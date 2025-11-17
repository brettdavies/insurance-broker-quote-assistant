#!/usr/bin/env python3
"""
Save discovered URLs to url-tracker after agent performs WebSearch.

This script:
1. Accepts search ID and list of URLs from agent
2. Normalizes URLs and calculates hashes for deduplication
3. Registers new URLs or appends search_id to existing URLs
4. Marks search as 'completed' (hand-off complete)
5. Commits changes

Usage:
    uv run scripts/save-urls.py --search-id search_abc123 --urls "https://url1.com" "https://url2.com" "https://url3.com"

Note: URLs must be quoted to handle special characters (&, ?, etc.)

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


def normalize_url(url: str) -> str:
    """
    Normalize URL for consistent hashing.

    Args:
        url: Raw URL string

    Returns:
        Normalized URL (lowercase, no protocol, no trailing slash)
    """
    normalized = url.lower().rstrip('/')

    # Remove protocol
    if normalized.startswith('http://'):
        normalized = normalized[7:]
    elif normalized.startswith('https://'):
        normalized = normalized[8:]

    return normalized


def calculate_url_hash(url: str) -> str:
    """
    Calculate SHA256 hash of normalized URL for deduplication.

    Args:
        url: Raw URL string

    Returns:
        First 16 characters of SHA256 hash
    """
    normalized = normalize_url(url)
    return hashlib.sha256(normalized.encode()).hexdigest()[:16]


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
        help='List of discovered URLs (space-separated, each URL should be quoted)'
    )

    args = parser.parse_args()
    search_id = args.search_id
    urls = args.urls

    try:
        # Validate URL count (at least 1 required)
        if len(urls) < 1:
            output_result(
                success=False,
                message="At least 1 URL required",
                next_steps="Provide at least 1 URL from your WebSearch results. All discovered URLs will be captured."
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

        # Build hash lookup for existing URLs
        existing_urls_by_hash = {}
        for url_entry in url_tracker.get('urls', []):
            url_hash = url_entry.get('urlHash')
            if url_hash:
                existing_urls_by_hash[url_hash] = url_entry

        # Process each URL (deduplication logic)
        new_urls_count = 0
        existing_urls_count = 0
        registered_urls = []

        for idx, url in enumerate(urls, 1):
            url_hash = calculate_url_hash(url)

            # Check if URL already exists
            if url_hash in existing_urls_by_hash:
                # URL exists - append search_id if not already present
                existing_entry = existing_urls_by_hash[url_hash]
                search_ids = existing_entry.get('search_ids', existing_entry.get('searchIds', []))

                # Handle legacy single searchId field
                if not isinstance(search_ids, list):
                    search_ids = [search_ids] if search_ids else []

                # Append search_id if not already present (idempotent)
                if search_id not in search_ids:
                    search_ids.append(search_id)
                    existing_entry['search_ids'] = search_ids
                    # Remove legacy field if present
                    if 'searchId' in existing_entry:
                        del existing_entry['searchId']

                existing_urls_count += 1
                registered_urls.append({
                    'url': url,
                    'status': 'existing',
                    'message': f'Added this search to existing URL ({idx} of {len(urls)})'
                })
            else:
                # New URL - create entry
                url_id = generate_url_id()

                url_entry = {
                    'id': url_id,
                    'search_ids': [search_id],  # Array for multi-search provenance
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
                existing_urls_by_hash[url_hash] = url_entry  # Add to lookup

                new_urls_count += 1
                registered_urls.append({
                    'id': url_id,
                    'url': url,
                    'hash': url_hash,
                    'status': 'new',
                    'message': f'Registered new URL ({idx} of {len(urls)})'
                })

        # Save url-tracker with dedup changes
        tm.save('url', url_tracker)

        # Mark search as 'completed' (hand-off complete)
        tm.update_status('search', search_id, 'completed', {
            'completedAt': tm._get_timestamp(),
            'urlsDiscoveredCount': len(urls),
            'urlsNewCount': new_urls_count,
            'urlsExistingCount': existing_urls_count
        })

        # Commit changes using centralized git script
        # Format: "feat(kb): complete search - registered N URLs (X new, Y existing)"
        commit_message = f'registered {len(urls)} URLs ({new_urls_count} new, {existing_urls_count} existing)'

        result = subprocess.run(
            [
                'uv', 'run', 'scripts/git-commit.py',
                '--type', 'complete',
                '--id', search_id,
                '--message', commit_message
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
            message=f"Search complete! Registered {len(urls)} URLs ({new_urls_count} new, {existing_urls_count} existing)",
            next_steps=(
                f"URLs saved and committed successfully.\n\n"
                f"Summary:\n"
                f"  - Total URLs: {len(urls)}\n"
                f"  - New URLs: {new_urls_count}\n"
                f"  - Existing URLs (deduplicated): {existing_urls_count}\n\n"
                f"Search marked as completed.\n"
                f"URLs will be fetched by URL processing agents.\n\n"
                f"Chaining to next work item..."
            ),
            data={
                "search_id": search_id,
                "urls_total": len(urls),
                "urls_new": new_urls_count,
                "urls_existing": existing_urls_count,
                "urls_registered": registered_urls
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
