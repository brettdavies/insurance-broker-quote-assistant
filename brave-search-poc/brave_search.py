#!/usr/bin/env python3
"""
Brave Search API POC for Knowledge Pack Phase 2 URL Discovery

Replaces WebSearch tool with Brave Search API for automated URL discovery.
Designed for one-time batch processing of ~500 search queries.

Usage:
    python brave_search.py [--max-queries N] [--delay SECONDS] [--output-dir PATH]

Environment:
    BRAVE_API_KEY - Brave Search API key (required)
"""

import argparse
import json
import os
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional
from urllib.parse import urlparse

try:
    import requests
except ImportError:
    print("Error: 'requests' library not found. Install with: pip install requests")
    sys.exit(1)

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    print("Warning: 'python-dotenv' not found. Using environment variables only.")


class BraveSearchClient:
    """Simple Brave Search API client with mock mode."""

    BASE_URL = "https://api.search.brave.com/res/v1/web/search"

    # Mock data for testing without API key (matches Brave API WebSearchApiResponse schema)
    MOCK_RESULTS = {
        'geico': [
            {
                'type': 'search_result',
                'subtype': 'generic',
                'title': 'GEICO - State Availability',
                'url': 'https://www.geico.com/information/states/',
                'description': 'Find where GEICO insurance is available. View states where GEICO operates and get auto insurance quotes.',
                'age': '2024-01-15',
                'language': 'en',
                'family_friendly': True
            },
            {
                'type': 'search_result',
                'subtype': 'generic',
                'title': 'About GEICO | GEICO Insurance',
                'url': 'https://www.geico.com/about/',
                'description': 'Learn about GEICO coverage options, discounts, and company information.',
                'age': '2024-02-01',
                'language': 'en',
                'family_friendly': True
            },
            {
                'type': 'search_result',
                'subtype': 'generic',
                'title': 'California Department of Insurance - Licensed Companies',
                'url': 'https://www.insurance.ca.gov/01-consumers/120-company/02-companies-in-ca/',
                'description': 'Official list of insurance companies licensed to operate in California, including GEICO and other carriers.',
                'age': '2024-03-10',
                'language': 'en',
                'family_friendly': True
            },
        ],
        'progressive': [
            {
                'type': 'search_result',
                'subtype': 'generic',
                'title': 'Progressive Insurance - State Availability',
                'url': 'https://www.progressive.com/state-availability/',
                'description': 'Find out where Progressive auto insurance is available. Check if we serve your state and get a quote.',
                'age': '2024-01-20',
                'language': 'en',
                'family_friendly': True
            },
            {
                'type': 'search_result',
                'subtype': 'generic',
                'title': 'Progressive Auto Insurance Coverage & Discounts',
                'url': 'https://www.progressive.com/auto/',
                'description': 'Learn about Progressive auto insurance coverage options, available discounts, and how to save money.',
                'age': '2024-02-15',
                'language': 'en',
                'family_friendly': True
            },
            {
                'type': 'search_result',
                'subtype': 'generic',
                'title': 'Auto Insurance Facts and Statistics | III',
                'url': 'https://www.iii.org/fact-statistic/facts-statistics-auto-insurance',
                'description': 'Industry statistics on auto insurance from the Insurance Information Institute, including market share and trends.',
                'age': '2024-03-01',
                'language': 'en',
                'family_friendly': True
            },
        ],
        'default': [
            {
                'type': 'search_result',
                'subtype': 'generic',
                'title': 'Insurance Information and Resources',
                'url': 'https://www.insurance.com/info/',
                'description': 'Comprehensive insurance information, guides, and resources for consumers.',
                'age': '2024-01-01',
                'language': 'en',
                'family_friendly': True
            },
            {
                'type': 'search_result',
                'subtype': 'generic',
                'title': 'Coverage Guide - Understanding Insurance',
                'url': 'https://www.insurance.com/coverage/',
                'description': 'Learn about different types of insurance coverage and how to choose the right policy.',
                'age': '2024-02-01',
                'language': 'en',
                'family_friendly': True
            },
        ]
    }

    def __init__(self, api_key: Optional[str] = None, mock_mode: bool = False):
        """
        Initialize Brave Search client.

        Args:
            api_key: Brave Search API key (None for mock mode)
            mock_mode: Use mock data instead of real API
        """
        self.api_key = api_key
        self.mock_mode = mock_mode or api_key is None

        if not self.mock_mode:
            self.session = requests.Session()
            self.session.headers.update({
                'Accept': 'application/json',
                'Accept-Encoding': 'gzip',
                'X-Subscription-Token': api_key
            })

    def search(self, query: str, count: int = 20) -> Dict:
        """
        Perform a search query.

        Args:
            query: Search query string
            count: Number of results to return (max 20 for free tier)

        Returns:
            Search results dictionary
        """
        if self.mock_mode:
            return self._mock_search(query, count)

        params = {
            'q': query,
            'count': min(count, 20),  # Free tier limit
            'safesearch': 'off',
            'freshness': 'py',  # Past year (insurance data changes frequently)
        }

        response = self.session.get(self.BASE_URL, params=params)
        response.raise_for_status()

        return response.json()

    def _mock_search(self, query: str, count: int = 20) -> Dict:
        """
        Generate mock search results for testing.

        Args:
            query: Search query string
            count: Number of results to return

        Returns:
            Mock search results in Brave API format (WebSearchApiResponse schema)
        """
        # Determine which mock data to use based on query
        query_lower = query.lower()
        if 'geico' in query_lower:
            results = self.MOCK_RESULTS['geico']
        elif 'progressive' in query_lower:
            results = self.MOCK_RESULTS['progressive']
        else:
            results = self.MOCK_RESULTS['default']

        # Format as Brave API response (matches WebSearchApiResponse schema)
        return {
            'type': 'search',
            'query': {
                'original': query,
                'show_strict_warning': False,
                'is_navigational': False,
                'is_geolocal': False,
                'spellcheck_off': True,
                'country': 'US',
                'more_results_available': True
            },
            'web': {
                'type': 'search',
                'results': results[:count],
                'family_friendly': True
            }
        }


