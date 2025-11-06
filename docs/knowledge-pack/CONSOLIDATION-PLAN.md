# Knowledge Pack Documentation Consolidation Plan

**Date Created**: 2025-11-05
**Date Completed**: 2025-11-05
**Status**: ✅ ALL PHASES COMPLETE (Phases 0-6)
**Actual Time**: ~3 hours (Phases 0-4: ~2 hours, Phase 5: ~30 minutes, Phase 6: ~30 minutes)
**Estimated Total Time**: 7.5-11 hours

---

## Executive Summary

This plan addresses critical duplication, inconsistency, and Single Source of Truth (SoT) violations across 8 knowledge pack documentation files. The work is divided into 6 phases (0-5), executed sequentially with discovery-based tasks that identify changes at execution time.

**Key Metrics from Analysis:**
- Total Files: 8
- Duplicated Content: ~800 lines (9.5% of total)
- Critical Duplications: 5 major patterns
- Inconsistencies: 4 major types
- Missing Cross-References: 5+ critical links

---

## CLI Tools Reference

This plan uses standard Unix/Linux CLI tools for discovery, execution, and validation. All tasks include explicit commands.

### Core Tools

| Tool | Purpose | Common Flags |
|------|---------|--------------|
| `rg`   | Fast search for patterns in files (ripgrep, a modern alternative to grep) | `-r` (recursive, default), `-n` (line numbers), `-i` (case-insensitive), `-c` (count), `-e` (regex pattern), `-l` (files with matches), `-v` (invert match), `-A N` (N lines after), `-B N` (N lines before), `-C N` (N lines context) |
| `grep` | Search for patterns in files | `-r` (recursive), `-n` (line numbers), `-i` (case-insensitive), `-c` (count), `-E` (extended regex), `-l` (files with matches), `-v` (invert match), `-A N` (N lines after), `-B N` (N lines before), `-C N` (N lines context) |
| `sed` | Stream editor for text transformations | `-i ''` (in-place edit, macOS), `-i` (in-place edit, Linux), `-e` (multiple expressions), `-n` (suppress output) |
| `find` | Locate files and directories | `-name` (filename pattern), `-type f` (files only), `-type d` (directories only), `-exec` (execute command) |
| `test` | File/directory existence and type checks | `-f` (file exists), `-d` (directory exists), `-e` (exists), `-s` (non-empty) |
| `wc` | Count lines, words, characters | `-l` (lines), `-w` (words), `-c` (bytes) |
| `git` | Version control operations | `mv` (rename), `status` (show changes), `diff` (show differences) |
| `head` | Output first part of files | `-n N` (first N lines) |
| `tail` | Output last part of files | `-n N` (last N lines) |
| `diff` | Compare files | `-u` (unified format), `-q` (brief) |
| `awk` | Pattern scanning and processing | `-F` (field separator), `NR` (record number) |

### Working Directory

All commands assume you're in the project root:
```bash
cd /Users/brett/dev/insurance-broker-quote-assistant
```

For tasks in docs/knowledge-pack/, either:
- Use full paths: `rg -n "pattern" docs/knowledge-pack/`
- Or change directory: `cd docs/knowledge-pack && rg -n "pattern" .`

**Note**: `rg` (ripgrep) is recursive by default, so no `-r` flag needed.

---

## Phase 0: SoT File Reorganization

### Objective
Rename Single Source of Truth documents with `sot-` prefix to establish clear information architecture and proper reference direction (implementation docs reference SoT docs, not vice versa).

### SoT Documents to Rename
1. `id-conventions.md` → `sot-id-conventions.md`
2. `knowledge-pack-schemas.md` → `sot-schemas.md`
3. `knowledge-pack-source-hierarchy.md` → `sot-source-hierarchy.md`
4. `knowledge-pack-search-queries.md` → `sot-search-queries.md`

### Tasks (Execute Sequentially)

#### Task 0.1: Rename SoT Files ✅ COMPLETED
**Objective**: Rename 4 SoT files using git mv to preserve history

**Discovery Steps**:
```bash
# List all markdown files in docs/knowledge-pack/
find docs/knowledge-pack -name "*.md" -type f | sort

# Check if target files exist
test -f docs/knowledge-pack/id-conventions.md && echo "✓ id-conventions.md exists"
test -f docs/knowledge-pack/knowledge-pack-schemas.md && echo "✓ knowledge-pack-schemas.md exists"
test -f docs/knowledge-pack/knowledge-pack-source-hierarchy.md && echo "✓ knowledge-pack-source-hierarchy.md exists"
test -f docs/knowledge-pack/knowledge-pack-search-queries.md && echo "✓ knowledge-pack-search-queries.md exists"

# Check if any are already renamed
test -f docs/knowledge-pack/sot-id-conventions.md && echo "⚠ sot-id-conventions.md already exists"
```

**Execution**:
```bash
# Rename all 4 SoT files (preserves git history)
git mv docs/knowledge-pack/id-conventions.md docs/knowledge-pack/sot-id-conventions.md
git mv docs/knowledge-pack/knowledge-pack-schemas.md docs/knowledge-pack/sot-schemas.md
git mv docs/knowledge-pack/knowledge-pack-source-hierarchy.md docs/knowledge-pack/sot-source-hierarchy.md
git mv docs/knowledge-pack/knowledge-pack-search-queries.md docs/knowledge-pack/sot-search-queries.md
```

**Validation**:
```bash
# Check git status shows renames (R) not deletes (D) + adds (A)
git status --short docs/knowledge-pack/

# Verify all 4 new files exist
test -f docs/knowledge-pack/sot-id-conventions.md && echo "✓ sot-id-conventions.md"
test -f docs/knowledge-pack/sot-schemas.md && echo "✓ sot-schemas.md"
test -f docs/knowledge-pack/sot-source-hierarchy.md && echo "✓ sot-source-hierarchy.md"
test -f docs/knowledge-pack/sot-search-queries.md && echo "✓ sot-search-queries.md"

# Verify old files don't exist
! test -f docs/knowledge-pack/id-conventions.md && echo "✓ id-conventions.md removed"
! test -f docs/knowledge-pack/knowledge-pack-schemas.md && echo "✓ knowledge-pack-schemas.md removed"

# Count total markdown files (should still be 8)
find docs/knowledge-pack -name "*.md" -type f | wc -l
```

---

#### Task 0.2: Update Links in README.md ✅ COMPLETED
**Objective**: Update all references to renamed SoT files in README.md

**Discovery Steps**:
```bash
# Search for all old filename references with context
rg -n "id-conventions\.md" docs/knowledge-pack/README.md
rg -n "knowledge-pack-schemas\.md" docs/knowledge-pack/README.md
rg -n "knowledge-pack-source-hierarchy\.md" docs/knowledge-pack/README.md
rg -n "knowledge-pack-search-queries\.md" docs/knowledge-pack/README.md

# Count total occurrences of each
echo "id-conventions.md: $(rg -c 'id-conventions\.md' docs/knowledge-pack/README.md)"
echo "knowledge-pack-schemas.md: $(rg -c 'knowledge-pack-schemas\.md' docs/knowledge-pack/README.md)"
echo "knowledge-pack-source-hierarchy.md: $(rg -c 'knowledge-pack-source-hierarchy\.md' docs/knowledge-pack/README.md)"
echo "knowledge-pack-search-queries.md: $(rg -c 'knowledge-pack-search-queries\.md' docs/knowledge-pack/README.md)"
```

**Execution**:
```bash
# Replace all old filenames with new sot- prefixed names (macOS version with -i '')
sed -i '' \
  -e 's/id-conventions\.md/sot-id-conventions.md/g' \
  -e 's/knowledge-pack-schemas\.md/sot-schemas.md/g' \
  -e 's/knowledge-pack-source-hierarchy\.md/sot-source-hierarchy.md/g' \
  -e 's/knowledge-pack-search-queries\.md/sot-search-queries.md/g' \
  docs/knowledge-pack/README.md

# For Linux, use: sed -i (without the '')
```

**Validation**:
```bash
# Verify no old filenames remain (should return 0 for each)
rg -c "id-conventions\.md" docs/knowledge-pack/README.md
rg -c "knowledge-pack-schemas\.md" docs/knowledge-pack/README.md
rg -c "knowledge-pack-source-hierarchy\.md" docs/knowledge-pack/README.md
rg -c "knowledge-pack-search-queries\.md" docs/knowledge-pack/README.md

# Verify new filenames exist
rg -n "sot-id-conventions\.md" docs/knowledge-pack/README.md
rg -n "sot-schemas\.md" docs/knowledge-pack/README.md
rg -n "sot-source-hierarchy\.md" docs/knowledge-pack/README.md
rg -n "sot-search-queries\.md" docs/knowledge-pack/README.md

# Show git diff to review changes
git diff docs/knowledge-pack/README.md
```

---

#### Task 0.3: Update Links in knowledge-pack-examples.md ✅ COMPLETED
**Objective**: Update all references to renamed SoT files

**Discovery Steps**:
```bash
# Search and count old filename references
rg -n "id-conventions\.md\|knowledge-pack-schemas\.md\|knowledge-pack-source-hierarchy\.md\|knowledge-pack-search-queries\.md" docs/knowledge-pack/knowledge-pack-examples.md

# Count occurrences
echo "Total old refs: $(rg -c 'id-conventions\.md\|knowledge-pack-schemas\.md\|knowledge-pack-source-hierarchy\.md\|knowledge-pack-search-queries\.md' docs/knowledge-pack/knowledge-pack-examples.md)"
```

**Execution**:
```bash
sed -i '' \
  -e 's/id-conventions\.md/sot-id-conventions.md/g' \
  -e 's/knowledge-pack-schemas\.md/sot-schemas.md/g' \
  -e 's/knowledge-pack-source-hierarchy\.md/sot-source-hierarchy.md/g' \
  -e 's/knowledge-pack-search-queries\.md/sot-search-queries.md/g' \
  docs/knowledge-pack/knowledge-pack-examples.md
```

**Validation**:
```bash
# Should return 0
rg -c "id-conventions\.md\|knowledge-pack-schemas\.md" docs/knowledge-pack/knowledge-pack-examples.md

git diff docs/knowledge-pack/knowledge-pack-examples.md
```

---

