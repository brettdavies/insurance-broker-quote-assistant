#!/usr/bin/env python3
"""
Claim a page and output content for agent to extract data.

This script:
1. Pulls latest from git
2. Claims the page in page-tracker
3. Commits the claim
4. Loads page content (HTML or MD)
5. Outputs content for agent to perform LLM extraction

Usage:
    uv run scripts/claim-page.py --id page_abc123

Output:
    JSON with page content and explicit next_steps for agent
"""

import argparse
import json
import subprocess
import sys
from datetime import datetime
from pathlib import Path

# Add scripts directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from tracker_manager import TrackerManager
from id_generator import generate_agent_id


# Generate unique agent ID for this process
AGENT_ID = generate_agent_id()


def output_result(success: bool, message: str, next_steps: str, data: dict = None) -> None:
    """
    Output JSON result to stdout.

    Args:
        success: Whether operation succeeded
        message: Status message
        next_steps: Explicit instructions for agent
        data: Additional data (page content, etc.)
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


def load_page_content(html_path: Path, md_path: Path) -> tuple[bool, str, str, str]:
    """
    Load page content, trying HTML first, falling back to MD.

    Args:
        html_path: Path to HTML file
        md_path: Path to Markdown file

    Returns:
        Tuple of (success, content, format_used, error_message)
    """
    # Try HTML first
    try:
        with open(html_path, 'r', encoding='utf-8') as f:
            content = f.read()
        return True, content, 'html', ""
    except Exception as html_error:
        # Try markdown
        try:
            with open(md_path, 'r', encoding='utf-8') as f:
                content = f.read()
            return True, content, 'markdown', ""
        except Exception as md_error:
            return False, "", "", f"Failed to read both formats: HTML ({html_error}), MD ({md_error})"


def main() -> None:
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Claim a page for data extraction"
    )
    parser.add_argument(
        '--id',
        required=True,
        help='Page ID to claim (e.g., page_abc123)'
    )

    args = parser.parse_args()
    page_id = args.id

    try:
        # Step 1: Pull latest
        if not git_pull():
            output_result(
                success=False,
                message="Git pull failed",
                next_steps="Check git repository status and try again"
            )
            sys.exit(1)

        # Step 2: Load tracker and find page
        tm = TrackerManager()
        page = tm.find_item_by_id('page', page_id)

        if page is None:
            output_result(
                success=False,
                message=f"Page {page_id} not found in tracker",
                next_steps="Check page ID and try again. Run: uv run scripts/select-work.py"
            )
            sys.exit(1)

        # Step 3: Check if still pending
        if page.get('status') != 'pending':
            current_status = page.get('status', 'unknown')
            assigned_to = page.get('assignedTo', 'unknown')

            output_result(
                success=False,
                message=f"Page {page_id} already claimed (status: {current_status}, assignedTo: {assigned_to})",
                next_steps="Run: uv run scripts/select-work.py to select different work"
            )
            sys.exit(1)

        # Step 4: Claim it
        tm.update_status('page', page_id, 'claimed', {
            'assignedTo': AGENT_ID,
            'claimedAt': datetime.now().isoformat()
        })

        # Step 5: Commit claim
        result = subprocess.run(
            [
                'uv', 'run', 'scripts/git-commit.py',
                '--type', 'claim',
                '--id', page_id,
                '--message', 'extraction'
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
                    page = tm.find_item_by_id('page', page_id)
                    if not page or page.get('assignedTo') != AGENT_ID:
                        # Lost race - AUTOMATIC RECOVERY
                        output_result(
                            success=False,
                            message="Lost race - another agent claimed this page first",
                            next_steps=(
                                "Race condition detected and handled automatically.\n"
                                "Another agent won the race to claim this page.\n\n"
                                "AUTOMATIC RECOVERY - Select new work:\n"
                                "Run: uv run scripts/select-work.py"
                            )
                        )
                        sys.exit(0)  # Exit 0 - normal behavior
                else:
                    output_result(
                        success=False,
                        message=f"Git commit failed: {error_data.get('message', 'unknown error')}",
                        next_steps=(
                            "Git commit failed. Automatic recovery:\n\n"
                            "Run: uv run scripts/select-work.py to try different work"
                        )
                    )
                    sys.exit(0)  # Exit 0 - agent should continue
            except json.JSONDecodeError:
                output_result(
                    success=False,
                    message=f"Git commit failed: {result.stdout}",
                    next_steps=(
                        "Git commit produced unexpected output. Automatic recovery:\n\n"
                        "Run: uv run scripts/select-work.py to try different work"
                    )
                )
                sys.exit(0)  # Exit 0 - agent should continue

        # Step 6: Load page content
        html_file_path = page.get('htmlFile', '')
        md_file_path = page.get('markdownFile', '')
        search_id = page.get('searchId', 'unknown')
        url_id = page.get('urlId', 'unknown')

        # Resolve file paths
        html_file = Path(html_file_path)
        if not html_file.is_absolute():
            html_file = tm.base_path.parent / html_file_path.replace('../', '')

        md_file = Path(md_file_path)
        if not md_file.is_absolute():
            md_file = tm.base_path.parent / md_file_path.replace('../', '')

        success, content, format_used, error_msg = load_page_content(html_file, md_file)

        if not success:
            # Failed to load content
            tm.update_status('page', page_id, 'failed', {
                'notes': error_msg
            })

            subprocess.run(
                [
                    'uv', 'run', 'scripts/git-commit.py',
                    '--type', 'fail',
                    '--id', page_id,
                    '--message', 'file read error'
                ],
                cwd=Path(__file__).parent.parent
            )

            output_result(
                success=False,
                message=f"Failed to load page content: {error_msg}",
                next_steps="Run: uv run scripts/select-work.py to continue with next work item"
            )
            sys.exit(1)

        # Success! Output file paths for extraction
        output_result(
            success=True,
            message=f"Successfully claimed page with {format_used} content ({len(content):,} chars)",
            next_steps=(
                f"Claim committed successfully. You now own {page_id}.\n\n"
                f"ACTION REQUIRED - Extract Data:\n"
                f"1. Read the page content from the file paths provided below\n"
                f"2. Use LLM to extract insurance data points from the content\n"
                f"3. Look for: discounts, eligibility rules, carrier info, state requirements\n"
                f"4. Extract data in structured format following the Raw Data Schema:\n"
                f"   Schema: docs/knowledge-pack/sot-schemas.md#raw-data-schema\n"
                f"   Required fields: id, dataPoint, rawValue, source (with pageId, uri, accessedDate)\n"
                f"5. Generate unique raw data IDs for each data point (raw_{{cuid2}})\n"
                f"6. After extraction completes, save data using:\n"
                f"   echo '<json_data>' | uv run scripts/save-extraction.py --page-id {page_id} --search-id {search_id}\n\n"
                f"Recommended: Use Task tool with subagent to read file and perform extraction."
            ),
            data={
                "page_id": page_id,
                "search_id": search_id,
                "html_file": str(html_file),
                "markdown_file": str(md_file),
                "content_format": format_used,
                "content_size": len(content),
                "claimed_by": AGENT_ID,
                "claimed_at": datetime.now().isoformat()
            }
        )

    except Exception as e:
        output_result(
            success=False,
            message=f"Unexpected error: {e}",
            next_steps="Check error message and try again"
        )
        sys.exit(1)


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        output_result(
            success=False,
            message="Interrupted by user",
            next_steps="Restart claim operation when ready"
        )
        sys.exit(130)