class URLDiscoveryPOC:
    """POC for discovering URLs using Brave Search API and integrating with Phase 2."""

    # Authoritative domain patterns for insurance data
    AUTHORITATIVE_DOMAINS = [
        # Insurance carriers
        'geico.com', 'progressive.com', 'statefarm.com', 'allstate.com',
        'libertymutual.com', 'farmers.com', 'nationwide.com', 'usaa.com',
        'travelers.com', 'thehartford.com', 'amfam.com', 'erie.com',

        # State insurance departments
        'insurance.ca.gov', 'tdi.texas.gov', 'floir.com', 'dfs.ny.gov',
        'insurance.illinois.gov', 'insurance.ohio.gov', 'insurance.pa.gov',

        # Industry associations
        'iii.org', 'naic.org', 'ambest.com', 'insurance-research.org',
    ]

    def __init__(
        self,
        client: BraveSearchClient,
        output_dir: Path,
        scraper_dir: Path,
        delay: float = 1.1,
        auto_integrate: bool = True
    ):
        """
        Initialize POC.

        Args:
            client: Brave Search API client
            output_dir: Directory to save results
            scraper_dir: Path to knowledge-pack-scraper directory
            delay: Delay between requests (seconds)
            auto_integrate: Automatically call save-urls.py after each search
        """
        self.client = client
        self.output_dir = output_dir
        self.scraper_dir = scraper_dir
        self.delay = delay
        self.auto_integrate = auto_integrate
        self.progress_file = output_dir / 'progress.json'

        # Create output directory
        output_dir.mkdir(parents=True, exist_ok=True)

        # Load progress
        self.completed_searches = self._load_progress()

    def _load_progress(self) -> set:
        """Load completed search IDs from progress file."""
        if self.progress_file.exists():
            with open(self.progress_file, 'r') as f:
                data = json.load(f)
                return set(data.get('completed_searches', []))
        return set()

    def _save_progress(self, search_id: str):
        """Save progress after completing a search."""
        self.completed_searches.add(search_id)

        with open(self.progress_file, 'w') as f:
            json.dump({
                'completed_searches': list(self.completed_searches),
                'last_updated': datetime.utcnow().isoformat() + 'Z',
                'total_completed': len(self.completed_searches)
            }, f, indent=2)

    def _is_authoritative(self, url: str) -> bool:
        """
        Check if URL is from an authoritative source.

        Args:
            url: URL to check

        Returns:
            True if URL is from authoritative domain
        """
        domain = urlparse(url).netloc.lower()

        # Remove 'www.' prefix
        if domain.startswith('www.'):
            domain = domain[4:]

        # Check against authoritative domains
        for auth_domain in self.AUTHORITATIVE_DOMAINS:
            if domain == auth_domain or domain.endswith('.' + auth_domain):
                return True

        return False

    def discover_urls(self, search: Dict) -> List[str]:
        """
        Discover URLs for a search query using Brave Search API.

        Args:
            search: Search object from search-tracker.json

        Returns:
            List of discovered URLs
        """
        query = search['query']
        search_id = search['id']

        print(f"\n[{search_id}] Searching: {query}")

        try:
            # Perform search
            results = self.client.search(query, count=20)

            # Extract URLs from results
            urls = []
            web_results = results.get('web', {}).get('results', [])

            for idx, result in enumerate(web_results, 1):
                url = result.get('url', '')
                title = result.get('title', '')
                description = result.get('description', '')

                if not url:
                    continue

                # Check if authoritative (prefer these)
                is_auth = self._is_authoritative(url)

                urls.append({
                    'url': url,
                    'title': title,
                    'description': description,
                    'rank': idx,
                    'authoritative': is_auth
                })

                status = '⭐' if is_auth else '  '
                print(f"  {status} [{idx}] {url}")
                print(f"      {title[:80]}")

            # Sort: authoritative first, then by rank
            urls.sort(key=lambda x: (not x['authoritative'], x['rank']))

            print(f"  ✓ Found {len(urls)} URLs ({sum(1 for u in urls if u['authoritative'])} authoritative)")

            return urls

        except Exception as e:
            print(f"  ✗ Error: {e}")
            return []

    def _integrate_urls(self, search_id: str, urls: List[str]) -> bool:
        """
        Integrate URLs into Phase 2 by calling save-urls.py.

        Args:
            search_id: Search ID
            urls: List of URLs to register

        Returns:
            True if successful, False otherwise
        """
        if not urls:
            print(f"  → No URLs to integrate")
            return True

        # Build save-urls.py command
        cmd = [
            'uv', 'run', 'scripts/save-urls.py',
            '--search-id', search_id,
            '--urls'
        ] + urls

        print(f"  → Integrating {len(urls)} URLs into Phase 2...")

        try:
            result = subprocess.run(
                cmd,
                cwd=self.scraper_dir,
                capture_output=True,
                text=True,
                timeout=60  # 60 second timeout
            )

            # Parse JSON output
            try:
                output = json.loads(result.stdout)
                if output.get('success'):
                    new_count = output.get('urls_new', 0)
                    existing_count = output.get('urls_existing', 0)
                    print(f"  ✓ Integrated: {new_count} new, {existing_count} existing")
                    return True
                else:
                    print(f"  ✗ Integration failed: {output.get('message')}")
                    return False
            except json.JSONDecodeError:
                # Non-JSON output, check return code
                if result.returncode == 0:
                    print(f"  ✓ Integrated successfully")
                    return True
                else:
                    print(f"  ✗ Integration failed: {result.stderr}")
                    return False

        except subprocess.TimeoutExpired:
            print(f"  ✗ Integration timeout (>60s)")
            return False
        except Exception as e:
            print(f"  ✗ Integration error: {e}")
            return False

    def process_search(self, search: Dict) -> Optional[Dict]:
        """
        Process a single search: discover URLs, save results, and optionally integrate.

        Args:
            search: Search object from search-tracker.json

        Returns:
            Result dictionary or None if already completed
        """
        search_id = search['id']

        # Skip if already completed
        if search_id in self.completed_searches:
            print(f"[{search_id}] Already completed, skipping...")
            return None

        # Discover URLs
        url_objects = self.discover_urls(search)
        urls = [u['url'] for u in url_objects]

        # Prepare result
        result = {
            'search_id': search_id,
            'query': search['query'],
            'category': search.get('category'),
            'subcategory': search.get('subcategory'),
            'carrier': search.get('carrier'),
            'priority': search.get('priority'),
            'searched_at': datetime.utcnow().isoformat() + 'Z',
            'urls_found': len(urls),
            'urls': url_objects,
            'integrated': False
        }

        # Auto-integrate if enabled
        if self.auto_integrate and self.scraper_dir:
            integration_success = self._integrate_urls(search_id, urls)
            result['integrated'] = integration_success

            if not integration_success:
                print(f"  ⚠️  Integration failed, but continuing...")

        # Save result file
        result_file = self.output_dir / f"{search_id}.json"
        with open(result_file, 'w') as f:
            json.dump(result, f, indent=2)

        # Save progress
        self._save_progress(search_id)

        # Rate limiting delay
        if self.delay > 0:
            time.sleep(self.delay)

        return result

    def process_searches(self, searches: List[Dict], max_queries: Optional[int] = None):
        """
        Process multiple searches.

        Args:
            searches: List of search objects
            max_queries: Maximum number of queries to process (None = all)
        """
        # Filter to pending searches only
        pending = [s for s in searches if s['status'] == 'pending']

        # Apply max limit
        if max_queries:
            pending = pending[:max_queries]

        total = len(pending)
        mock_mode_str = " [MOCK MODE]" if self.client.mock_mode else ""
        auto_int_str = " [AUTO-INTEGRATE]" if self.auto_integrate else ""

        print(f"\nProcessing {total} searches{mock_mode_str}{auto_int_str}")
        print(f"Already completed: {len(self.completed_searches)}")
        print(f"Rate limit delay: {self.delay}s between requests")
        print(f"Output directory: {self.output_dir}")
        if self.auto_integrate:
            print(f"Scraper directory: {self.scraper_dir}")
        print("=" * 80)

        # Process each search
        results = []
        integration_successes = 0
        integration_failures = 0

        for idx, search in enumerate(pending, 1):
            print(f"\n[{idx}/{total}]", end=' ')

            result = self.process_search(search)
            if result:
                results.append(result)
                if self.auto_integrate:
                    if result.get('integrated'):
                        integration_successes += 1
                    else:
                        integration_failures += 1

        # Summary
        print("\n" + "=" * 80)
        print(f"\n✓ Complete! Processed {len(results)} searches")
        print(f"  Total URLs discovered: {sum(r['urls_found'] for r in results)}")
        print(f"  Results saved to: {self.output_dir}")

        if self.auto_integrate:
            print(f"\n📦 Phase 2 Integration:")
            print(f"  Successful: {integration_successes}")
            print(f"  Failed: {integration_failures}")
            print(f"\nNext steps:")
            print(f"  1. Review results: python analyze_results.py")
            print(f"  2. Continue Phase 2: cd ../knowledge-pack-scraper && uv run scripts/select-work.py")
        else:
            print(f"\nNext steps:")
            print(f"  1. Review results: python analyze_results.py")
            print(f"  2. Integrate with Phase 2: python integrate_results.py")
            print(f"  3. See README.md for instructions")


