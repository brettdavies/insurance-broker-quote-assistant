#!/usr/bin/env python3
"""
Autonomous URL fetching with crawl4ai.

This script fully autonomously:
1. Claims the URL
2. Fetches with crawl4ai
3. Saves HTML + MD (same page ID)
4. Registers page in page-tracker
5. Commits changes

No agent interaction needed - this is a complete autonomous script.

Usage:
    uv run scripts/fetch-url.py --id url_abc123

Output:
    JSON with fetch results and explicit next_steps for agent
"""

import argparse
import asyncio
import json
import subprocess
import sys
from datetime import datetime
from pathlib import Path

# Add scripts directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from tracker_manager import TrackerManager
from id_generator import generate_agent_id, generate_page_id

# Import crawl4ai
try:
    from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig
except ImportError:
    print(json.dumps({
        "success": False,
        "message": "crawl4ai not installed",
        "next_steps": "Install crawl4ai: uv sync && uv run crawl4ai-setup"
    }, indent=2))
    sys.exit(1)


# Generate unique agent ID for this process
AGENT_ID = generate_agent_id()


def output_result(success: bool, message: str, next_steps: str, data: dict = None) -> None:
    """
    Output JSON result to stdout.

    Args:
        success: Whether operation succeeded
        message: Status message
        next_steps: Explicit instructions for agent
        data: Additional data
    """
    result = {
        "success": success,
        "message": message,
        "agent_id": AGENT_ID,
        "next_steps": next_steps
    }

    if data:
        result.update(data)

    print(json.dumps(result, indent=2))


def git_pull() -> bool:
    """Pull latest changes."""
    try:
        repo_root = Path(__file__).parent.parent.parent
        result = subprocess.run(
            ['git', 'pull', '--rebase'],
            capture_output=True,
            text=True,
            cwd=repo_root
        )
        return result.returncode == 0
    except Exception:
        return False


async def fetch_page(url: str) -> tuple[bool, str, str, str]:
    """
    Fetch page with crawl4ai.

    Args:
        url: URL to fetch

    Returns:
        Tuple of (success, html, markdown, error_message)
    """
    try:
        browser_config = BrowserConfig(
            headless=True,
            java_script_enabled=True
        )
        run_config = CrawlerRunConfig()

        crawler = AsyncWebCrawler(browser_config)
        await crawler.start()

        try:
            result = await crawler.arun(url, config=run_config)

            if not result.success:
                return False, "", "", result.error_message or "Unknown crawl error"

            return True, result.html, result.markdown.raw_markdown, ""
        finally:
            await crawler.close()

    except Exception as e:
        return False, "", "", str(e)


