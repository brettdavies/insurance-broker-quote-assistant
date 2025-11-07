# Phase 5: Data Extraction

Save and commit extracted insurance data after LLM extraction by agents.

## Overview

Phase 5 processes the final step of the data extraction pipeline: **persisting structured insurance data** extracted by LLM agents into the knowledge pack's raw data directory.

This phase receives JSON-formatted extracted data points (discovered and structured by an LLM agent from page markdown) and:
1. Validates extraction format
2. Saves raw JSON files organized by carrier/category
3. Updates page-tracker.json with extraction metadata
4. Commits all changes to git with extraction summary

**Workflow Context:**
- **Input source**: Page markdown from Phase 2 (already extracted and formatted)
- **Input process**: LLM agent performs structured extraction (agent-driven, outside this phase)
- **Output**: Categorized raw data files in `raw/carriers/{category}/` directories
- **Coordination**: Updates page-tracker.json; automatic git commits

## Scripts

### `save-extraction.py` - Save Extracted Data

Accepts page ID and extracted data, saves to raw.json, updates tracker, commits to git.

**Location**: `/phase5-data-extraction/save-extraction.py`

**Purpose**:
- Receive extracted data from LLM agent
- Save as `data_{page_id}.raw.json`
- Update page-tracker.json with extraction metadata
- Commit changes with extraction summary

#### Usage

**Via stdin (recommended for large data):**
```bash
cd knowledge-pack-scraper

# Example with extracted data pipe
echo '[{"insurer": "GEICO", "discount": "Good Student", "rate": "10%"}]' | \
  uv run phase5-data-extraction/save-extraction.py --page-id page_abc123
```

**Via --data argument (for small data):**
```bash
uv run phase5-data-extraction/save-extraction.py \
  --page-id page_abc123 \
  --data '[{"insurer": "State Farm", "coverage": "Comprehensive"}]'
```

**Integration example from LLM agent:**
```bash
# Agent extracts data from page markdown, pipes to save-extraction
EXTRACTED_JSON=$(python extract-from-markdown.py --page page_xyz)
echo "$EXTRACTED_JSON" | uv run phase5-data-extraction/save-extraction.py --page-id $PAGE_ID
```

#### Arguments

- **`--page-id` (required)**
  Unique page identifier from page-tracker.json (format: `page_xxxxx`)

- **`--data` (optional)**
  JSON string containing extracted data (omit to read from stdin)

#### Input Format

Extracted data must be **valid JSON** in one of these formats:

**Array of objects (recommended):**
```json
[
  {
    "insurer": "GEICO",
    "discount_name": "Good Student",
    "discount_rate": "10%",
    "eligibility": "Students with 3.0+ GPA"
  },
  {
    "insurer": "State Farm",
    "discount_name": "Multi-Policy",
    "discount_rate": "15%"
  }
]
```

**Single object (auto-converted to array):**
```json
{
  "insurer": "Progressive",
  "coverage_type": "Comprehensive",
  "premium_base": "$800/year"
}
```

**Empty array (valid - marks page as completed with 0 extractions):**
```json
[]
```

#### Output Format

Returns JSON with explicit next_steps for agent coordination:

**Success case (with data):**
```json
{
  "success": true,
  "message": "Successfully saved 3 data points",
  "next_steps": "Extraction saved successfully!\n\nDetails:\n  - Data points extracted: 3\n  - Saved to: data_page_abc123.raw.json\n  - Page marked as completed\n\nChanges committed to git.\n\nChaining to next work item...",
  "data_points_extracted": 3,
  "raw_file": "/path/to/raw/carriers/uncategorized/data_page_abc123.raw.json"
}
```

**Success case (no data extracted):**
```json
{
  "success": true,
  "message": "No data points extracted from page_abc123",
  "next_steps": "Extraction completed but no data points found.\nThis is normal for pages without relevant insurance information.\n\nContinue with next work item:\nRun: uv run scripts/select-work.py"
}
```

**Error case:**
```json
{
  "success": false,
  "message": "Invalid JSON data: Expecting value: line 1 column 1",
  "next_steps": "Ensure extracted data is valid JSON"
}
```

#### Page-Tracker Updates

When save-extraction.py completes, it updates the corresponding page entry in `trackers/page-tracker.json`:

```json
{
  "id": "page_abc123",
  "status": "completed",
  "dataPointsExtracted": 3,
  "rawDataFile": "raw/carriers/uncategorized/data_page_abc123.raw.json",
  "extractedAt": "2025-11-07T15:32:45.123456"
}
```

