#!/usr/bin/env python3
"""
Analyze HTML structure patterns for a specific domain.

This script analyzes all pages from a given domain to identify common patterns
for content extraction. It generates a statistical report with confidence scores
and recommends an extraction configuration.

Usage:
    uv run scripts/analyze-domain-structure.py progressive.com
    uv run scripts/analyze-domain-structure.py --domain www.progressive.com
    uv run scripts/analyze-domain-structure.py --all  # Analyze all domains

Features:
- Domain normalization (www.domain.com → domain.com)
- Content indicator detection (<article>, <main>, etc.)
- Non-content indicator detection (<header>, <footer>, <nav>, etc.)
- Boilerplate pattern analysis (ads, social, forms, comments)
- CSS class/ID frequency analysis
- Statistical confidence scoring
"""

import argparse
import json
import re
import sys
from collections import Counter
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Set
from urllib.parse import urlparse

# Add lib directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / 'lib'))

from tracker_manager import TrackerManager


def normalize_domain(domain: str) -> str:
    """
    Normalize domain by removing www prefix and protocol.

    Args:
        domain: Raw domain (e.g., "www.progressive.com", "https://progressive.com")

    Returns:
        Normalized domain (e.g., "progressive.com")
    """
    # Remove protocol if present
    if '://' in domain:
        domain = domain.split('://')[1]

    # Remove path if present
    if '/' in domain:
        domain = domain.split('/')[0]

    # Remove www prefix
    if domain.startswith('www.'):
        domain = domain[4:]

    return domain.lower()


def extract_domain_from_url(url: str) -> str:
    """Extract and normalize domain from URL."""
    parsed = urlparse(url)
    return normalize_domain(parsed.netloc)


def load_domain_pages(domain: str, tm: TrackerManager) -> List[Dict]:
    """
    Load all pages and their HTML content for a given domain.

    Args:
        domain: Normalized domain name
        tm: TrackerManager instance

    Returns:
        List of dicts with page_id, url, html_path
    """
    url_tracker = tm.load('url')
    page_tracker = tm.load('page')

    # Build page_id -> url mapping
    page_to_url = {}
    for url_entry in url_tracker['urls']:
        page_id = url_entry.get('pageId')
        if page_id and url_entry.get('status') == 'completed':
            page_to_url[page_id] = url_entry['url']

    # Find pages for this domain
    domain_pages = []
    for page in page_tracker['pages']:
        page_id = page['id']
        url = page_to_url.get(page_id)
        if url:
            page_domain = extract_domain_from_url(url)
            if page_domain == domain:
                # Extract shard prefix (first 2 chars after 'page_')
                prefix = page_id.split('_')[1][:2]
                html_path = tm.output_base / 'pages' / prefix / f"{page_id}.html"
                if html_path.exists():
                    domain_pages.append({
                        'page_id': page_id,
                        'url': url,
                        'html_path': html_path
                    })

    return domain_pages


def analyze_tag_frequency(html_content: str, tags: List[str]) -> Dict[str, int]:
    """Count occurrences of specific HTML tags."""
    tag_counts = {}
    for tag in tags:
        # Match opening tag only
        pattern = f'<{tag}[\\s>]'
        matches = re.findall(pattern, html_content, re.IGNORECASE)
        tag_counts[tag] = len(matches)
    return tag_counts


def analyze_class_patterns(html_content: str, patterns: List[str]) -> Dict[str, int]:
    """Count occurrences of class patterns."""
    pattern_counts = {}
    for pattern in patterns:
        # Match class attributes containing the pattern
        regex = f'class="[^"]*{pattern}[^"]*"'
        matches = re.findall(regex, html_content, re.IGNORECASE)
        pattern_counts[pattern] = len(matches)
    return pattern_counts


def extract_all_classes(html_content: str) -> List[str]:
    """Extract all CSS classes from HTML."""
    class_pattern = r'class="([^"]+)"'
    matches = re.findall(class_pattern, html_content)

    # Split multiple classes
    all_classes = []
    for match in matches:
        all_classes.extend(match.split())

    return all_classes


def extract_all_ids(html_content: str) -> List[str]:
    """Extract all IDs from HTML."""
    id_pattern = r'id="([^"]+)"'
    return re.findall(id_pattern, html_content)


