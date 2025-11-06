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
    JSON with selected work item and explicit next_steps for agent
"""

import json
import sys
from pathlib import Path

# Add scripts directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from select_random_work import select_random_work, get_work_summary
from tracker_manager import TrackerManager


def output_result(work_item: dict, tracker_type: str, summary: dict) -> None:
    """
    Output selected work item with next steps.

    Args:
        work_item: Selected work item dict
        tracker_type: Type of tracker (search, url, page, extraction)
        summary: Work summary counts
    """
    result = {
        "success": True,
        "tracker_type": tracker_type,
        "work_item": work_item,
        "summary": summary,
        "next_steps": ""
    }

    # Determine next steps based on tracker type
    if tracker_type == 'search':
        search_id = work_item['id']
        query = work_item['query']
        result["next_steps"] = (
            f"Selected search: {search_id}\n"
            f"Query: {query}\n\n"
            f"ACTION REQUIRED:\n"
            f"1. Run: uv run scripts/claim-search.py --id {search_id}\n"
            f"2. If claim succeeds, you will receive the search details\n"
            f"3. Perform WebSearch using the provided query\n"
            f"4. Save discovered URLs using save-urls.py"
        )

    elif tracker_type == 'url':
        url_id = work_item['id']
        url = work_item['url']
        result["next_steps"] = (
            f"Selected URL: {url_id}\n"
            f"URL: {url}\n\n"
            f"ACTION REQUIRED:\n"
            f"1. Run: uv run scripts/fetch-url.py --id {url_id}\n"
            f"2. This will autonomously fetch the URL with crawl4ai\n"
            f"3. HTML and Markdown will be saved automatically\n"
            f"4. No further action needed - script handles everything"
        )

    elif tracker_type == 'page':
        page_id = work_item['id']
        result["next_steps"] = (
            f"Selected page: {page_id}\n\n"
            f"ACTION REQUIRED:\n"
            f"1. Run: uv run scripts/claim-page.py --id {page_id}\n"
            f"2. If claim succeeds, you will receive the page content\n"
            f"3. Extract data points from the content using LLM\n"
            f"4. Save extracted data using save-extraction.py"
        )

    elif tracker_type == 'extraction':
        extraction_id = work_item['id']
        result["next_steps"] = (
            f"Selected extraction: {extraction_id}\n\n"
            f"ACTION REQUIRED:\n"
            f"1. Run: uv run scripts/validate-extraction.py --id {extraction_id}\n"
            f"2. This will autonomously validate the extraction\n"
            f"3. Search will be marked complete if validation passes\n"
            f"4. No further action needed - script handles everything"
        )

    print(json.dumps(result, indent=2))


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

        # Output selected work with next steps
        output_result(work_item, tracker_type, summary)

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
