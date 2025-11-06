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
            base_path = Path.cwd()

        self.base_path = base_path
        self.tracker_files = {
            'search': base_path / 'search-tracker.json',
            'url': base_path / 'url-tracker.json',
            'page': base_path / 'page-tracker.json',
            'extraction': base_path / 'extraction-tracker.json'
        }
        # Output goes to ../knowledge_pack/raw/
        self.output_base = base_path.parent / 'knowledge_pack' / 'raw'

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

        if tracker_type == 'search':
            for category in tracker.get('categories', []):
                for search in category.get('searches', []):
                    if search.get('status') == 'pending':
                        return search

        elif tracker_type in ['url', 'page', 'extraction']:
            items_key = {
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

        # Find and update item
        if tracker_type == 'search':
            for category in tracker.get('categories', []):
                for search in category.get('searches', []):
                    if search.get('id') == item_id:
                        old_status = search.get('status')
                        search['status'] = new_status
                        search.update(updates)

                        # Update status counts
                        if old_status and old_status in tracker['statusCounts']:
                            tracker['statusCounts'][old_status] -= 1
                        if new_status in tracker['statusCounts']:
                            tracker['statusCounts'][new_status] += 1
                        else:
                            tracker['statusCounts'][new_status] = 1
                        break

        else:
            items_key = {
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
            category_name: Category name (for search tracker only)
        """
        tracker = self.load(tracker_type)

        if tracker_type == 'search':
            if not category_name:
                raise ValueError("category_name required for search tracker")

            # Find or create category
            category = None
            for cat in tracker.get('categories', []):
                if cat.get('name') == category_name:
                    category = cat
                    break

            if category is None:
                category = {'name': category_name, 'searches': []}
                if 'categories' not in tracker:
                    tracker['categories'] = []
                tracker['categories'].append(category)

            category['searches'].append(item)
            tracker['meta']['totalSearches'] = tracker['meta'].get('totalSearches', 0) + 1

        else:
            items_key = {
                'url': 'urls',
                'page': 'pages',
                'extraction': 'extractions'
            }[tracker_type]

            if items_key not in tracker:
                tracker[items_key] = []

            tracker[items_key].append(item)

            # Update total count
            total_key = {
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

        if tracker_type == 'search':
            for category in tracker.get('categories', []):
                for search in category.get('searches', []):
                    if search.get('id') == item_id:
                        return search

        else:
            items_key = {
                'url': 'urls',
                'page': 'pages',
                'extraction': 'extractions'
            }[tracker_type]

            for item in tracker.get(items_key, []):
                if item.get('id') == item_id:
                    return item

        return None
