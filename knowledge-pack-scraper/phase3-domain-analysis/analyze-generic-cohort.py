#!/usr/bin/env python3
"""
Analyze all pages from domains WITHOUT custom configs to generate generic fallback.

This script treats all single-page domains (and any domains without custom analysis)
as a single cohort and analyzes their collective HTML patterns.

Usage:
    uv run scripts/analyze-generic-cohort.py
"""

import json
import sys
from collections import Counter
from datetime import datetime
from pathlib import Path
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


def get_custom_config_domains(base_path: Path) -> set:
    """Get set of domains that have custom analysis configs."""
    custom_domains = set()
    reports_dir = base_path / 'analysis' / 'domain-reports'

    if reports_dir.exists():
        for report_file in reports_dir.glob('*.json'):
            custom_domains.add(report_file.stem)

    return custom_domains


def analyze_html_file(html_path: Path) -> dict:
    """Analyze a single HTML file for structural patterns."""
    from bs4 import BeautifulSoup

    try:
        with open(html_path, 'r', encoding='utf-8') as f:
            html = f.read()

        soup = BeautifulSoup(html, 'html.parser')

        # Count content indicators
        content_indicators = {
            'article': len(soup.find_all('article')),
            'main': len(soup.find_all('main')),
            '[role="main"]': len(soup.select('[role="main"]')),
        }

        # Count non-content indicators
        non_content_indicators = {
            'header': len(soup.find_all('header')),
            'footer': len(soup.find_all('footer')),
            'nav': len(soup.find_all('nav')),
            'aside': len(soup.find_all('aside')),
        }

        # Count boilerplate patterns (class/id contains these)
        boilerplate_patterns = {
            'social': len(soup.select('[class*="social"], [id*="social"]')),
            'share': len(soup.select('[class*="share"], [id*="share"]')),
            'ad': len(soup.select('[class*="ad"], [id*="ad"]')),
            'ads': len(soup.select('[class*="ads"], [id*="ads"]')),
            'banner': len(soup.select('[class*="banner"], [id*="banner"]')),
            'tracker': len(soup.select('[class*="tracker"], [id*="tracker"]')),
            'comment': len(soup.select('[class*="comment"], [id*="comment"]')),
            'sidebar': len(soup.select('[class*="sidebar"], [id*="sidebar"]')),
            'menu': len(soup.select('[class*="menu"], [id*="menu"]')),
            'breadcrumb': len(soup.select('[class*="breadcrumb"], [id*="breadcrumb"]')),
            'form': len(soup.select('[class*="form"], [id*="form"]')),
        }

        # Extract top CSS classes
        class_counter = Counter()
        for elem in soup.find_all(class_=True):
            classes = elem.get('class', [])
            if isinstance(classes, list):
                class_counter.update(classes)

        # Extract top IDs
        id_counter = Counter()
        for elem in soup.find_all(id=True):
            id_val = elem.get('id')
            if id_val:
                id_counter[id_val] += 1

        return {
            'content_indicators': content_indicators,
            'non_content_indicators': non_content_indicators,
            'boilerplate_patterns': boilerplate_patterns,
            'top_classes': dict(class_counter.most_common(50)),
            'top_ids': dict(id_counter.most_common(30)),
        }

    except Exception as e:
        return None


