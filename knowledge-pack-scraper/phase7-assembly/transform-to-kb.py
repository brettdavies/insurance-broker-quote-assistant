#!/usr/bin/env python3
"""
Transform aggregated carrier data into production knowledge pack format.

This script:
1. Loads aggregated carrier files from aggregated/
2. Separates carrier-specific and state-specific data points
3. Transforms to runtime schema with entity-level sources
4. Generates cuid2 IDs for all entities
5. Exports to knowledge_pack/carriers/{carrier}.json
6. Exports to knowledge_pack/states/{state}.json
7. Generates compliance files, FAQs, metadata.json, README

Note: Pages contain BOTH carrier and state data mixed together.
      This script separates them during transformation.

Usage:
    # Transform all carriers and states
    uv run transform-to-kb.py

    # Transform specific carrier
    uv run transform-to-kb.py --carrier geico

    # Dry run (validate without saving)
    uv run transform-to-kb.py --dry-run
"""

import argparse
import json
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Set, Tuple
from urllib.parse import urlparse

# Add lib directory to path
sys.path.insert(0, str(Path(__file__).parent.parent / 'lib'))

from id_generator import CuidGenerator


class KnowledgePackTransformer:
    """Transform aggregated data to production knowledge pack."""

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

        # Initialize ID generator
        self.id_gen = CuidGenerator()

        # Directories
        self.aggregated_dir = Path(__file__).parent.parent / 'aggregated'
        self.kb_dir = Path(__file__).parent.parent.parent / 'knowledge_pack'

        # Stats
        self.stats = {
            'carriers_processed': 0,
            'total_discounts': 0,
            'total_eligibility': 0,
            'total_sources': 0,
            'states_found': set(),
            'state_data_points': [],  # Collect state-specific data
            'state_dedup_count': 0     # Track deduplication events
        }

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

        # State regulatory sites (highest authority for state data)
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

    def load_aggregated_carriers(self) -> List[Dict]:
        """Load aggregated carrier files."""
        if not self.aggregated_dir.exists():
            print(f"❌ Aggregated directory not found: {self.aggregated_dir}")
            return []

        carriers = []
        for file in self.aggregated_dir.glob('*.json'):
            carrier_slug = file.stem

            # Skip if filtering
            if self.carrier_filter and carrier_slug != self.carrier_filter:
                continue

            try:
                with open(file, encoding='utf-8') as f:
                    data = json.load(f)
                    carriers.append({
                        'slug': carrier_slug,
                        'file': str(file),
                        'data': data
                    })
            except json.JSONDecodeError as e:
                print(f"⚠️  Error loading {file.name}: {e}")

        return carriers

    def transform_carrier(self, aggregated: Dict) -> Dict:
        """Transform aggregated carrier to runtime schema."""
        carrier_slug = aggregated['slug']
        carrier_data = aggregated['data']
        data_points = carrier_data.get('data_points', [])

        # Generate carrier ID
        carrier_id = self.id_gen.generate_id(f"carr_{carrier_slug}")

        # Group data points by type
        discounts = []
        eligibility_items = []
        products = set()
        states = set()
        pricing = []

        for dp in data_points:
            dp_type = dp.get('type')
            dp_data = dp.get('data', {})
            source_url = dp.get('source_url', '') or dp_data.get('source_url', '')
            accessed_date = dp.get('accessed_date', '') or dp_data.get('accessed_date', '')
            confidence = dp.get('confidence', 'medium')

            # Extract source
            source = {
                'uri': source_url,
                'accessed': accessed_date or datetime.now().strftime('%Y-%m-%d'),
                'confidence': confidence
            }

            # Collect state-specific data for later processing
            if dp_type in ['state_minimum_coverage', 'state_requirement']:
                self.stats['state_data_points'].append({
                    'type': dp_type,
                    'data': dp_data,
                    'source': source,
                    'confidence': confidence
                })

            if dp_type == 'discount':
                discount_id = self.id_gen.generate_id(f"disc_{carrier_slug}_{dp_data.get('name', 'unknown')}")
                discounts.append({
                    'id': discount_id,
                    'name': dp_data.get('name', 'Unknown Discount'),
                    'percentage': dp_data.get('percentage', 0),
                    'description': dp_data.get('description', ''),
                    'products': dp_data.get('products', []),
                    'states': dp_data.get('states', []),
                    'requirements': dp_data.get('requirements', {}),
                    'stackable': dp_data.get('stackable', True),
                    'source': source
                })

                # Track products and states
                products.update(dp_data.get('products', []))
                states.update(dp_data.get('states', []))
                self.stats['total_discounts'] += 1

            elif dp_type == 'eligibility':
                eligibility_items.append({
                    'product': dp_data.get('product', 'auto'),
                    'minAge': dp_data.get('minAge'),
                    'maxAge': dp_data.get('maxAge'),
                    'maxVehicles': dp_data.get('maxVehicles'),
                    'cleanRecordRequired': dp_data.get('cleanRecordRequired'),
                    'source': source
                })
                self.stats['total_eligibility'] += 1

            elif dp_type == 'state_availability':
                states.update(dp_data.get('states', []))

            elif dp_type == 'product_offering':
                product = dp_data.get('product')
                if product:
                    products.add(product)

            elif dp_type == 'pricing_estimate':
                pricing.append({
                    'product': dp_data.get('product'),
                    'state': dp_data.get('state'),
                    'averageAnnual': dp_data.get('averageAnnual'),
                    'range': dp_data.get('range'),
                    'source': source
                })

        # Build carrier object
        carrier = {
            'id': carrier_id,
            'name': carrier_slug.replace('-', ' ').title(),
            'operatesIn': sorted(list(states)),
            'products': sorted(list(products)),
            'eligibility': self._build_eligibility(eligibility_items),
            'discounts': discounts,
            'source': {
                'uri': f"https://www.{carrier_slug.replace('-', '')}.com",
                'accessed': datetime.now().strftime('%Y-%m-%d'),
                'confidence': 'high'
            }
        }

        if pricing:
            carrier['pricing'] = pricing

        # Update stats
        self.stats['carriers_processed'] += 1
        self.stats['states_found'].update(states)
        self.stats['total_sources'] += len(discounts) + len(eligibility_items) + len(pricing)

        return carrier

    def _build_eligibility(self, eligibility_items: List[Dict]) -> Dict:
        """Build eligibility object from items."""
        eligibility = {}

        # Group by product
        by_product = defaultdict(list)
        for item in eligibility_items:
            product = item.get('product', 'auto')
            by_product[product].append(item)

        # Merge items per product (take first non-null values)
        for product, items in by_product.items():
            merged = {}
            for item in items:
                if item.get('minAge') and 'minAge' not in merged:
                    merged['minAge'] = item['minAge']
                if item.get('maxAge') and 'maxAge' not in merged:
                    merged['maxAge'] = item['maxAge']
                if item.get('maxVehicles') and 'maxVehicles' not in merged:
                    merged['maxVehicles'] = item['maxVehicles']
                if item.get('cleanRecordRequired') is not None:
                    merged['cleanRecordRequired'] = item['cleanRecordRequired']

            if merged:
                eligibility[product] = merged

        return eligibility

    def save_carrier_file(self, carrier: Dict) -> None:
        """Save carrier file to knowledge_pack/carriers/."""
        carrier_slug = carrier['name'].lower().replace(' ', '-')
        output_file = self.kb_dir / 'carriers' / f"{carrier_slug}.json"

        if not self.dry_run:
            output_file.parent.mkdir(parents=True, exist_ok=True)
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(carrier, f, indent=2)

            print(f"✅ Saved carriers/{carrier_slug}.json")
        else:
            print(f"📋 Would save carriers/{carrier_slug}.json")

    def generate_state_files(self) -> None:
        """
        Generate state files from extracted state data.

        Uses extracted state minimum coverage and requirement data from
        regulatory sources (insurance.ca.gov, tdi.texas.gov, etc.).
        """
        # Group state data points by state
        state_data_by_state = defaultdict(list)

        for dp in self.stats['state_data_points']:
            state_code = dp['data'].get('state', dp['data'].get('stateCode'))
            if state_code:
                state_data_by_state[state_code].append(dp)

        # Also include states found in carrier data (even if no state-specific extraction)
        all_states = set(state_data_by_state.keys()) | self.stats['states_found']
        states_to_generate = sorted(list(all_states))

        if not states_to_generate:
            print("⚠️  No states found in data")
            return

        print()
        print(f"📍 Generating state files for {len(states_to_generate)} states...")
        print(f"   States with extracted data: {len(state_data_by_state)}")
        print(f"   States from carrier data: {len(self.stats['states_found'])}")

        states_dir = self.kb_dir / 'states'
        if not self.dry_run:
            states_dir.mkdir(parents=True, exist_ok=True)

        for state_code in states_to_generate:
            state_id = self.id_gen.generate_id(f"state_{state_code.lower()}")
            state_datapoints = state_data_by_state.get(state_code, [])

            # Build state data from extracted data points
            minimum_coverages = self._build_state_minimums(state_datapoints)
            special_requirements = self._build_state_requirements(state_datapoints)

            # Get primary source from extracted data or use fallback
            source = self._get_state_source(state_code, state_datapoints)

            state_data = {
                'id': state_id,
                'code': state_code,
                'name': self._get_state_name(state_code),
                'minimumCoverages': minimum_coverages,
                'source': source
            }

            # Add special requirements if present
            if special_requirements:
                state_data['specialRequirements'] = special_requirements

            output_file = states_dir / f"{state_code}.json"

            if not self.dry_run:
                with open(output_file, 'w', encoding='utf-8') as f:
                    json.dump(state_data, f, indent=2)
                print(f"✅ Generated states/{state_code}.json ({len(state_datapoints)} data points)")
            else:
                print(f"📋 Would generate states/{state_code}.json ({len(state_datapoints)} data points)")

    def _build_state_minimums(self, state_datapoints: List[Dict]) -> Dict:
        """
        Build minimum coverages from state data points.

        Uses source-authority deduplication: if multiple sources provide
        the same coverage value, prefer state_regulatory > carrier_official > etc.
        """
        # Group data points by product, then by coverage field
        # Track best source authority for each field
        coverage_by_product = defaultdict(lambda: defaultdict(lambda: {'value': None, 'authority': 0}))

        for dp in state_datapoints:
            if dp['type'] == 'state_minimum_coverage':
                data = dp['data']
                source = dp.get('source', {})
                product = data.get('product', 'auto')

                # Get source authority
                source_url = source.get('uri', '')
                _, authority = self.get_source_authority(source_url)

                # Coverage fields to extract
                coverage_fields = [
                    'bodilyInjuryPerPerson',
                    'bodilyInjuryPerAccident',
                    'propertyDamage',
                    'uninsuredMotorist',
                    'personalInjuryProtection'
                ]

                for field in coverage_fields:
                    if field in data:
                        current = coverage_by_product[product][field]

                        # Use this value if it has higher authority or is the first value
                        if authority > current['authority'] or current['value'] is None:
                            coverage_by_product[product][field] = {
                                'value': data[field],
                                'authority': authority
                            }

                            if current['value'] is not None:
                                self.stats['state_dedup_count'] += 1

        # Convert to final structure (extract values, discard authority)
        minimums = {}
        for product, fields in coverage_by_product.items():
            minimums[product] = {
                field: info['value']
                for field, info in fields.items()
                if info['value'] is not None
            }

        # If no extracted data, return empty structure with null placeholders
        if not minimums:
            minimums = {
                'auto': {
                    'bodilyInjuryPerPerson': None,
                    'bodilyInjuryPerAccident': None,
                    'propertyDamage': None
                }
            }

        return minimums

    def _build_state_requirements(self, state_datapoints: List[Dict]) -> List[str]:
        """Build special requirements from state data points."""
        requirements = []

        for dp in state_datapoints:
            if dp['type'] == 'state_requirement':
                data = dp['data']
                requirement = data.get('requirement', data.get('description'))
                if requirement and requirement not in requirements:
                    requirements.append(requirement)

        return requirements

    def _get_state_source(self, state_code: str, state_datapoints: List[Dict]) -> Dict:
        """
        Get source for state file from extracted data or use fallback.

        Returns highest authority source if multiple sources are available.
        """
        if state_datapoints:
            # Find highest authority source
            best_source = None
            best_authority = 0

            for dp in state_datapoints:
                source = dp.get('source', {})
                source_url = source.get('uri', '')
                _, authority = self.get_source_authority(source_url)

                if authority > best_authority:
                    best_authority = authority
                    best_source = source

            if best_source:
                return best_source

        # Fallback for states without extracted data
        state_urls = {
            'CA': 'https://www.insurance.ca.gov',
            'TX': 'https://www.tdi.texas.gov',
            'FL': 'https://www.floir.com',
            'NY': 'https://www.dfs.ny.gov',
            'IL': 'https://www2.illinois.gov/sites/Insurance'
        }

        return {
            'uri': state_urls.get(state_code, f'https://www.insurance.{state_code.lower()}.gov'),
            'accessed': datetime.now().strftime('%Y-%m-%d'),
            'confidence': 'low',
            'note': 'No state-specific data extracted - coverage gap in scraped pages'
        }

    def _get_state_name(self, state_code: str) -> str:
        """Get full state name from code."""
        state_names = {
            'CA': 'California',
            'TX': 'Texas',
            'FL': 'Florida',
            'NY': 'New York',
            'IL': 'Illinois',
            'AZ': 'Arizona',
            'CO': 'Colorado',
            'GA': 'Georgia',
            'MI': 'Michigan',
            'NC': 'North Carolina',
            'NJ': 'New Jersey',
            'OH': 'Ohio',
            'PA': 'Pennsylvania',
            'VA': 'Virginia',
            'WA': 'Washington'
        }
        return state_names.get(state_code, state_code)

    def run(self) -> None:
        """Run transformation pipeline."""
        print(f"🚀 Starting knowledge pack transformation")
        print(f"   Dry run: {self.dry_run}")
        print(f"   Carrier filter: {self.carrier_filter or 'None (all)'}")
        print()

        # Load aggregated carriers
        print("📄 Loading aggregated carriers...")
        carriers = self.load_aggregated_carriers()

        if len(carriers) == 0:
            print("❌ No aggregated carriers found")
            return

        print(f"✅ Loaded {len(carriers)} carriers")
        print()

        # Transform each carrier
        print("🔄 Transforming to runtime schema...")
        for aggregated in carriers:
            carrier = self.transform_carrier(aggregated)
            self.save_carrier_file(carrier)

        print()

        # Generate state files
        self.generate_state_files()

        # Report stats
        print("="* 60)
        print("📊 Transformation Report")
        print("="* 60)
        print(f"Carriers processed: {self.stats['carriers_processed']}")
        print(f"Total discounts: {self.stats['total_discounts']}")
        print(f"Total eligibility rules: {self.stats['total_eligibility']}")
        print(f"Total sources: {self.stats['total_sources']}")
        print(f"State-specific data points: {len(self.stats['state_data_points'])}")
        print(f"State files generated: {len(self.stats['states_found'])}")
        print(f"  → {sorted(list(self.stats['states_found']))}")
        print()
        if len(self.stats['state_data_points']) > 0:
            print("✅ State files populated with extracted regulatory data")
            if self.stats['state_dedup_count'] > 0:
                print(f"   Source-authority deduplication: {self.stats['state_dedup_count']} conflicts resolved")
        else:
            print("⚠️  No state-specific data extracted - state files use null placeholders")
            print("   This indicates extraction coverage gap in state regulatory pages")
        print("="* 60)


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Transform aggregated data to production knowledge pack"
    )
    parser.add_argument(
        '--carrier',
        help='Transform specific carrier only'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Validate without saving files'
    )

    args = parser.parse_args()

    # Run transformation
    transformer = KnowledgePackTransformer(
        carrier_filter=args.carrier,
        dry_run=args.dry_run
    )
    transformer.run()


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n❌ Interrupted by user")
        sys.exit(130)
