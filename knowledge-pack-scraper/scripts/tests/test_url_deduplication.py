#!/usr/bin/env python3
"""
Test URL deduplication logic in save-urls.py

Creates isolated test environment, stages test trackers,
runs scenarios, validates results.

Usage:
    cd knowledge-pack-scraper
    uv run scripts/test_url_deduplication.py

    # Or run specific scenario
    uv run scripts/test_url_deduplication.py --scenario basic
"""

import argparse
import hashlib
import json
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path

# Test configuration
TEST_DIR = Path(__file__).parent.parent.parent / "test_run"
SCRIPTS_DIR = Path(__file__).parent.parent


def print_header(title):
    """Print test section header"""
    print(f"\n{'='*70}")
    print(f"  {title}")
    print(f"{'='*70}\n")


def print_result(scenario, passed, details=""):
    """Print test result"""
    status = "✓ PASSED" if passed else "✗ FAILED"
    color = "\033[92m" if passed else "\033[91m"
    reset = "\033[0m"
    print(f"{color}{status}{reset} - {scenario}")
    if details:
        print(f"  {details}")


def calculate_url_hash(url: str) -> str:
    """Calculate URL hash (same logic as save-urls.py)"""
    normalized = url.lower().rstrip('/')
    if normalized.startswith('http://'):
        normalized = normalized[7:]
    elif normalized.startswith('https://'):
        normalized = normalized[8:]
    return hashlib.sha256(normalized.encode()).hexdigest()[:16]


def setup_test_environment():
    """Create test directory and initialize trackers"""
    # Clean existing test directory
    if TEST_DIR.exists():
        shutil.rmtree(TEST_DIR)

    TEST_DIR.mkdir(parents=True, exist_ok=True)

    # Create empty trackers
    search_tracker = {
        "meta": {
            "version": "1.0",
            "schemaVersion": "test-v1",
            "createdDate": datetime.now().strftime("%Y-%m-%d"),
            "lastUpdated": datetime.now().isoformat(),
            "totalSearches": 0,
            "description": "Test search tracker"
        },
        "statusCounts": {
            "pending": 0,
            "claimed": 0,
            "completed": 0,
            "failed": 0
        },
        "searches": []
    }

    url_tracker = {
        "meta": {
            "version": "1.0",
            "schemaVersion": "test-v1",
            "createdDate": datetime.now().strftime("%Y-%m-%d"),
            "lastUpdated": datetime.now().isoformat(),
            "totalUrls": 0,
            "description": "Test URL tracker"
        },
        "statusCounts": {
            "pending": 0,
            "claimed": 0,
            "completed": 0,
            "failed": 0
        },
        "urls": []
    }

    # Save trackers
    with open(TEST_DIR / "search-tracker.json", 'w') as f:
        json.dump(search_tracker, f, indent=2)

    with open(TEST_DIR / "url-tracker.json", 'w') as f:
        json.dump(url_tracker, f, indent=2)

    print(f"✓ Test environment created at: {TEST_DIR}")


def add_test_search(search_id, status="claimed", query="Test query"):
    """Add a test search to search-tracker"""
    tracker_path = TEST_DIR / "search-tracker.json"
    with open(tracker_path, 'r') as f:
        tracker = json.load(f)

    search_entry = {
        "id": search_id,
        "query": query,
        "category": "test",
        "priority": "medium",
        "status": status,
        "assignedTo": "agnt_test123" if status == "claimed" else None,
        "startedAt": datetime.now().isoformat() if status == "claimed" else None
    }

    tracker["searches"].append(search_entry)
    tracker["statusCounts"][status] = tracker["statusCounts"].get(status, 0) + 1
    tracker["meta"]["totalSearches"] += 1

    with open(tracker_path, 'w') as f:
        json.dump(tracker, f, indent=2)

    print(f"  Added test search: {search_id} (status={status})")


