#!/usr/bin/env python3
"""
Save extracted data after agent performs LLM extraction.

This script:
1. Accepts page ID, search ID, and extracted data (via stdin or --data)
2. Saves raw.json file
3. Updates page-tracker
4. Commits changes

Usage:
    # Via stdin (recommended for large data)
    echo '{"data": [...]}' | uv run scripts/save-extraction.py --page-id page_abc123 --search-id search_xyz789

    # Via argument (for small data)
    uv run scripts/save-extraction.py --page-id page_abc123 --search-id search_xyz789 --data '{"data": [...]}'

Output:
    JSON with save results and explicit next_steps for agent
"""

import argparse
import json
import subprocess
import sys
from datetime import datetime
from pathlib import Path

# Add scripts directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from tracker_manager import TrackerManager


def output_result(success: bool, message: str, next_steps: str, data: dict = None) -> None:
    """
    Output JSON result to stdout.

    Args:
        success: Whether operation succeeded
        message: Status message
        next_steps: Explicit instructions for agent
        data: Additional data
    """
    result = {
        "success": success,
        "message": message,
        "next_steps": next_steps
    }

    if data:
        result.update(data)

    print(json.dumps(result, indent=2))


def main() -> None:
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Save extracted data to raw.json"
    )
    parser.add_argument(
        '--page-id',
        required=True,
        help='Page ID this extraction is for'
    )
    parser.add_argument(
        '--search-id',
        required=True,
        help='Search ID this extraction belongs to'
    )
    parser.add_argument(
        '--data',
        required=False,
        help='Extracted data as JSON string (or use stdin)'
    )

    args = parser.parse_args()
    page_id = args.page_id
    search_id = args.search_id

    try:
        # Load extracted data (from stdin or --data)
        if args.data:
            extracted_data = json.loads(args.data)
        else:
            # Read from stdin
            stdin_data = sys.stdin.read()
            if not stdin_data.strip():
                output_result(
                    success=False,
                    message="No data provided (stdin empty and --data not specified)",
                    next_steps="Provide extracted data via stdin or --data argument"
                )
                sys.exit(1)
            extracted_data = json.loads(stdin_data)

        # Validate extracted data structure
        if not isinstance(extracted_data, (list, dict)):
            output_result(
                success=False,
                message="Extracted data must be a list or dict",
                next_steps="Ensure extracted data is valid JSON (array or object)"
            )
            sys.exit(1)

        # Convert to list if single dict
        if isinstance(extracted_data, dict):
            extracted_data = [extracted_data]

        data_point_count = len(extracted_data)

        if data_point_count == 0:
            # No data points extracted - still valid, just mark as completed with 0 count
            tm = TrackerManager()
            tm.update_status('page', page_id, 'completed', {
                'dataPointsExtracted': 0,
                'extractedAt': datetime.now().isoformat(),
                'notes': 'No data points extracted'
            })

            subprocess.run(
                [
                    'uv', 'run', 'scripts/git-commit.py',
                    '--type', 'extract',
                    '--id', page_id,
                    '--message', 'no data found'
                ],
                cwd=Path(__file__).parent.parent
            )

            output_result(
                success=True,
                message=f"No data points extracted from {page_id}",
                next_steps=(
                    "Extraction completed but no data points found.\n"
                    "This is normal for pages without relevant insurance information.\n\n"
                    "Continue with next work item:\n"
                    "Run: uv run scripts/select-work.py"
                )
            )
            sys.exit(0)

        # Determine output file path
        # TODO: Proper categorization logic based on search metadata
        tm = TrackerManager()
        raw_dir = tm.output_base / 'carriers' / 'uncategorized'
        raw_dir.mkdir(parents=True, exist_ok=True)
        raw_file = raw_dir / f"data_{search_id}.raw.json"

        # Save raw.json
        with open(raw_file, 'w', encoding='utf-8') as f:
            json.dump(extracted_data, f, indent=2)

        # Update page-tracker
        tm.update_status('page', page_id, 'completed', {
            'dataPointsExtracted': data_point_count,
            'rawDataFile': str(raw_file.relative_to(tm.output_base.parent)),
            'extractedAt': datetime.now().isoformat()
        })

        # Commit changes
        result = subprocess.run(
            [
                'uv', 'run', 'scripts/git-commit.py',
                '--type', 'extract',
                '--id', page_id,
                '--message', f'{data_point_count} data points'
            ],
            capture_output=True,
            text=True,
            cwd=Path(__file__).parent.parent
        )

        if result.returncode != 0:
            # Commit failed - provide automatic recovery
            try:
                error_data = json.loads(result.stdout)
                output_result(
                    success=False,
                    message=f"Git commit failed: {error_data.get('message', 'unknown error')}",
                    next_steps=(
                        "Git commit failed after saving extraction. Automatic recovery:\n\n"
                        "The extraction was saved to raw.json but commit failed.\n"
                        "This is likely a temporary git issue.\n\n"
                        "AUTOMATIC RECOVERY:\n"
                        "1. Try committing manually: git add -A && git commit -m 'save extraction' && git push\n"
                        "2. If that succeeds, continue: uv run scripts/select-work.py\n"
                        "3. If it fails, check git status and resolve any issues"
                    )
                )
                sys.exit(0)  # Exit 0 - agent can attempt recovery
            except json.JSONDecodeError:
                output_result(
                    success=False,
                    message=f"Git commit failed: {result.stdout}",
                    next_steps=(
                        "Git commit produced unexpected output. Automatic recovery:\n\n"
                        "Try committing manually: git add -A && git commit -m 'save extraction' && git push\n"
                        "Then continue: uv run scripts/select-work.py"
                    )
                )
                sys.exit(0)  # Exit 0 - agent can attempt recovery

        # Success!
        output_result(
            success=True,
            message=f"Successfully saved {data_point_count} data points from {page_id}",
            next_steps=(
                f"Extraction saved successfully!\n\n"
                f"Details:\n"
                f"  - Data points extracted: {data_point_count}\n"
                f"  - Saved to: {raw_file.name}\n"
                f"  - Page {page_id} marked as completed\n\n"
                f"Changes committed to git.\n\n"
                f"Continue with next work item:\n"
                f"Run: uv run scripts/select-work.py"
            ),
            data={
                "data_points_extracted": data_point_count,
                "raw_file": str(raw_file)
            }
        )

    except json.JSONDecodeError as e:
        output_result(
            success=False,
            message=f"Invalid JSON data: {e}",
            next_steps="Ensure extracted data is valid JSON"
        )
        sys.exit(1)

    except Exception as e:
        output_result(
            success=False,
            message=f"Unexpected error: {e}",
            next_steps="Check error message and try again"
        )
        sys.exit(1)


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        output_result(
            success=False,
            message="Interrupted by user",
            next_steps="Restart save-extraction operation when ready"
        )
        sys.exit(130)