Key fields updated:
- **`status`**: Changed from "pending" → "completed" (or "extracting" → "completed")
- **`dataPointsExtracted`**: Count of extracted data points
- **`rawDataFile`**: Relative path to saved raw.json (null if no data extracted)
- **`extractedAt`**: ISO timestamp of extraction completion

## File Organization

### Output Directory Structure

Extracted data files are organized by carrier/category:

```
raw/
├── carriers/
│   ├── geico/
│   │   ├── data_page_xxx.raw.json
│   │   └── data_page_yyy.raw.json
│   ├── state-farm/
│   │   └── data_page_zzz.raw.json
│   ├── progressive/
│   │   └── data_page_aaa.raw.json
│   └── uncategorized/          # Default category (Phase 5 starting point)
│       ├── data_page_bbb.raw.json
│       └── data_page_ccc.raw.json
├── pages/                      # Sharded by 2-char prefix
│   ├── a0/
│   │   ├── page_a0abc123.html
│   │   └── page_a0abc123.md
│   ├── tk/
│   │   ├── page_tkxyz789.html
│   │   └── page_tkxyz789.md
│   └── ... (898 subdirectories)
└── websearches/                # Sharded by 1-char prefix
    ├── a/
    │   └── websearch_a1234.json
    └── ... (26 subdirectories)
```

**Note on Categorization:**
- Phase 5 saves all extractions to `carriers/uncategorized/` by default
- Future phases will implement categorization logic to move data to carrier-specific directories based on metadata
- TODO comment in save-extraction.py indicates where categorization logic will be added

### Raw JSON File Naming

Files are named by page ID to maintain traceability:
```
data_{page_id}.raw.json
```

Example: `data_page_z51deyu2g9hvrcqgddh3mxoi.raw.json`

## Integration Guide

### For LLM Extraction Agents

The typical agent workflow is:

1. **Get work item:**
   ```bash
   uv run scripts/select-work.py
   # Output includes page ID and next steps
   ```

2. **Claim page (if needed):**
   ```bash
   uv run scripts/claim-page.py --id page_abc123
   # Returns page markdown content and metadata
   ```

3. **Perform LLM extraction:**
   ```python
   # Agent calls Claude API or other LLM
   # Extracts structured data from page markdown
   # Produces JSON array of extracted records
   extracted_data = llm_client.extract_insurance_data(page_markdown)
   ```

4. **Save extraction results:**
   ```bash
   # Pipe extracted JSON to save-extraction
   echo "$extracted_data" | uv run phase5-data-extraction/save-extraction.py --page-id page_abc123
   ```

5. **Continue workflow:**
   - Script output includes next_steps
   - Auto-chains to select-work.py to find next item

### Data Schema Recommendations

While Phase 5 accepts flexible JSON, coordinate with LLM extraction agents on a consistent schema:

**Suggested base schema:**
```json
{
  "insurer": "string",           // Insurance company name
  "product": "string",            // Product type (auto, home, life, etc.)
  "discount": "string",           // Discount/rate name
  "value": "string",              // Discount amount or rate value
  "eligibility": "string",        // Eligibility requirements (optional)
  "source_page_id": "string",     // Page ID (for audit trail)
  "extracted_at": "string"        // ISO timestamp (optional)
}
```

**Example:**
```json
[
  {
    "insurer": "GEICO",
    "product": "auto",
    "discount": "Multi-Policy",
    "value": "15% off",
    "eligibility": "Home + Auto bundle",
    "source_page_id": "page_abc123",
    "extracted_at": "2025-11-07T15:32:45Z"
  }
]
```

## Tracker Integration

### Page-Tracker Workflow

Phase 5 coordinates with `trackers/page-tracker.json`:

**Before extraction:**
```json
{
  "id": "page_abc123",
  "status": "pending",           // Pending extraction
  "dataPointsExtracted": 0,
  "rawDataFile": null,
  "extractedAt": null
}
```

**After successful extraction:**
```json
{
  "id": "page_abc123",
  "status": "completed",         // Marked complete
  "dataPointsExtracted": 3,
  "rawDataFile": "raw/carriers/uncategorized/data_page_abc123.raw.json",
  "extractedAt": "2025-11-07T15:32:45.123456"
}
```

### Tracker Counts

The tracker metadata shows phase progress:
```json
{
  "statusCounts": {
    "pending": 2500,            // Pages awaiting extraction
    "extracting": 15,           // Currently being extracted
    "completed": 400,           // Extraction saved
    "failed": 5                 // Extraction attempts that failed
  }
}
```