def add_test_url(url_id, url, search_ids):
    """Add a test URL to url-tracker"""
    tracker_path = TEST_DIR / "url-tracker.json"
    with open(tracker_path, 'r') as f:
        tracker = json.load(f)

    url_entry = {
        "id": url_id,
        "search_ids": search_ids if isinstance(search_ids, list) else [search_ids],
        "url": url,
        "urlHash": calculate_url_hash(url),
        "priority": "medium",
        "status": "pending",
        "assignedTo": None,
        "pageId": None,
        "htmlFile": None,
        "markdownFile": None,
        "fetchedAt": None,
        "fetchError": None,
        "retryCount": 0
    }

    tracker["urls"].append(url_entry)
    tracker["statusCounts"]["pending"] += 1
    tracker["meta"]["totalUrls"] += 1

    with open(tracker_path, 'w') as f:
        json.dump(tracker, f, indent=2)

    print(f"  Added test URL: {url} (search_ids={search_ids})")


def run_save_urls(search_id, urls, expect_success=True):
    """Run save-urls.py with test tracker directory"""
    # Temporarily modify tracker_manager.py to use test directory
    # For now, we'll use subprocess with modified PYTHONPATH

    cmd = [
        'uv', 'run', 'scripts/save-urls.py',
        '--search-id', search_id,
        '--urls'
    ] + urls

    # Set environment to use test trackers
    env = {
        **subprocess.os.environ.copy(),
        'KNOWLEDGE_PACK_TEST_DIR': str(TEST_DIR)
    }

    result = subprocess.run(
        cmd,
        cwd=SCRIPTS_DIR.parent,
        capture_output=True,
        text=True,
        env=env
    )

    if expect_success and result.returncode != 0:
        print(f"  ✗ save-urls.py failed:")
        print(f"    stdout: {result.stdout}")
        print(f"    stderr: {result.stderr}")
        return None

    try:
        return json.loads(result.stdout)
    except json.JSONDecodeError:
        print(f"  ✗ Failed to parse JSON output:")
        print(f"    stdout: {result.stdout}")
        return None


def validate_url_tracker(expected_url_count=None, expected_search_ids_map=None):
    """Validate URL tracker state"""
    tracker_path = TEST_DIR / "url-tracker.json"
    with open(tracker_path, 'r') as f:
        tracker = json.load(f)

    errors = []

    # Check URL count
    if expected_url_count is not None:
        actual_count = len(tracker["urls"])
        if actual_count != expected_url_count:
            errors.append(f"Expected {expected_url_count} URLs, got {actual_count}")

    # Check search_ids for specific URLs
    if expected_search_ids_map:
        for url_hash, expected_search_ids in expected_search_ids_map.items():
            found = False
            for url_entry in tracker["urls"]:
                if url_entry["urlHash"] == url_hash:
                    found = True
                    actual_search_ids = url_entry.get("search_ids", [])
                    if sorted(actual_search_ids) != sorted(expected_search_ids):
                        errors.append(
                            f"URL {url_hash}: expected search_ids={expected_search_ids}, "
                            f"got {actual_search_ids}"
                        )
                    break
            if not found:
                errors.append(f"URL with hash {url_hash} not found")

    # Check for duplicate url_hash values
    url_hashes = [url["urlHash"] for url in tracker["urls"]]
    if len(url_hashes) != len(set(url_hashes)):
        duplicates = [h for h in url_hashes if url_hashes.count(h) > 1]
        errors.append(f"Duplicate url_hash values found: {set(duplicates)}")

    return len(errors) == 0, errors


def validate_search_status(search_id, expected_status="completed"):
    """Validate search status"""
    tracker_path = TEST_DIR / "search-tracker.json"
    with open(tracker_path, 'r') as f:
        tracker = json.load(f)

    for search in tracker["searches"]:
        if search["id"] == search_id:
            actual_status = search.get("status")
            if actual_status != expected_status:
                return False, f"Expected status={expected_status}, got {actual_status}"
            return True, None

    return False, f"Search {search_id} not found"


# ============================================================================
# Test Scenarios
# ============================================================================

