"""
Random work selection with waterfall priority.

Checks trackers in priority order and randomly selects from available work.
"""

import random
from typing import Optional, Tuple, Dict
from tracker_manager import TrackerManager, TrackerType


def select_random_work(tm: Optional[TrackerManager] = None) -> Optional[Tuple[TrackerType, Dict]]:
    """
    Check trackers in waterfall order, return first available work.

    Priority order:
    1. search-tracker (execute searches to discover URLs)
    2. url-tracker (fetch URLs with crawl4ai)
    3. page-tracker (extract data from pages)
    4. extraction-tracker (validate and commit)

    Args:
        tm: TrackerManager instance (creates new one if None)

    Returns:
        Tuple of (tracker_type, work_item) or None if no work available
    """
    if tm is None:
        tm = TrackerManager()

    # Waterfall: check each tracker in order
    for tracker_type in ['search', 'url', 'page']:
        tracker = tm.load(tracker_type)

        # Collect all pending items
        items_key = {
            'search': 'searches',
            'url': 'urls',
            'page': 'pages'
        }[tracker_type]

        pending = [
            item for item in tracker.get(items_key, [])
            if item.get('status') == 'pending'
        ]

        if pending:
            # Random selection from available work
            # This reduces collision probability when multiple agents run
            selected = random.choice(pending)
            return (tracker_type, selected)

    return None  # No work available


def get_work_summary(tm: Optional[TrackerManager] = None) -> Dict[str, int]:
    """
    Get summary of pending work across all trackers.

    Args:
        tm: TrackerManager instance (creates new one if None)

    Returns:
        Dict mapping tracker type to count of pending items
    """
    if tm is None:
        tm = TrackerManager()

    summary = {}

    for tracker_type in ['search', 'url', 'page']:
        counts = tm.get_status_counts(tracker_type)
        summary[tracker_type] = counts.get('pending', 0)

    return summary


def print_work_summary(tm: Optional[TrackerManager] = None) -> None:
    """
    Print a human-readable summary of available work.

    Args:
        tm: TrackerManager instance (creates new one if None)
    """
    summary = get_work_summary(tm)

    print("\n=== Work Summary ===")
    print(f"Searches pending:    {summary['search']}")
    print(f"URLs pending:        {summary['url']}")
    print(f"Pages pending:       {summary['page']}")
    print(f"Total pending:       {sum(summary.values())}")
    print("===================\n")


if __name__ == '__main__':
    # Test: print work summary
    print_work_summary()

    # Test: try to select work
    work = select_random_work()
    if work:
        tracker_type, work_item = work
        print(f"Selected work: {tracker_type} - {work_item.get('id')}")
    else:
        print("No work available")
