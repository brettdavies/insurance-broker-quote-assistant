#!/usr/bin/env python3
"""
Select next work item using waterfall priority.

This script checks all 4 trackers in priority order and randomly selects
available work to minimize collision probability.

Priority order:
1. search-tracker (execute searches to discover URLs)
2. url-tracker (fetch URLs with crawl4ai)
3. page-tracker (extract data from pages)
4. extraction-tracker (validate and commit)

Usage:
    uv run scripts/select-work.py

Output:
    Automatically chains to next script based on work type
"""

import json
import subprocess
import sys
from pathlib import Path

# Add scripts directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from select_random_work import select_random_work, get_work_summary
from tracker_manager import TrackerManager


def chain_to_next_script(work_item: dict, tracker_type: str, summary: dict) -> int:
    """
    Automatically chain to the next script based on work type.

    Args:
        work_item: Selected work item dict
        tracker_type: Type of tracker (search, url, page, extraction)
        summary: Work summary counts

    Returns:
        Exit code from subprocess
    """
    item_id = work_item['id']

    # Determine which script to call
    script_map = {
        'search': 'claim-search.py',
        'url': 'fetch-url.py',
        'page': 'claim-page.py',
        'extraction': 'validate-extraction.py'
    }

    script = script_map[tracker_type]

    # Output summary for context
    print(json.dumps({
        "success": True,
        "tracker_type": tracker_type,
        "work_item": work_item,
        "summary": summary,
        "chaining_to": script
    }, indent=2), flush=True)

    # Chain to next script synchronously
    result = subprocess.run(
        ['uv', 'run', f'scripts/{script}', '--id', item_id],
        cwd=Path(__file__).parent.parent
    )

    return result.returncode


def output_no_work(summary: dict) -> None:
    """
    Output no work available message.

    Args:
        summary: Work summary counts
    """
    result = {
        "success": True,
        "tracker_type": None,
        "work_item": None,
        "summary": summary,
        "next_steps": (
            "No work available - Phase 2 complete!\n\n"
            "All trackers show zero pending items. Phase 2 data gathering is finished.\n"
            "You can now proceed to Phase 3 (conflict detection and resolution)."
        )
    }

    print(json.dumps(result, indent=2))


def output_error(error_message: str) -> None:
    """
    Output error result.

    Args:
        error_message: Error description
    """
    result = {
        "success": False,
        "error": error_message,
        "next_steps": (
            "Check tracker files and ensure they are valid JSON. "
            "Run: uv run scripts/select-work.py to try again."
        )
    }

    print(json.dumps(result, indent=2))


def main() -> None:
    """Main entry point."""
    try:
        # Initialize tracker manager
        tm = TrackerManager()

        # Get work summary
        summary = get_work_summary(tm)

        # Select work using waterfall priority + random selection
        work = select_random_work(tm)

        if work is None:
            # No work available - Phase 2 complete!
            output_no_work(summary)
            sys.exit(0)

        tracker_type, work_item = work

        # Chain to next script automatically
        exit_code = chain_to_next_script(work_item, tracker_type, summary)
        sys.exit(exit_code)

    except FileNotFoundError as e:
        output_error(f"Tracker file not found: {e}")
        sys.exit(1)

    except json.JSONDecodeError as e:
        output_error(f"Invalid JSON in tracker file: {e}")
        sys.exit(1)

    except Exception as e:
        output_error(f"Unexpected error: {e}")
        sys.exit(1)


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        output_error("Interrupted by user")
        sys.exit(130)
