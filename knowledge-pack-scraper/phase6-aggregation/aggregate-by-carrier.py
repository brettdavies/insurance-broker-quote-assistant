#!/usr/bin/env python3
"""
Aggregate extracted data by carrier with source-authority deduplication.

This script:
1. Loads all data_page_*.raw.json files from raw/extractions/
2. Groups by carrier name (already normalized to lowercase during extraction)
3. Applies source-authority deduplication:
   - Carrier official site > State regulatory > 3rd party
   - First-wins if same authority level
4. Generates aggregated carrier files in aggregated/ directory
5. Tracks multi-source data points for reference
6. Separates carrier data from state data for proper organization

Usage:
    # Aggregate all extractions
    uv run aggregate-by-carrier.py

    # Aggregate specific carrier only
    uv run aggregate-by-carrier.py --carrier geico

    # Dry run (show stats, don't save)
    uv run aggregate-by-carrier.py --dry-run
"""

import argparse
import json
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple
from urllib.parse import urlparse

# Add lib directory to path
sys.path.insert(0, str(Path(__file__).parent.parent / 'lib'))

from tracker_manager import TrackerManager


class CarrierAggregator:
    """Aggregate page extractions by carrier with deduplication."""

    # Source authority levels (higher = more authoritative)
    SOURCE_AUTHORITY = {
        'carrier_official': 5,      # geico.com, progressive.com
        'state_regulatory': 4,      # insurance.ca.gov, tdi.texas.gov
        'industry_org': 3,          # iii.org, naic.org
        'financial_site': 2,        # bankrate.com, nerdwallet.com
        'unknown': 1,
    }

    def __init__(self, carrier_filter: str = None, dry_run: bool = False):
        self.carrier_filter = carrier_filter
        self.dry_run = dry_run

        # Initialize tracker manager
        self.tm = TrackerManager()

        # Output directory
        self.aggregated_dir = Path(__file__).parent.parent / 'aggregated'
        if not dry_run:
            self.aggregated_dir.mkdir(exist_ok=True)

        # Stats
        self.stats = {
            'total_pages': 0,
            'total_data_points': 0,
            'carriers_found': set(),
            'duplicates_removed': 0,
            'multi_source_items': 0
        }

    def normalize_carrier_name(self, carrier: str) -> str:
        """
        Normalize carrier name for file naming (slugification).

        Note: Carrier names should already be lowercase from extraction.
        This just handles slugification for filenames (spaces → hyphens).
        """
        carrier_clean = carrier.lower().strip()

        # Slugify for filenames (spaces → hyphens)
        return carrier_clean.replace(' ', '-').replace('_', '-')

    def get_source_authority(self, source_url: str) -> Tuple[str, int]:
        """Determine source authority level from URL."""
        domain = urlparse(source_url).netloc.lower()

        # Carrier official sites
        carrier_domains = [
            'geico.com', 'progressive.com', 'statefarm.com', 'allstate.com',
            'nationwide.com', 'farmers.com', 'libertymutual.com', 'usaa.com',
            'travelers.com'
        ]
        if any(d in domain for d in carrier_domains):
            return ('carrier_official', self.SOURCE_AUTHORITY['carrier_official'])

        # State regulatory sites
        state_domains = [
            'insurance.ca.gov', 'tdi.texas.gov', 'floir.com', 'dfs.ny.gov',
            'illinois.gov'
        ]
        if any(d in domain for d in state_domains):
            return ('state_regulatory', self.SOURCE_AUTHORITY['state_regulatory'])

        # Industry organizations
        if 'iii.org' in domain or 'naic.org' in domain:
            return ('industry_org', self.SOURCE_AUTHORITY['industry_org'])

        # Financial sites
        if 'bankrate.com' in domain or 'nerdwallet.com' in domain:
            return ('financial_site', self.SOURCE_AUTHORITY['financial_site'])

        return ('unknown', self.SOURCE_AUTHORITY['unknown'])

    def load_page_extractions(self) -> List[Dict]:
        """Load all page extraction files."""
        extractions_dir = self.tm.output_base / 'extractions'

        if not extractions_dir.exists():
            print(f"❌ No extractions found in {extractions_dir}")
            return []

        extractions = []
        for file in extractions_dir.glob('data_page_*.raw.json'):
            try:
                with open(file, encoding='utf-8') as f:
                    data = json.load(f)

                # Handle both array and single object formats
                if isinstance(data, list):
                    data_points = data
                elif isinstance(data, dict) and 'data_points' in data:
                    data_points = data['data_points']
                else:
                    continue

                page_id = file.stem.replace('data_', '')
                self.stats['total_pages'] += 1

                extractions.append({
                    'page_id': page_id,
                    'file': str(file),
                    'data_points': data_points
                })

            except (json.JSONDecodeError, KeyError) as e:
                print(f"⚠️  Error loading {file.name}: {e}")

        return extractions

    def group_by_carrier(self, extractions: List[Dict]) -> Dict[str, List]:
        """Group all data points by carrier."""
        by_carrier = defaultdict(list)

        for extraction in extractions:
            for data_point in extraction['data_points']:
                # Get carrier from data point or extraction metadata
                carrier = data_point.get('carrier', 'unknown')

                # Normalize carrier name
                carrier_key = self.normalize_carrier_name(carrier)
                self.stats['carriers_found'].add(carrier_key)

                # Add page_id for tracking
                data_point['_source_page_id'] = extraction['page_id']

                by_carrier[carrier_key].append(data_point)
                self.stats['total_data_points'] += 1

        return by_carrier

    def deduplicate_data_points(self, data_points: List[Dict]) -> List[Dict]:
        """
        Deduplicate data points using source authority.

        Strategy:
        1. Group identical data points (same type + key fields)
        2. For each group, keep highest authority source
        3. Track multi-source items for reference
        """
        # Group by content hash
        groups = defaultdict(list)

        for dp in data_points:
            # Create hash based on type + key fields
            hash_key = self._create_hash_key(dp)
            groups[hash_key].append(dp)

        # Deduplicate each group
        deduplicated = []

        for hash_key, group in groups.items():
            if len(group) == 1:
                # No duplicates
                deduplicated.append(group[0])
            else:
                # Multiple sources - apply authority ranking
                self.stats['multi_source_items'] += 1
                self.stats['duplicates_removed'] += len(group) - 1

                # Get highest authority item
                best_item = self._select_best_source(group)
                deduplicated.append(best_item)

        return deduplicated

    def _create_hash_key(self, data_point: Dict) -> str:
        """Create hash key for deduplication."""
        dp_type = data_point.get('type', 'unknown')
        data = data_point.get('data', {})

        # Hash based on type + core fields
        if dp_type == 'discount':
            name = data.get('name', '')
            percentage = data.get('percentage', 0)
            return f"discount:{name}:{percentage}"

        elif dp_type == 'eligibility':
            product = data.get('product', '')
            return f"eligibility:{product}"

        elif dp_type == 'state_availability':
            states = tuple(sorted(data.get('states', [])))
            return f"states:{states}"

        elif dp_type == 'product_offering':
            product = data.get('product', '')
            return f"product:{product}"

        elif dp_type == 'pricing_estimate':
            product = data.get('product', '')
            state = data.get('state', '')
            return f"pricing:{product}:{state}"

        elif dp_type == 'state_minimum_coverage':
            state = data.get('state', data.get('stateCode', ''))
            product = data.get('product', 'auto')
            return f"state_min:{state}:{product}"

        elif dp_type == 'state_requirement':
            state = data.get('state', data.get('stateCode', ''))
            requirement = data.get('requirement', data.get('description', ''))
            # Use first 50 chars of requirement for hash to avoid duplicates
            req_hash = requirement[:50] if requirement else ''
            return f"state_req:{state}:{req_hash}"

        else:
            # Generic hash
            return f"{dp_type}:{json.dumps(data, sort_keys=True)}"

    def _select_best_source(self, group: List[Dict]) -> Dict:
        """Select best source from group based on authority."""
        # Get source URL from each item
        def get_authority(item):
            source_url = item.get('source_url', '') or item.get('data', {}).get('source_url', '')
            _, authority = self.get_source_authority(source_url)
            return authority

        # Sort by authority (highest first), then by first occurrence
        sorted_group = sorted(group, key=get_authority, reverse=True)
        return sorted_group[0]

    def save_aggregated_files(self, by_carrier: Dict[str, List]) -> None:
        """Save aggregated carrier files."""
        for carrier, data_points in by_carrier.items():
            # Skip if filtering by carrier
            if self.carrier_filter and carrier != self.carrier_filter:
                continue

            # Deduplicate
            deduplicated = self.deduplicate_data_points(data_points)

            # Create output structure
            aggregated = {
                'carrier': carrier,
                'generated': datetime.now().isoformat(),
                'total_data_points': len(deduplicated),
                'source_pages': len(set(dp.get('_source_page_id') for dp in deduplicated)),
                'data_points': deduplicated
            }

            # Save to file
            output_file = self.aggregated_dir / f"{carrier}.json"

            if not self.dry_run:
                with open(output_file, 'w', encoding='utf-8') as f:
                    json.dump(aggregated, f, indent=2)

                print(f"✅ Saved {carrier}.json ({len(deduplicated)} data points)")
            else:
                print(f"📋 Would save {carrier}.json ({len(deduplicated)} data points)")

    def generate_report(self, by_carrier: Dict[str, List]) -> None:
        """Generate aggregation report."""
        print()
        print("="* 60)
        print("📊 Aggregation Report")
        print("="* 60)
        print(f"Total pages processed: {self.stats['total_pages']}")
        print(f"Total data points: {self.stats['total_data_points']}")
        print(f"Carriers found: {len(self.stats['carriers_found'])}")
        print(f"Duplicates removed: {self.stats['duplicates_removed']}")
        print(f"Multi-source items: {self.stats['multi_source_items']}")
        print()

        print("Carriers breakdown:")
        for carrier in sorted(by_carrier.keys()):
            count = len(by_carrier[carrier])
            dedup_count = len(self.deduplicate_data_points(by_carrier[carrier]))
            print(f"  {carrier}: {count} raw → {dedup_count} deduplicated")

        print("="* 60)

    def run(self) -> None:
        """Run aggregation pipeline."""
        print(f"🚀 Starting carrier aggregation")
        print(f"   Dry run: {self.dry_run}")
        print(f"   Carrier filter: {self.carrier_filter or 'None (all)'}")
        print()

        # Load page extractions
        print("📄 Loading page extractions...")
        extractions = self.load_page_extractions()

        if len(extractions) == 0:
            print("❌ No extractions found")
            return

        print(f"✅ Loaded {len(extractions)} page extractions")
        print()

        # Group by carrier
        print("🏢 Grouping by carrier...")
        by_carrier = self.group_by_carrier(extractions)
        print(f"✅ Found {len(by_carrier)} carriers")
        print()

        # Save aggregated files
        print("💾 Saving aggregated files...")
        self.save_aggregated_files(by_carrier)
        print()

        # Generate report
        self.generate_report(by_carrier)


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Aggregate extracted data by carrier"
    )
    parser.add_argument(
        '--carrier',
        help='Filter to specific carrier (e.g., geico, progressive)'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Show stats without saving files'
    )

    args = parser.parse_args()

    # Run aggregation
    aggregator = CarrierAggregator(
        carrier_filter=args.carrier,
        dry_run=args.dry_run
    )
    aggregator.run()


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n❌ Interrupted by user")
        sys.exit(130)
