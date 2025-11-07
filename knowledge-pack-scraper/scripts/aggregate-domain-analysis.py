#!/usr/bin/env python3
"""
Aggregate analysis across all domain reports to create generic fallback config.

This script analyzes all domain-specific reports and generates a data-driven
generic configuration based on common patterns across all domains.

Usage:
    uv run scripts/aggregate-domain-analysis.py
    uv run scripts/aggregate-domain-analysis.py --output analysis/generic-fallback-config.json
"""

import argparse
import json
import sys
from collections import Counter
from pathlib import Path
from typing import Dict, List


def load_all_reports(reports_dir: Path) -> List[Dict]:
    """Load all domain analysis reports."""
    reports = []

    for report_file in sorted(reports_dir.glob('*.json')):
        try:
            with open(report_file) as f:
                report = json.load(f)
                reports.append(report)
        except Exception as e:
            print(f"Warning: Failed to load {report_file.name}: {e}", file=sys.stderr)

    return reports


def aggregate_content_indicators(reports: List[Dict]) -> List[Dict]:
    """
    Aggregate content indicator statistics across all domains.

    Returns:
        List of indicators with aggregated stats sorted by effectiveness
    """
    # Track: selector -> {total_domains, total_pages, weighted_frequency}
    stats = {}

    for report in reports:
        domain_pages = report.get('total_pages', 0)
        for indicator in report.get('content_indicators', []):
            selector = indicator['selector']
            frequency = indicator['frequency']
            confidence = indicator['confidence']

            if selector not in stats:
                stats[selector] = {
                    'selector': selector,
                    'domains': 0,
                    'total_pages': 0,
                    'weighted_frequency': 0.0,
                    'high_confidence_domains': 0,
                    'medium_confidence_domains': 0,
                }

            stats[selector]['domains'] += 1
            stats[selector]['total_pages'] += domain_pages
            stats[selector]['weighted_frequency'] += frequency * domain_pages

            if confidence == 'high':
                stats[selector]['high_confidence_domains'] += 1
            elif confidence == 'medium':
                stats[selector]['medium_confidence_domains'] += 1

    # Calculate average frequency and confidence
    indicators = []
    for selector, data in stats.items():
        avg_frequency = data['weighted_frequency'] / data['total_pages'] if data['total_pages'] > 0 else 0

        # Confidence score: prioritize HIGH confidence domains
        high_ratio = data['high_confidence_domains'] / data['domains']
        medium_ratio = data['medium_confidence_domains'] / data['domains']

        if high_ratio >= 0.6:
            confidence = 'high'
        elif high_ratio + medium_ratio >= 0.6:
            confidence = 'medium'
        else:
            confidence = 'low'

        indicators.append({
            'selector': selector,
            'domains': data['domains'],
            'total_pages': data['total_pages'],
            'avg_frequency': round(avg_frequency, 3),
            'confidence': confidence,
            'domain_coverage': round(data['domains'] / len(reports), 3),
        })

    # Sort by effectiveness (high avg_frequency + high domain coverage + high confidence)
    indicators.sort(key=lambda x: (
        x['confidence'] == 'high',
        x['avg_frequency'] * x['domain_coverage']
    ), reverse=True)

    return indicators


def aggregate_non_content_indicators(reports: List[Dict]) -> List[Dict]:
    """
    Aggregate non-content indicator statistics (tags to exclude).

    Returns:
        List of tags with aggregated stats sorted by exclusion priority
    """
    stats = {}

    for report in reports:
        domain_pages = report.get('total_pages', 0)
        for indicator in report.get('non_content_indicators', []):
            tag = indicator['tag']
            frequency = indicator['frequency']
            confidence = indicator['confidence']

            if tag not in stats:
                stats[tag] = {
                    'tag': tag,
                    'domains': 0,
                    'total_pages': 0,
                    'weighted_frequency': 0.0,
                    'high_confidence_domains': 0,
                }

            stats[tag]['domains'] += 1
            stats[tag]['total_pages'] += domain_pages
            stats[tag]['weighted_frequency'] += frequency * domain_pages

            if confidence == 'high':
                stats[tag]['high_confidence_domains'] += 1

    # Calculate statistics
    indicators = []
    for tag, data in stats.items():
        avg_frequency = data['weighted_frequency'] / data['total_pages'] if data['total_pages'] > 0 else 0
        high_ratio = data['high_confidence_domains'] / data['domains']

        confidence = 'high' if high_ratio >= 0.6 else 'medium'

        indicators.append({
            'tag': tag,
            'domains': data['domains'],
            'total_pages': data['total_pages'],
            'avg_frequency': round(avg_frequency, 3),
            'confidence': confidence,
            'domain_coverage': round(data['domains'] / len(reports), 3),
        })

    # Sort by exclusion priority
    indicators.sort(key=lambda x: (
        x['confidence'] == 'high',
        x['domain_coverage'],
        x['avg_frequency']
    ), reverse=True)

    return indicators


