#!/usr/bin/env python3
"""
Batch analyze all multi-page domains in parallel.

Usage:
    uv run scripts/batch-analyze-domains.py
    uv run scripts/batch-analyze-domains.py --min-pages 2
    uv run scripts/batch-analyze-domains.py --batch-size 20
"""

import argparse
import asyncio
import json
import sys
from collections import Counter
from pathlib import Path
from urllib.parse import urlparse

sys.path.insert(0, str(Path(__file__).parent))
from tracker_manager import TrackerManager


def normalize_domain(domain: str) -> str:
    """Normalize domain by removing www prefix and protocol."""
    if '://' in domain:
        domain = domain.split('://')[1]
    if '/' in domain:
        domain = domain.split('/')[0]
    if domain.startswith('www.'):
        domain = domain[4:]
    return domain.lower()


def extract_domain_from_url(url: str) -> str:
    """Extract and normalize domain from URL."""
    parsed = urlparse(url)
    return normalize_domain(parsed.netloc)


def get_multi_page_domains(tm: TrackerManager, min_pages: int = 2) -> list[tuple[str, int]]:
    """
    Get all domains with at least min_pages pages.

    Returns:
        List of (domain, page_count) tuples sorted by page count descending
    """
    url_tracker = tm.load('url')
    page_tracker = tm.load('page')

    # Build page_id -> url mapping
    page_to_url = {}
    for url_entry in url_tracker['urls']:
        page_id = url_entry.get('pageId')
        if page_id and url_entry.get('status') == 'completed':
            page_to_url[page_id] = url_entry['url']

    # Count pages per domain
    domain_counts = Counter()
    for page in page_tracker['pages']:
        page_id = page['id']
        url = page_to_url.get(page_id)
        if url:
            domain = extract_domain_from_url(url)
            domain_counts[domain] += 1

    # Filter and sort
    multi_page = [(domain, count) for domain, count in domain_counts.items()
                  if count >= min_pages]
    multi_page.sort(key=lambda x: x[1], reverse=True)

    return multi_page


async def analyze_domain(domain: str, script_path: Path) -> tuple[str, bool, str]:
    """
    Analyze a single domain using analyze-domain-structure.py

    Returns:
        Tuple of (domain, success, message)
    """
    try:
        proc = await asyncio.create_subprocess_exec(
            'uv', 'run', str(script_path), domain,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )

        stdout, stderr = await proc.communicate()

        if proc.returncode == 0:
            # Extract confidence from output
            output = stdout.decode()
            if '"success": true' in output:
                if '"confidence": "high"' in output:
                    return (domain, True, "HIGH")
                elif '"confidence": "medium"' in output:
                    return (domain, True, "MEDIUM")
                else:
                    return (domain, True, "LOW")
            else:
                return (domain, False, f"Analysis failed")
        else:
            error_msg = stderr.decode().strip()
            return (domain, False, f"Error: {error_msg[:100]}")

    except Exception as e:
        return (domain, False, f"Exception: {str(e)[:100]}")


async def batch_analyze_domains(
    domains: list[tuple[str, int]],
    batch_size: int,
    script_path: Path
) -> None:
    """
    Analyze domains in batches with progress reporting.

    Args:
        domains: List of (domain, page_count) tuples
        batch_size: Number of concurrent analyses
        script_path: Path to analyze-domain-structure.py
    """
    total = len(domains)
    completed = 0
    successes = 0
    high_confidence = 0
    medium_confidence = 0
    low_confidence = 0

    print(f"Analyzing {total} domains in batches of {batch_size}...")
    print()

    # Process in batches
    for i in range(0, total, batch_size):
        batch = domains[i:i + batch_size]
        batch_num = i // batch_size + 1
        total_batches = (total + batch_size - 1) // batch_size

        print(f"Batch {batch_num}/{total_batches}: Processing {len(batch)} domains...")

        # Run batch in parallel
        tasks = [analyze_domain(domain, script_path) for domain, _ in batch]
        results = await asyncio.gather(*tasks)

        # Report results
        for domain, success, message in results:
            completed += 1
            if success:
                successes += 1
                if message == "HIGH":
                    high_confidence += 1
                    status = "✓ HIGH"
                elif message == "MEDIUM":
                    medium_confidence += 1
                    status = "✓ MEDIUM"
                else:
                    low_confidence += 1
                    status = "✓ LOW"
            else:
                status = f"✗ {message}"

            print(f"  [{completed}/{total}] {domain:40} {status}")

        print()

    # Final summary
    print("=" * 80)
    print("Analysis Complete!")
    print(f"  Total domains: {total}")
    print(f"  Successful: {successes} ({100*successes/total:.1f}%)")
    print(f"  Failed: {total - successes}")
    print()
    print("Confidence distribution:")
    print(f"  HIGH confidence: {high_confidence} ({100*high_confidence/successes:.1f}%)")
    print(f"  MEDIUM confidence: {medium_confidence} ({100*medium_confidence/successes:.1f}%)")
    print(f"  LOW confidence: {low_confidence} ({100*low_confidence/successes:.1f}%)")
    print("=" * 80)


def main():
    parser = argparse.ArgumentParser(
        description="Batch analyze all multi-page domains"
    )
    parser.add_argument(
        '--min-pages',
        type=int,
        default=2,
        help='Minimum pages per domain (default: 2)'
    )
    parser.add_argument(
        '--batch-size',
        type=int,
        default=20,
        help='Number of concurrent analyses (default: 20)'
    )
    parser.add_argument(
        '--force',
        action='store_true',
        help='Skip existing analyses and re-analyze all domains'
    )
    parser.add_argument(
        '--skip-existing',
        action='store_true',
        help='Skip domains that have already been analyzed'
    )

    args = parser.parse_args()

    # Setup paths
    base_path = Path(__file__).parent.parent
    script_path = Path(__file__).parent / 'analyze-domain-structure.py'

    if not script_path.exists():
        print(f"Error: {script_path} not found")
        sys.exit(1)

    # Get multi-page domains
    tm = TrackerManager(base_path)
    domains = get_multi_page_domains(tm, args.min_pages)

    if not domains:
        print(f"No domains found with {args.min_pages}+ pages")
        sys.exit(0)

    # Show summary
    print(f"Found {len(domains)} domains with {args.min_pages}+ pages")
    print(f"Top 10: {', '.join(d for d, _ in domains[:10])}")
    print()

    # Check for existing analyses
    analysis_dir = base_path / 'analysis' / 'domain-reports'
    existing = 0
    existing_domains = set()
    if analysis_dir.exists():
        for report_file in analysis_dir.glob('*.json'):
            existing_domains.add(report_file.stem)  # domain name without .json
        existing = len(existing_domains)

    if existing > 0 and not args.force:
        print(f"Found {existing} existing analysis reports")

        if args.skip_existing:
            # Filter out already-analyzed domains
            domains = [(d, c) for d, c in domains if d not in existing_domains]
            print(f"Skipping {existing} already-analyzed domains")
            print(f"Analyzing remaining {len(domains)} domains")
            if len(domains) == 0:
                print("All domains already analyzed. Use --force to re-analyze.")
                sys.exit(0)
        else:
            print("Use --force to re-analyze all, or --skip-existing to analyze only new domains")
            sys.exit(0)

    # Run batch analysis
    asyncio.run(batch_analyze_domains(domains, args.batch_size, script_path))


if __name__ == '__main__':
    main()