def load_search_tracker(tracker_path: Path) -> List[Dict]:
    """Load searches from search-tracker.json."""
    with open(tracker_path, 'r') as f:
        data = json.load(f)

    return data.get('searches', [])


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='Brave Search API POC for Knowledge Pack URL Discovery'
    )
    parser.add_argument(
        '--max-queries',
        type=int,
        default=None,
        help='Maximum number of queries to process (default: all pending)'
    )
    parser.add_argument(
        '--delay',
        type=float,
        default=1.1,
        help='Delay between API requests in seconds (default: 1.1)'
    )
    parser.add_argument(
        '--output-dir',
        type=Path,
        default=Path('./results'),
        help='Output directory for results (default: ./results)'
    )
    parser.add_argument(
        '--tracker',
        type=Path,
        default=Path('../knowledge-pack-scraper/trackers/search-tracker.json'),
        help='Path to search-tracker.json'
    )
    parser.add_argument(
        '--scraper-dir',
        type=Path,
        default=Path('../knowledge-pack-scraper'),
        help='Path to knowledge-pack-scraper directory (default: ../knowledge-pack-scraper)'
    )
    parser.add_argument(
        '--no-auto-integrate',
        action='store_true',
        help='Disable automatic Phase 2 integration (save results only)'
    )
    parser.add_argument(
        '--mock',
        action='store_true',
        help='Use mock data instead of real API (for testing)'
    )

    args = parser.parse_args()

    # Check for API key (optional in mock mode)
    api_key = os.getenv('BRAVE_API_KEY')
    mock_mode = args.mock or api_key is None

    if not mock_mode and not api_key:
        print("Error: BRAVE_API_KEY environment variable not set")
        print("\nOptions:")
        print("  1. Set your API key:")
        print("     export BRAVE_API_KEY='your_key_here'")
        print("  2. Use mock mode for testing:")
        print("     python brave_search.py --mock")
        sys.exit(1)

    if mock_mode and not args.mock:
        print("⚠️  No API key found, using mock mode")
        print("   Set BRAVE_API_KEY to use real Brave Search API\n")

    # Validate scraper directory if auto-integrate is enabled
    auto_integrate = not args.no_auto_integrate
    if auto_integrate and not args.scraper_dir.exists():
        print(f"Error: Scraper directory not found: {args.scraper_dir}")
        print("\nOptions:")
        print("  1. Specify correct path: --scraper-dir /path/to/knowledge-pack-scraper")
        print("  2. Disable auto-integrate: --no-auto-integrate")
        sys.exit(1)

    # Load search tracker
    tracker_path = args.tracker
    if not tracker_path.exists():
        print(f"Error: Search tracker not found at {tracker_path}")
        sys.exit(1)

    print(f"Loading searches from {tracker_path}...")
    searches = load_search_tracker(tracker_path)
    print(f"Loaded {len(searches)} searches")

    # Initialize client and POC
    client = BraveSearchClient(api_key=api_key, mock_mode=mock_mode)
    poc = URLDiscoveryPOC(
        client=client,
        output_dir=args.output_dir,
        scraper_dir=args.scraper_dir,
        delay=args.delay,
        auto_integrate=auto_integrate
    )

    # Process searches
    poc.process_searches(searches, max_queries=args.max_queries)


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nInterrupted by user. Progress has been saved.")
        print("Run again to resume from where you left off.")
        sys.exit(130)
    except Exception as e:
        print(f"\nFatal error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