#### Task 0.4: Update Links in knowledge-pack-methodology.md ✅ COMPLETED
**Objective**: Update all references to renamed SoT files

**Discovery Steps**:
```bash
rg -n "id-conventions\.md\|knowledge-pack-schemas\.md\|knowledge-pack-source-hierarchy\.md\|knowledge-pack-search-queries\.md" docs/knowledge-pack/knowledge-pack-methodology.md

echo "Total old refs: $(rg -c 'id-conventions\.md\|knowledge-pack-schemas\.md\|knowledge-pack-source-hierarchy\.md\|knowledge-pack-search-queries\.md' docs/knowledge-pack/knowledge-pack-methodology.md)"
```

**Execution**:
```bash
sed -i '' \
  -e 's/id-conventions\.md/sot-id-conventions.md/g' \
  -e 's/knowledge-pack-schemas\.md/sot-schemas.md/g' \
  -e 's/knowledge-pack-source-hierarchy\.md/sot-source-hierarchy.md/g' \
  -e 's/knowledge-pack-search-queries\.md/sot-search-queries.md/g' \
  docs/knowledge-pack/knowledge-pack-methodology.md
```

**Validation**:
```bash
rg -c "id-conventions\.md\|knowledge-pack-schemas\.md" docs/knowledge-pack/knowledge-pack-methodology.md  # Should return 0

git diff docs/knowledge-pack/knowledge-pack-methodology.md
```

---

#### Task 0.5: Update Links in phase-2-agent-instructions.md ✅ COMPLETED
**Objective**: Update all references to renamed SoT files

**Discovery Steps**:
```bash
rg -n "id-conventions\.md\|knowledge-pack-schemas\.md\|knowledge-pack-source-hierarchy\.md\|knowledge-pack-search-queries\.md" docs/knowledge-pack/phase-2-agent-instructions.md

echo "Total old refs: $(rg -c 'id-conventions\.md\|knowledge-pack-schemas\.md\|knowledge-pack-source-hierarchy\.md\|knowledge-pack-search-queries\.md' docs/knowledge-pack/phase-2-agent-instructions.md)"
```

**Execution**:
```bash
sed -i '' \
  -e 's/id-conventions\.md/sot-id-conventions.md/g' \
  -e 's/knowledge-pack-schemas\.md/sot-schemas.md/g' \
  -e 's/knowledge-pack-source-hierarchy\.md/sot-source-hierarchy.md/g' \
  -e 's/knowledge-pack-search-queries\.md/sot-search-queries.md/g' \
  docs/knowledge-pack/phase-2-agent-instructions.md
```

**Validation**:
```bash
rg -c "id-conventions\.md\|knowledge-pack-schemas\.md" docs/knowledge-pack/phase-2-agent-instructions.md  # Should return 0

git diff docs/knowledge-pack/phase-2-agent-instructions.md
```

---

#### Task 0.6: Update Internal Cross-References in SoT Files ✅ COMPLETED
**Objective**: Update references between SoT files themselves

**Discovery Steps**:
```bash
# Search all SoT files for old filenames (they may reference each other)
rg -n "id-conventions\.md\|knowledge-pack-schemas\.md\|knowledge-pack-source-hierarchy\.md\|knowledge-pack-search-queries\.md" \
  docs/knowledge-pack/sot-*.md

# Count total matches across all SoT files
rg -c "id-conventions\.md\|knowledge-pack-schemas\.md" docs/knowledge-pack/sot-*.md
```

**Execution**:
```bash
# Update all SoT files in one pass
for file in docs/knowledge-pack/sot-*.md; do
  sed -i '' \
    -e 's/id-conventions\.md/sot-id-conventions.md/g' \
    -e 's/knowledge-pack-schemas\.md/sot-schemas.md/g' \
    -e 's/knowledge-pack-source-hierarchy\.md/sot-source-hierarchy.md/g' \
    -e 's/knowledge-pack-search-queries\.md/sot-search-queries.md/g' \
    "$file"
done
```

**Validation**:
```bash
# Verify no old filenames in any SoT file (should return no matches)
rg -n "id-conventions\.md\|knowledge-pack-schemas\.md" docs/knowledge-pack/sot-*.md

# Show all changes
git diff docs/knowledge-pack/sot-*.md
```

---

### Phase 0 Success Criteria
- ✅ All 4 files renamed with `sot-` prefix
- ✅ Git history preserved (git mv used)
- ✅ Zero references to old filenames across all docs
- ✅ All markdown links valid and functional

---

## Phase 1: Critical Fixes

### Objective
Fix critical inconsistencies that undermine the knowledge pack system integrity.

---

#### Task 1.1: Fix ID Format Inconsistencies ✅ COMPLETED
**Objective**: Replace all old ID formats with proper cuid2 format throughout documentation

**Status Note**: Replaced all 27 unique old ID patterns (e.g., "raw-001", "field-005") with proper cuid2 format (e.g., "raw_cm8r2s4b6g", "fld_cm0j4k6t8y"). Applied consistent mappings across 6 files, maintaining semantic relationships. Total: 163 ID replacements. All IDs now follow {prefix}_{10-char-cuid2} standard per sot-id-conventions.md.

**Discovery Steps**:
```bash
# Read sot-id-conventions.md to review current patterns
head -n 50 docs/knowledge-pack/sot-id-conventions.md

# Search for old ID patterns across all knowledge pack files
# Pattern 1: Quoted hyphenated IDs like "raw_cm8r2s4b6g", "fld_cm0j4k6t8y"
rg -n '"[a-z]\+-[0-9]\{3\}"' docs/knowledge-pack/*.md

# Pattern 2: All hyphenated ID patterns in JSON contexts
rg -n '"id":\s*"[a-z]\+-[0-9]\+"' docs/knowledge-pack/*.md
rg -n '"_id":\s*"[a-z]\+-[0-9]\+"' docs/knowledge-pack/*.md

# List all unique old ID patterns found
rg -o '"[a-z]\+-[0-9]\{3\}"' docs/knowledge-pack/*.md | sort | uniq

# Count total occurrences
echo "Total old IDs: $(rg -c '"[a-z]\+-[0-9]\{3\}"' docs/knowledge-pack/*.md | awk -F: '{sum+=$2} END {print sum}')"
```

**Execution Pattern**:
```bash
# NOTE: This task requires manual or scripted replacement because:
# 1. Each old ID should be replaced with a NEW unique cuid2
# 2. Cannot use simple sed because each instance needs unique replacement
# 3. Consider using a script to generate fresh cuid2 IDs

# Option 1: Manual replacement (recommended for accuracy)
# - For each file with old IDs, edit manually to replace with generated cuid2s
# - Use: npx @paralleldrive/cuid2 (or bun/node script)

# Option 2: Simple pattern replacement (if exact values don't matter)
# Example for knowledge-pack-examples.md:
sed -i '' 's/"raw_cm8r2s4b6g"/"raw_ckm9x7wnp"/g' docs/knowledge-pack/knowledge-pack-examples.md
sed -i '' 's/"fld_cm0j4k6t8y"/"fld_ckm9x8k2n"/g' docs/knowledge-pack/knowledge-pack-examples.md
# ... repeat for each unique old ID

# Option 3: Script to generate cuid2 and replace
# Create a temp Node/Bun script if needed for bulk generation
```

**Validation**:
```bash
# Verify no old hyphenated ID patterns remain
rg -n '"[a-z]\+-[0-9]\{3\}"' docs/knowledge-pack/*.md  # Should return no matches

# Verify new cuid2 format is used
rg -n '"[a-z]\+_[a-z0-9]\{24\}"' docs/knowledge-pack/*.md

# Check specific files expected to have changes
git diff docs/knowledge-pack/knowledge-pack-examples.md | rg -e '^\+.*"[a-z]+_'

# Count lines changed
git diff --stat docs/knowledge-pack/
```

**Note**: This task may require manual editing or a custom script to ensure each old ID is replaced with a unique cuid2 value.

---

#### Task 1.2: Remove Phase 2 Duplication from Methodology ✅ COMPLETED
**Objective**: Remove duplicated Phase 2 implementation details, replace with overview + link

**Status Note**: Phase 2 section reduced from 295 lines to 110 lines. Removed 184 lines (15.3% reduction). Replaced detailed implementation with concise overview linking to phase-2-agent-instructions.md.

**Discovery Steps**:
```bash
# Read phase-2-agent-instructions.md to understand SoT content
wc -l docs/knowledge-pack/phase-2-agent-instructions.md
head -n 100 docs/knowledge-pack/phase-2-agent-instructions.md

# Search knowledge-pack-methodology.md for duplicated Phase 2 content
rg -n "page file storage\|page_{cuid2}" docs/knowledge-pack/knowledge-pack-methodology.md
rg -n "agent workflow\|search workflow" docs/knowledge-pack/knowledge-pack-methodology.md
rg -n "search tracker\|search-tracker.json" docs/knowledge-pack/knowledge-pack-methodology.md
rg -n "git automation\|git commit" docs/knowledge-pack/knowledge-pack-methodology.md
rg -n "markdown conversion\|html2md" docs/knowledge-pack/knowledge-pack-methodology.md

# Get line count before changes
wc -l docs/knowledge-pack/knowledge-pack-methodology.md
```

**Execution Pattern**:
```bash
# NOTE: This task requires manual editing because:
# 1. Need to identify exact section boundaries for Phase 2
# 2. Complex multi-paragraph replacement
# 3. Maintain markdown structure integrity

# Manual steps:
# 1. Open docs/knowledge-pack/knowledge-pack-methodology.md
# 2. Locate Phase 2 section (search for "### Phase 2" or "## Phase 2")
# 3. Identify duplicated content (likely lines 195-382 based on analysis)
# 4. Replace with concise version linking to phase-2-agent-instructions.md
# 5. Keep only: Objective, Key Concepts bullet list, link, Deliverables

# After manual edit, verify changes:
git diff docs/knowledge-pack/knowledge-pack-methodology.md | head -n 50
```

