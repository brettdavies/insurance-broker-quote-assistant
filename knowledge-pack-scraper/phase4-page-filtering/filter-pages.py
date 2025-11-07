#!/usr/bin/env python3
"""
Filter pages using domain-specific or generic fallback configurations.

This script processes all HTML pages with appropriate content extraction
configurations based on domain analysis. It generates three outputs per page:
  1. {page_id}_filtered.md - Clean content
  2. {page_id}_filtered_negative.md - Removed content (for validation)
  3. {page_id}_quality.json - Quality metrics

Usage:
    uv run scripts/filter-pages.py
    uv run scripts/filter-pages.py --domain progressive.com
    uv run scripts/filter-pages.py --limit 100
    uv run scripts/filter-pages.py --workers 10
"""

import argparse
import asyncio
import json
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional
from urllib.parse import urlparse

# Add lib directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / 'lib'))
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


def load_domain_config(domain: str, base_path: Path) -> Optional[Dict]:
    """
    Load domain-specific configuration from analysis report.

    Returns:
        Dict with config or None if not found
    """
    report_path = base_path / 'analysis' / 'domain-reports' / f'{domain}.json'

    if report_path.exists():
        with open(report_path) as f:
            report = json.load(f)
            recommendations = report.get('recommendations', {})
            # Normalize confidence field name
            if 'confidence_score' in recommendations:
                recommendations['confidence'] = recommendations['confidence_score']
            return recommendations

    return None


def load_generic_config(base_path: Path) -> Dict:
    """
    Load generic fallback configuration.

    Returns:
        Dict with generic config
    """
    fallback_path = base_path / 'analysis' / 'generic-fallback.json'

    if fallback_path.exists():
        with open(fallback_path) as f:
            aggregate = json.load(f)
            return aggregate.get('generic_config', {})

    # Hardcoded fallback if file doesn't exist
    return {
        'css_selector': 'main',
        'excluded_tags': ['header', 'nav', 'footer'],
        'excluded_selector': '[class*="ad"], [class*="menu"], [class*="social"]',
        'word_count_threshold': 10,
        'confidence': 'low',
    }


