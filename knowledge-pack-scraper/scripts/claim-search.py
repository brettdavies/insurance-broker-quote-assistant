#!/usr/bin/env python3
"""
Claim a search and output details for agent to perform WebSearch.

This script:
1. Pulls latest from git
2. Claims the search in search-tracker
3. Commits the claim (calls git-commit.py)
4. Outputs search details for agent to perform WebSearch

Usage:
    uv run scripts/claim-search.py --id search_abc123

Output:
    JSON with search details and explicit next_steps for agent
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
from id_generator import generate_agent_id


# Generate unique agent ID for this process
AGENT_ID = generate_agent_id()


def output_result(success: bool, message: str, next_steps: str, data: dict = None) -> None:
    """
    Output JSON result to stdout.

    Args:
        success: Whether operation succeeded
        message: Status message
        next_steps: Explicit instructions for agent
        data: Additional data (search details, etc.)
    """
    result = {
        "success": success,
        "message": message,
        "agent_id": AGENT_ID,
        "next_steps": next_steps
    }

    if data:
        result.update(data)

    print(json.dumps(result, indent=2))


def git_pull() -> bool:
    """Pull latest changes."""
    try:
        repo_root = Path(__file__).parent.parent.parent
        result = subprocess.run(
            ['git', 'pull', '--rebase'],
            capture_output=True,
            text=True,
            cwd=repo_root
        )
        return result.returncode == 0
    except Exception:
        return False


def main() -> None:
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Claim a search for execution"
    )
    parser.add_argument(
        '--id',
        required=True,
        help='Search ID to claim (e.g., search_abc123)'
    )

    args = parser.parse_args()
    search_id = args.id

    try:
        # Step 1: Pull latest
        if not git_pull():
            output_result(
                success=False,
                message="Git pull failed",
                next_steps="Check git repository status and try again. Run: git status"
            )
            sys.exit(1)

        # Step 2: Load tracker and find search
        tm = TrackerManager()
        search = tm.find_item_by_id('search', search_id)

        if search is None:
            output_result(
                success=False,
                message=f"Search {search_id} not found in tracker",
                next_steps="Check search ID and try again. Run: uv run scripts/select-work.py"
            )
            sys.exit(1)

        # Step 3: Check if still pending
        if search.get('status') != 'pending':
            current_status = search.get('status', 'unknown')
            assigned_to = search.get('assignedTo', 'unknown')

            output_result(
                success=False,
                message=f"Search {search_id} already claimed (status: {current_status}, assignedTo: {assigned_to})",
                next_steps=(
                    "This search is no longer available. "
                    "Run: uv run scripts/select-work.py to select different work."
                )
            )
            sys.exit(1)

        # Step 4: Claim it
        tm.update_status('search', search_id, 'claimed', {
            'assignedTo': AGENT_ID,
            'claimedAt': datetime.now().isoformat()
        })

        # Step 5: Commit claim using centralized git script
        query = search.get('query', 'unknown query')
        result = subprocess.run(
            [
                'uv', 'run', 'scripts/git-commit.py',
                '--type', 'claim',
                '--id', search_id,
                '--message', query[:60]
            ],
            capture_output=True,
            text=True,
            cwd=Path(__file__).parent.parent
        )

        if result.returncode != 0:
            # Commit failed - parse error and handle automatically
            try:
                error_data = json.loads(result.stdout)
                had_conflict = error_data.get('had_conflict', False)

                if had_conflict:
                    # Race condition - check ownership after rebase
                    tm = TrackerManager()  # Reload after rebase
                    search = tm.find_item_by_id('search', search_id)

                    if search and search.get('assignedTo') == AGENT_ID:
                        # We still own it after rebase - continue
                        pass
                    else:
                        # Lost race - AUTOMATIC RECOVERY: select new work
                        output_result(
                            success=False,
                            message="Lost race - another agent claimed this search first",
                            next_steps=(
                                "Race condition detected and handled automatically.\n"
                                "Another agent won the race to claim this search.\n\n"
                                "AUTOMATIC RECOVERY - Select new work:\n"
                                "Run: uv run scripts/select-work.py"
                            )
                        )
                        sys.exit(0)  # Exit 0 - this is normal behavior, not an error
                else:
                    # Other error - provide automatic recovery
                    output_result(
                        success=False,
                        message=f"Git commit failed: {error_data.get('message', 'unknown error')}",
                        next_steps=(
                            "Git commit failed. Automatic recovery:\n\n"
                            "1. Run: uv run scripts/select-work.py to try different work\n"
                            "2. If repeated failures, check git repository health:\n"
                            "   - Run: git status\n"
                            "   - Run: git pull --rebase\n"
                            "   - If still failing, may need repository repair"
                        )
                    )
                    sys.exit(0)  # Exit 0 - agent should continue with recovery

            except json.JSONDecodeError:
                output_result(
                    success=False,
                    message=f"Git commit failed with unexpected output: {result.stdout}",
                    next_steps=(
                        "Git commit produced unexpected output. Automatic recovery:\n\n"
                        "Run: uv run scripts/select-work.py to try different work"
                    )
                )
                sys.exit(0)  # Exit 0 - agent should continue

        # Success! Output search details for WebSearch
        category = search.get('category', 'unknown')
        subcategory = search.get('subcategory', '')
        priority = search.get('priority', 'medium')

        output_result(
            success=True,
            message="Successfully claimed search",
            next_steps=(
                f"Claim committed successfully. You now own {search_id}.\n\n"
                f"ACTION REQUIRED - Perform WebSearch:\n"
                f"1. Use WebSearch tool with query: \"{query}\"\n"
                f"2. Find 4-6 high-quality URLs related to the query\n"
                f"3. After WebSearch completes, save URLs using:\n"
                f"   uv run scripts/save-urls.py --search-id {search_id} --urls <url1> <url2> <url3> ...\n\n"
                f"Note: You MUST perform WebSearch yourself. This script cannot do it for you."
            ),
            data={
                "search_id": search_id,
                "query": query,
                "category": category,
                "subcategory": subcategory,
                "priority": priority,
                "claimed_by": AGENT_ID,
                "claimed_at": datetime.now().isoformat()
            }
        )

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
            next_steps="Restart claim operation when ready"
        )
        sys.exit(130)
