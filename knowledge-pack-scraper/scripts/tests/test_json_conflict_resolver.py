#!/usr/bin/env python3
"""
Unit tests for json_conflict_resolver.py

Tests conflict detection, parsing, merging, and resolution logic.
"""

import json
import sys
from pathlib import Path

# Add scripts directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from json_conflict_resolver import (
    parse_conflict_markers,
    detect_array_key,
    merge_by_id,
    recalculate_counts,
    is_pure_array_append,
    resolve_tracker_conflict,
    is_tracker_file
)


def test_parse_conflict_markers():
    """Test parsing conflict markers from file content."""
    print("\nTest: parse_conflict_markers")

    content = """<<<<<<< HEAD
{"items": [{"id": 1}, {"id": 2}]}
=======
{"items": [{"id": 1}, {"id": 3}]}
>>>>>>> abc123 (add item 3)
"""

    head, theirs = parse_conflict_markers(content)

    expected_head = '{"items": [{"id": 1}, {"id": 2}]}'
    expected_theirs = '{"items": [{"id": 1}, {"id": 3}]}'

    assert head == expected_head, f"Expected: {expected_head}, Got: {head}"
    assert theirs == expected_theirs, f"Expected: {expected_theirs}, Got: {theirs}"

    print("  ✓ Conflict markers parsed correctly")


def test_parse_conflict_markers_multiline():
    """Test parsing multi-line JSON conflict."""
    print("\nTest: parse_conflict_markers (multiline)")

    content = """<<<<<<< HEAD
{
  "meta": {"version": "1.0"},
  "searches": [
    {"id": "search_A", "status": "pending"}
  ]
}
=======
{
  "meta": {"version": "1.0"},
  "searches": [
    {"id": "search_B", "status": "pending"}
  ]
}
>>>>>>> def456 (add search B)
"""

    head, theirs = parse_conflict_markers(content)

    head_data = json.loads(head)
    theirs_data = json.loads(theirs)

    assert head_data["searches"][0]["id"] == "search_A"
    assert theirs_data["searches"][0]["id"] == "search_B"

    print("  ✓ Multi-line conflict markers parsed correctly")


def test_detect_array_key():
    """Test detecting array key from tracker data."""
    print("\nTest: detect_array_key")

    # Test search tracker
    search_data = {"meta": {}, "searches": []}
    key = detect_array_key(search_data, "search-tracker.json")
    assert key == "searches", f"Expected 'searches', got '{key}'"

    # Test URL tracker
    url_data = {"meta": {}, "urls": []}
    key = detect_array_key(url_data, "url-tracker.json")
    assert key == "urls", f"Expected 'urls', got '{key}'"

    # Test page tracker
    page_data = {"meta": {}, "pages": []}
    key = detect_array_key(page_data, "page-tracker.json")
    assert key == "pages", f"Expected 'pages', got '{key}'"

    print("  ✓ Array keys detected correctly")


def test_merge_by_id_different_ids():
    """Test merging arrays with different IDs."""
    print("\nTest: merge_by_id (different IDs)")

    arr1 = [{"id": "search_A", "query": "test1"}]
    arr2 = [{"id": "search_B", "query": "test2"}]

    merged = merge_by_id(arr1, arr2)

    assert len(merged) == 2, f"Expected 2 items, got {len(merged)}"
    assert merged[0]["id"] == "search_A"
    assert merged[1]["id"] == "search_B"

    print("  ✓ Different IDs merged correctly")


def test_merge_by_id_duplicate_ids():
    """Test merging arrays with duplicate IDs (keep first)."""
    print("\nTest: merge_by_id (duplicate IDs)")

    arr1 = [{"id": "search_A", "query": "test1", "status": "claimed"}]
    arr2 = [{"id": "search_A", "query": "test2", "status": "completed"}]

    merged = merge_by_id(arr1, arr2)

    assert len(merged) == 1, f"Expected 1 item (deduplicated), got {len(merged)}"
    assert merged[0]["id"] == "search_A"
    assert merged[0]["status"] == "claimed", "Should keep arr1 version"

    print("  ✓ Duplicate IDs deduplicated (kept first)")


def test_merge_by_id_preserves_order():
    """Test that merge preserves chronological order (arr1 + arr2)."""
    print("\nTest: merge_by_id (preserves order)")

    arr1 = [{"id": "url_1"}, {"id": "url_2"}]
    arr2 = [{"id": "url_3"}, {"id": "url_4"}]

    merged = merge_by_id(arr1, arr2)

    assert len(merged) == 4
    assert [item["id"] for item in merged] == ["url_1", "url_2", "url_3", "url_4"]

    print("  ✓ Order preserved (arr1 first, then arr2)")


def test_recalculate_counts():
    """Test recalculating total and status counts."""
    print("\nTest: recalculate_counts")

    merged_array = [
        {"id": "search_1", "status": "pending"},
        {"id": "search_2", "status": "pending"},
        {"id": "search_3", "status": "claimed"},
        {"id": "search_4", "status": "completed"}
    ]

    total, status_counts = recalculate_counts(merged_array, "totalSearches")

    assert total == 4, f"Expected total=4, got {total}"
    assert status_counts["pending"] == 2
    assert status_counts["claimed"] == 1
    assert status_counts["completed"] == 1

    print("  ✓ Counts recalculated correctly")


