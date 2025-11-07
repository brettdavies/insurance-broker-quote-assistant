#!/usr/bin/env python3
"""
Integrate Brave Search POC results into Phase 2 pipeline.

This script converts POC result files into calls to save-urls.py,
integrating discovered URLs into the existing Phase 2 workflow.

Usage:
    # Process all results
    python integrate_results.py --results-dir ./results

    # Dry run (show commands without executing)
    python integrate_results.py --results-dir ./results --dry-run

    # Process specific search
    python integrate_results.py --results-dir ./results --search-id search_abc123
"""

import argparse
import json
import subprocess
import sys
from pathlib import Path
from typing import List, Dict


class ResultsIntegrator:
    """Integrate POC results into Phase 2 pipeline."""

    def __init__(self, results_dir: Path, scraper_dir: Path, dry_run: bool = False):
        """
        Initialize integrator.

        Args:
            results_dir: Directory containing POC result files
            scraper_dir: Path to knowledge-pack-scraper directory
            dry_run: If True, show commands without executing
        """
        self.results_dir = results_dir
        self.scraper_dir = scraper_dir
        self.dry_run = dry_run

    def load_result(self, result_file: Path) -> Dict:
        """Load a result file."""
        with open(result_file, 'r') as f:
            return json.load(f)

    def integrate_search(self, result: Dict) -> bool:
        """
        Integrate a single search result into Phase 2.

        Args:
            result: Result dictionary from POC

        Returns:
            True if successful, False otherwise
        """
        search_id = result['search_id']
        urls = [u['url'] for u in result['urls']]

        if not urls:
            print(f"[{search_id}] No URLs to integrate, skipping...")
            return True

        # Build save-urls.py command
        cmd = [
            'uv', 'run', 'scripts/save-urls.py',
            '--search-id', search_id,
            '--urls'
        ] + urls

        print(f"\n[{search_id}] Integrating {len(urls)} URLs...")
        print(f"  Query: {result['query']}")

        if self.dry_run:
            print(f"  [DRY RUN] Would execute:")
            print(f"    {' '.join(cmd)}")
            return True

        # Execute save-urls.py
        try:
            result = subprocess.run(
                cmd,
                cwd=self.scraper_dir,
                capture_output=True,
                text=True,
                check=True
            )

            # Parse JSON output
            try:
                output = json.loads(result.stdout)
                if output.get('success'):
                    print(f"  ✓ Success: {output.get('message')}")
                    print(f"    New URLs: {output.get('urls_new', 0)}")
                    print(f"    Existing URLs: {output.get('urls_existing', 0)}")
                    return True
                else:
                    print(f"  ✗ Failed: {output.get('message')}")
                    return False
            except json.JSONDecodeError:
                print(f"  ✓ Completed (non-JSON output)")
                return True

        except subprocess.CalledProcessError as e:
            print(f"  ✗ Error executing save-urls.py:")
            print(f"    {e.stderr}")
            return False

    def integrate_all(self, search_id: str = None):
        """
        Integrate all POC results into Phase 2.

        Args:
            search_id: Optional specific search ID to process
        """
        # Find result files
        if search_id:
            result_files = [self.results_dir / f"{search_id}.json"]
        else:
            result_files = sorted(self.results_dir.glob('search_*.json'))

        if not result_files:
            print(f"No result files found in {self.results_dir}")
            return

        # Exclude progress.json
        result_files = [f for f in result_files if f.name != 'progress.json']

        total = len(result_files)
        print(f"Found {total} result files to integrate")

        if self.dry_run:
            print("\n[DRY RUN MODE - No changes will be made]\n")

        print("=" * 80)

        # Process each result
        successes = 0
        failures = 0

        for idx, result_file in enumerate(result_files, 1):
            print(f"\n[{idx}/{total}]", end=' ')

            try:
                result = self.load_result(result_file)
                success = self.integrate_search(result)

                if success:
                    successes += 1
                else:
                    failures += 1

            except Exception as e:
                print(f"  ✗ Error loading {result_file.name}: {e}")
                failures += 1

        # Summary
        print("\n" + "=" * 80)
        print(f"\n✓ Integration complete!")
        print(f"  Successful: {successes}")
        print(f"  Failed: {failures}")
        print(f"  Total: {total}")

        if not self.dry_run:
            print(f"\nURLs have been registered in url-tracker.json")
            print(f"Phase 2 pipeline will now fetch and process these URLs")


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='Integrate Brave Search POC results into Phase 2 pipeline'
    )
    parser.add_argument(
        '--results-dir',
        type=Path,
        default=Path('./results'),
        help='Directory containing POC result files (default: ./results)'
    )
    parser.add_argument(
        '--scraper-dir',
        type=Path,
        default=Path('../knowledge-pack-scraper'),
        help='Path to knowledge-pack-scraper directory (default: ../knowledge-pack-scraper)'
    )
    parser.add_argument(
        '--search-id',
        type=str,
        default=None,
        help='Process specific search ID only (default: all)'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Show commands without executing them'
    )

    args = parser.parse_args()

    # Validate directories
    if not args.results_dir.exists():
        print(f"Error: Results directory not found: {args.results_dir}")
        sys.exit(1)

    if not args.scraper_dir.exists():
        print(f"Error: Scraper directory not found: {args.scraper_dir}")
        sys.exit(1)

    # Initialize integrator
    integrator = ResultsIntegrator(
        results_dir=args.results_dir,
        scraper_dir=args.scraper_dir,
        dry_run=args.dry_run
    )

    # Integrate results
    integrator.integrate_all(search_id=args.search_id)


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nInterrupted by user.")
        sys.exit(130)
    except Exception as e:
        print(f"\nFatal error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
