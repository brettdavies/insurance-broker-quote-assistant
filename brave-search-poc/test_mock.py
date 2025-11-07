#!/usr/bin/env python3
"""
Test script to demonstrate mock mode functionality.

This script runs the POC in mock mode with a small subset of queries
to verify the integration works correctly.

Usage:
    python test_mock.py
"""

import sys
import subprocess
from pathlib import Path


def main():
    """Run POC in mock mode with limited queries."""

    print("=" * 80)
    print("BRAVE SEARCH POC - MOCK MODE TEST")
    print("=" * 80)
    print("\nThis test will:")
    print("  1. Run 5 searches using mock data (no API key needed)")
    print("  2. Demonstrate URL discovery")
    print("  3. Test integration with save-urls.py (if scraper dir exists)")
    print("\n" + "=" * 80 + "\n")

    # Check if this is being run from the correct directory
    script_dir = Path(__file__).parent

    # Build command
    cmd = [
        sys.executable,
        str(script_dir / 'brave_search.py'),
        '--mock',
        '--max-queries', '5',
        '--delay', '0.5',  # Faster for testing
    ]

    # Check if scraper directory exists
    scraper_dir = script_dir.parent / 'knowledge-pack-scraper'
    if not scraper_dir.exists():
        print("⚠️  knowledge-pack-scraper directory not found")
        print("   Disabling auto-integration for this test\n")
        cmd.append('--no-auto-integrate')

    # Run the POC
    try:
        result = subprocess.run(cmd, cwd=script_dir)

        if result.returncode == 0:
            print("\n" + "=" * 80)
            print("✓ Mock mode test completed successfully!")
            print("=" * 80)
            print("\nNext steps:")
            print("  1. Check results/ directory for output files")
            print("  2. Run: python analyze_results.py")
            print("  3. When ready, set BRAVE_API_KEY and run with real API")
        else:
            print("\n" + "=" * 80)
            print("✗ Test failed with exit code:", result.returncode)
            print("=" * 80)
            sys.exit(result.returncode)

    except KeyboardInterrupt:
        print("\n\nTest interrupted by user")
        sys.exit(130)
    except Exception as e:
        print(f"\nError running test: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()