def scenario_1_basic_registration():
    """Scenario 1: Basic URL registration (first search, new URLs)"""
    print_header("Scenario 1: Basic URL Registration")

    # Setup
    setup_test_environment()
    add_test_search("search_A", status="claimed", query="Test search A")

    # Execute
    urls = [
        "https://geico.com/discounts",
        "https://statefarm.com/insurance",
        "https://progressive.com/auto"
    ]

    print(f"  Running save-urls.py with {len(urls)} URLs...")
    result = run_save_urls("search_A", urls)

    if result is None:
        print_result("Scenario 1", False, "save-urls.py execution failed")
        return False

    # Validate
    passed, errors = validate_url_tracker(expected_url_count=3)
    if not passed:
        print_result("Scenario 1", False, "\n    ".join(errors))
        return False

    passed, error = validate_search_status("search_A", "completed")
    if not passed:
        print_result("Scenario 1", False, error)
        return False

    print_result("Scenario 1", True, "3 URLs registered, search completed")
    return True


def scenario_2_duplicate_url():
    """Scenario 2: Duplicate URL (second search discovers same URL)"""
    print_header("Scenario 2: Duplicate URL Detection")

    # Setup
    setup_test_environment()
    add_test_search("search_A", status="completed", query="Test search A")
    add_test_search("search_B", status="claimed", query="Test search B")
    add_test_url("url_existing", "https://geico.com/discounts", ["search_A"])

    # Execute
    print(f"  Running save-urls.py with existing URL...")
    result = run_save_urls("search_B", ["https://geico.com/discounts"])

    if result is None:
        print_result("Scenario 2", False, "save-urls.py execution failed")
        return False

    # Validate - should still only be 1 URL
    url_hash = calculate_url_hash("https://geico.com/discounts")
    passed, errors = validate_url_tracker(
        expected_url_count=1,
        expected_search_ids_map={
            url_hash: ["search_A", "search_B"]
        }
    )

    if not passed:
        print_result("Scenario 2", False, "\n    ".join(errors))
        return False

    passed, error = validate_search_status("search_B", "completed")
    if not passed:
        print_result("Scenario 2", False, error)
        return False

    print_result("Scenario 2", True, "Existing URL updated with new search_id")
    return True


def scenario_3_mixed():
    """Scenario 3: Mixed (some new, some existing URLs)"""
    print_header("Scenario 3: Mixed New and Existing URLs")

    # Setup
    setup_test_environment()
    add_test_search("search_A", status="completed", query="Test search A")
    add_test_search("search_C", status="claimed", query="Test search C")
    add_test_url("url_existing1", "https://geico.com/discounts", ["search_A"])
    add_test_url("url_existing2", "https://statefarm.com/insurance", ["search_A"])

    # Execute - 1 existing + 2 new
    urls = [
        "https://geico.com/discounts",  # existing
        "https://progressive.com/auto",  # new
        "https://allstate.com/home"      # new
    ]

    print(f"  Running save-urls.py with 1 existing + 2 new URLs...")
    result = run_save_urls("search_C", urls)

    if result is None:
        print_result("Scenario 3", False, "save-urls.py execution failed")
        return False

    # Validate - should be 4 URLs total (2 existing + 2 new)
    url_hash_existing = calculate_url_hash("https://geico.com/discounts")
    passed, errors = validate_url_tracker(
        expected_url_count=4,
        expected_search_ids_map={
            url_hash_existing: ["search_A", "search_C"]
        }
    )

    if not passed:
        print_result("Scenario 3", False, "\n    ".join(errors))
        return False

    passed, error = validate_search_status("search_C", "completed")
    if not passed:
        print_result("Scenario 3", False, error)
        return False

    print_result("Scenario 3", True, "2 new URLs registered, 1 existing updated")
    return True


