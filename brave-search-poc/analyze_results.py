#!/usr/bin/env python3
"""
Analyze Brave Search POC results and show statistics.

Usage:
    python analyze_results.py --results-dir ./results
    python analyze_results.py --results-dir ./results --show-top-urls 20
"""

import argparse
import json
from collections import Counter, defaultdict
from pathlib import Path
from typing import List, Dict


class ResultsAnalyzer:
    """Analyze POC results and generate statistics."""

    def __init__(self, results_dir: Path):
        """
        Initialize analyzer.

        Args:
            results_dir: Directory containing POC result files
        """
        self.results_dir = results_dir
        self.results = []

    def load_results(self):
        """Load all result files."""
        result_files = sorted(self.results_dir.glob('search_*.json'))
        result_files = [f for f in result_files if f.name != 'progress.json']

        for result_file in result_files:
            with open(result_file, 'r') as f:
                self.results.append(json.load(f))

        print(f"Loaded {len(self.results)} search results")

    def analyze(self, show_top_urls: int = 10):
        """
        Analyze results and show statistics.

        Args:
            show_top_urls: Number of top URLs to show
        """
        if not self.results:
            print("No results to analyze")
            return

        # Basic stats
        total_searches = len(self.results)
        total_urls = sum(r['urls_found'] for r in self.results)
        avg_urls = total_urls / total_searches if total_searches > 0 else 0

        # Category breakdown
        category_counts = Counter(r.get('category', 'unknown') for r in self.results)
        carrier_counts = Counter(r.get('carrier', 'N/A') for r in self.results if r.get('carrier'))

        # URL statistics
        authoritative_urls = sum(
            sum(1 for u in r['urls'] if u.get('authoritative'))
            for r in self.results
        )

        # Domain analysis
        domain_counts = Counter()
        url_frequency = Counter()

        for result in self.results:
            for url_obj in result['urls']:
                url = url_obj['url']
                url_frequency[url] += 1

                # Extract domain
                from urllib.parse import urlparse
                domain = urlparse(url).netloc.lower()
                if domain.startswith('www.'):
                    domain = domain[4:]
                domain_counts[domain] += 1

        # Searches with no results
        no_results = [r for r in self.results if r['urls_found'] == 0]

        # Print statistics
        print("\n" + "=" * 80)
        print("BRAVE SEARCH POC - RESULTS ANALYSIS")
        print("=" * 80)

        print(f"\n📊 OVERALL STATISTICS")
        print(f"  Total searches completed: {total_searches}")
        print(f"  Total URLs discovered: {total_urls}")
        print(f"  Average URLs per search: {avg_urls:.1f}")
        print(f"  Authoritative URLs: {authoritative_urls} ({authoritative_urls/total_urls*100:.1f}%)")
        print(f"  Searches with no results: {len(no_results)}")

        print(f"\n📁 CATEGORY BREAKDOWN")
        for category, count in category_counts.most_common():
            print(f"  {category}: {count} searches")

        if carrier_counts:
            print(f"\n🏢 CARRIER BREAKDOWN")
            for carrier, count in carrier_counts.most_common(10):
                print(f"  {carrier}: {count} searches")

        print(f"\n🌐 TOP DOMAINS (by frequency)")
        for domain, count in domain_counts.most_common(20):
            print(f"  {domain}: {count} URLs")

        if show_top_urls > 0:
            print(f"\n🔗 TOP URLS (appearing in multiple searches)")
            duplicate_urls = [(url, count) for url, count in url_frequency.most_common(show_top_urls) if count > 1]

            if duplicate_urls:
                for url, count in duplicate_urls:
                    print(f"  [{count}x] {url}")
            else:
                print("  (No URLs appearing in multiple searches)")

        if no_results:
            print(f"\n⚠️  SEARCHES WITH NO RESULTS ({len(no_results)})")
            for result in no_results[:10]:
                print(f"  - {result['query']}")
            if len(no_results) > 10:
                print(f"  ... and {len(no_results) - 10} more")

        # Coverage analysis
        print(f"\n📈 COVERAGE ANALYSIS")

        # Group by carrier
        carrier_urls = defaultdict(int)
        for result in self.results:
            carrier = result.get('carrier', 'N/A')
            carrier_urls[carrier] += result['urls_found']

        for carrier, url_count in sorted(carrier_urls.items(), key=lambda x: x[1], reverse=True)[:10]:
            if carrier != 'N/A':
                print(f"  {carrier}: {url_count} URLs")

        print("\n" + "=" * 80)


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='Analyze Brave Search POC results'
    )
    parser.add_argument(
        '--results-dir',
        type=Path,
        default=Path('./results'),
        help='Directory containing POC result files (default: ./results)'
    )
    parser.add_argument(
        '--show-top-urls',
        type=int,
        default=10,
        help='Number of top URLs to show (default: 10, 0 to hide)'
    )

    args = parser.parse_args()

    # Validate directory
    if not args.results_dir.exists():
        print(f"Error: Results directory not found: {args.results_dir}")
        return

    # Analyze results
    analyzer = ResultsAnalyzer(args.results_dir)
    analyzer.load_results()
    analyzer.analyze(show_top_urls=args.show_top_urls)


if __name__ == '__main__':
    main()