def aggregate_boilerplate_patterns(reports: List[Dict]) -> List[Dict]:
    """
    Aggregate boilerplate pattern statistics.

    Returns:
        List of patterns with aggregated stats sorted by effectiveness
    """
    pattern_stats = {}

    for report in reports:
        domain_pages = report.get('total_pages', 0)
        for pattern in report.get('boilerplate_patterns', []):
            pattern_type = pattern['pattern']
            frequency = pattern.get('frequency', 0)
            confidence = pattern.get('confidence', 'none')

            if pattern_type not in pattern_stats:
                pattern_stats[pattern_type] = {
                    'pattern': pattern_type,
                    'domains': 0,
                    'total_pages': 0,
                    'weighted_frequency': 0.0,
                    'high_confidence_domains': 0,
                }

            pattern_stats[pattern_type]['domains'] += 1
            pattern_stats[pattern_type]['total_pages'] += domain_pages
            pattern_stats[pattern_type]['weighted_frequency'] += frequency * domain_pages

            if confidence == 'high':
                pattern_stats[pattern_type]['high_confidence_domains'] += 1

    # Calculate statistics
    patterns = []
    for pattern_type, data in pattern_stats.items():
        avg_frequency = data['weighted_frequency'] / data['total_pages'] if data['total_pages'] > 0 else 0
        high_ratio = data['high_confidence_domains'] / data['domains'] if data['domains'] > 0 else 0

        confidence = 'high' if high_ratio >= 0.6 else 'medium'

        patterns.append({
            'pattern': pattern_type,
            'domains': data['domains'],
            'total_pages': data['total_pages'],
            'avg_frequency': round(avg_frequency, 3),
            'confidence': confidence,
            'domain_coverage': round(data['domains'] / len(reports), 3),
        })

    # Sort by effectiveness (high confidence + high domain coverage)
    patterns.sort(key=lambda x: (
        x['confidence'] == 'high',
        x['domain_coverage'],
        x['avg_frequency']
    ), reverse=True)

    return patterns


def aggregate_css_classes(reports: List[Dict], top_n: int = 30) -> List[Dict]:
    """Aggregate CSS class frequency across all domains."""
    class_stats = Counter()

    for report in reports:
        for class_info in report.get('top_classes', []):
            class_name = class_info['class']
            count = class_info['count']
            class_stats[class_name] += count

    return [
        {'class': cls, 'total_count': count}
        for cls, count in class_stats.most_common(top_n)
    ]


def aggregate_css_ids(reports: List[Dict], top_n: int = 20) -> List[Dict]:
    """Aggregate CSS ID frequency across all domains."""
    id_stats = Counter()

    for report in reports:
        for id_info in report.get('top_ids', []):
            id_name = id_info['id']
            count = id_info['count']
            id_stats[id_name] += count

    return [
        {'id': id_name, 'total_count': count}
        for id_name, count in id_stats.most_common(top_n)
    ]


def generate_generic_config(aggregate: Dict) -> Dict:
    """
    Generate a generic extraction configuration from aggregate statistics.

    Returns:
        Dict with recommended crawl4ai extraction config
    """
    # Content selectors: Use top indicators with high confidence
    content_indicators = aggregate['content_indicators']
    top_selectors = [
        ind['selector'] for ind in content_indicators
        if ind['confidence'] == 'high' and ind['domain_coverage'] >= 0.3
    ]

    if not top_selectors:
        # Fallback to medium confidence
        top_selectors = [
            ind['selector'] for ind in content_indicators
            if ind['domain_coverage'] >= 0.2
        ][:3]

    css_selector = ', '.join(top_selectors) if top_selectors else 'body'

    # Excluded tags: Use high-confidence non-content indicators
    non_content = aggregate['non_content_indicators']
    excluded_tags = [
        ind['tag'] for ind in non_content
        if ind['confidence'] == 'high' and ind['domain_coverage'] >= 0.5
    ]

    # Build excluded selector from boilerplate patterns
    # Use top patterns with high confidence and good domain coverage
    boilerplate = aggregate['boilerplate_patterns']
    top_patterns = [
        p['pattern'] for p in boilerplate
        if p['confidence'] == 'high' and p['domain_coverage'] >= 0.5
    ]

    # Build wildcard selectors for class and id attributes
    excluded_selector_parts = []
    for pattern in top_patterns[:8]:  # Top 8 patterns
        excluded_selector_parts.append(f'[class*="{pattern}"]')
        excluded_selector_parts.append(f'[id*="{pattern}"]')

    excluded_selector = ', '.join(excluded_selector_parts) if excluded_selector_parts else None

    return {
        'css_selector': css_selector,
        'excluded_tags': excluded_tags,
        'excluded_selector': excluded_selector,
        'word_count_threshold': 10,
        'remove_forms': True,
        'remove_overlay_elements': True,
        'confidence': 'medium',  # Generic config is always medium confidence
        'description': 'Data-driven generic fallback config from 238 domain analyses',
    }