## Git Coordination

### Automatic Commits

save-extraction.py automatically commits changes:

```bash
# Called internally by save-extraction.py
uv run scripts/git-commit.py \
  --type extract \
  --id page_abc123 \
  --message "3 data points"
```

**Commit format:**
```
chore(kb/extract): page_abc123 - 3 data points

- Saved to: raw/carriers/uncategorized/data_page_abc123.raw.json
- Updated page-tracker.json
- Phase 5 data extraction complete
```

### Commit Failure Recovery

If git commit fails (e.g., merge conflict):

1. Extraction is **already saved** to raw.json
2. Page-tracker is **already updated**
3. Script outputs explicit recovery instructions:

```json
{
  "success": false,
  "message": "Git commit failed: merge conflict",
  "next_steps": "Git commit failed after saving extraction. Automatic recovery:\n\nThe extraction was saved to raw.json but commit failed.\nThis is likely a temporary git issue.\n\nAUTOMATIC RECOVERY:\n1. Try committing manually: git add -A && git commit -m 'save extraction' && git push\n2. If that succeeds, continue: uv run scripts/select-work.py\n3. If it fails, check git status and resolve any issues"
}
```

**To recover:**
```bash
# Try manual commit
cd knowledge-pack-scraper
git add -A
git commit -m "save extraction"
git push

# Continue workflow
uv run scripts/select-work.py
```

## Troubleshooting

### "No data provided (stdin empty and --data not specified)"

**Cause**: Neither stdin nor --data argument contained data

**Solutions**:
1. **Via stdin**: `echo '[{...}]' | uv run phase5-data-extraction/save-extraction.py --page-id page_abc123`
2. **Via argument**: Add `--data '[{...}]'` to command
3. **From file**: `cat extracted_data.json | uv run phase5-data-extraction/save-extraction.py --page-id page_abc123`

### "Extracted data must be a list or dict"

**Cause**: JSON is not an array or object (e.g., string, number, null)

**Solution**: Wrap data in an array or object:
```bash
# Wrong: plain string
echo '"GEICO discount"' | uv run ...

# Correct: object
echo '{"insurer": "GEICO"}' | uv run ...

# Correct: array
echo '[{"insurer": "GEICO"}]' | uv run ...
```

### "Invalid JSON data"

**Cause**: Malformed JSON (missing quotes, unclosed brackets, etc.)

**Solution**: Validate JSON before piping:
```bash
# Check JSON syntax
python -m json.tool <<< '[{"insurer": "GEICO"}]'

# If valid, pipe to script
cat validated_data.json | uv run phase5-data-extraction/save-extraction.py --page-id page_abc123
```

### "Page not found in tracker"

**Cause**: Page ID doesn't exist in page-tracker.json

**Solution**:
1. Verify page ID: `grep "page_abc123" trackers/page-tracker.json`
2. If not found, use correct page ID from select-work.py output
3. Check if page is in correct tracker (should be in page-tracker.json, not url-tracker.json)

### Raw data file not created

**Cause**: One of several issues:
- Directory permissions
- Disk space
- Corrupted tracker file

**Debug steps**:
1. Check directory exists: `ls -la raw/carriers/uncategorized/`
2. Check disk space: `df -h`
3. Verify tracker syntax: `python -m json.tool trackers/page-tracker.json`
4. Check git status: `git status` (ensure no uncommitted conflicts)

### Git commit fails repeatedly

**Cause**: Persistent merge conflicts or authentication issues

**Recovery**:
```bash
# Check git status
git status

# Pull latest changes
git pull --rebase

# Resolve any conflicts manually
# Then retry save-extraction.py
```

## Related Documentation

- **Phase 2 (Page Fetching)**: Provides page HTML/markdown for extraction
- **Phase 4 (Page Filtering)**: Identifies pages ready for extraction
- **Tracker Integration**: `trackers/page-tracker.json` coordinates extraction status
- **Git Coordination**: Automatic commits via `scripts/git-commit.py`

## Next Steps in Data Pipeline

After Phase 5 data extraction:

1. **Phase 6 (Data Categorization)**: Organize raw data by carrier/product
2. **Phase 7 (Data Validation)**: Verify extracted data quality
3. **Phase 8 (Knowledge Pack Assembly)**: Build final structured knowledge pack

---

**Last Updated**: 2025-11-07
**Maintainer**: Knowledge Pack Scraper Team