def analyze_domain_structure(domain: str, pages: List[Dict]) -> Dict:
    """
    Analyze HTML structure patterns across all pages for a domain.

    Args:
        domain: Normalized domain name
        pages: List of page dicts with html_path

    Returns:
        Analysis report with patterns and recommendations
    """
    total_pages = len(pages)

    # Initialize counters
    content_indicators = {
        'article': 0,
        'main': 0,
        '[role="main"]': 0,
    }

    non_content_indicators = {
        'header': 0,
        'footer': 0,
        'nav': 0,
        'aside': 0,
    }

    boilerplate_patterns = {
        'social': 0,
        'share': 0,
        'ad': 0,
        'ads': 0,
        'banner': 0,
        'tracker': 0,
        'comment': 0,
        'sidebar': 0,
        'menu': 0,
        'breadcrumb': 0,
        'form': 0,
    }

    all_classes = []
    all_ids = []

    # Analyze each page
    for page in pages:
        try:
            with open(page['html_path'], 'r', encoding='utf-8') as f:
                html = f.read()

            # Content indicators
            content_indicators['article'] += analyze_tag_frequency(html, ['article'])['article']
            content_indicators['main'] += analyze_tag_frequency(html, ['main'])['main']
            if 'role="main"' in html.lower():
                content_indicators['[role="main"]'] += 1

            # Non-content indicators
            tag_counts = analyze_tag_frequency(html, ['header', 'footer', 'nav', 'aside'])
            for tag, count in tag_counts.items():
                non_content_indicators[tag] += count

            # Boilerplate patterns
            pattern_counts = analyze_class_patterns(html, list(boilerplate_patterns.keys()))
            for pattern, count in pattern_counts.items():
                boilerplate_patterns[pattern] += count

            # Collect all classes and IDs
            all_classes.extend(extract_all_classes(html))
            all_ids.extend(extract_all_ids(html))

        except Exception as e:
            print(f"Error analyzing {page['page_id']}: {e}", file=sys.stderr)
            continue

    # Calculate frequencies and confidence
    def calculate_confidence(count: int, total: int) -> tuple:
        frequency = count / total if total > 0 else 0
        if frequency >= 0.8:
            confidence = "high"
        elif frequency >= 0.5:
            confidence = "medium"
        elif frequency >= 0.2:
            confidence = "low"
        else:
            confidence = "none"
        return frequency, confidence

    # Build analysis report
    content_analysis = []
    for indicator, count in content_indicators.items():
        freq, conf = calculate_confidence(count, total_pages)
        content_analysis.append({
            'selector': indicator,
            'count': count,
            'frequency': round(freq, 3),
            'confidence': conf
        })

    non_content_analysis = []
    for indicator, count in non_content_indicators.items():
        freq, conf = calculate_confidence(count, total_pages)
        non_content_analysis.append({
            'tag': indicator,
            'count': count,
            'frequency': round(freq, 3),
            'confidence': conf
        })

    boilerplate_analysis = []
    for pattern, count in boilerplate_patterns.items():
        freq, conf = calculate_confidence(count, total_pages)
        boilerplate_analysis.append({
            'pattern': pattern,
            'count': count,
            'frequency': round(freq, 3),
            'confidence': conf
        })

    # Top classes and IDs
    class_counter = Counter(all_classes)
    id_counter = Counter(all_ids)

    top_classes = [{'class': cls, 'count': count} for cls, count in class_counter.most_common(50)]
    top_ids = [{'id': id_val, 'count': count} for id_val, count in id_counter.most_common(30)]

    # Generate recommendations
    recommendations = generate_recommendations(
        content_analysis,
        non_content_analysis,
        boilerplate_analysis,
        top_classes,
        top_ids
    )

    return {
        'domain': domain,
        'total_pages': total_pages,
        'analyzed_at': datetime.now().isoformat(),
        'content_indicators': content_analysis,
        'non_content_indicators': non_content_analysis,
        'boilerplate_patterns': boilerplate_analysis,
        'top_classes': top_classes,
        'top_ids': top_ids,
        'recommendations': recommendations
    }