def test_is_pure_array_append_true():
    """Test detecting pure array append (safe to resolve)."""
    print("\nTest: is_pure_array_append (true)")

    head = {
        "meta": {"version": "1.0", "totalSearches": 1},
        "statusCounts": {"pending": 1},
        "searches": [{"id": "search_A"}]
    }

    theirs = {
        "meta": {"version": "1.0", "totalSearches": 1},
        "statusCounts": {"pending": 1},
        "searches": [{"id": "search_B"}]
    }

    result = is_pure_array_append(head, theirs, "searches")

    assert result is True, "Should detect pure array append"

    print("  ✓ Pure array append detected")


def test_is_pure_array_append_false():
    """Test detecting non-pure append (unsafe to resolve)."""
    print("\nTest: is_pure_array_append (false)")

    head = {
        "meta": {"version": "1.0"},
        "otherField": "value1",
        "searches": [{"id": "search_A"}]
    }

    theirs = {
        "meta": {"version": "1.0"},
        "otherField": "value2",  # Different!
        "searches": [{"id": "search_B"}]
    }

    result = is_pure_array_append(head, theirs, "searches")

    assert result is False, "Should detect non-pure conflict"

    print("  ✓ Non-pure conflict detected")


def test_is_tracker_file():
    """Test identifying whitelisted tracker files."""
    print("\nTest: is_tracker_file")

    assert is_tracker_file(Path("search-tracker.json")) is True
    assert is_tracker_file(Path("url-tracker.json")) is True
    assert is_tracker_file(Path("page-tracker.json")) is True
    assert is_tracker_file(Path("extraction-tracker.json")) is True
    assert is_tracker_file(Path("other-file.json")) is False
    assert is_tracker_file(Path("README.md")) is False

    print("  ✓ Tracker files identified correctly")


def test_resolve_tracker_conflict_integration():
    """Integration test: resolve a complete tracker conflict."""
    print("\nTest: resolve_tracker_conflict (integration)")

    # Create a temporary file with conflict markers
    import tempfile

    conflict_content = """<<<<<<< HEAD
{
  "meta": {
    "version": "1.0",
    "totalUrls": 1,
    "lastUpdated": "2025-11-06T10:00:00"
  },
  "statusCounts": {
    "pending": 1
  },
  "urls": [
    {
      "id": "url_abc123",
      "url": "https://geico.com/discounts",
      "status": "pending"
    }
  ]
}
=======
{
  "meta": {
    "version": "1.0",
    "totalUrls": 1,
    "lastUpdated": "2025-11-06T10:00:00"
  },
  "statusCounts": {
    "pending": 1
  },
  "urls": [
    {
      "id": "url_def456",
      "url": "https://statefarm.com/insurance",
      "status": "pending"
    }
  ]
}
>>>>>>> abc123 (add statefarm URL)
"""

    with tempfile.NamedTemporaryFile(mode='w', suffix='-url-tracker.json', delete=False) as f:
        f.write(conflict_content)
        temp_path = Path(f.name)

    try:
        # Rename to url-tracker.json for proper detection
        tracker_path = temp_path.parent / "url-tracker.json"
        temp_path.rename(tracker_path)

        resolved = resolve_tracker_conflict(tracker_path)

        # Verify merged data
        assert len(resolved["urls"]) == 2, f"Expected 2 URLs, got {len(resolved['urls'])}"
        assert resolved["meta"]["totalUrls"] == 2
        assert resolved["statusCounts"]["pending"] == 2

        url_ids = {url["id"] for url in resolved["urls"]}
        assert "url_abc123" in url_ids
        assert "url_def456" in url_ids

        print("  ✓ Complete conflict resolved successfully")

    finally:
        # Clean up
        tracker_path.unlink(missing_ok=True)


def main():
    """Run all tests."""
    print("="*70)
    print("  JSON Conflict Resolver Test Suite")
    print("="*70)

    tests = [
        test_parse_conflict_markers,
        test_parse_conflict_markers_multiline,
        test_detect_array_key,
        test_merge_by_id_different_ids,
        test_merge_by_id_duplicate_ids,
        test_merge_by_id_preserves_order,
        test_recalculate_counts,
        test_is_pure_array_append_true,
        test_is_pure_array_append_false,
        test_is_tracker_file,
        test_resolve_tracker_conflict_integration
    ]

    passed = 0
    failed = 0

    for test in tests:
        try:
            test()
            passed += 1
        except Exception as e:
            print(f"  ✗ FAILED: {e}")
            failed += 1
            import traceback
            traceback.print_exc()

    print("\n" + "="*70)
    print(f"  Test Summary")
    print("="*70)
    print(f"Total tests: {len(tests)}")
    print(f"✓ Passed: {passed}")
    print(f"✗ Failed: {failed}")
    print("="*70)

    if failed > 0:
        sys.exit(1)
    else:
        print("\n✓ All tests passed!")
        sys.exit(0)


if __name__ == '__main__':
    main()
