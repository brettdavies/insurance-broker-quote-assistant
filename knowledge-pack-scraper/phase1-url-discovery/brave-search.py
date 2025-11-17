#!/usr/bin/env python3
"""
Brave API search execution for all pending queries.

This script:
1. Loads search-tracker.json (pending queries)
2. For each query:
   - Calls Brave API
   - Saves raw request/response → raw/websearches/websearch_{cuid2}.json
   - Extracts URLs with enrichment
   - Deduplicates and saves to url-tracker.json
   - Updates search status → completed
3. Final git commit with summary

Usage:
    uv run scripts/brave-search.py

Environment:
    BRAVE_WEB_API_TOKEN_FREE - Free tier token (used first)
    BRAVE_WEB_API_TOKEN_PAID - Paid tier token (used after free)
"""

import hashlib
import json
import sys
from datetime import datetime
from pathlib import Path

# Add lib directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / 'lib'))

from brave_api_client import search as brave_search
from id_generator import generate_websearch_id, generate_url_id
from tracker_manager import TrackerManager


def normalize_url(url: str) -> str:
    """
    Normalize URL for deduplication.

    Args:
        url: Raw URL

    Returns:
        Normalized URL (lowercase, no protocol, no trailing slash)
    """
    normalized = url.lower().rstrip('/')
    # Remove protocol
    if normalized.startswith('http://'):
        normalized = normalized[7:]
    elif normalized.startswith('https://'):
        normalized = normalized[8:]
    return normalized


def generate_url_hash(url: str) -> str:
    """
    Generate SHA256 hash of normalized URL.

    Args:
        url: Raw URL

    Returns:
        First 16 characters of SHA256 hash
    """
    normalized = normalize_url(url)
    return hashlib.sha256(normalized.encode()).hexdigest()[:16]


def save_websearch_raw(
    websearch_id: str,
    search_id: str,
    query: str,
    response: dict,
    metadata: dict
) -> None:
    """
    Save raw Brave API request/response to file.

    Args:
        websearch_id: Unique websearch ID
        search_id: Search ID from search-tracker
        query: Search query string
        response: Full Brave API response
        metadata: Execution metadata (timestamps, duration, etc.)
    """
    # Extract first char of ID for sharding (websearch_axyz... → a/)
    prefix = websearch_id.split('_')[1][0]  # First char after 'websearch_'
    raw_dir = Path(__file__).parent.parent / "raw" / "websearches" / prefix
    raw_dir.mkdir(parents=True, exist_ok=True)

    raw_file = raw_dir / f"{websearch_id}.json"

    data = {
        "websearch_id": websearch_id,
        "search_id": search_id,
        "timestamp": metadata["timestamp"],
        "startedAt": metadata["startedAt"],
        "completedAt": metadata["completedAt"],
        "durationSeconds": metadata["durationSeconds"],
        "urlsDiscoveredCount": metadata["urlsDiscoveredCount"],
        "errorMessage": metadata.get("errorMessage"),
        "request": {
            "endpoint": "https://api.search.brave.com/res/v1/web/search",
            "query": query,
            "params": {
                "safesearch": "strict",
                "freshness": "py",
                "text_decorations": False,
                "result_filter": "web,query",
                "extra_snippets": False,
                "summary": False,
                "count": 20,
                "offset": 0
            }
        },
        "response": response
    }

    with open(raw_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)


def extract_urls_from_brave(
    response: dict,
    websearch_id: str,
    search_id: str
) -> list[dict]:
    """
    Extract URLs from Brave API response with enrichment.

    Args:
        response: Brave API response
        websearch_id: Websearch ID
        search_id: Search ID

    Returns:
        List of URL dicts with enriched fields
    """
    urls = []

    # Extract from web.results
    web = response.get("web", {})
    results = web.get("results", [])

    for result in results:
        url = result.get("url")
        if not url:
            continue

        # Extract enrichment fields
        url_data = {
            "url": url,
            "title": result.get("title", ""),
            "description": result.get("description", ""),
            "page_age": result.get("page_age", ""),
            "language": result.get("language", ""),
            "type": result.get("type", ""),
            "subtype": result.get("subtype", ""),
            "hostname": result.get("meta_url", {}).get("hostname", ""),
            "source_name": result.get("profile", {}).get("name", "")
        }

        urls.append({
            "url_data": url_data,
            "websearch_id": websearch_id,
            "search_id": search_id
        })

    return urls