def generate_recommendations(content_indicators, non_content_indicators, boilerplate_patterns, top_classes, top_ids) -> Dict:
    """Generate extraction configuration recommendations based on analysis."""

    # Recommend excluded tags (high confidence non-content)
    excluded_tags = []
    for item in non_content_indicators:
        if item['confidence'] in ['high', 'medium']:
            excluded_tags.append(item['tag'])

    # Recommend CSS selector for main content (high confidence content indicators)
    css_selector_candidates = []
    for item in content_indicators:
        if item['confidence'] == 'high':
            css_selector_candidates.append(item['selector'])

    # Recommend excluded selectors (high confidence boilerplate)
    excluded_selector_parts = []
    for item in boilerplate_patterns:
        if item['confidence'] in ['high', 'medium']:
            pattern = item['pattern']

            # For short patterns (<=4 chars), use specific matching to avoid false positives
            # e.g., "ad" would match "head", "read", "lead"
            # e.g., "form" would match "platform", "transform", "perform"
            if len(pattern) <= 4:
                # Use starts-with and ends-with patterns for short strings
                excluded_selector_parts.append(f'[class^="{pattern}-"]')   # Starts with "ad-"
                excluded_selector_parts.append(f'[class$="-{pattern}"]')   # Ends with "-ad"
                excluded_selector_parts.append(f'[class~="{pattern}"]')    # Exact word match
                excluded_selector_parts.append(f'[id^="{pattern}-"]')
                excluded_selector_parts.append(f'[id$="-{pattern}"]')
                excluded_selector_parts.append(f'[id~="{pattern}"]')
            else:
                # For longer patterns, substring matching is safer
                excluded_selector_parts.append(f'[class*="{pattern}"]')
                excluded_selector_parts.append(f'[id*="{pattern}"]')

    return {
        'excluded_tags': excluded_tags,
        'css_selector': ', '.join(css_selector_candidates) if css_selector_candidates else None,
        'excluded_selector': ', '.join(excluded_selector_parts[:20]) if excluded_selector_parts else None,  # Limit to top 20
        'pruning_threshold': 0.6,
        'min_word_threshold': 50,
        'confidence_score': calculate_overall_confidence(content_indicators, non_content_indicators)
    }


def calculate_overall_confidence(content_indicators, non_content_indicators) -> str:
    """Calculate overall confidence score for the domain analysis."""
    high_count = sum(1 for item in content_indicators + non_content_indicators if item['confidence'] == 'high')
    total_count = len(content_indicators) + len(non_content_indicators)

    if high_count >= total_count * 0.7:
        return "high"
    elif high_count >= total_count * 0.4:
        return "medium"
    else:
        return "low"


def main():
    """Main execution."""
    parser = argparse.ArgumentParser(
        description="Analyze HTML structure patterns for domain-specific extraction"
    )
    parser.add_argument(
        'domain',
        nargs='?',
        help='Domain to analyze (e.g., progressive.com, www.progressive.com)'
    )
    parser.add_argument(
        '--domain',
        dest='domain_flag',
        help='Domain to analyze (alternative syntax)'
    )
    parser.add_argument(
        '--all',
        action='store_true',
        help='Analyze all domains (generates aggregate report)'
    )
    parser.add_argument(
        '--output',
        default='analysis/domain-reports',
        help='Output directory for analysis reports (default: analysis/domain-reports)'
    )

    args = parser.parse_args()

    # Get domain
    domain = args.domain or args.domain_flag

    if not domain and not args.all:
        parser.error("Must specify either domain or --all")

    # Initialize TrackerManager
    tm = TrackerManager()

    # Create output directory (relative to project root, not script directory)
    base_path = Path(__file__).parent.parent
    if Path(args.output).is_absolute():
        output_dir = Path(args.output)
    else:
        output_dir = base_path / args.output
    output_dir.mkdir(parents=True, exist_ok=True)

    if args.all:
        print("Analyzing all domains for aggregate report...", file=sys.stderr)
        # TODO: Implement aggregate analysis in next iteration
        print("Error: --all flag not yet implemented", file=sys.stderr)
        sys.exit(1)

    # Normalize domain
    normalized_domain = normalize_domain(domain)
    print(f"Analyzing domain: {normalized_domain}", file=sys.stderr)
    if domain != normalized_domain:
        print(f"  Normalized from: {domain}", file=sys.stderr)

    # Load pages for domain
    pages = load_domain_pages(normalized_domain, tm)

    if not pages:
        print(f"Error: No pages found for domain: {normalized_domain}", file=sys.stderr)
        sys.exit(1)

    print(f"  Found {len(pages)} pages", file=sys.stderr)

    # Analyze domain structure
    analysis = analyze_domain_structure(normalized_domain, pages)

    # Save report
    report_file = output_dir / f"{normalized_domain}.json"
    with open(report_file, 'w', encoding='utf-8') as f:
        json.dump(analysis, f, indent=2)

    print(f"\nAnalysis complete!", file=sys.stderr)
    print(f"Report saved to: {report_file}", file=sys.stderr)

    # Print summary
    print(json.dumps({
        'success': True,
        'domain': normalized_domain,
        'total_pages': analysis['total_pages'],
        'report_file': str(report_file),
        'confidence': analysis['recommendations']['confidence_score'],
        'content_selectors': analysis['recommendations']['css_selector'],
        'excluded_tags_count': len(analysis['recommendations']['excluded_tags'])
    }, indent=2))


if __name__ == '__main__':
    main()
