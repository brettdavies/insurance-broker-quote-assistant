#!/usr/bin/env python3
"""
Auto-resolve JSON array append conflicts in tracker files.

Handles concurrent agent appends by merging arrays and deduplicating by ID.
Only resolves pure array append conflicts in whitelisted tracker files.
"""

import json
import re
import subprocess
from pathlib import Path
from typing import Optional, Tuple, List, Dict, Any


# Whitelisted tracker files that can be auto-resolved
TRACKER_FILES = {
    'search-tracker.json',
    'url-tracker.json',
    'page-tracker.json',
    'extraction-tracker.json'
}

# Mapping of tracker files to their array keys
ARRAY_KEYS = {
    'search-tracker.json': 'searches',
    'url-tracker.json': 'urls',
    'page-tracker.json': 'pages',
    'extraction-tracker.json': 'extractions'
}


def detect_conflicted_files(repo_root: Path) -> List[Path]:
    """
    Find files with merge conflicts (UU status).

    Args:
        repo_root: Repository root directory

    Returns:
        List of file paths with conflicts
    """
    result = subprocess.run(
        ['git', 'status', '--porcelain'],
        cwd=repo_root,
        capture_output=True,
        text=True
    )

    conflicted = []
    for line in result.stdout.splitlines():
        # UU means both modified (merge conflict)
        if line.startswith('UU '):
            file_path = repo_root / line[3:].strip()
            conflicted.append(file_path)

    return conflicted


def is_tracker_file(file_path: Path) -> bool:
    """
    Check if file is a whitelisted tracker file.

    Args:
        file_path: Path to check

    Returns:
        True if file is in TRACKER_FILES whitelist
    """
    return file_path.name in TRACKER_FILES


def parse_conflict_markers(content: str) -> Tuple[str, str]:
    """
    Extract HEAD and THEIRS sections from conflict markers.

    Args:
        content: File content with conflict markers

    Returns:
        (head_section, theirs_section) as strings

    Raises:
        ValueError: If conflict markers not found or malformed
    """
    # Pattern: <<<<<<< HEAD\n{content}\n=======\n{content}\n>>>>>>> {hash}
    pattern = r'<<<<<<< HEAD\n(.*?)\n=======\n(.*?)\n>>>>>>> [^\n]+'

    match = re.search(pattern, content, re.DOTALL)
    if not match:
        raise ValueError("No conflict markers found in content")

    head_section = match.group(1)
    theirs_section = match.group(2)

    return head_section, theirs_section


def detect_array_key(tracker_data: Dict[str, Any], file_name: str) -> str:
    """
    Detect the array key in tracker data.

    Args:
        tracker_data: Parsed tracker JSON
        file_name: Name of tracker file

    Returns:
        Array key ('searches', 'urls', 'pages', 'extractions')

    Raises:
        ValueError: If array key not found
    """
    if file_name in ARRAY_KEYS:
        expected_key = ARRAY_KEYS[file_name]
        if expected_key in tracker_data:
            return expected_key

    raise ValueError(f"Could not detect array key in {file_name}")


def merge_by_id(arr1: List[Dict], arr2: List[Dict], id_field: str = 'id') -> List[Dict]:
    """
    Merge two arrays, deduplicating by ID field.

    Keeps all unique items from both arrays.
    If same ID appears in both (rare), keeps arr1 version.
    Preserves chronological order (arr1 items first, then arr2 items).

    Args:
        arr1: First array (HEAD version)
        arr2: Second array (THEIRS version)
        id_field: Field name to use for deduplication

    Returns:
        Merged array with unique items
    """
    seen_ids = set()
    merged = []

    for item in arr1 + arr2:
        item_id = item.get(id_field)

        # Skip items without ID (shouldn't happen)
        if not item_id:
            continue

        # Skip duplicates (keep first occurrence)
        if item_id in seen_ids:
            continue

        merged.append(item)
        seen_ids.add(item_id)

    return merged


def recalculate_counts(merged_array: List[Dict], meta_key: str) -> Tuple[int, Dict[str, int]]:
    """
    Recalculate total count and status counts after merge.

    Args:
        merged_array: Merged array of items
        meta_key: Meta field to update (e.g., 'totalSearches')

    Returns:
        (total_count, status_counts_dict)
    """
    total = len(merged_array)

    status_counts: Dict[str, int] = {}
    for item in merged_array:
        status = item.get('status', 'unknown')
        status_counts[status] = status_counts.get(status, 0) + 1

    return total, status_counts


