#!/usr/bin/env python3
"""
Concurrent URL fetching using crawl4ai's arun_many() with streaming.

Uses crawl4ai best practices:
- MemoryAdaptiveDispatcher for auto-managed concurrency
- Streaming mode for real-time processing
- Built-in rate limiting (mean_delay + max_range)

Usage:
    uv run scripts/fetch-url.py --workers 3 --delay 1.0
    uv run scripts/fetch-url.py --workers 2 --delay 1.5 --delay-variance 0.3

Options:
    --workers N             Max concurrent workers (default: 3)
    --delay SECONDS         Mean delay between requests (default: 1.0)
    --delay-variance SECS   Random variance for delay (default: 0.2)
    --limit N               Limit to first N URLs (for testing)
"""

import argparse
import asyncio
import json
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional

# Add scripts directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from id_generator import generate_page_id
from tracker_manager import TrackerManager

# Import crawl4ai
try:
    from crawl4ai import AsyncWebCrawler, CrawlerRunConfig, CacheMode
    from crawl4ai.async_dispatcher import MemoryAdaptiveDispatcher
except ImportError:
    print(json.dumps({
        "success": False,
        "error": "MISSING_DEPENDENCY",
        "message": "crawl4ai not installed",
        "next_steps": "Install: uv sync && uv run crawl4ai-setup"
    }, indent=2))
    sys.exit(1)


class FetchStats:
    """Track fetching statistics."""

    def __init__(self):
        self.total = 0
        self.completed = 0
        self.failed = 0
        self.start_time = datetime.now()
        self.last_progress_report = 0

    def increment_completed(self):
        self.completed += 1

    def increment_failed(self):
        self.failed += 1

    def should_report_progress(self, interval: int = 50) -> bool:
        """Check if we should report progress."""
        current = self.completed + self.failed
        if current - self.last_progress_report >= interval:
            self.last_progress_report = current
            return True
        return False

    def get_summary(self) -> Dict:
        """Get final summary stats."""
        duration = (datetime.now() - self.start_time).total_seconds()
        completed_total = self.completed + self.failed

        return {
            "total_urls": self.total,
            "completed": self.completed,
            "failed": self.failed,
            "remaining": self.total - completed_total,
            "success_rate": round(self.completed / completed_total * 100, 2) if completed_total > 0 else 0,
            "duration_seconds": round(duration, 2),
            "urls_per_second": round(completed_total / duration, 2) if duration > 0 else 0
        }

    def print_progress(self):
        """Print current progress."""
        completed_total = self.completed + self.failed
        progress_pct = (completed_total / self.total * 100) if self.total > 0 else 0

        print(f"\nProgress: {completed_total}/{self.total} ({progress_pct:.1f}%)", file=sys.stderr)
        print(f"  ✓ Completed: {self.completed}", file=sys.stderr)
        print(f"  ✗ Failed: {self.failed}", file=sys.stderr)


async def process_result(
    result,
    url_entry: Dict,
    tm: TrackerManager,
    stats: FetchStats
) -> None:
    """Process a single crawl result."""
    url_id = url_entry['id']
    url = url_entry['url']

    if not result.success:
        # Failed fetch
        tm.update_status('url', url_id, 'failed', {
            'fetchError': result.error_message or "Unknown error",
            'retryCount': url_entry.get('retryCount', 0) + 1
        })
        stats.increment_failed()

        print(json.dumps({
            "url_id": url_id,
            "url": url[:80],
            "status": "failed",
            "error": result.error_message or "Unknown error"
        }, indent=2), file=sys.stderr)
        return

    # Success - save page files
    page_id = generate_page_id()
    search_ids = url_entry.get('search_ids', [])

    # Ensure output directory exists
    output_dir = tm.output_base / 'pages'
    output_dir.mkdir(parents=True, exist_ok=True)

    # Save HTML and markdown
    html_file = output_dir / f"{page_id}.html"
    md_file = output_dir / f"{page_id}.md"

    with open(html_file, 'w', encoding='utf-8') as f:
        f.write(result.html)

    markdown_content = result.markdown.raw_markdown if hasattr(result.markdown, 'raw_markdown') else result.markdown
    with open(md_file, 'w', encoding='utf-8') as f:
        f.write(markdown_content)

    html_size = len(result.html)
    md_size = len(markdown_content)

    # Update url-tracker
    tm.update_status('url', url_id, 'completed', {
        'pageId': page_id,
        'htmlFile': f"../knowledge_pack/raw/pages/{page_id}.html",
        'markdownFile': f"../knowledge_pack/raw/pages/{page_id}.md",
        'fetchedAt': datetime.now().isoformat()
    })

    # Register page in page-tracker
    page_tracker = tm.load('page')
    page_tracker['pages'].append({
        'id': page_id,
        'urlId': url_id,
        'searchIds': search_ids,
        'htmlFile': f"../knowledge_pack/raw/pages/{page_id}.html",
        'markdownFile': f"../knowledge_pack/raw/pages/{page_id}.md",
        'htmlSize': html_size,
        'markdownSize': md_size,
        'status': 'pending',
        'dataPointsExtracted': 0,
        'rawDataFile': None,
        'extractedAt': None
    })
    page_tracker['statusCounts']['pending'] += 1
    page_tracker['meta']['totalPages'] = page_tracker['meta'].get('totalPages', 0) + 1
    tm.save('page', page_tracker)

    stats.increment_completed()

    print(json.dumps({
        "url_id": url_id,
        "page_id": page_id,
        "url": url[:80],
        "status": "completed",
        "html_size": html_size,
        "markdown_size": md_size
    }, indent=2), file=sys.stderr)