async def main_async(url_id: str) -> None:
    """Main async logic."""
    try:
        # Step 1: Pull latest
        if not git_pull():
            output_result(
                success=False,
                message="Git pull failed",
                next_steps="Check git repository status and try again"
            )
            sys.exit(1)

        # Step 2: Load tracker and find URL
        tm = TrackerManager()
        url_entry = tm.find_item_by_id('url', url_id)

        if url_entry is None:
            output_result(
                success=False,
                message=f"URL {url_id} not found in tracker",
                next_steps="Check URL ID and try again"
            )
            sys.exit(1)

        # Step 3: Check if still pending
        if url_entry.get('status') != 'pending':
            current_status = url_entry.get('status', 'unknown')
            output_result(
                success=False,
                message=f"URL {url_id} not pending (status: {current_status})",
                next_steps="Run: uv run scripts/select-work.py to select different work"
            )
            sys.exit(1)

        # Step 4: Claim it
        tm.update_status('url', url_id, 'claimed', {
            'assignedTo': AGENT_ID,
            'claimedAt': datetime.now().isoformat()
        })

        # Step 5: Commit claim
        url = url_entry.get('url', 'unknown url')
        result = subprocess.run(
            [
                'uv', 'run', 'scripts/git-commit.py',
                '--type', 'claim',
                '--id', url_id,
                '--message', url[:60]
            ],
            capture_output=True,
            text=True,
            cwd=Path(__file__).parent.parent
        )

        if result.returncode != 0:
            # Check for race condition and handle automatically
            try:
                error_data = json.loads(result.stdout)
                if error_data.get('had_conflict'):
                    # Check ownership
                    tm = TrackerManager()
                    url_entry = tm.find_item_by_id('url', url_id)
                    if not url_entry or url_entry.get('assignedTo') != AGENT_ID:
                        # Lost race - AUTOMATIC RECOVERY
                        output_result(
                            success=False,
                            message="Lost race - another agent claimed this URL first",
                            next_steps=(
                                "Race condition detected and handled automatically.\n"
                                "Another agent is fetching this URL.\n\n"
                                "AUTOMATIC RECOVERY - Select new work:\n"
                                "Run: uv run scripts/select-work.py"
                            )
                        )
                        sys.exit(0)  # Exit 0 - normal behavior
            except json.JSONDecodeError:
                # Commit failed for other reasons - continue anyway since this is autonomous
                pass

        # Step 6: Generate page ID (same for both formats)
        page_id = generate_page_id()
        search_id = url_entry.get('searchId', 'unknown')

        # Step 7: Ensure output directory exists
        output_dir = tm.output_base / '_pages'
        output_dir.mkdir(parents=True, exist_ok=True)

        # Step 8: Fetch with crawl4ai
        success, html, markdown, error_msg = await fetch_page(url)

        if not success:
            # Fetch failed - mark as failed
            tm.update_status('url', url_id, 'failed', {
                'fetchError': error_msg,
                'retryCount': url_entry.get('retryCount', 0) + 1
            })

            subprocess.run(
                [
                    'uv', 'run', 'scripts/git-commit.py',
                    '--type', 'fail',
                    '--id', url_id,
                    '--message', error_msg[:60]
                ],
                cwd=Path(__file__).parent.parent
            )

            output_result(
                success=False,
                message=f"Fetch failed: {error_msg}",
                next_steps="Fetch failed. Chaining to next work item..."
            )

            # Auto-chain to select-work.py (even on failure)
            result = subprocess.run(
                ['uv', 'run', 'scripts/select-work.py'],
                cwd=Path(__file__).parent.parent
            )
            sys.exit(result.returncode)

        # Step 9: Save both formats with SAME page ID
        html_file = output_dir / f"{page_id}.html"
        md_file = output_dir / f"{page_id}.md"

        with open(html_file, 'w', encoding='utf-8') as f:
            f.write(html)

        with open(md_file, 'w', encoding='utf-8') as f:
            f.write(markdown)

        html_size = len(html)
        md_size = len(markdown)

        # Step 10: Update url-tracker
        tm.update_status('url', url_id, 'completed', {
            'pageId': page_id,
            'htmlFile': f"../knowledge_pack/raw/_pages/{page_id}.html",
            'markdownFile': f"../knowledge_pack/raw/_pages/{page_id}.md",
            'fetchedAt': datetime.now().isoformat()
        })

        # Step 11: Register page in page-tracker
        page_tracker = tm.load('page')
        page_tracker['pages'].append({
            'id': page_id,
            'urlId': url_id,
            'searchId': search_id,
            'htmlFile': f"../knowledge_pack/raw/_pages/{page_id}.html",
            'markdownFile': f"../knowledge_pack/raw/_pages/{page_id}.md",
            'htmlSize': html_size,
            'markdownSize': md_size,
            'status': 'pending',
            'assignedTo': None,
            'dataPointsExtracted': 0,
            'rawDataFile': None,
            'extractedAt': None
        })
        page_tracker['statusCounts']['pending'] += 1
        tm.save('page', page_tracker)

        # Step 12: Commit changes
        subprocess.run(
            [
                'uv', 'run', 'scripts/git-commit.py',
                '--type', 'fetch',
                '--id', page_id,
                '--message', url[:60]
            ],
            cwd=Path(__file__).parent.parent
        )

        # Success!
        output_result(
            success=True,
            message="Successfully fetched and saved page",
            next_steps=(
                f"URL fetch completed successfully!\n\n"
                f"Saved:\n"
                f"  - HTML: {html_file.name} ({html_size:,} bytes)\n"
                f"  - Markdown: {md_file.name} ({md_size:,} bytes)\n\n"
                f"Page registered in page-tracker as {page_id}.\n"
                f"Changes committed to git.\n\n"
                f"Chaining to next work item..."
            ),
            data={
                "url_id": url_id,
                "page_id": page_id,
                "url": url,
                "html_size": html_size,
                "markdown_size": md_size,
                "html_file": str(html_file),
                "markdown_file": str(md_file)
            }
        )

        # Auto-chain to select-work.py
        result = subprocess.run(
            ['uv', 'run', 'scripts/select-work.py'],
            cwd=Path(__file__).parent.parent
        )
        sys.exit(result.returncode)

    except Exception as e:
        output_result(
            success=False,
            message=f"Unexpected error: {e}",
            next_steps="Check error message and try again"
        )
        sys.exit(1)


def main() -> None:
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Autonomous URL fetching with crawl4ai"
    )
    parser.add_argument(
        '--id',
        required=True,
        help='URL ID to fetch (e.g., url_abc123)'
    )

    args = parser.parse_args()

    try:
        asyncio.run(main_async(args.id))
    except KeyboardInterrupt:
        output_result(
            success=False,
            message="Interrupted by user",
            next_steps="Restart fetch operation when ready"
        )
        sys.exit(130)


if __name__ == '__main__':
    main()