**Validation**:
```bash
# Verify Phase 2 section is concise (should NOT have detailed implementation)
rg -A 20 "### Phase 2" docs/knowledge-pack/knowledge-pack-methodology.md

# Verify link to phase-2-agent-instructions.md exists
rg -n "phase-2-agent-instructions.md" docs/knowledge-pack/knowledge-pack-methodology.md

# Confirm these detailed terms are REMOVED from methodology.md
rg -n "memory refresh protocol" docs/knowledge-pack/knowledge-pack-methodology.md  # Should return 0 or minimal
rg -n "Step 1:\|Step 2:\|Step 3:" docs/knowledge-pack/knowledge-pack-methodology.md  # Phase 2 steps should be gone

# Check line count reduction
wc -l docs/knowledge-pack/knowledge-pack-methodology.md
# Compare to previous count (should be ~150-200 lines less)

git diff --stat docs/knowledge-pack/knowledge-pack-methodology.md
```

---

#### Task 1.3: Add SoT Declarations ✅ COMPLETED
**Objective**: Add prominent SoT notices to establish authoritative status

**Discovery Steps**:
```bash
# Read first 20 lines of each SoT file to check for existing declarations
head -n 20 docs/knowledge-pack/sot-id-conventions.md
head -n 20 docs/knowledge-pack/sot-schemas.md
head -n 20 docs/knowledge-pack/sot-source-hierarchy.md
head -n 20 docs/knowledge-pack/sot-search-queries.md

# Search for existing SoT declarations
rg -n "Single Source of Truth\|SoT" docs/knowledge-pack/sot-*.md
```

**Execution Pattern**:
```bash
# NOTE: This task requires manual editing to insert declarations after the title
# Sed can insert after pattern match, but manual review recommended for accuracy

# For each SoT file, add declaration after the main title (# heading)
# Example for sot-id-conventions.md:

# Option 1: Manual edit (recommended)
# - Open each file
# - After main title (# cuid2 ID Conventions or similar)
# - Add blank line + declaration

# Option 2: Sed insertion (after first heading)
# Example for sot-id-conventions.md:
sed -i '' '/^# /a\
\
> **📌 Single Source of Truth**: This document is the authoritative source for all cuid2 ID specifications and conventions used throughout the knowledge pack system.
' docs/knowledge-pack/sot-id-conventions.md

# Repeat for other files with appropriate declarations:
# - sot-schemas.md: "...JSON schema definitions and data structure specifications."
# - sot-source-hierarchy.md: "...source authority levels, confidence scoring, and conflict resolution strategies."
# - sot-search-queries.md: "...complete search query catalog used in data gathering."
```

**Validation**:
```bash
# Verify all SoT files have declarations
rg -n "📌 Single Source of Truth" docs/knowledge-pack/sot-*.md

# Check each file has declaration in first 20 lines
for file in docs/knowledge-pack/sot-*.md; do
  echo "Checking $file:"
  head -n 20 "$file" | rg -n "Single Source of Truth" || echo "  ⚠ No declaration found"
done

# Review changes
git diff docs/knowledge-pack/sot-*.md | rg -A 2 "Single Source of Truth"
```

---

#### Task 1.4: Add Critical Cross-References ✅ COMPLETED
**Objective**: Add missing cross-references to improve navigation

**Discovery Steps**:
```bash
# Check if cross-references already exist

# 1. Check methodology.md for link to phase-2-agent-instructions
rg -n "phase-2-agent-instructions.md" docs/knowledge-pack/knowledge-pack-methodology.md
rg -A 5 "### Phase 2" docs/knowledge-pack/knowledge-pack-methodology.md | rg -n "phase-2-agent"

# 2. Check phase-2-agent-instructions.md for link to sot-search-queries
rg -n "sot-search-queries.md" docs/knowledge-pack/phase-2-agent-instructions.md
rg -A 5 "Step 4\|Execute Search" docs/knowledge-pack/phase-2-agent-instructions.md | rg "sot-search"

# 3. Check knowledge-pack-examples.md for reference to sot-id-conventions
rg -n "sot-id-conventions.md" docs/knowledge-pack/knowledge-pack-examples.md
head -n 50 docs/knowledge-pack/knowledge-pack-examples.md | rg "sot-id-conventions"
```

**Execution Pattern**:
```bash
# NOTE: These additions require manual editing to insert at appropriate locations
# Each cross-reference should be added in context

# Example manual steps:
# 1. Open docs/knowledge-pack/knowledge-pack-methodology.md
#    - Find Phase 2 section
#    - Add link: "See [phase-2-agent-instructions.md](phase-2-agent-instructions.md) for complete implementation"
#
# 2. Open docs/knowledge-pack/phase-2-agent-instructions.md
#    - Find Step 4 (Execute Search) or search execution section
#    - Add: "Use queries from [sot-search-queries.md](sot-search-queries.md)"
#
# 3. Open docs/knowledge-pack/knowledge-pack-examples.md
#    - Find intro or "How to Use" section (near top)
#    - Add: "All IDs follow conventions in [sot-id-conventions.md](sot-id-conventions.md)"

# After manual edits, verify:
git diff docs/knowledge-pack/knowledge-pack-methodology.md
git diff docs/knowledge-pack/phase-2-agent-instructions.md
git diff docs/knowledge-pack/knowledge-pack-examples.md
```

**Validation**:
```bash
# Verify all 3 cross-references were added

# 1. Verify methodology → phase-2-agent link
rg -n "phase-2-agent-instructions\.md" docs/knowledge-pack/knowledge-pack-methodology.md
test $? -eq 0 && echo "✓ Methodology has phase-2 link" || echo "⚠ Missing link"

# 2. Verify phase-2 → sot-search-queries link
rg -n "sot-search-queries\.md" docs/knowledge-pack/phase-2-agent-instructions.md
test $? -eq 0 && echo "✓ Phase-2 has search-queries link" || echo "⚠ Missing link"

# 3. Verify examples → sot-id-conventions link
rg -n "sot-id-conventions\.md" docs/knowledge-pack/knowledge-pack-examples.md
test $? -eq 0 && echo "✓ Examples has id-conventions link" || echo "⚠ Missing link"

# Verify markdown link format is correct
rg '\[.*\.md\](.*\.md)' docs/knowledge-pack/knowledge-pack-methodology.md | rg phase-2
rg '\[.*\.md\](.*\.md)' docs/knowledge-pack/phase-2-agent-instructions.md | rg sot-search
rg '\[.*\.md\](.*\.md)' docs/knowledge-pack/knowledge-pack-examples.md | rg sot-id

# Show all changes
git diff docs/knowledge-pack/ | rg -e '^\+.*\[.*\.md\]'
```

---

### Phase 1 Success Criteria
- ✅ All IDs use cuid2 format (no old sequential IDs)
- ✅ Phase 2 duplication removed from methodology.md
- ✅ All 4 SoT files have authoritative declarations
- ✅ Critical cross-references added and functional

---

## Phase 2: Consolidation (Duplication Removal)

### Objective
Eliminate duplicated content across files by establishing clear SoT references.

---

#### Task 2.1: Reduce cuid2 Duplication ✅ COMPLETED
**Objective**: Remove cuid2 specification details from non-SoT files


**Status Note**: Successfully removed cuid2 specification details from non-SoT files. All installation instructions, prefix tables, and detailed examples now reference sot-id-conventions.md.
**Discovery Steps**:
```bash
# Search all non-SoT files for cuid2 content
rg -n "cuid2" docs/knowledge-pack/README.md docs/knowledge-pack/knowledge-pack-*.md docs/knowledge-pack/phase-2-*.md

# Search for specific duplication patterns
rg -n "@paralleldrive/cuid2" docs/knowledge-pack/*.md
rg -n "createId()" docs/knowledge-pack/*.md
rg -n "npm install.*cuid2\|bun add.*cuid2" docs/knowledge-pack/*.md

# Find ID prefix tables (look for table with Entity/Prefix columns)
rg -A 10 "| Entity.*Prefix |" docs/knowledge-pack/*.md

# Count instances in non-SoT files
echo "README.md: $(rg -c 'cuid2' docs/knowledge-pack/README.md)"
echo "methodology.md: $(rg -c 'cuid2' docs/knowledge-pack/knowledge-pack-methodology.md)"
echo "phase-2.md: $(rg -c 'cuid2' docs/knowledge-pack/phase-2-agent-instructions.md)"

# List all TypeScript code blocks with cuid2
rg -B 2 -A 10 '```typescript' docs/knowledge-pack/*.md | rg -A 10 "cuid2\|createId"
```

**Execution Pattern**:
```bash
# NOTE: This task requires manual editing due to context-sensitive decisions
# Must distinguish between:
#   - Legitimate usage examples (KEEP)
#   - Specification duplication (REMOVE → link to sot-id-conventions.md)

# Manual steps for each file:
# 1. Open file and locate cuid2 content
# 2. Determine if it's specification or example
# 3. If specification: replace with 1-2 sentence + link
# 4. If example: keep but verify it's minimal

# After manual edits:
git diff docs/knowledge-pack/README.md
git diff docs/knowledge-pack/knowledge-pack-methodology.md
git diff docs/knowledge-pack/phase-2-agent-instructions.md
```

**Validation**:
```bash
# Verify cuid2 specifications removed from non-SoT files

