# Knowledge Pack Scraper - Test Suite

This directory contains test scripts for validating the Phase 2 knowledge pack scraper functionality.

## Test Scripts

### test_url_deduplication.py

**Purpose**: Validates URL deduplication logic in `save-urls.py`

**Location**: `scripts/test_url_deduplication.py`

**What it tests**:
- URL hash-based deduplication
- Multi-search provenance tracking via `search_ids` array
- URL normalization (protocol, case, trailing slash)
- Idempotent operations (no duplicate search_ids)
- Mixed new and existing URL handling

**How to run**:
```bash
cd knowledge-pack-scraper
uv run scripts/test_url_deduplication.py
```

**Test environment**:
- Creates isolated test directory: `knowledge-pack-scraper/test_run/`
- Stages test trackers with fake search and URL data
- Uses `KNOWLEDGE_PACK_TEST_DIR` environment variable to redirect TrackerManager
- Cleans up test directory on success, preserves on failure for debugging

**Exit codes**:
- `0`: All tests passed
- `1`: One or more tests failed (test directory preserved for inspection)

## Test Scenarios

### Scenario 1: Basic URL Registration

**Setup**:
- 1 claimed search (search_A)
- Empty url-tracker
- 3 new URLs to register

**Expected outcome**:
- 3 URL entries created
- Each URL has unique ID and hash
- All URLs have `search_ids: ["search_A"]`
- Search marked as "completed"

**Validates**:
- URL ID generation
- Hash calculation
- Initial search_ids array creation
- Status updates

---

### Scenario 2: Duplicate URL Detection

**Setup**:
- search_A already completed with 1 URL registered
- search_B claims same URL
- url-tracker has existing entry: `https://geico.com/discounts`

**Expected outcome**:
- No new URL entry created
- Existing URL entry updated: `search_ids: ["search_A", "search_B"]`
- search_B marked as "completed"
- 0 new URLs, 1 existing URL in output

**Validates**:
- Hash-based URL matching
- search_ids array append logic
- Duplicate prevention
- Correct new vs existing counts

---

### Scenario 3: Mixed New and Existing URLs

**Setup**:
- search_A completed with 2 URLs registered
- search_C discovers 3 URLs (1 existing, 2 new)

**Expected outcome**:
- 2 new URL entries created
- 1 existing URL updated with search_C appended
- Total URLs in tracker: 4
- Output: 2 new, 1 existing

**Validates**:
- Combined new/existing handling in single operation
- Correct counting logic
- Multiple URL processing

---

### Scenario 4: Idempotent Operation

**Setup**:
- search_D claims same URL twice
- Run `save-urls.py` twice with same search_id and URL

**Expected outcome**:
- First run: URL registered with `search_ids: ["search_D"]`
- Second run: No duplicate search_D in `search_ids` array
- Final state: `search_ids: ["search_D"]` (NOT `["search_D", "search_D"]`)

**Validates**:
- Duplicate search_id prevention
- Idempotent operations
- Safe to re-run if git push fails

---

### Scenario 5: URL Normalization

**Setup**:
- search_E discovers 3 URL variations:
  - `http://geico.com`
  - `https://geico.com/`
  - `https://GEICO.com`

**Expected outcome**:
- All 3 URLs normalize to same hash: `ca98c401636cff9d`
- Only 1 URL entry created
- First URL format preserved in entry
- Subsequent URLs detected as existing

**Validates**:
- Protocol removal (http/https)
- Case insensitivity (GEICO → geico)
- Trailing slash removal
- Hash consistency across variations

**Normalization rules**:
```python
def normalize_url(url: str) -> str:
    normalized = url.lower().rstrip('/')
    if normalized.startswith('http://'):
        normalized = normalized[7:]
    elif normalized.startswith('https://'):
        normalized = normalized[8:]
    return normalized
```

---

## Validation Functions

### validate_url_tracker()

**Purpose**: Validates url-tracker.json state after save-urls.py execution

**Checks**:
- Total URL count matches expected
- Each URL has correct search_ids array
- URL hashes match expected values

**Usage**:
```python
validate_url_tracker(
    expected_url_count=3,
    expected_search_ids_map={
        "566943cebf713422": ["search_A", "search_B"],  # geico.com/discounts
        "7189e06b58f11b50": ["search_A"]               # statefarm.com/insurance
    }
)
```

### validate_search_status()

**Purpose**: Validates search entry status in search-tracker.json

**Checks**:
- Search status matches expected value
- Appropriate metadata fields set (completedAt, urlsDiscoveredCount, etc.)

**Usage**:
```python
validate_search_status("search_A", expected_status="completed")
```

---

## Test Fixtures

Test scenarios use inline fixture generation via helper functions:

- `setup_test_environment()`: Creates test_run/ directory with empty trackers
- `add_test_search()`: Adds fake search to search-tracker
- `add_test_url()`: Adds fake URL to url-tracker
- `calculate_url_hash()`: Generates expected hashes for validation

---

## Troubleshooting

### Test failures

If a test fails:
1. Check `knowledge-pack-scraper/test_run/` directory (preserved on failure)
2. Inspect tracker JSON files to see actual vs expected state
3. Review save-urls.py output in test failure message

### Clean up after failed test

```bash
rm -rf knowledge-pack-scraper/test_run/
```

### Re-run specific scenario

Edit `test_url_deduplication.py` and comment out other scenarios in `main()`:

```python
def main():
    # Only run scenario 2
    # scenario_1_basic_registration()
    passed, failed = scenario_2_duplicate_url()
    # scenario_3_mixed()
    # ...
```

---

## Integration with CI/CD

To add this test to automated CI:

```yaml
# .github/workflows/test-scraper.yml
- name: Run URL deduplication tests
  run: |
    cd knowledge-pack-scraper
    uv run scripts/test_url_deduplication.py
```

---

## Related Documentation

- [Phase 2 Agent Instructions](../../docs/knowledge-pack/phase-2-agent-instructions.md)
- [URL Tracker Schema](../../docs/knowledge-pack/sot-schemas.md#url-tracker-schema)
- [Main README](../README.md)
