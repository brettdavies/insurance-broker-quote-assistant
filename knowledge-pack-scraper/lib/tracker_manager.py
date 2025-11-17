"""
Tracker management utilities.

Handles loading, saving, and updating the 4 tracker JSON files.
"""

import json
from typing import Dict, List, Optional, Literal, Any
from pathlib import Path
from datetime import datetime

TrackerType = Literal['search', 'url', 'page', 'extraction']


class TrackerManager:
    """Manager for Phase 2 tracker files."""

    def __init__(self, base_path: Optional[Path] = None):
        """
        Initialize tracker manager.

        Args:
            base_path: Base path for tracker files (defaults to current directory)
        """
        if base_path is None:
            # Auto-detect scraper root (support phase subdirs)
            current = Path.cwd()
            if (current / 'trackers').exists():
                base_path = current  # Already at root
            elif (current.parent / 'trackers').exists():
                base_path = current.parent  # In phase subdir
            else:
                # Fallback: assume current directory
                base_path = current

        self.base_path = base_path
        # Tracker files are in trackers/ subdirectory
        trackers_dir = base_path / 'trackers'
        self.tracker_files = {
            'search': trackers_dir / 'search-tracker.json',
            'url': trackers_dir / 'url-tracker.json',
            'page': trackers_dir / 'page-tracker.json',
            'extraction': trackers_dir / 'extraction-tracker.json'
        }
        # Output goes to raw/ (inside scraper folder)
        self.output_base = base_path / 'raw'

    def load(self, tracker_type: TrackerType) -> Dict:
        """
        Load tracker JSON file.

        Args:
            tracker_type: Type of tracker to load

        Returns:
            Tracker data as dict
        """
        path = self.tracker_files[tracker_type]
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)

    def save(self, tracker_type: TrackerType, data: Dict) -> None:
        """
        Save tracker JSON file.

        Updates lastUpdated timestamp before saving.

        Args:
            tracker_type: Type of tracker to save
            data: Tracker data dict
        """
        path = self.tracker_files[tracker_type]
        data['meta']['lastUpdated'] = datetime.now().isoformat()
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)

    def find_pending_work(self, tracker_type: TrackerType) -> Optional[Dict]:
        """
        Find first pending work item (status == 'pending').

        Args:
            tracker_type: Type of tracker to search

        Returns:
            First pending work item, or None if no work available
        """
        tracker = self.load(tracker_type)

        items_key = {
            'search': 'searches',
            'url': 'urls',
            'page': 'pages',
            'extraction': 'extractions'
        }[tracker_type]

        for item in tracker.get(items_key, []):
            if item.get('status') == 'pending':
                return item

        return None

    def update_status(
        self,
        tracker_type: TrackerType,
        item_id: str,
        new_status: str,
        updates: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Update item status and fields.

        Args:
            tracker_type: Type of tracker
            item_id: ID of item to update
            new_status: New status value
            updates: Additional fields to update
        """
        if updates is None:
            updates = {}

        tracker = self.load(tracker_type)

        items_key = {
            'search': 'searches',
            'url': 'urls',
            'page': 'pages',
            'extraction': 'extractions'
        }[tracker_type]

        for item in tracker.get(items_key, []):
            if item.get('id') == item_id:
                old_status = item.get('status')
                item['status'] = new_status
                item.update(updates)

                # Update status counts
                if old_status and old_status in tracker['statusCounts']:
                    tracker['statusCounts'][old_status] -= 1
                if new_status in tracker['statusCounts']:
                    tracker['statusCounts'][new_status] += 1
                else:
                    tracker['statusCounts'][new_status] = 1
                break

        self.save(tracker_type, tracker)

    def add_item(
        self,
        tracker_type: TrackerType,
        item: Dict,
        category_name: Optional[str] = None
    ) -> None:
        """
        Add a new item to a tracker.

        Args:
            tracker_type: Type of tracker
            item: Item dict to add
            category_name: Deprecated, not used (kept for backward compatibility)
        """
        tracker = self.load(tracker_type)

        items_key = {
            'search': 'searches',
            'url': 'urls',
            'page': 'pages',
            'extraction': 'extractions'
        }[tracker_type]

        if items_key not in tracker:
            tracker[items_key] = []

        tracker[items_key].append(item)

        # Update total count
        total_key = {
            'search': 'totalSearches',
            'url': 'totalUrls',
            'page': 'totalPages',
            'extraction': 'totalExtractions'
        }[tracker_type]
        tracker['meta'][total_key] = tracker['meta'].get(total_key, 0) + 1

        # Update status counts
        item_status = item.get('status', 'pending')
        if item_status in tracker['statusCounts']:
            tracker['statusCounts'][item_status] += 1
        else:
            tracker['statusCounts'][item_status] = 1

        self.save(tracker_type, tracker)

    def get_status_counts(self, tracker_type: TrackerType) -> Dict[str, int]:
        """
        Get status counts for a tracker.

        Args:
            tracker_type: Type of tracker

        Returns:
            Dict mapping status -> count
        """
        tracker = self.load(tracker_type)
        return tracker.get('statusCounts', {})

    def find_item_by_id(
        self,
        tracker_type: TrackerType,
        item_id: str
    ) -> Optional[Dict]:
        """
        Find an item by its ID.

        Args:
            tracker_type: Type of tracker
            item_id: ID to search for

        Returns:
            Item dict if found, None otherwise
        """
        tracker = self.load(tracker_type)

        items_key = {
            'search': 'searches',
            'url': 'urls',
            'page': 'pages',
            'extraction': 'extractions'
        }[tracker_type]

        for item in tracker.get(items_key, []):
            if item.get('id') == item_id:
                return item

        return None

    def _get_timestamp(self) -> str:
        """
        Get current timestamp in ISO format.

        Returns:
            ISO formatted timestamp string
        """
        return datetime.now().isoformat()