def scenario_4_idempotent():
    """Scenario 4: Idempotent (same search adds same URL twice)"""
    print_header("Scenario 4: Idempotent Operation")

    # Setup
    setup_test_environment()
    add_test_search("search_D", status="claimed", query="Test search D")

    # Execute - run twice with same URL
    url = "https://geico.com/discounts"

    print(f"  First run...")
    result1 = run_save_urls("search_D", [url])
    if result1 is None:
        print_result("Scenario 4", False, "First save-urls.py execution failed")
        return False

    # Need to re-claim search_D for second run
    tracker_path = TEST_DIR / "search-tracker.json"
    with open(tracker_path, 'r') as f:
        tracker = json.load(f)
    for search in tracker["searches"]:
        if search["id"] == "search_D":
            search["status"] = "claimed"
            break
    with open(tracker_path, 'w') as f:
        json.dump(tracker, f, indent=2)

    print(f"  Second run (idempotent check)...")
    result2 = run_save_urls("search_D", [url])
    if result2 is None:
        print_result("Scenario 4", False, "Second save-urls.py execution failed")
        return False

    # Validate - should still be only 1 URL, search_ids not duplicated
    url_hash = calculate_url_hash(url)
    passed, errors = validate_url_tracker(
        expected_url_count=1,
        expected_search_ids_map={
            url_hash: ["search_D"]  # Should NOT be ["search_D", "search_D"]
        }
    )

    if not passed:
        print_result("Scenario 4", False, "\n    ".join(errors))
        return False

    print_result("Scenario 4", True, "Idempotent operation - no duplicate search_ids")
    return True


def scenario_5_normalization():
    """Scenario 5: URL normalization (different protocols/casing/trailing slash)"""
    print_header("Scenario 5: URL Normalization")

    # Setup
    setup_test_environment()
    add_test_search("search_E", status="claimed", query="Test search E")

    # Execute - all these should normalize to the same URL
    urls = [
        "http://geico.com",
        "https://geico.com/",
        "https://GEICO.com"
    ]

    print(f"  Running save-urls.py with {len(urls)} variations of same URL...")
    result = run_save_urls("search_E", urls)

    if result is None:
        print_result("Scenario 5", False, "save-urls.py execution failed")
        return False

    # Validate - should only be 1 URL (all normalize to same hash)
    passed, errors = validate_url_tracker(expected_url_count=1)

    if not passed:
        print_result("Scenario 5", False, "\n    ".join(errors))
        return False

    print_result("Scenario 5", True, "All URL variations normalized to single entry")
    return True


# ============================================================================
# Main Test Runner
# ============================================================================

def main():
    parser = argparse.ArgumentParser(
        description="Test URL deduplication logic"
    )
    parser.add_argument(
        '--scenario',
        choices=['basic', 'duplicate', 'mixed', 'idempotent', 'normalization', 'all'],
        default='all',
        help='Which scenario to run (default: all)'
    )
    parser.add_argument(
        '--preserve',
        action='store_true',
        help='Preserve test environment on success (always preserved on failure)'
    )

    args = parser.parse_args()

    print_header("URL Deduplication Test Suite")
    print(f"Test directory: {TEST_DIR}")

    # Define scenarios
    scenarios = {
        'basic': scenario_1_basic_registration,
        'duplicate': scenario_2_duplicate_url,
        'mixed': scenario_3_mixed,
        'idempotent': scenario_4_idempotent,
        'normalization': scenario_5_normalization
    }

    # Run scenarios
    if args.scenario == 'all':
        to_run = scenarios
    else:
        to_run = {args.scenario: scenarios[args.scenario]}

    results = {}
    for name, scenario_fn in to_run.items():
        try:
            results[name] = scenario_fn()
        except Exception as e:
            print_result(f"Scenario {name}", False, f"Exception: {e}")
            results[name] = False

    # Summary
    print_header("Test Summary")
    total = len(results)
    passed = sum(1 for r in results.values() if r)
    failed = total - passed

    print(f"Total scenarios: {total}")
    print(f"✓ Passed: {passed}")
    if failed > 0:
        print(f"✗ Failed: {failed}")

    # Cleanup
    if passed == total and not args.preserve:
        print(f"\n✓ All tests passed! Cleaning up test environment...")
        shutil.rmtree(TEST_DIR)
    else:
        print(f"\n⚠️ Test trackers preserved at: {TEST_DIR}")
        print(f"   Inspect files to debug failures")

    sys.exit(0 if passed == total else 1)


if __name__ == '__main__':
    main()