def is_pure_array_append(head_data: Dict, theirs_data: Dict, array_key: str) -> bool:
    """
    Check if conflict is a pure array append (safe to auto-resolve).

    Compares everything except the array to ensure only array changed.

    Args:
        head_data: HEAD version of tracker
        theirs_data: THEIRS version of tracker
        array_key: Key of the array being appended to

    Returns:
        True if only array differs, False otherwise
    """
    # Create copies without the array
    head_copy = {k: v for k, v in head_data.items() if k != array_key}
    theirs_copy = {k: v for k, v in theirs_data.items() if k != array_key}

    # Meta and statusCounts will differ due to array changes, so exclude them
    head_copy.pop('meta', None)
    head_copy.pop('statusCounts', None)
    theirs_copy.pop('meta', None)
    theirs_copy.pop('statusCounts', None)

    # Everything else should be identical
    return head_copy == theirs_copy


def resolve_tracker_conflict(file_path: Path) -> Dict[str, Any]:
    """
    Parse conflict markers and merge JSON arrays by ID.

    Args:
        file_path: Path to conflicted tracker file

    Returns:
        Resolved tracker data

    Raises:
        ValueError: If conflict cannot be auto-resolved
        json.JSONDecodeError: If JSON is malformed
    """
    content = file_path.read_text()

    # Extract conflict sections
    try:
        head_json, theirs_json = parse_conflict_markers(content)
    except ValueError as e:
        raise ValueError(f"Cannot parse conflict markers: {e}")

    # Parse JSON
    try:
        head_data = json.loads(head_json)
        theirs_data = json.loads(theirs_json)
    except json.JSONDecodeError as e:
        raise ValueError(f"Malformed JSON in conflict: {e}")

    # Detect array key
    array_key = detect_array_key(head_data, file_path.name)

    # Safety check: ensure this is a pure array append
    if not is_pure_array_append(head_data, theirs_data, array_key):
        raise ValueError("Conflict is not a pure array append - unsafe to auto-resolve")

    # Merge arrays by ID
    merged_array = merge_by_id(
        head_data.get(array_key, []),
        theirs_data.get(array_key, []),
        id_field='id'
    )

    # Build resolved JSON (use HEAD as base, replace array)
    resolved = head_data.copy()
    resolved[array_key] = merged_array

    # Recalculate metadata
    meta_field_map = {
        'searches': 'totalSearches',
        'urls': 'totalUrls',
        'pages': 'totalPages',
        'extractions': 'totalExtractions'
    }
    meta_field = meta_field_map.get(array_key, 'totalItems')

    total, status_counts = recalculate_counts(merged_array, meta_field)

    resolved['meta'][meta_field] = total
    resolved['statusCounts'] = status_counts

    # Update lastUpdated timestamp
    from datetime import datetime
    resolved['meta']['lastUpdated'] = datetime.now().isoformat()

    return resolved


def resolve_json_conflicts(repo_root: Path) -> Tuple[bool, str]:
    """
    Auto-resolve JSON array append conflicts in tracker files.

    Main entry point for conflict resolution.

    Args:
        repo_root: Repository root directory

    Returns:
        (success, error_message)
    """
    # 1. Detect conflicts
    conflicted_files = detect_conflicted_files(repo_root)

    if not conflicted_files:
        return False, "No conflicted files found"

    # 2. Filter to tracker files only
    tracker_conflicts = [f for f in conflicted_files if is_tracker_file(f)]

    if not tracker_conflicts:
        return False, "Conflicts exist but not in auto-resolvable tracker files"

    # 3. Resolve each tracker file
    for file_path in tracker_conflicts:
        try:
            resolved = resolve_tracker_conflict(file_path)

            # Write resolved JSON
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(resolved, f, indent=2)
                f.write('\n')  # Add trailing newline

            # Mark as resolved
            subprocess.run(
                ['git', 'add', str(file_path.relative_to(repo_root))],
                cwd=repo_root,
                check=True
            )

        except Exception as e:
            return False, f"Failed to resolve {file_path.name}: {e}"

    # 4. Continue rebase
    result = subprocess.run(
        ['git', 'rebase', '--continue'],
        cwd=repo_root,
        capture_output=True,
        text=True
    )

    if result.returncode != 0:
        return False, f"Failed to continue rebase after resolution: {result.stderr}"

    return True, ""


if __name__ == '__main__':
    # Quick test/debug
    import sys

    if len(sys.argv) > 1:
        repo_path = Path(sys.argv[1])
    else:
        repo_path = Path(__file__).parent.parent.parent

    success, error = resolve_json_conflicts(repo_path)

    if success:
        print("✓ Conflicts resolved successfully")
        sys.exit(0)
    else:
        print(f"✗ Failed to resolve conflicts: {error}")
        sys.exit(1)