async def main_async(args):
    """Main async execution."""
    tm = TrackerManager()

    # Load pending URLs
    url_tracker = tm.load('url')
    pending_urls_entries = [u for u in url_tracker['urls'] if u['status'] == 'pending']

    # Apply limit if requested
    if args.limit:
        pending_urls_entries = pending_urls_entries[:args.limit]

    if not pending_urls_entries:
        print(json.dumps({
            "success": True,
            "message": "No pending URLs to fetch",
            "total_urls": len(url_tracker['urls'])
        }, indent=2))
        return

    # Extract URL strings
    pending_urls = [u['url'] for u in pending_urls_entries]

    # Create URL ID lookup for result processing
    url_lookup = {u['url']: u for u in pending_urls_entries}

    # Initialize stats
    stats = FetchStats()
    stats.total = len(pending_urls)

    print(json.dumps({
        "message": "Starting concurrent URL fetching",
        "total_urls": stats.total,
        "workers": args.workers,
        "mean_delay": args.delay,
        "delay_variance": args.delay_variance
    }, indent=2), file=sys.stderr)

    # Configure dispatcher
    dispatcher = MemoryAdaptiveDispatcher(
        memory_threshold_percent=70.0,
        max_session_permit=args.workers
    )

    # Crawler config (single config for all HTML URLs)
    config = CrawlerRunConfig(
        stream=True,
        mean_delay=args.delay,
        max_range=args.delay_variance,
        cache_mode=CacheMode.BYPASS
    )

    # Process URLs with streaming
    try:
        async with AsyncWebCrawler() as crawler:
            async for result in await crawler.arun_many(
                urls=pending_urls,
                config=config,
                dispatcher=dispatcher
            ):
                # Find corresponding URL entry
                url_entry = url_lookup.get(result.url)
                if not url_entry:
                    print(f"Warning: No entry found for URL: {result.url}", file=sys.stderr)
                    continue

                # Process result
                await process_result(result, url_entry, tm, stats)

                # Periodic progress reports
                if stats.should_report_progress():
                    stats.print_progress()

    except KeyboardInterrupt:
        print("\n\nInterrupted by user. Saving progress...", file=sys.stderr)
        stats.print_progress()
        sys.exit(130)

    # Final summary
    summary = stats.get_summary()
    print("\n" + "=" * 60, file=sys.stderr)
    print("FETCH COMPLETED", file=sys.stderr)
    print("=" * 60, file=sys.stderr)
    print(json.dumps(summary, indent=2))


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Concurrent URL fetching with crawl4ai"
    )
    parser.add_argument(
        '--workers',
        type=int,
        default=3,
        help='Max concurrent workers (default: 3)'
    )
    parser.add_argument(
        '--delay',
        type=float,
        default=1.0,
        help='Mean delay between requests in seconds (default: 1.0)'
    )
    parser.add_argument(
        '--delay-variance',
        type=float,
        default=0.2,
        help='Random variance for delay (default: 0.2)'
    )
    parser.add_argument(
        '--limit',
        type=int,
        default=None,
        help='Limit to first N URLs (for testing)'
    )

    args = parser.parse_args()

    # Run async main
    try:
        asyncio.run(main_async(args))
    except KeyboardInterrupt:
        print("\nInterrupted by user", file=sys.stderr)
        sys.exit(130)


if __name__ == '__main__':
    main()
