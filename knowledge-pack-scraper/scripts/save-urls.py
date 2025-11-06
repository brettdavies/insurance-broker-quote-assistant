#!/usr/bin/env python3
"""
Save discovered URLs to url-tracker after agent performs WebSearch.

This script:
1. Accepts search ID and list of URLs from agent
2. Generates URL IDs and hashes
3. Registers URLs in url-tracker
4. Updates search status to 'urls_discovered'
5. Commits changes

Usage:
    uv run scripts/save-urls.py --search-id search_abc123 --urls https://url1.com https://url2.com https://url3.com

Output:
    JSON with registration results and explicit next_steps for agent
"""

import argparse
import hashlib
import json
import subprocess
import sys
from pathlib import Path

# Add scripts directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from tracker_manager import TrackerManager
from id_generator import generate_url_id


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
        "next_steps": next_steps
    }

    if data:
        result.update(data)

    print(json.dumps(result, indent=2))


def main() -> None:
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Save discovered URLs to url-tracker"
    )
    parser.add_argument(
        '--search-id',
        required=True,
        help='Search ID these URLs belong to'
    )
    parser.add_argument(
        '--urls',
        required=True,
        nargs='+',
        help='List of discovered URLs (space-separated)'
    )

    args = parser.parse_args()
    search_id = args.search_id
    urls = args.urls

    try:
        # Validate URL count (4-6 recommended)
        if len(urls) < 1:
            output_result(
                success=False,
                message="At least 1 URL required",
                next_steps="Provide at least 1 URL. Ideally 4-6 URLs for best coverage."
            )
            sys.exit(1)

        if len(urls) > 6:
            output_result(
                success=False,
                message=f"Too many URLs ({len(urls)}). Maximum is 6.",
                next_steps="Provide at most 6 URLs. Select the most relevant ones."
            )
            sys.exit(1)

        # Load trackers
        tm = TrackerManager()

        # Verify search exists and is claimed
        search = tm.find_item_by_id('search', search_id)
        if search is None:
            output_result(
                success=False,
                message=f"Search {search_id} not found",
                next_steps="Check search ID and try again"
            )
            sys.exit(1)

        if search.get('status') != 'claimed':
            output_result(
                success=False,
                message=f"Search {search_id} has status '{search.get('status')}', expected 'claimed'",
                next_steps="Only claimed searches can have URLs saved. Check search status."
            )
            sys.exit(1)

        # Load url-tracker
        url_tracker = tm.load('url')

        # Register each URL
        registered_urls = []
        for url in urls:
            url_id = generate_url_id()
            url_hash = hashlib.sha256(url.encode()).hexdigest()[:16]

            url_entry = {
                'id': url_id,
                'searchId': search_id,
                'url': url,
                'urlHash': url_hash,
                'priority': search.get('priority', 'medium'),
                'status': 'pending',
                'assignedTo': None,
                'pageId': None,
                'htmlFile': None,
                'markdownFile': None,
                'fetchedAt': None,
                'fetchError': None,
                'retryCount': 0
            }

            url_tracker['urls'].append(url_entry)
            url_tracker['statusCounts']['pending'] += 1
            registered_urls.append({
                'id': url_id,
                'url': url,
                'hash': url_hash
            })

        tm.save('url', url_tracker)

        # Update search status to 'urls_discovered'
        tm.update_status('search', search_id, 'urls_discovered', {
            'urlsDiscoveredCount': len(urls)
        })

        # Commit changes using centralized git script
        result = subprocess.run(
            [
                'uv', 'run', 'scripts/git-commit.py',
                '--type', 'complete',
                '--id', search_id,
                '--message', f'discovered {len(urls)} URLs'
            ],
            capture_output=True,
            text=True,
            cwd=Path(__file__).parent.parent
        )

        if result.returncode != 0:
            # Commit failed - provide automatic recovery
            try:
                error_data = json.loads(result.stdout)
                output_result(
                    success=False,
                    message=f"Git commit failed: {error_data.get('message', 'unknown error')}",
                    next_steps=(
                        "Git commit failed after saving URLs. Automatic recovery:\n\n"
                        "The URLs were saved to the tracker but commit failed.\n"
                        "This is likely a temporary git issue.\n\n"
                        "AUTOMATIC RECOVERY:\n"
                        "1. Try committing manually: git add -A && git commit -m 'save URLs' && git push\n"
                        "2. If that succeeds, continue: uv run scripts/select-work.py\n"
                        "3. If it fails, check git status and resolve any issues"
                    )
                )
                sys.exit(0)  # Exit 0 - agent can attempt recovery
            except json.JSONDecodeError:
                output_result(
                    success=False,
                    message=f"Git commit failed: {result.stdout}",
                    next_steps=(
                        "Git commit produced unexpected output. Automatic recovery:\n\n"
                        "Try committing manually: git add -A && git commit -m 'save URLs' && git push\n"
                        "Then continue: uv run scripts/select-work.py"
                    )
                )
                sys.exit(0)  # Exit 0 - agent can attempt recovery

        # Success!
        output_result(
            success=True,
            message=f"Successfully registered {len(urls)} URLs",
            next_steps=(
                f"URLs saved and committed successfully.\n\n"
                f"Registered {len(urls)} URLs.\n"
                f"URLs will be fetched by URL processing agents.\n\n"
                f"Continue with next work item:\n"
                f"Run: uv run scripts/select-work.py"
            ),
            data={
                "search_id": search_id,
                "urls_registered": len(urls)
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
            next_steps="Restart save-urls operation when ready"
        )
        sys.exit(130)