# Check for installation instructions (should be ONLY in sot-id-conventions.md)
rg -n "npm install.*cuid2\|bun add.*cuid2" docs/knowledge-pack/*.md

# Check for complete prefix tables (should be ONLY in sot-id-conventions.md)
rg -l "| Entity.*Prefix |" docs/knowledge-pack/*.md
# Should return only sot-id-conventions.md

# Verify links to sot-id-conventions.md exist
rg -n "sot-id-conventions\.md" docs/knowledge-pack/README.md
rg -n "sot-id-conventions\.md" docs/knowledge-pack/knowledge-pack-methodology.md
rg -n "sot-id-conventions\.md" docs/knowledge-pack/phase-2-agent-instructions.md

# Check line count reduction
git diff --stat docs/knowledge-pack/ | rg -e 'README|methodology|phase-2'
```

---

#### Task 2.2: Remove Confidence Scoring Duplication ✅ COMPLETED
**Objective**: Remove confidence scoring formula from sot-schemas.md


**Status Note**: Removed confidence scoring formula duplication from sot-schemas.md. Formula details now only in sot-source-hierarchy.md with appropriate cross-references.
**Discovery Steps**:
```bash
# Read sot-source-hierarchy.md confidence section
rg -A 30 "confidence\|Confidence Scoring" docs/knowledge-pack/sot-source-hierarchy.md | head -n 50

# Search sot-schemas.md for confidence content
rg -n "confidence" docs/knowledge-pack/sot-schemas.md
rg -A 20 "confidence.*scoring\|scoring.*formula" docs/knowledge-pack/sot-schemas.md

# Find authority level references in schemas.md
rg -n "authorityLevel\|authority level" docs/knowledge-pack/sot-schemas.md

# Identify the duplicated section (look for extended explanation beyond basic schema)
rg -B 5 -A 30 "confidence.*formula\|Formula\|Scoring" docs/knowledge-pack/sot-schemas.md
```

**Execution Pattern**:
```bash
# NOTE: Manual editing required to preserve TypeScript interface while removing formula details

# Manual steps:
# 1. Open docs/knowledge-pack/sot-schemas.md
# 2. Locate Source object interface
# 3. Keep confidence field definition with type
# 4. Remove detailed scoring formula/calculation sections
# 5. Add inline comment: "// See sot-source-hierarchy.md for scoring formula"

# After manual edit:
git diff docs/knowledge-pack/sot-schemas.md
```

**Validation**:
```bash
# Verify confidence field still in Source interface
rg -A 10 "interface Source" docs/knowledge-pack/sot-schemas.md | rg "confidence"

# Verify scoring formula NOT in sot-schemas.md
rg -i "formula\|calculation.*confidence" docs/knowledge-pack/sot-schemas.md | wc -l
# Should be 0 or minimal (just the comment/link)

# Verify link to sot-source-hierarchy.md exists
rg "sot-source-hierarchy\.md" docs/knowledge-pack/sot-schemas.md | rg -i "confidence\|scoring"

# Check line reduction
git diff --stat docs/knowledge-pack/sot-schemas.md
```

---

#### Task 2.3: Consolidate Source Object References ✅ COMPLETED
**Objective**: Establish sot-schemas.md as sole definition source for Source object


**Status Note**: Consolidated Source object interface definition in sot-schemas.md. Other files now reference the SoT rather than duplicating the interface.
**Discovery Steps**:
```bash
# Search for Source object interface definitions
rg -n "interface Source" docs/knowledge-pack/*.md

# Search for Source object examples in JSON
rg -n '"url":\s*"http' docs/knowledge-pack/*.md | head -n 20

# Find field metadata envelope structures
rg -n "Field.*metadata.*envelope\|metadata envelope" docs/knowledge-pack/*.md

# List all files with Source object content
rg -l "Source.*object\|source.*object" docs/knowledge-pack/*.md

# Show context around Source definitions
rg -B 3 -A 15 "interface Source" docs/knowledge-pack/*.md
```

**Execution Pattern**:
```bash
# NOTE: Manual editing required - must preserve examples while removing duplicate definitions

# Manual steps:
# 1. Verify sot-schemas.md has complete TypeScript Source interface (this is SoT)
# 2. For each other file with Source content:
#    - If it's an interface definition: REMOVE (link to sot-schemas.md instead)
#    - If it's an example: KEEP (but add reference link if missing)
# 3. Remove field-by-field explanations (keep only in sot-schemas.md)

# After manual edits:
git diff docs/knowledge-pack/
```

**Validation**:
```bash
# Verify only ONE complete interface definition (in sot-schemas.md)
rg -l "interface Source" docs/knowledge-pack/*.md
# Should return only sot-schemas.md

# Verify other files have reference links
for file in docs/knowledge-pack/knowledge-pack-*.md docs/knowledge-pack/phase-2-*.md; do
  if rg -q '"url":\|Source object' "$file" 2>/dev/null; then
    echo "Checking $file for sot-schemas.md reference:"
    rg -n "sot-schemas\.md" "$file" || echo "  ⚠ Missing reference"
  fi
done

# Check line reduction
git diff --stat docs/knowledge-pack/
```

---

### Phase 2 Success Criteria
- ✅ cuid2 details only in sot-id-conventions.md (non-SoT files have links only)
- ✅ Confidence scoring formula only in sot-source-hierarchy.md
- ✅ Source object definition only in sot-schemas.md
- ✅ ~180-220 total lines reduced

---

## Phase 3: Standardization

### Objective
Standardize terminology, formats, and specifications across all documentation.

---

#### Task 3.1: Standardize Date Formats ✅ COMPLETED
**Objective**: Establish and document consistent date/timestamp format standards

**Status Note**: Added comprehensive "Date and Timestamp Standards" section to sot-schemas.md (140 lines). Standardized all examples to ISO 8601 format with validation rules.

**Discovery Steps**:
```bash
# Search for all date/timestamp references
rg -n '\d\{4\}-\d\{2\}-\d\{2\}' docs/knowledge-pack/*.md | head -n 30
rg -n "ISO 8601" docs/knowledge-pack/*.md
rg -n "timestamp" docs/knowledge-pack/*.md | rg -i "format\|pattern"

# Find all audit field examples
rg -n "scrapedAt\|updatedAt\|createdAt" docs/knowledge-pack/*.md

# List different date format patterns found
rg -o '[0-9]{4}-[0-9]{2}-[0-9]{2}[T ][0-9:]+Z?' docs/knowledge-pack/*.md | sort | uniq
rg -o '[0-9]{4}-[0-9]{2}-[0-9]{2}' docs/knowledge-pack/*.md | sort | uniq | head -n 10

# Find date format specifications
rg -n "Format:.*date\|date.*format\|Pattern:.*YYYY" docs/knowledge-pack/*.md
```

**Execution Pattern**:
```bash
# NOTE: Manual editing required to add/update date standards section

# Manual steps:
# 1. Open docs/knowledge-pack/sot-schemas.md
# 2. Add "Date and Timestamp Standards" section (if not exists)
# 3. Document both formats:
#    - Timestamps: YYYY-MM-DDTHH:mm:ssZ
#    - Dates: YYYY-MM-DD
# 4. Review other files and update examples to match standards
# 5. Remove duplicate format specifications from other files

# After manual edits:
git diff docs/knowledge-pack/sot-schemas.md
git diff docs/knowledge-pack/
```

**Validation**:
```bash
# Verify date standard section exists in sot-schemas.md
rg -A 10 "Date.*Timestamp.*Standards\|Timestamp.*Standards" docs/knowledge-pack/sot-schemas.md

# Check for inconsistent timestamp formats
rg -n '[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}T[0-9]\{2\}:[0-9]\{2\}' docs/knowledge-pack/*.md | rg -v 'Z"'
# Should return minimal or no matches (all should have Z suffix)

# Verify no duplicate format specifications
rg -n "Format:.*ISO.*8601" docs/knowledge-pack/*.md | rg -v sot-schemas.md
# Should return 0 or minimal matches

git diff --stat docs/knowledge-pack/
```

---

#### Task 3.2: Clarify pageId/pageFile Requirements ✅ COMPLETED
**Objective**: Document when pageId/pageFile are required vs. optional

**Status Note**: Added clarifying comments to Source interface in sot-schemas.md. Documents that pageId/pageFile are required for Phase 2 raw data, optional after cleanup.

**Discovery Steps**:
```bash
# Check Source object definition in sot-schemas.md
rg -A 10 "interface Source" docs/knowledge-pack/sot-schemas.md

# Search for pageId/pageFile usage and documentation
rg -n "pageId\|pageFile" docs/knowledge-pack/*.md

# Check phase-2-agent-instructions for usage context
rg -A 5 -B 5 "pageId\|pageFile" docs/knowledge-pack/phase-2-agent-instructions.md | head -n 30

# Look for conflicting requirement statements
rg -n "required\|optional\|mandatory" docs/knowledge-pack/*.md | rg -i "pageid\|pagefile"
```

**Execution Pattern**:
```bash
# NOTE: Manual editing required to add clarifying comments

# Manual steps:
# 1. Open docs/knowledge-pack/sot-schemas.md
# 2. Locate Source interface
# 3. Add inline comments to pageId and pageFile fields:
#    pageId?: string;     // Required for Phase 2 raw data, optional after cleanup
#    pageFile?: string;   // Required for Phase 2 raw data, optional after cleanup
# 4. Add "Field Lifecycle Notes" section below interface if helpful
# 5. Verify no conflicting statements in other files

# After manual edit:
git diff docs/knowledge-pack/sot-schemas.md
```

**Validation**:
```bash
# Verify Source object has clarifying comments
rg -A 10 "interface Source" docs/knowledge-pack/sot-schemas.md | rg "pageId\|pageFile"

# Check for lifecycle documentation
rg -A 5 "Field Lifecycle\|Lifecycle Notes" docs/knowledge-pack/sot-schemas.md

# Verify no conflicting statements
rg -n "pageId.*required\|pageFile.*required" docs/knowledge-pack/*.md

git diff docs/knowledge-pack/sot-schemas.md
```

---

#### Task 3.3: Standardize Confidence Terminology ✅ COMPLETED
**Objective**: Clarify confidence field stores classification, with optional numeric score

**Status Note**: Updated both sot-schemas.md and sot-source-hierarchy.md to clarify that confidence field stores classification (high/medium/low) with optional confidenceScore field for numeric values.

**Discovery Steps**:
```bash
# Search all files for confidence references
rg -n "confidence" docs/knowledge-pack/*.md | head -n 30

# Check for numeric vs string confusion
rg -n "confidence.*[0-9]\|confidence.*score" docs/knowledge-pack/*.md
rg -n "confidence.*high\|confidence.*medium\|confidence.*low" docs/knowledge-pack/*.md

# List all confidence field usages
rg -n '"confidence":\|confidence:' docs/knowledge-pack/*.md
```

**Execution Pattern**:
```bash
# NOTE: Manual editing required for both sot-source-hierarchy.md and sot-schemas.md

# Manual steps:
# 1. Open docs/knowledge-pack/sot-source-hierarchy.md
#    - Locate confidence scoring section
#    - Add clarification: "The confidence field stores classification ('high'|'medium'|'low').
#                         Numeric score (1.0-5.0) can optionally be stored in confidenceScore field."
#
# 2. Open docs/knowledge-pack/sot-schemas.md
#    - Update Source interface to include both fields:
#      confidence: 'high' | 'medium' | 'low';      // Classification (required)
#      confidenceScore?: number;                    // Calculated 1.0-5.0 (optional)

# After manual edits:
git diff docs/knowledge-pack/sot-source-hierarchy.md
git diff docs/knowledge-pack/sot-schemas.md
```

**Validation**:
```bash
# Verify Source interface has both fields
rg -A 12 "interface Source" docs/knowledge-pack/sot-schemas.md | rg -e "confidence|confidenceScore"

# Verify clarification in sot-source-hierarchy.md
rg -A 10 "confidence.*field\|Confidence.*Field" docs/knowledge-pack/sot-source-hierarchy.md | rg -i "classification\|numeric"

# Check for conflicting terminology
rg -n "confidence" docs/knowledge-pack/*.md | rg -v "high\|medium\|low\|score" | head -n 10

git diff docs/knowledge-pack/sot-*.md
```

---

### Phase 3 Success Criteria
- ✅ Date/timestamp formats standardized and documented
- ✅ pageId/pageFile lifecycle clearly documented
- ✅ Confidence terminology clarified (string + optional numeric)
- ✅ All standards documented in appropriate SoT files

---

## Phase 4: Enhancement (Optional)

### Objective
Add navigation aids and reference tracking for improved maintainability.

---

#### Task 4.1: Add "Referenced By" Sections to SoT Files ✅ COMPLETED
**Objective**: Document which files reference each SoT file

**Discovery Steps**:
```bash
# For each SoT file, find all files that reference it

# sot-id-conventions.md references
echo "=== sot-id-conventions.md referenced by ==="
rg -l "sot-id-conventions\.md" docs/knowledge-pack/*.md | rg -v "sot-id-conventions.md"

# sot-schemas.md references
echo "=== sot-schemas.md referenced by ==="
rg -l "sot-schemas\.md" docs/knowledge-pack/*.md | rg -v "sot-schemas.md"

# sot-source-hierarchy.md references
echo "=== sot-source-hierarchy.md referenced by ==="
rg -l "sot-source-hierarchy\.md" docs/knowledge-pack/*.md | rg -v "sot-source-hierarchy.md"

# sot-search-queries.md references
echo "=== sot-search-queries.md referenced by ==="
rg -l "sot-search-queries\.md" docs/knowledge-pack/*.md | rg -v "sot-search-queries.md"
```

**Execution Pattern**:
```bash
# NOTE: Manual editing required to add "Referenced By" sections

# For each SoT file:
# 1. Open the file
# 2. Go to end of file
# 3. Add "---" separator
# 4. Add "## Referenced By" section
# 5. List all files that reference this SoT (from discovery step)
# 6. Add brief description of how each file uses the SoT
# 7. Add maintenance note

# After manual edits:
git diff docs/knowledge-pack/sot-*.md | rg -A 10 "Referenced By"
```

**Validation**:
```bash
# Verify all SoT files have "Referenced By" section
for file in docs/knowledge-pack/sot-*.md; do
  echo "Checking $file:"
  rg -n "## Referenced By" "$file" || echo "  ⚠ Missing section"
done

# Verify cross-references are accurate
# For each SoT file, check that listed references actually exist
rg -A 20 "## Referenced By" docs/knowledge-pack/sot-id-conventions.md | \
  rg -o '\[.*\.md\]' | while read ref; do
    filename=$(echo "$ref" | tr -d '[]')
    test -f "docs/knowledge-pack/$filename" && echo "✓ $filename exists" || echo "⚠ $filename missing"
  done

git diff docs/knowledge-pack/sot-*.md
```

---

#### Task 4.2: Add SoT Reference Table to README ✅ COMPLETED
**Objective**: Create central navigation to SoT documents

**Discovery Steps**:
```bash
# Read README.md structure
head -n 100 docs/knowledge-pack/README.md

# Find appropriate location for SoT section
rg -n "## .*Reference\|## File Navigation\|## Quick Reference" docs/knowledge-pack/README.md

# Check if SoT section already exists
rg -n "Single Source of Truth\|SoT" docs/knowledge-pack/README.md

# List all SoT files
ls -1 docs/knowledge-pack/sot-*.md
```

**Execution Pattern**:
```bash
# NOTE: Manual editing required to add SoT reference section

# Manual steps:
# 1. Open docs/knowledge-pack/README.md
# 2. Identify location (suggested: after "Quick Reference" or before "File Navigation")
# 3. Add "## Single Source of Truth (SoT) Reference" section
# 4. Create table with 4 rows (one for each SoT file):
#    - Concept | SoT Document | Description
#    - cuid2 ID Specifications | sot-id-conventions.md | ...
#    - JSON Schemas | sot-schemas.md | ...
#    - Authority & Conflict Resolution | sot-source-hierarchy.md | ...
#    - Search Query Catalog | sot-search-queries.md | ...
# 5. Add architecture principle paragraph

# After manual edit:
git diff docs/knowledge-pack/README.md
```

**Validation**:
```bash
# Verify SoT reference section exists
rg -A 15 "## Single Source of Truth" docs/knowledge-pack/README.md

# Verify all 4 SoT files are listed
rg "sot-id-conventions\.md\|sot-schemas\.md\|sot-source-hierarchy\.md\|sot-search-queries\.md" docs/knowledge-pack/README.md | wc -l
# Should return 4 or more

# Verify table format is correct
rg -A 10 "| Concept.*SoT Document.*Description |" docs/knowledge-pack/README.md

# Verify architecture principle mentioned
rg -i "architecture principle\|sot.*principle" docs/knowledge-pack/README.md

git diff docs/knowledge-pack/README.md
```

---

### Phase 4 Success Criteria
- ✅ All SoT files have "Referenced By" sections
- ✅ README has SoT reference table
- ✅ Architecture principle clearly stated

---

## Phase 5: Post-Review Corrections

### Objective
Address issues identified in deep review: fix non-standard IDs in examples, remove legacy fields, standardize timestamps, and add missing schema documentation.

---

#### Task 5.1: Fix Non-Standard ID Formats in Examples ✅ COMPLETED
**Objective**: Replace all sequential/hyphenated ID formats with proper cuid2 format in examples

**Status Note**: Replaced 3 unique non-standard ID patterns with proper cuid2 format. Applied consistent mapping: discount-geico-multipolicy-001 & discount-geico-multi-001 → disc_cm5e9f1o3t, state-CA-001 → state_cm7s8t9u0v. Total: 8 replacements (7 discount + 1 state).

**Discovery Steps**:
```bash
# Search for old sequential ID patterns (hyphenated format like "discount-geico-multipolicy-001")
rg -n '"discount-[a-z]+-[a-z]+-[0-9]+"' docs/knowledge-pack/*.md
rg -n '"state-[A-Z]+-[0-9]+"' docs/knowledge-pack/*.md

# List all unique non-standard IDs
rg -o '"discount-[a-z]+-[a-z]+-[0-9]+"|"state-[A-Z]+-[0-9]+"' docs/knowledge-pack/*.md | sort | uniq

# Count total occurrences
echo "Total non-standard IDs: $(rg -c '"discount-[a-z]+-[a-z]+-[0-9]+"|"state-[A-Z]+-[0-9]+"' docs/knowledge-pack/*.md | awk -F: '{sum+=$2} END {print sum}')"
```

**Execution Pattern**:
```bash
# NOTE: Requires consistent ID mapping across files to maintain referential integrity

# Step 1: Create ID mapping (generate fresh cuid2s)
# Example mappings:
# "discount-geico-multipolicy-001" -> "disc_ckm9x7wdx1" (use across all files)
# "state-CA-001" -> "state_ckm9x7wtu6" (use across all files)

# Step 2: Apply replacements consistently
# For knowledge-pack-examples.md:
sed -i '' 's/"discount-geico-multipolicy-001"/"disc_ckm9x7wdx1"/g' docs/knowledge-pack/knowledge-pack-examples.md
sed -i '' 's/"state-CA-001"/"state_ckm9x7wtu6"/g' docs/knowledge-pack/knowledge-pack-examples.md

# For knowledge-pack-methodology.md:
sed -i '' 's/"discount-geico-multi-001"/"disc_ckm9x7wdx1"/g' docs/knowledge-pack/knowledge-pack-methodology.md

# Step 3: Document mapping in commit message for traceability
```

**Validation**:
```bash
# Verify no sequential IDs remain
rg '"discount-[a-z]+-[a-z]+-[0-9]+"' docs/knowledge-pack/*.md  # Should return 0
rg '"state-[A-Z]+-[0-9]+"' docs/knowledge-pack/*.md  # Should return 0

# Verify new cuid2 format used
rg '"disc_[a-z0-9]{10}"' docs/knowledge-pack/knowledge-pack-examples.md
rg '"state_[a-z0-9]{10}"' docs/knowledge-pack/knowledge-pack-examples.md

# Check git diff
git diff docs/knowledge-pack/knowledge-pack-examples.md | rg -e 'discount|state'
git diff docs/knowledge-pack/knowledge-pack-methodology.md | rg -e 'discount|state'
```

---

#### Task 5.2: Remove Legacy Schema Fields from Production Examples ✅ COMPLETED
**Objective**: Remove `screenshot` field (deprecated) and move `extractionMethod` to raw-data-only context

**Status Note**: Removed 5 screenshot fields and 8 extractionMethod fields from production Source examples. extractionMethod retained in sot-schemas.md raw-data schema definition only. Total: 13 field removals.

**Discovery Steps**:
```bash
# Find all screenshot field usages
rg -n '"screenshot":' docs/knowledge-pack/*.md

# Find all extractionMethod usages outside raw-data context
rg -n '"extractionMethod":' docs/knowledge-pack/*.md

# Verify extractionMethod is in Raw Data Schema but NOT Source interface
rg -A 5 "interface Source" docs/knowledge-pack/sot-schemas.md | rg "extractionMethod"  # Should return 0
rg -A 5 "raw-data-schema" docs/knowledge-pack/sot-schemas.md | rg "extractionMethod"  # Should return 1
```

**Execution Pattern**:
```bash
# NOTE: Manual editing required to preserve JSON structure integrity

# Manual steps:
# 1. Open docs/knowledge-pack/knowledge-pack-examples.md
# 2. Remove all "screenshot": "..." lines from Source objects
# 3. Remove "extractionMethod" from production Source examples
# 4. Keep "extractionMethod" ONLY in raw data examples (if any exist)
# 5. Verify JSON structure remains valid after removal

# For knowledge-pack-methodology.md:
# 1. Remove "screenshot" field
# 2. Remove "extractionMethod" from Source examples

# After manual edits:
git diff docs/knowledge-pack/knowledge-pack-examples.md | rg -e 'screenshot|extractionMethod'
git diff docs/knowledge-pack/knowledge-pack-methodology.md | rg -e 'screenshot|extractionMethod'
```

**Validation**:
```bash
# Verify screenshot removed from all files
rg '"screenshot":' docs/knowledge-pack/*.md  # Should return 0

# Verify extractionMethod only in raw-data-schema section
rg '"extractionMethod":' docs/knowledge-pack/*.md
# Should only appear in sot-schemas.md raw-data-schema definition

# Verify Source interface examples are clean
rg -B 5 -A 15 '"uri":.*"http' docs/knowledge-pack/knowledge-pack-examples.md | rg '"screenshot"|"extractionMethod"'
# Should return 0

git diff --stat docs/knowledge-pack/
```

---

#### Task 5.3: Fix Date-Only Timestamp Formats ✅ COMPLETED
**Objective**: Add timezone suffix to all accessedDate fields using date-only format

**Status Note**: Fixed 9 date-only timestamps by adding T12:00:00Z suffix. All accessedDate fields now use proper ISO 8601 format (YYYY-MM-DDTHH:mm:ssZ). Files updated: knowledge-pack-examples.md (5), knowledge-pack-methodology.md (3), sot-id-conventions.md (1).

**Discovery Steps**:
```bash
# Find all accessedDate with date-only format (missing T and Z)
rg -n 'accessedDate.*"[0-9]{4}-[0-9]{2}-[0-9]{2}"' docs/knowledge-pack/*.md

# Count occurrences per file
rg -c 'accessedDate.*"[0-9]{4}-[0-9]{2}-[0-9]{2}"' docs/knowledge-pack/*.md

# List all unique date-only patterns
rg -o 'accessedDate.*"[0-9]{4}-[0-9]{2}-[0-9]{2}"' docs/knowledge-pack/*.md | sort | uniq
```

**Execution Pattern**:
```bash
# Replace date-only with full timestamp format (add T12:00:00Z)
# Pattern: "YYYY-MM-DD" -> "YYYY-MM-DDTHH:mm:ssZ"

# For knowledge-pack-examples.md:
sed -i '' 's/"accessedDate": "\([0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}\)"/"accessedDate": "\1T12:00:00Z"/g' docs/knowledge-pack/knowledge-pack-examples.md

# For knowledge-pack-methodology.md:
sed -i '' 's/"accessedDate": "\([0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}\)"/"accessedDate": "\1T12:00:00Z"/g' docs/knowledge-pack/knowledge-pack-methodology.md

# For sot-id-conventions.md:
sed -i '' 's/"accessedDate": "\([0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}\)"/"accessedDate": "\1T12:00:00Z"/g' docs/knowledge-pack/sot-id-conventions.md
```

**Validation**:
```bash
# Verify no date-only accessedDate remains
rg 'accessedDate.*"[0-9]{4}-[0-9]{2}-[0-9]{2}"' docs/knowledge-pack/*.md | rg -v 'T.*Z'
# Should return 0

# Verify all have proper timestamp format
rg 'accessedDate.*"[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z"' docs/knowledge-pack/*.md

# Check specific files
git diff docs/knowledge-pack/knowledge-pack-examples.md | rg 'accessedDate'
git diff docs/knowledge-pack/knowledge-pack-methodology.md | rg 'accessedDate'
git diff docs/knowledge-pack/sot-id-conventions.md | rg 'accessedDate'
```

---

#### Task 5.4: Add Search Tracker Schema Documentation ✅ COMPLETED
**Objective**: Document search-tracker.json schema in sot-schemas.md

**Status Note**: Added comprehensive Search Tracker Schema section (97 lines) with TypeScript interfaces, JSON example, and field notes. Renumbered sections 5-8 to 6-9. Updated Schema Files table and ID Conventions table. Fixed cross-reference in sot-search-queries.md.

**Discovery Steps**:
```bash
# Check if search-tracker schema already exists
rg -n "search-tracker|Search Tracker" docs/knowledge-pack/sot-schemas.md

# Review phase-2-agent-instructions for tracker structure examples
rg -A 30 "search-tracker.json" docs/knowledge-pack/phase-2-agent-instructions.md | head -n 50

# Find all tracker field references
rg -n '"id":|"query":|"status":|"assignedTo":' docs/knowledge-pack/phase-2-agent-instructions.md | head -n 20
```

**Execution Pattern**:
```bash
# NOTE: Manual editing required to add new schema section

# Manual steps:
# 1. Open docs/knowledge-pack/sot-schemas.md
# 2. Add new section after "4. Conflict Schema" and before "5. cuid2 ID Conventions"
# 3. Add "## 5. Search Tracker Schema" section
# 4. Include complete JSON schema with:
#    - Search entry object (id, query, category, carrier, priority, status, etc.)
#    - Status counts object
#    - Categories array
# 5. Add example tracker file
# 6. Renumber subsequent sections (old 5-8 become 6-9)

# After manual edit:
git diff docs/knowledge-pack/sot-schemas.md | rg -A 10 "Search Tracker"
```

**Validation**:
```bash
# Verify search tracker schema section exists
rg -A 20 "Search Tracker Schema" docs/knowledge-pack/sot-schemas.md

# Verify schema includes key fields
rg "search.*schema" docs/knowledge-pack/sot-schemas.md | rg -i "id.*query.*status"

# Verify section is properly numbered
rg -n "^## [0-9]\\." docs/knowledge-pack/sot-schemas.md

# Check cross-references updated
rg "sot-schemas.md#.*search" docs/knowledge-pack/phase-2-agent-instructions.md

git diff docs/knowledge-pack/sot-schemas.md
```

---

### Phase 5 Success Criteria
- ✅ All example IDs use proper cuid2 format (no sequential/hyphenated IDs)
- ✅ Legacy `screenshot` field removed from all examples
- ✅ `extractionMethod` clarified as raw-data-only field
- ✅ All `accessedDate` fields use full ISO 8601 timestamp format
- ✅ Search tracker schema documented in sot-schemas.md
- ✅ All examples validate against documented schemas

---

## Phase 6: Post-Consolidation Review Corrections

### Objective
Address issues identified in comprehensive post-consolidation review: remove circular references, fix display name mismatches, correct cross-reference anchors, clarify path formats, update descriptions, resolve TypeScript confusion, reduce code duplication, and add visual distinction for SoT files.

---

#### Task 6.1: Remove CONSOLIDATION-PLAN.md from Referenced By Sections ✅ COMPLETED
**Objective**: Remove circular references to CONSOLIDATION-PLAN.md from all 4 SoT files

**Status Note**: Removed 4 circular references from SoT files' Referenced By sections. CONSOLIDATION-PLAN.md is a meta-document for tracking work, not active consumer documentation.

**Issue**: All SoT files list CONSOLIDATION-PLAN.md in their "Referenced By" sections, creating a circular reference. CONSOLIDATION-PLAN is a meta-document for tracking work progress, not part of the active documentation that consumers would use.

**Discovery Steps**:
```bash
# Search for CONSOLIDATION-PLAN.md references in all SoT files
rg -n "CONSOLIDATION-PLAN.md" docs/knowledge-pack/sot-*.md

# Count occurrences per file
rg -c "CONSOLIDATION-PLAN.md" docs/knowledge-pack/sot-*.md

# Show context around references (should be in Referenced By sections)
rg -B 3 -A 1 "CONSOLIDATION-PLAN.md" docs/knowledge-pack/sot-*.md
```

**Execution Pattern**:
```bash
# NOTE: Manual editing required to remove specific bullet points from Referenced By sections

# Manual steps:
# 1. Open docs/knowledge-pack/sot-id-conventions.md
#    - Locate "## Referenced By" section (around line 672)
#    - Remove the bullet point: "- CONSOLIDATION-PLAN.md - ..."
# 2. Open docs/knowledge-pack/sot-schemas.md
#    - Locate "## Referenced By" section (around line 1099)
#    - Remove the bullet point: "- CONSOLIDATION-PLAN.md - ..."
# 3. Open docs/knowledge-pack/sot-source-hierarchy.md
#    - Locate "## Referenced By" section (around line 672)
#    - Remove the bullet point: "- CONSOLIDATION-PLAN.md - ..."
# 4. Open docs/knowledge-pack/sot-search-queries.md
#    - Locate "## Referenced By" section (around line 1030)
#    - Remove the bullet point: "- CONSOLIDATION-PLAN.md - ..."

# After manual edits:
git diff docs/knowledge-pack/sot-*.md | rg -e 'CONSOLIDATION-PLAN'
```

**Validation**:
```bash
# Verify no CONSOLIDATION-PLAN.md references remain in SoT files
rg "CONSOLIDATION-PLAN.md" docs/knowledge-pack/sot-*.md
# Should return 0 matches

# Verify Referenced By sections still exist and have other references
for file in docs/knowledge-pack/sot-*.md; do
  echo "Checking $file:"
  rg -A 5 "## Referenced By" "$file" || echo "  ⚠ Missing section"
done

# Show changes
git diff docs/knowledge-pack/sot-*.md
```

---

#### Task 6.2: Fix README.md Display Names ✅ COMPLETED
**Objective**: Update file list display names to match actual filenames

**Status Note**: Updated 6 display name mismatches in README.md file list. All links now show full filenames (e.g., [sot-schemas.md] instead of [schemas.md]).

**Issue**: README.md shows shortened names in display text (e.g., "schemas.md") but links to full names (e.g., "sot-schemas.md"). This creates confusion about actual filenames and inconsistency in the documentation.

**Discovery Steps**:
```bash
# Find the numbered file list in README.md
rg -n "^[0-9]+\. \[" docs/knowledge-pack/README.md | head -n 20

# Check specific mismatches
rg -n "\[schemas\.md\]" docs/knowledge-pack/README.md
rg -n "\[search-queries\.md\]" docs/knowledge-pack/README.md
rg -n "\[source-hierarchy\.md\]" docs/knowledge-pack/README.md
rg -n "\[examples\.md\]" docs/knowledge-pack/README.md
rg -n "\[methodology\.md\]" docs/knowledge-pack/README.md
rg -n "\[phase-2\.md\]" docs/knowledge-pack/README.md

# Show context (around lines 11-62)
sed -n '11,62p' docs/knowledge-pack/README.md | rg "\[.*\].*\.md\)"
```

**Execution Pattern**:
```bash
# Replace shortened display names with full filenames
# Pattern: [display-text](actual-filename.md) where display-text != actual-filename

sed -i '' \
  -e 's/\[schemas\.md\](sot-schemas.md)/[sot-schemas.md](sot-schemas.md)/g' \
  -e 's/\[search-queries\.md\](sot-search-queries.md)/[sot-search-queries.md](sot-search-queries.md)/g' \
  -e 's/\[source-hierarchy\.md\](sot-source-hierarchy.md)/[sot-source-hierarchy.md](sot-source-hierarchy.md)/g' \
  -e 's/\[examples\.md\](knowledge-pack-examples.md)/[knowledge-pack-examples.md](knowledge-pack-examples.md)/g' \
  -e 's/\[methodology\.md\](knowledge-pack-methodology.md)/[knowledge-pack-methodology.md](knowledge-pack-methodology.md)/g' \
  -e 's/\[phase-2\.md\](phase-2-agent-instructions.md)/[phase-2-agent-instructions.md](phase-2-agent-instructions.md)/g' \
  docs/knowledge-pack/README.md
```

**Validation**:
```bash
# Verify no mismatched display names remain
rg '\[schemas\.md\]\(sot-schemas\.md\)' docs/knowledge-pack/README.md  # Should return 0
rg '\[search-queries\.md\]\(sot-search-queries\.md\)' docs/knowledge-pack/README.md  # Should return 0
rg '\[examples\.md\]\(knowledge-pack-examples\.md\)' docs/knowledge-pack/README.md  # Should return 0

# Verify display text matches target filename
rg '\[([^\]]+)\]\(([^\)]+)\)' docs/knowledge-pack/README.md | rg -e 'sot-|knowledge-pack-|phase-2' | head -n 20
# Each link should have display text matching target (except for descriptive links)

# Show changes
git diff docs/knowledge-pack/README.md | rg -e '^\+.*\[.*\.md\]'
```

---

#### Task 6.3: Fix Cross-Reference Anchor Mismatches ✅ COMPLETED
**Objective**: Correct anchor links to use proper markdown heading format

**Status Note**: Fixed 2 anchor links in knowledge-pack-methodology.md to include section numbers: #carrier-schema → #1-carrier-schema, #resolution-object → #4-resolution-object.

**Issue**: References like `sot-schemas.md#carrier-schema` don't match actual heading `## 1. Carrier Schema`. Markdown anchors are auto-generated from heading text, so links must include numbering.

**Discovery Steps**:
```bash
# Find all cross-file anchor references in methodology.md
rg -n 'sot-schemas\.md#' docs/knowledge-pack/knowledge-pack-methodology.md

# Show context around these references (around lines 96, 598)
rg -B 2 -A 2 'sot-schemas\.md#' docs/knowledge-pack/knowledge-pack-methodology.md

# Check actual heading format in sot-schemas.md
rg -n "^## [0-9]\. Carrier Schema" docs/knowledge-pack/sot-schemas.md
rg -n "^## [0-9]\. Resolution Object" docs/knowledge-pack/sot-schemas.md

# List all anchor references that may need updating
rg '#[a-z-]+' docs/knowledge-pack/knowledge-pack-methodology.md | rg 'sot-schemas'
```

**Execution Pattern**:
```bash
# Update anchor links to match numbered headings
# Pattern: #heading-name -> #number-heading-name

sed -i '' \
  -e 's/sot-schemas\.md#carrier-schema/sot-schemas.md#1-carrier-schema/g' \
  -e 's/sot-schemas\.md#resolution-object/sot-schemas.md#3-resolution-object/g' \
  docs/knowledge-pack/knowledge-pack-methodology.md

# If there are other mismatched anchors, add them here
# Example: -e 's/sot-schemas\.md#discount-schema/sot-schemas.md#2-discount-schema/g' \
```

**Validation**:
```bash
# Verify old anchor formats are gone
rg 'sot-schemas\.md#carrier-schema[^-]' docs/knowledge-pack/knowledge-pack-methodology.md  # Should return 0
rg 'sot-schemas\.md#resolution-object[^-]' docs/knowledge-pack/knowledge-pack-methodology.md  # Should return 0

# Verify new anchor formats exist
rg 'sot-schemas\.md#1-carrier-schema' docs/knowledge-pack/knowledge-pack-methodology.md
rg 'sot-schemas\.md#3-resolution-object' docs/knowledge-pack/knowledge-pack-methodology.md

# Cross-verify anchors exist in target file
rg -n "^## 1\. Carrier Schema" docs/knowledge-pack/sot-schemas.md
rg -n "^## 3\. Resolution Object" docs/knowledge-pack/sot-schemas.md

# Show changes
git diff docs/knowledge-pack/knowledge-pack-methodology.md | rg '#'
```

---

#### Task 6.4: Clarify pageFile Path Format ✅ COMPLETED
**Objective**: Document consistent pageFile path representation

**Status Note**: Updated pageFile field comments in 3 locations (TypeScript interface + 2 JSON schemas) to clarify format: "Path relative to knowledge_pack/raw/ (e.g., '_pages/page_ckm9x7w8k0.html')".

**Issue**: Two different path formats appear in examples: `"_pages/page_ckm9x7w8k0.html"` (relative to knowledge_pack/raw/) vs `"page_ckm9x7w8k0.html"` (just filename). Need to clarify which is canonical.

**Discovery Steps**:
```bash
# Find all pageFile field examples
rg -n '"pageFile":' docs/knowledge-pack/*.md

# Compare formats in sot-schemas.md vs phase-2-agent-instructions.md
rg -B 2 -A 2 '"pageFile":' docs/knowledge-pack/sot-schemas.md | head -n 20
rg -B 2 -A 2 '"pageFile":' docs/knowledge-pack/phase-2-agent-instructions.md | head -n 20

# Check Source interface definition
rg -A 2 'pageFile\?:' docs/knowledge-pack/sot-schemas.md
```

**Execution Pattern**:
```bash
# NOTE: Manual editing required to add clarifying comment to Source interface

# Manual steps:
# 1. Open docs/knowledge-pack/sot-schemas.md
# 2. Locate Source interface (around line 54-75)
# 3. Find pageFile field definition line (around line 75)
# 4. Update field comment to:
#    pageFile?: string;  // Path relative to knowledge_pack/raw/ (e.g., "_pages/page_ckm9x7w8k0.html")
# 5. Verify examples use consistent format

# After manual edit:
git diff docs/knowledge-pack/sot-schemas.md | rg 'pageFile'
```

**Validation**:
```bash
# Verify clarifying comment exists
rg -A 1 'pageFile\?:' docs/knowledge-pack/sot-schemas.md | rg 'relative to knowledge_pack/raw'

# Check that examples use consistent format
rg '"pageFile": "[^"]*"' docs/knowledge-pack/*.md

# Verify format documentation
rg -B 5 -A 5 'pageFile' docs/knowledge-pack/sot-schemas.md | rg -i 'path\|relative'

git diff docs/knowledge-pack/sot-schemas.md
```

---

#### Task 6.5: Update cuid2 Description in README ✅ COMPLETED
**Objective**: Clarify cuid2 description to avoid confusion

**Status Note**: Updated cuid2 description from "10-character identifier" to "identifier system (10-character cuid2 + prefix)" to reflect full ID structure (e.g., carr_ckm9x7w8k0).

**Issue**: README.md describes cuid2 as "Globally unique 10-character identifier system" which is misleading. The full ID format is `{prefix}_{cuid2}` (e.g., `car_ckm9x7w8k0`), making it 15+ characters total.

**Discovery Steps**:
```bash
# Find cuid2 definition in README Key Concepts table
rg -n "Globally unique.*10-character" docs/knowledge-pack/README.md

# Show context around line 236
sed -n '230,245p' docs/knowledge-pack/README.md

# Check for other references to "10-character"
rg -n '10-character' docs/knowledge-pack/README.md
```

**Execution Pattern**:
```bash
# Update cuid2 description to clarify full ID structure
sed -i '' \
  -e 's/Globally unique 10-character identifier system/Globally unique identifier system (10-character cuid2 + prefix)/g' \
  docs/knowledge-pack/README.md
```

**Validation**:
```bash
# Verify old description is gone
rg "Globally unique 10-character identifier system" docs/knowledge-pack/README.md  # Should return 0

# Verify new description exists
rg "Globally unique identifier system.*10-character cuid2.*prefix" docs/knowledge-pack/README.md

# Show changes
git diff docs/knowledge-pack/README.md | rg 'cuid2'
```

---

#### Task 6.6: Resolve TypeScript Optional Field Confusion ✅ COMPLETED
**Objective**: Clarify pageId/pageFile lifecycle in schema

**Status Note**: Updated field comments in 3 locations to clarify: "Optional in interface; Phase 2 MUST populate for raw data". Resolves confusion between TypeScript optionality (?) and Phase 2 requirements.

**Issue**: Source interface marks `pageId?` and `pageFile?` as optional (with `?`) but includes comments saying "Required for Phase 2". This creates confusion about when these fields are truly required.

**Discovery Steps**:
```bash
# Check Source interface pageId/pageFile definitions
rg -A 2 'pageId\?:' docs/knowledge-pack/sot-schemas.md
rg -A 2 'pageFile\?:' docs/knowledge-pack/sot-schemas.md

# Show full Source interface (around lines 54-75)
sed -n '50,80p' docs/knowledge-pack/sot-schemas.md

# Check if there's already lifecycle documentation
rg -n "lifecycle\|Lifecycle" docs/knowledge-pack/sot-schemas.md
```

**Execution Pattern**:
```bash
# NOTE: Manual editing required to enhance field comments

# Manual steps (Option 1 - Enhance comments):
# 1. Open docs/knowledge-pack/sot-schemas.md
# 2. Locate Source interface pageId and pageFile fields
# 3. Update comments to:
#    pageId?: string;     // Optional in interface; Phase 2 MUST populate for raw data
#    pageFile?: string;   // Optional in interface; Phase 2 MUST populate for raw data
#
# Option 2 (Preferred - Split interfaces):
# 1. Keep Source interface as-is (optional fields)
# 2. Add new "RawDataSource" interface that extends Source:
#    interface RawDataSource extends Source {
#      pageId: string;    // Required for raw data (removes ? from parent)
#      pageFile: string;  // Required for raw data (removes ? from parent)
#    }
# 3. Document when to use each interface

# After manual edit:
git diff docs/knowledge-pack/sot-schemas.md | rg 'pageId\|pageFile'
```

**Validation**:
```bash
# Verify clarifying comments exist
rg -A 1 'pageId\?:' docs/knowledge-pack/sot-schemas.md | rg 'Phase 2\|raw data'
rg -A 1 'pageFile\?:' docs/knowledge-pack/sot-schemas.md | rg 'Phase 2\|raw data'

# OR verify RawDataSource interface exists (if Option 2 chosen)
rg -A 5 "interface RawDataSource" docs/knowledge-pack/sot-schemas.md

# Check that lifecycle is clearly documented
rg -B 2 -A 10 'pageId\|pageFile' docs/knowledge-pack/sot-schemas.md | rg -i 'optional\|required\|phase'

git diff docs/knowledge-pack/sot-schemas.md
```

---

#### Task 6.7: Reduce ID Generation Code Duplication ✅ COMPLETED
**Objective**: Consolidate ID generation examples

**Status Note**: Removed 42 lines of duplicate ID generation code from phase-2-agent-instructions.md. Added 5 cross-references to sot-id-conventions.md. Net reduction: 32 lines (5.5% of file).

**Issue**: Similar TypeScript code for ID generation appears in both sot-id-conventions.md and phase-2-agent-instructions.md. This duplication creates maintenance burden and potential inconsistency.

**Discovery Steps**:
```bash
# Find ID generation code blocks in both files
rg -A 10 '@paralleldrive/cuid2' docs/knowledge-pack/sot-id-conventions.md | head -n 30
rg -A 10 '@paralleldrive/cuid2' docs/knowledge-pack/phase-2-agent-instructions.md | head -n 30

# Compare import/usage examples
rg -B 2 -A 5 'import.*createId.*from' docs/knowledge-pack/sot-id-conventions.md
rg -B 2 -A 5 'import.*createId.*from' docs/knowledge-pack/phase-2-agent-instructions.md

# Check for installation instructions duplication
rg -n 'npm install.*cuid2\|bun add.*cuid2' docs/knowledge-pack/*.md
```

**Execution Pattern**:
```bash
# NOTE: Manual editing required to reduce duplication while preserving usability

# Manual steps:
# 1. Open docs/knowledge-pack/phase-2-agent-instructions.md
# 2. Locate ID generation section
# 3. Replace detailed code examples with:
#    - Brief reference: "For complete ID generation specifications, see sot-id-conventions.md"
#    - Keep only minimal usage example (1-2 lines showing prefix pattern)
#    - Remove installation instructions (only in sot-id-conventions.md)
#    - Remove detailed usage examples (only in sot-id-conventions.md)
# 4. Add cross-reference link at the beginning of ID-related section

# After manual edit:
git diff docs/knowledge-pack/phase-2-agent-instructions.md | rg -e 'cuid2|createId|sot-id-conventions'
```

**Validation**:
```bash
# Verify phase-2 references sot-id-conventions
rg -n 'sot-id-conventions\.md' docs/knowledge-pack/phase-2-agent-instructions.md | rg -i 'id\|cuid2'

# Verify minimal example remains in phase-2
rg -c 'createId\|@paralleldrive' docs/knowledge-pack/phase-2-agent-instructions.md
# Should be minimal (1-2 occurrences max)

# Verify complete examples still in sot-id-conventions
rg -c 'createId\|@paralleldrive' docs/knowledge-pack/sot-id-conventions.md
# Should have more occurrences (complete reference)

# Check line reduction in phase-2
git diff --stat docs/knowledge-pack/phase-2-agent-instructions.md

git diff docs/knowledge-pack/phase-2-agent-instructions.md
```

---

#### Task 6.8: Add SoT Indicator to README File List ✅ COMPLETED
**Objective**: Clearly mark which files are SoT vs implementation guides

**Status Note**: Added section headers "Single Source of Truth (SoT) Documents 📌" and "Implementation Guides" to README. Added intro paragraph explaining distinction. Files 1-4 grouped as SoT, files 5-7 as implementation.

**Issue**: README file list (lines 11-62) doesn't indicate SoT status until later in the document. This makes it harder for readers to quickly identify authoritative sources.

**Discovery Steps**:
```bash
# Review README file list structure
sed -n '11,62p' docs/knowledge-pack/README.md

# Check if section headers exist
rg -n "^### .*SoT\|^### .*Implementation" docs/knowledge-pack/README.md

# Find where SoT concept is first explained
rg -n "Single Source of Truth" docs/knowledge-pack/README.md | head -n 5
```

**Execution Pattern**:
```bash
# NOTE: Manual editing required to add section headers and grouping

# Manual steps:
# 1. Open docs/knowledge-pack/README.md
# 2. Locate numbered file list (around lines 11-62)
# 3. Add section headers with emoji:
#
#    ### Single Source of Truth (SoT) Documents 📌
#
#    1. [sot-id-conventions.md](sot-id-conventions.md) - ...
#    2. [sot-schemas.md](sot-schemas.md) - ...
#    3. [sot-source-hierarchy.md](sot-source-hierarchy.md) - ...
#    4. [sot-search-queries.md](sot-search-queries.md) - ...
#
#    ### Implementation Guides
#
#    5. [knowledge-pack-examples.md](knowledge-pack-examples.md) - ...
#    6. [knowledge-pack-methodology.md](knowledge-pack-methodology.md) - ...
#    7. [phase-2-agent-instructions.md](phase-2-agent-instructions.md) - ...
#
# 4. Adjust numbering if needed (or remove numbers and use bullets)
# 5. Add brief explanation paragraph before sections

# After manual edit:
git diff docs/knowledge-pack/README.md | rg -e '###.*SoT|###.*Implementation|📌'
```

**Validation**:
```bash
# Verify section headers exist
rg -n "### Single Source of Truth.*SoT.*Documents" docs/knowledge-pack/README.md
rg -n "### Implementation Guides" docs/knowledge-pack/README.md

# Verify 📌 emoji is present
rg -n "📌" docs/knowledge-pack/README.md

# Verify SoT files are grouped together
rg -A 10 "### Single Source of Truth" docs/knowledge-pack/README.md | rg 'sot-.*\.md'

# Verify implementation files are grouped together
rg -A 10 "### Implementation Guides" docs/knowledge-pack/README.md | rg 'knowledge-pack\|phase-2'

git diff docs/knowledge-pack/README.md
```

---

### Phase 6 Success Criteria
- ✅ Zero references to CONSOLIDATION-PLAN.md in SoT "Referenced By" sections
- ✅ All README.md file display names match actual filenames
- ✅ All cross-reference anchor links resolve correctly
- ✅ pageFile path format clearly documented
- ✅ cuid2 description accurately represents full ID structure
- ✅ TypeScript interface lifecycle clarified (pageId/pageFile requirements)
- ✅ ID generation examples consolidated (phase-2 references sot-id-conventions)
- ✅ SoT files visually distinguished in README (section headers + 📌 emoji)

**Estimated Time**: 1-1.5 hours

---

## Final Validation Checklist

After completing all phases, validate:

### File Structure
- [ ] All 4 SoT files renamed with `sot-` prefix
- [ ] File list matches expected structure:
  ```
  docs/knowledge-pack/
  ├── README.md
  ├── sot-id-conventions.md
  ├── sot-schemas.md
  ├── sot-source-hierarchy.md
  ├── sot-search-queries.md
  ├── knowledge-pack-examples.md
  ├── knowledge-pack-methodology.md
  └── phase-2-agent-instructions.md
  ```

### Content Quality
- [ ] Zero old ID formats (search: `"[a-z]+-\d{3}"`)
- [ ] Zero references to old filenames (search: `knowledge-pack-schemas.md`, `id-conventions.md`, etc.)
- [ ] All links valid (no broken markdown links)
- [ ] All SoT files have declarations
- [ ] All duplications removed per plan

### Architecture
- [ ] Each concept has clear SoT file
- [ ] No duplication of specifications
- [ ] Implementation docs reference SoT docs (not vice versa)
- [ ] Cross-references complete and accurate

### Documentation
- [ ] Date formats standardized
- [ ] Confidence terminology clarified
- [ ] pageId/pageFile requirements documented
- [ ] All examples use current conventions

---

## Rollback Plan

If issues arise during execution:

**Phase 0**:
- Rollback: `git reset --hard` or rename files back manually
- Low risk: Just file renames and link updates

**Phase 1-4**:
- Rollback: `git checkout -- <file>` for specific files
- Or: Create branch before starting, revert to branch if needed

**Best Practice**:
- Commit after each major task
- Test links and examples after each phase
- Keep this plan updated with actual changes made

---

## Success Metrics

**Before**:
- 8 files, ~8,450 lines
- ~800 lines duplicated (9.5%)
- 5 critical duplication patterns
- 4 major inconsistencies
- Unclear SoT architecture

**After**:
- 8 files, ~8,000 lines
- <1% duplication (only legitimate examples)
- Clear SoT architecture
- Consistent terminology and formats
- Complete cross-reference network

**Estimated Improvement**:
- 5-6% reduction in total content
- 95% reduction in duplication
- 100% improvement in SoT clarity

---

## Execution Notes

**Task Execution Pattern**:
1. Read task objective and discovery steps
2. Execute discovery (search, identify, list)
3. Review findings, confirm scope
4. Execute changes per pattern
5. Validate against success criteria
6. Commit changes
7. Move to next task

**Key Principles**:
- Discovery-driven (identify at execution time, not plan time)
- Pattern-based (apply rules, not line-by-line edits)
- Validate-early (check after each task)
- Commit-frequently (preserve progress)

---

**End of Plan Document**