async def filter_page(
    page_id: str,
    html_file: Path,
    md_file: Path,
    config: Dict,
    output_dir: Path
) -> Dict:
    """
    Filter a single page using crawl4ai to preserve markdown formatting.

    Args:
        page_id: Page ID
        html_file: Path to raw HTML file
        md_file: Path to raw markdown file
        config: Extraction configuration
        output_dir: Output directory for filtered files

    Returns:
        Quality metrics dict
    """
    try:
        from bs4 import BeautifulSoup
        from markdownify import markdownify as md
        import difflib
        import re

        # Read raw files
        with open(html_file, 'r', encoding='utf-8') as f:
            html_content = f.read()

        with open(md_file, 'r', encoding='utf-8') as f:
            raw_markdown = f.read()

        # Get config values
        css_selector = config.get('css_selector', 'body')
        excluded_tags = config.get('excluded_tags', [])
        excluded_selector = config.get('excluded_selector')

        # Parse HTML
        soup = BeautifulSoup(html_content, 'html.parser')

        # Apply css_selector (hard filter - select only these elements)
        if css_selector and css_selector != 'body':
            selected_elements = soup.select(css_selector)
            if selected_elements:
                # Create new soup with only selected elements
                new_soup = BeautifulSoup('', 'html.parser')
                for elem in selected_elements:
                    new_soup.append(elem.extract())
                soup = new_soup

        # Apply excluded_tags (remove these tags entirely)
        for tag in excluded_tags:
            for elem in soup.find_all(tag):
                elem.decompose()

        # Apply excluded_selector (remove elements matching these patterns)
        if excluded_selector:
            for selector in excluded_selector.split(', '):
                selector = selector.strip()
                if selector:
                    for elem in soup.select(selector):
                        elem.decompose()

        # Convert filtered HTML to markdown using markdownify
        filtered_markdown = md(str(soup), heading_style="ATX")

        # Clean up extra whitespace
        filtered_markdown = re.sub(r'\n{3,}', '\n\n', filtered_markdown)
        filtered_markdown = filtered_markdown.strip()

        # Calculate word counts
        raw_word_count = len(raw_markdown.split())
        filtered_word_count = len(filtered_markdown.split())
        reduction_ratio = 1 - (filtered_word_count / raw_word_count) if raw_word_count > 0 else 0

        # Generate actual diff for negative space
        raw_lines = raw_markdown.splitlines(keepends=True)
        filtered_lines = filtered_markdown.splitlines(keepends=True)

        diff = list(difflib.unified_diff(
            filtered_lines,
            raw_lines,
            fromfile='filtered.md',
            tofile='original.md',
            lineterm=''
        ))

        # Extract only removed lines (lines that start with '+' in the diff)
        # Then deduplicate to remove lines that also appear in filtered content
        negative_lines = []
        for line in diff:
            if line.startswith('+') and not line.startswith('+++'):
                negative_lines.append(line[1:])  # Remove the '+' prefix

        # Create set of lines in filtered markdown for deduplication
        filtered_lines_set = set(filtered_markdown.splitlines())

        # Keep only lines that don't appear in filtered markdown
        unique_negative_lines = []
        for line in negative_lines:
            line_stripped = line.rstrip('\n')
            if line_stripped and line_stripped not in filtered_lines_set:
                unique_negative_lines.append(line_stripped)

        negative_space = '\n'.join(unique_negative_lines)

        # Save outputs
        filtered_file = output_dir / f'{page_id}_filtered.md'
        negative_file = output_dir / f'{page_id}_filtered_negative.md'
        quality_file = output_dir / f'{page_id}_quality.json'

        with open(filtered_file, 'w', encoding='utf-8') as f:
            f.write(filtered_markdown)

        with open(negative_file, 'w', encoding='utf-8') as f:
            f.write(negative_space)

        quality_metrics = {
            'page_id': page_id,
            'raw_word_count': raw_word_count,
            'filtered_word_count': filtered_word_count,
            'removed_word_count': raw_word_count - filtered_word_count,
            'reduction_ratio': round(reduction_ratio, 3),
            'config': {
                'css_selector': css_selector,
                'excluded_tags': excluded_tags,
                'excluded_selector': excluded_selector,
                'confidence': config.get('confidence', 'unknown'),
            },
            'filtered_at': datetime.now().isoformat(),
        }

        with open(quality_file, 'w') as f:
            json.dump(quality_metrics, f, indent=2)

        return quality_metrics

    except Exception as e:
        return {
            'page_id': page_id,
            'error': str(e),
            'filtered_at': datetime.now().isoformat(),
        }


async def batch_filter_pages(
    pages: List[Dict],
    config_map: Dict[str, Dict],
    generic_config: Dict,
    output_dir: Path,
    batch_size: int
) -> Dict:
    """
    Filter pages in batches with progress reporting.

    Returns:
        Summary statistics
    """
    total = len(pages)
    completed = 0
    successes = 0
    errors = 0
    total_reduction = 0.0

    print(f"Filtering {total} pages in batches of {batch_size}...")
    print()

    # Process in batches
    for i in range(0, total, batch_size):
        batch = pages[i:i + batch_size]
        batch_num = i // batch_size + 1
        total_batches = (total + batch_size - 1) // batch_size

        print(f"Batch {batch_num}/{total_batches}: Processing {len(batch)} pages...")

        # Run batch in parallel
        tasks = []
        for page in batch:
            page_id = page['page_id']
            domain = page['domain']
            html_file = page['html_file']
            md_file = page['md_file']

            # Get config (domain-specific or generic fallback)
            config = config_map.get(domain, generic_config)

            tasks.append(filter_page(page_id, html_file, md_file, config, output_dir))

        results = await asyncio.gather(*tasks)

        # Report results
        for result in results:
            completed += 1
            if 'error' in result:
                errors += 1
                print(f"  [{completed}/{total}] {result['page_id']:40} ✗ {result['error'][:50]}")
            else:
                successes += 1
                reduction = result['reduction_ratio']
                total_reduction += reduction
                words = result['filtered_word_count']
                confidence = result['config']['confidence']
                print(f"  [{completed}/{total}] {result['page_id']:40} ✓ {words:5} words ({reduction*100:5.1f}% reduced) [{confidence}]")

        print()

    # Calculate averages
    avg_reduction = total_reduction / successes if successes > 0 else 0

    return {
        'total_pages': total,
        'successful': successes,
        'errors': errors,
        'average_reduction': round(avg_reduction, 3),
    }


