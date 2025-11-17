#!/usr/bin/env python3
"""
Populate search-tracker.json with search queries from sot-search-queries.md.

This script generates a complete search tracker with:
- All search queries parsed from the markdown source
- Unique search IDs (search_{cuid2})
- Proper schema version 2.0 (multi-step-v1)
- Initial status 'pending' for all searches
"""

import json
import re
import sys
from datetime import datetime
from pathlib import Path

# Add scripts directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from id_generator import generate_search_id


def parse_markdown_queries(md_path: Path) -> list[dict]:
    """
    Parse search queries from sot-search-queries.md.

    Returns list of dicts with:
    - query: str
    - category: str
    - subcategory: str
    - carrier: str | None
    - priority: str
    """
    with open(md_path, 'r', encoding='utf-8') as f:
        content = f.read()

    queries = []
    current_category = None
    current_subcategory = None
    in_code_block = False

    # Category mapping for slugs
    category_map = {
        "Carrier Operating States & Availability": "carrier-states",
        "Auto Insurance Discounts": "carrier-discounts-auto",
        "Home Insurance Discounts": "carrier-discounts-home",
        "Auto Eligibility Requirements": "carrier-eligibility-auto",
        "Home Eligibility Requirements": "carrier-eligibility-home",
        "State Minimum Requirements": "state-minimums-auto",
        "Average Pricing Data": "industry-pricing",
        "Broker Commission & Compensation": "broker-commission",
        "Product-Specific Coverage": "product-coverage",
        "State-Specific Requirements": "state-specific",
        "Compliance & Prohibited Statements": "compliance",
        "Discount Stacking & Combinations": "carrier-discount-stacking",
        "Industry Benchmarking Sources": "industry-benchmarking"
    }

    for line in content.split('\n'):
        # Category header (## N. Category Name)
        if re.match(r'^##\s+\d+\.\s+', line):
            category_name = re.sub(r'^##\s+\d+\.\s+', '', line).strip()
            # Skip documentation sections (Search Techniques, Operators, etc.)
            if any(skip in category_name for skip in ["Search Techniques", "Operators", "Examples"]):
                current_category = None
                current_subcategory = None
                in_code_block = False
                continue
            current_category = category_map.get(category_name, category_name.lower().replace(' ', '-'))
            current_subcategory = None
            in_code_block = False

        # Subcategory header (### Subcategory Name)
        elif line.startswith('### '):
            subcategory_name = line[4:].strip()
            # Convert to slug
            current_subcategory = subcategory_name.lower().replace(' ', '-').replace('/', '-').replace('&', 'and')
            in_code_block = False

        # Code block delimiter
        elif line.strip() == '```':
            in_code_block = not in_code_block

        # Query line inside code block
        elif in_code_block and line.strip() and current_category:
            query_text = line.strip()

            # Skip comment lines or empty lines
            if query_text.startswith('#') or not query_text:
                continue

            # Detect carrier from query content
            carrier = None
            if '"GEICO"' in query_text or 'site:geico.com' in query_text or 'GEICO' in query_text:
                carrier = "GEICO"
            elif '"Progressive"' in query_text or 'site:progressive.com' in query_text or 'Progressive' in query_text:
                carrier = "Progressive"
            elif '"State Farm"' in query_text or 'site:statefarm.com' in query_text or 'State Farm' in query_text:
                carrier = "State Farm"

            # Determine priority based on category
            priority = "medium"  # default
            if current_category in ["carrier-states", "carrier-discounts-auto", "state-minimums-auto", "compliance", "carrier-discount-stacking"]:
                priority = "high"
            elif current_category in ["carrier-eligibility-home", "carrier-eligibility-auto", "industry-pricing"]:
                priority = "high"

            queries.append({
                "query": query_text,
                "category": current_category,
                "subcategory": current_subcategory or "general",
                "carrier": carrier,
                "priority": priority
            })

    return queries


def create_search_entry(query_data: dict) -> dict:
    """Create a search entry with generated ID and all required fields."""
    return {
        "id": generate_search_id(),
        "query": query_data["query"],
        "category": query_data["category"],
        "subcategory": query_data["subcategory"],
        "carrier": query_data["carrier"],
        "priority": query_data["priority"],
        "status": "pending",
        "lastrunAt": None,
        "notes": None
    }


def main():
    """Generate and save search tracker."""

    # Parse queries from markdown
    md_path = Path(__file__).parent.parent.parent / "docs" / "knowledge-pack" / "sot-search-queries.md"
    query_list = parse_markdown_queries(md_path)

    # Create search entries (flat array)
    searches = [create_search_entry(query_data) for query_data in query_list]
    total_searches = len(searches)

    # Count searches by category for summary
    category_counts = {}
    for query_data in query_list:
        category = query_data["category"]
        category_counts[category] = category_counts.get(category, 0) + 1

    # Build tracker
    tracker = {
        "meta": {
            "version": "2.0",
            "schemaVersion": "multi-step-v1",
            "createdDate": datetime.now().strftime("%Y-%m-%d"),
            "lastUpdated": datetime.now().isoformat(),
            "totalSearches": total_searches,
            "description": "Phase 2 search execution tracker - searches pending execution"
        },
        "statusCounts": {
            "pending": total_searches,
            "claimed": 0,
            "urls_discovered": 0,
            "completed": 0,
            "failed": 0
        },
        "searches": searches
    }

    # Save to file
    tracker_path = Path(__file__).parent.parent / "search-tracker.json"
    with open(tracker_path, 'w', encoding='utf-8') as f:
        json.dump(tracker, f, indent=2)

    # Output summary
    print(json.dumps({
        "success": True,
        "message": f"Generated {total_searches} searches across {len(category_counts)} categories",
        "total_searches": total_searches,
        "categories": len(category_counts),
        "tracker_file": str(tracker_path),
        "breakdown": category_counts
    }, indent=2))


if __name__ == '__main__':
    main()