def deduplicate_and_save_urls(
    new_urls: list[dict],
    url_tracker: dict
) -> int:
    """
    Deduplicate URLs and add to url-tracker.

    Args:
        new_urls: List of URL dicts from extract_urls_from_brave
        url_tracker: URL tracker dict (will be modified in place)

    Returns:
        Number of new URLs added (not duplicates)
    """
    # Build hash map of existing URLs
    existing_hashes = {}
    for url_entry in url_tracker["urls"]:
        url_hash = url_entry.get("urlHash")
        if url_hash:
            existing_hashes[url_hash] = url_entry

    new_count = 0

    for url_info in new_urls:
        url_data = url_info["url_data"]
        websearch_id = url_info["websearch_id"]
        search_id = url_info["search_id"]
        url = url_data["url"]

        # Generate hash for deduplication
        url_hash = generate_url_hash(url)

        if url_hash in existing_hashes:
            # Duplicate - append websearch_id and search_id if not already present
            existing_entry = existing_hashes[url_hash]

            # Update websearch_ids
            websearch_ids = existing_entry.get("websearch_ids", [])
            if websearch_id not in websearch_ids:
                websearch_ids.append(websearch_id)
                existing_entry["websearch_ids"] = websearch_ids

            # Update search_ids
            search_ids = existing_entry.get("search_ids", [])
            if search_id not in search_ids:
                search_ids.append(search_id)
                existing_entry["search_ids"] = search_ids
        else:
            # New URL - create entry
            url_id = generate_url_id()
            new_entry = {
                "id": url_id,
                "search_ids": [search_id],
                "websearch_ids": [websearch_id],
                "url": url,
                "urlHash": url_hash,
                "priority": None,

                # Brave API enrichment
                "title": url_data["title"],
                "description": url_data["description"],
                "page_age": url_data["page_age"],
                "language": url_data["language"],
                "type": url_data["type"],
                "subtype": url_data["subtype"],
                "hostname": url_data["hostname"],
                "source_name": url_data["source_name"],

                # Standard fields
                "status": "pending",
                "assignedTo": None,
                "pageId": None,
                "htmlFile": None,
                "markdownFile": None,
                "fetchedAt": None,
                "fetchError": None,
                "retryCount": 0
            }

            url_tracker["urls"].append(new_entry)
            existing_hashes[url_hash] = new_entry
            new_count += 1

    # Update status counts
    url_tracker["statusCounts"]["pending"] = len([
        u for u in url_tracker["urls"] if u.get("status") == "pending"
    ])

    return new_count


def main():
    """Main execution."""
    tm = TrackerManager()

    # Load search tracker
    search_tracker = tm.load('search')
    searches = search_tracker.get("searches", [])
    pending_searches = [s for s in searches if s.get("status") == "pending"]

    if not pending_searches:
        print(json.dumps({
            "success": True,
            "message": "No pending searches found",
            "total_searches": len(searches),
            "pending": 0
        }, indent=2))
        sys.exit(0)

    print(json.dumps({
        "message": f"Starting Brave API search execution",
        "total_searches": len(searches),
        "pending_searches": len(pending_searches)
    }, indent=2))

    # Load or create url-tracker
    try:
        url_tracker = tm.load('url')
    except FileNotFoundError:
        url_tracker = {
            "meta": {
                "version": "1.0",
                "description": "URL tracker for Phase 2 searches"
            },
            "statusCounts": {
                "pending": 0,
                "completed": 0,
                "failed": 0
            },
            "urls": []
        }

    # Execute searches
    total_urls_discovered = 0
    total_new_urls = 0
    completed_count = 0

    for idx, search in enumerate(pending_searches, 1):
        search_id = search["id"]
        query = search["query"]
        category = search.get("category", "unknown")

        # Progress
        progress = (idx / len(pending_searches)) * 100
        print(f"\n[{idx}/{len(pending_searches)}] ({progress:.1f}%) {query[:60]}...", file=sys.stderr)

        # Generate websearch ID
        websearch_id = generate_websearch_id()

        # Execute search
        start_time = datetime.now()
        success, response = brave_search(query)

        if not success:
            # Search failed (should have exited in brave_api_client)
            continue

        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()

        # Extract URLs
        extracted_urls = extract_urls_from_brave(response, websearch_id, search_id)
        urls_discovered = len(extracted_urls)

        # Save raw request/response
        save_websearch_raw(
            websearch_id=websearch_id,
            search_id=search_id,
            query=query,
            response=response,
            metadata={
                "timestamp": start_time.isoformat(),
                "startedAt": start_time.isoformat(),
                "completedAt": end_time.isoformat(),
                "durationSeconds": round(duration, 2),
                "urlsDiscoveredCount": urls_discovered,
                "errorMessage": None
            }
        )

        # Deduplicate and save URLs
        new_urls_count = deduplicate_and_save_urls(extracted_urls, url_tracker)

        # Update search status
        search["status"] = "completed"
        search["lastrunAt"] = end_time.isoformat()

        # Update counts
        total_urls_discovered += urls_discovered
        total_new_urls += new_urls_count
        completed_count += 1

        print(json.dumps({
            "websearch_id": websearch_id,
            "urls_discovered": urls_discovered,
            "new_urls": new_urls_count,
            "duplicates": urls_discovered - new_urls_count
        }, indent=2), file=sys.stderr)

    # Update search tracker status counts
    search_tracker["statusCounts"]["pending"] = len([
        s for s in searches if s.get("status") == "pending"
    ])
    search_tracker["statusCounts"]["completed"] = len([
        s for s in searches if s.get("status") == "completed"
    ])

    # Save trackers
    tm.save('search', search_tracker)
    tm.save('url', url_tracker)

    # Final summary
    print(json.dumps({
        "success": True,
        "message": "Brave API search execution completed",
        "searches_completed": completed_count,
        "total_urls_discovered": total_urls_discovered,
        "new_urls_added": total_new_urls,
        "duplicates_found": total_urls_discovered - total_new_urls,
        "total_urls_in_tracker": len(url_tracker["urls"])
    }, indent=2))


if __name__ == '__main__':
    main()