def main():
    parser = argparse.ArgumentParser(
        description="Filter pages using domain-specific or generic fallback configs"
    )
    parser.add_argument(
        '--domain',
        type=str,
        help='Filter only pages from specific domain'
    )
    parser.add_argument(
        '--limit',
        type=int,
        help='Limit number of pages to process'
    )
    parser.add_argument(
        '--batch-size',
        type=int,
        default=20,
        help='Number of concurrent page filters (default: 20)'
    )
    parser.add_argument(
        '--output',
        type=Path,
        default=Path('../raw/pages'),
        help='Output directory for filtered pages (default: raw/pages)'
    )

    args = parser.parse_args()

    # Setup paths
    base_path = Path(__file__).parent.parent
    output_dir = base_path / args.output
    output_dir.mkdir(parents=True, exist_ok=True)

    # Load trackers
    tm = TrackerManager(base_path)
    url_tracker = tm.load('url')
    page_tracker = tm.load('page')

    # Build page_id -> url mapping
    page_to_url = {}
    for url_entry in url_tracker['urls']:
        page_id = url_entry.get('pageId')
        if page_id and url_entry.get('status') == 'completed':
            page_to_url[page_id] = url_entry['url']

    # Load domain configs
    print("Loading domain configurations...")
    config_map = {}

    reports_dir = base_path / 'analysis' / 'domain-reports'
    if reports_dir.exists():
        for report_file in reports_dir.glob('*.json'):
            domain = report_file.stem
            config = load_domain_config(domain, base_path)
            if config:
                config_map[domain] = config

    print(f"Loaded {len(config_map)} domain-specific configurations")

    # Load generic fallback
    print("Loading generic fallback configuration...")
    generic_config = load_generic_config(base_path)
    print(f"Generic fallback loaded (confidence: {generic_config.get('confidence', 'unknown')})")
    print()

    # Build list of pages to filter
    pages_to_filter = []

    for page in page_tracker['pages']:
        page_id = page['id']
        url = page_to_url.get(page_id)

        if not url:
            continue

        domain = extract_domain_from_url(url)

        # Filter by domain if specified
        if args.domain and domain != normalize_domain(args.domain):
            continue

        # Check files exist (using TrackerManager output_base)
        html_file = tm.output_base / 'pages' / f'{page_id}.html'
        md_file = tm.output_base / 'pages' / f'{page_id}.md'

        if not html_file.exists() or not md_file.exists():
            continue

        pages_to_filter.append({
            'page_id': page_id,
            'domain': domain,
            'html_file': html_file,
            'md_file': md_file,
        })

    # Apply limit if specified
    if args.limit:
        pages_to_filter = pages_to_filter[:args.limit]

    if not pages_to_filter:
        print("No pages to filter")
        sys.exit(0)

    # Show summary
    domain_counts = {}
    for page in pages_to_filter:
        domain = page['domain']
        domain_counts[domain] = domain_counts.get(domain, 0) + 1

    print(f"Filtering {len(pages_to_filter)} pages from {len(domain_counts)} domains")
    print(f"Using {len(config_map)} domain-specific configs + 1 generic fallback")
    print()

    # Run filtering
    summary = asyncio.run(
        batch_filter_pages(
            pages_to_filter,
            config_map,
            generic_config,
            output_dir,
            args.batch_size
        )
    )

    # Final summary
    print("=" * 80)
    print("FILTERING COMPLETE")
    print("=" * 80)
    print(f"Total pages: {summary['total_pages']}")
    print(f"Successful: {summary['successful']} ({100*summary['successful']/summary['total_pages']:.1f}%)")
    print(f"Errors: {summary['errors']}")
    print(f"Average reduction: {summary['average_reduction']*100:.1f}%")
    print()
    print(f"Output directory: {output_dir}")
    print("=" * 80)


if __name__ == '__main__':
    main()