def main():
    parser = argparse.ArgumentParser(
        description="Aggregate domain analysis reports to create generic fallback config"
    )
    parser.add_argument(
        '--output',
        type=Path,
        default=Path('analysis/generic-fallback.json'),
        help='Output file for aggregate analysis (default: analysis/generic-fallback.json)'
    )

    args = parser.parse_args()

    # Setup paths
    base_path = Path(__file__).parent.parent
    reports_dir = base_path / 'analysis' / 'domain-reports'

    if not reports_dir.exists():
        print(f"Error: {reports_dir} not found")
        sys.exit(1)

    # Load all reports
    print(f"Loading domain analysis reports from {reports_dir}...")
    reports = load_all_reports(reports_dir)

    if not reports:
        print("Error: No reports found")
        sys.exit(1)

    print(f"Loaded {len(reports)} domain analysis reports")
    print()

    # Aggregate statistics
    print("Aggregating content indicators...")
    content_indicators = aggregate_content_indicators(reports)

    print("Aggregating non-content indicators...")
    non_content_indicators = aggregate_non_content_indicators(reports)

    print("Aggregating boilerplate patterns...")
    boilerplate_patterns = aggregate_boilerplate_patterns(reports)

    print("Aggregating CSS classes...")
    top_classes = aggregate_css_classes(reports)

    print("Aggregating CSS IDs...")
    top_ids = aggregate_css_ids(reports)

    # Generate generic config
    print("Generating generic extraction config...")
    generic_config = generate_generic_config({
        'content_indicators': content_indicators,
        'non_content_indicators': non_content_indicators,
        'boilerplate_patterns': boilerplate_patterns,
    })

    # Build output
    output = {
        'meta': {
            'total_reports': len(reports),
            'total_domains': len(reports),
            'total_pages': sum(r.get('total_pages', 0) for r in reports),
            'generated_at': '2025-11-07',
        },
        'content_indicators': content_indicators,
        'non_content_indicators': non_content_indicators,
        'boilerplate_patterns': boilerplate_patterns,
        'top_classes': top_classes,
        'top_ids': top_ids,
        'generic_config': generic_config,
    }

    # Save output
    output_path = base_path / args.output
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, 'w') as f:
        json.dump(output, f, indent=2)

    print()
    print(f"Aggregate analysis saved to: {output_path}")
    print()

    # Display summary
    print("=" * 80)
    print("GENERIC FALLBACK CONFIGURATION")
    print("=" * 80)
    print()
    print(f"CSS Selector: {generic_config['css_selector']}")
    print(f"Excluded Tags: {', '.join(generic_config['excluded_tags'])}")
    print(f"Excluded Selector: {generic_config['excluded_selector'][:100]}..." if generic_config.get('excluded_selector') else "Excluded Selector: None")
    print(f"Word Count Threshold: {generic_config['word_count_threshold']}")
    print(f"Confidence: {generic_config['confidence']}")
    print()
    print(f"Top 5 Content Indicators:")
    for ind in content_indicators[:5]:
        print(f"  {ind['selector']:20} {ind['domains']:3} domains ({ind['domain_coverage']:.1%}), avg freq: {ind['avg_frequency']:.2f}, {ind['confidence']}")
    print()
    print(f"Top 5 Non-Content Indicators (to exclude):")
    for ind in non_content_indicators[:5]:
        print(f"  {ind['tag']:20} {ind['domains']:3} domains ({ind['domain_coverage']:.1%}), avg freq: {ind['avg_frequency']:.2f}, {ind['confidence']}")
    print()
    print("=" * 80)


if __name__ == '__main__':
    main()