def main():
    base_path = Path(__file__).parent.parent
    tm = TrackerManager(base_path)

    # Get domains with custom configs
    custom_domains = get_custom_config_domains(base_path)
    print(f"Found {len(custom_domains)} domains with custom configs")

    # Load trackers
    url_tracker = tm.load('url')
    page_tracker = tm.load('page')

    # Build page_id -> url mapping
    page_to_url = {}
    for url_entry in url_tracker['urls']:
        page_id = url_entry.get('pageId')
        if page_id and url_entry.get('status') == 'completed':
            page_to_url[page_id] = url_entry['url']

    # Find all pages from non-custom domains
    generic_cohort_pages = []
    domains_in_cohort = set()

    for page in page_tracker['pages']:
        page_id = page['id']
        url = page_to_url.get(page_id)

        if not url:
            continue

        domain = extract_domain_from_url(url)

        # Skip if domain has custom config
        if domain in custom_domains:
            continue

        html_path = tm.output_base / 'pages' / f'{page_id}.html'
        if html_path.exists():
            generic_cohort_pages.append({
                'page_id': page_id,
                'domain': domain,
                'html_path': html_path,
            })
            domains_in_cohort.add(domain)

    print(f"Found {len(generic_cohort_pages)} pages from {len(domains_in_cohort)} domains needing generic fallback")
    print()

    # Analyze all pages in the generic cohort
    print("Analyzing HTML patterns across generic cohort...")

    # Aggregate counters
    total_content_indicators = Counter()
    total_non_content_indicators = Counter()
    total_boilerplate_patterns = Counter()
    total_classes = Counter()
    total_ids = Counter()

    pages_with_each_indicator = {
        'content': {'article': 0, 'main': 0, '[role="main"]': 0},
        'non_content': {'header': 0, 'footer': 0, 'nav': 0, 'aside': 0},
        'boilerplate': {
            'social': 0, 'share': 0, 'ad': 0, 'ads': 0, 'banner': 0,
            'tracker': 0, 'comment': 0, 'sidebar': 0, 'menu': 0,
            'breadcrumb': 0, 'form': 0
        }
    }

    analyzed = 0
    for page_info in generic_cohort_pages:
        result = analyze_html_file(page_info['html_path'])
        if not result:
            continue

        analyzed += 1

        # Aggregate content indicators
        for indicator, count in result['content_indicators'].items():
            total_content_indicators[indicator] += count
            if count > 0:
                pages_with_each_indicator['content'][indicator] += 1

        # Aggregate non-content indicators
        for indicator, count in result['non_content_indicators'].items():
            total_non_content_indicators[indicator] += count
            if count > 0:
                pages_with_each_indicator['non_content'][indicator] += 1

        # Aggregate boilerplate patterns
        for pattern, count in result['boilerplate_patterns'].items():
            total_boilerplate_patterns[pattern] += count
            if count > 0:
                pages_with_each_indicator['boilerplate'][pattern] += 1

        # Aggregate classes and IDs
        total_classes.update(result['top_classes'])
        total_ids.update(result['top_ids'])

        if analyzed % 100 == 0:
            print(f"  Analyzed {analyzed}/{len(generic_cohort_pages)} pages...")

    print(f"  Analyzed {analyzed} pages successfully")
    print()

    # Calculate statistics and generate recommendations
    total_pages = analyzed

    # Content indicators
    content_indicators = []
    for indicator in ['main', 'article', '[role="main"]']:
        freq = total_content_indicators[indicator] / total_pages if total_pages > 0 else 0
        coverage = pages_with_each_indicator['content'][indicator] / total_pages if total_pages > 0 else 0

        if coverage >= 0.6:
            confidence = 'high'
        elif coverage >= 0.3:
            confidence = 'medium'
        else:
            confidence = 'low'

        content_indicators.append({
            'selector': indicator,
            'total_count': total_content_indicators[indicator],
            'avg_frequency': round(freq, 3),
            'page_coverage': round(coverage, 3),
            'confidence': confidence
        })

    # Non-content indicators
    non_content_indicators = []
    for tag in ['header', 'footer', 'nav', 'aside']:
        freq = total_non_content_indicators[tag] / total_pages if total_pages > 0 else 0
        coverage = pages_with_each_indicator['non_content'][tag] / total_pages if total_pages > 0 else 0

        if coverage >= 0.6:
            confidence = 'high'
        elif coverage >= 0.3:
            confidence = 'medium'
        else:
            confidence = 'low'

        non_content_indicators.append({
            'tag': tag,
            'total_count': total_non_content_indicators[tag],
            'avg_frequency': round(freq, 3),
            'page_coverage': round(coverage, 3),
            'confidence': confidence
        })

    # Boilerplate patterns
    boilerplate_patterns = []
    for pattern in total_boilerplate_patterns.keys():
        freq = total_boilerplate_patterns[pattern] / total_pages if total_pages > 0 else 0
        coverage = pages_with_each_indicator['boilerplate'][pattern] / total_pages if total_pages > 0 else 0

        if coverage >= 0.4:
            confidence = 'high'
        elif coverage >= 0.2:
            confidence = 'medium'
        else:
            confidence = 'low'

        boilerplate_patterns.append({
            'pattern': pattern,
            'total_count': total_boilerplate_patterns[pattern],
            'avg_frequency': round(freq, 3),
            'page_coverage': round(coverage, 3),
            'confidence': confidence
        })

    # Sort by effectiveness
    boilerplate_patterns.sort(key=lambda x: (
        x['confidence'] == 'high',
        x['page_coverage'],
        x['avg_frequency']
    ), reverse=True)

    # Generate recommendations
    # CSS selector: use high-confidence content indicators
    top_selectors = [
        ind['selector'] for ind in content_indicators
        if ind['confidence'] == 'high' and ind['page_coverage'] >= 0.3
    ]

    if not top_selectors:
        # Fallback to medium confidence
        top_selectors = [
            ind['selector'] for ind in content_indicators
            if ind['page_coverage'] >= 0.2
        ][:2]

    css_selector = ', '.join(top_selectors) if top_selectors else 'body'

    # Excluded tags: high-confidence non-content indicators
    excluded_tags = [
        ind['tag'] for ind in non_content_indicators
        if ind['confidence'] == 'high' and ind['page_coverage'] >= 0.5
    ]

    # Excluded selector: top boilerplate patterns
    top_patterns = [
        p['pattern'] for p in boilerplate_patterns
        if p['confidence'] == 'high' and p['page_coverage'] >= 0.3
    ]

    excluded_selector_parts = []
    for pattern in top_patterns[:8]:
        excluded_selector_parts.append(f'[class*="{pattern}"]')
        excluded_selector_parts.append(f'[id*="{pattern}"]')

    excluded_selector = ', '.join(excluded_selector_parts) if excluded_selector_parts else None

    generic_config = {
        'css_selector': css_selector,
        'excluded_tags': excluded_tags,
        'excluded_selector': excluded_selector,
        'word_count_threshold': 10,
        'remove_forms': True,
        'remove_overlay_elements': True,
        'confidence': 'medium',
        'description': f'Generic fallback config from {total_pages} pages across {len(domains_in_cohort)} domains without custom configs',
    }

    # Build output
    output = {
        'meta': {
            'total_pages': total_pages,
            'total_domains': len(domains_in_cohort),
            'generated_at': datetime.now().isoformat(),
            'description': 'Analysis of all pages from domains without custom configs',
        },
        'content_indicators': content_indicators,
        'non_content_indicators': non_content_indicators,
        'boilerplate_patterns': boilerplate_patterns,
        'top_classes': [{'class': cls, 'count': count} for cls, count in total_classes.most_common(30)],
        'top_ids': [{'id': id_val, 'count': count} for id_val, count in total_ids.most_common(20)],
        'generic_config': generic_config,
    }

    # Save output
    output_path = base_path / 'analysis' / 'generic-fallback.json'
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, 'w') as f:
        json.dump(output, f, indent=2)

    print(f"Generic fallback analysis saved to: {output_path}")
    print()

    # Display summary
    print("=" * 80)
    print("GENERIC FALLBACK CONFIGURATION")
    print("=" * 80)
    print()
    print(f"Based on {total_pages} pages from {len(domains_in_cohort)} domains")
    print()
    print(f"CSS Selector: {generic_config['css_selector']}")
    print(f"Excluded Tags: {', '.join(generic_config['excluded_tags'])}")
    if generic_config.get('excluded_selector'):
        print(f"Excluded Selector: {generic_config['excluded_selector'][:100]}...")
    print(f"Confidence: {generic_config['confidence']}")
    print()
    print("Top 5 Content Indicators:")
    for ind in content_indicators[:5]:
        print(f"  {ind['selector']:20} {ind['page_coverage']:.1%} pages, avg freq: {ind['avg_frequency']:.2f}, {ind['confidence']}")
    print()
    print("Top 5 Non-Content Indicators (to exclude):")
    for ind in non_content_indicators[:5]:
        print(f"  {ind['tag']:20} {ind['page_coverage']:.1%} pages, avg freq: {ind['avg_frequency']:.2f}, {ind['confidence']}")
    print()
    print("Top 8 Boilerplate Patterns:")
    for pattern in boilerplate_patterns[:8]:
        print(f"  {pattern['pattern']:20} {pattern['page_coverage']:.1%} pages, avg freq: {pattern['avg_frequency']:.2f}, {pattern['confidence']}")
    print()
    print("=" * 80)


if __name__ == '__main__':
    main()
