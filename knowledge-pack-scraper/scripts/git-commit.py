#!/usr/bin/env python3
"""
Centralized git operations for Phase 2 agents.

This script handles ALL git interactions (pull, commit, push) for DRY purposes.
All other scripts should call this script via subprocess rather than duplicating git logic.

Usage:
    uv run scripts/git-commit.py --type claim --id search_abc123 --message "GEICO auto discounts"
    uv run scripts/git-commit.py --type fetch --id page_xyz789 --message "https://geico.com/discounts"
    uv run scripts/git-commit.py --type complete --id search_abc123 --message "found 42 data points"
    uv run scripts/git-commit.py --type fail --id url_xyz789 --message "timeout after 30s"

Output:
    JSON with success status and explicit next_steps for agent
"""

import argparse
import json
import subprocess
import sys
import time
from pathlib import Path
from typing import Dict, Any, Optional


def git_pull() -> tuple[bool, str]:
    """
    Pull latest changes from remote with rebase.

    Returns:
        Tuple of (success, error_message)
    """
    try:
        # Run from repo root (parent of knowledge-pack-scraper)
        repo_root = Path(__file__).parent.parent.parent

        result = subprocess.run(
            ['git', 'pull', '--rebase'],
            capture_output=True,
            text=True,
            cwd=repo_root
        )

        if result.returncode != 0:
            return False, result.stderr or "Unknown git pull error"

        return True, ""

    except Exception as e:
        return False, str(e)


def git_add_all() -> tuple[bool, str]:
    """
    Stage all changes.

    Returns:
        Tuple of (success, error_message)
    """
    try:
        repo_root = Path(__file__).parent.parent.parent

        result = subprocess.run(
            ['git', 'add', '.'],
            capture_output=True,
            text=True,
            cwd=repo_root
        )

        if result.returncode != 0:
            return False, result.stderr or "Unknown git add error"

        return True, ""

    except Exception as e:
        return False, str(e)


def git_commit(message: str) -> tuple[bool, str]:
    """
    Create commit with message.

    Args:
        message: Commit message

    Returns:
        Tuple of (success, error_message)
    """
    try:
        repo_root = Path(__file__).parent.parent.parent

        result = subprocess.run(
            ['git', 'commit', '-m', message],
            capture_output=True,
            text=True,
            cwd=repo_root
        )

        if result.returncode != 0:
            # Check if error is "nothing to commit"
            if "nothing to commit" in result.stdout.lower():
                return True, ""  # Not an error, just nothing changed
            return False, result.stderr or result.stdout or "Unknown git commit error"

        return True, ""

    except Exception as e:
        return False, str(e)


def git_push_with_retry(max_retries: int = 3) -> tuple[bool, str, bool]:
    """
    Push with automatic retry on conflict.

    Args:
        max_retries: Maximum number of push attempts

    Returns:
        Tuple of (success, error_message, had_conflict)
    """
    repo_root = Path(__file__).parent.parent.parent
    had_conflict = False

    for attempt in range(max_retries):
        try:
            result = subprocess.run(
                ['git', 'push'],
                capture_output=True,
                text=True,
                cwd=repo_root
            )

            if result.returncode == 0:
                return True, "", had_conflict

            # Push failed, try to rebase
            had_conflict = True

            if attempt < max_retries - 1:  # Don't sleep on last attempt
                time.sleep(1)
                success, error = git_pull()
                if not success:
                    return False, f"Rebase failed: {error}", had_conflict

        except Exception as e:
            return False, str(e), had_conflict

    return False, f"Failed to push after {max_retries} attempts", had_conflict


def format_commit_message(commit_type: str, item_id: str, message: str) -> str:
    """
    Format commit message according to Phase 2 conventions.

    Args:
        commit_type: Type of commit (claim, fetch, extract, complete, fail)
        item_id: ID of the item being processed
        message: Additional context message

    Returns:
        Formatted commit message
    """
    # Determine prefix based on type
    if commit_type == 'claim':
        prefix = "chore(kb)"
        action = "claim"
    elif commit_type == 'fetch':
        prefix = "feat(kb)"
        action = "fetch"
    elif commit_type == 'extract':
        prefix = "feat(kb)"
        action = "extract"
    elif commit_type == 'complete':
        prefix = "feat(kb)"
        action = "complete"
    elif commit_type == 'fail':
        prefix = "chore(kb)"
        action = "fail"
    else:
        prefix = "chore(kb)"
        action = commit_type

    # Truncate message if too long
    max_msg_len = 60
    if len(message) > max_msg_len:
        message = message[:max_msg_len] + "..."

    return f"{prefix}: {action} {item_id} - {message}"


def output_result(success: bool, message: str, next_steps: str, had_conflict: bool = False) -> None:
    """
    Output JSON result to stdout.

    Args:
        success: Whether operation succeeded
        message: Status message
        next_steps: Explicit instructions for agent
        had_conflict: Whether git push had conflicts (ownership check needed)
    """
    result = {
        "success": success,
        "message": message,
        "had_conflict": had_conflict,
        "next_steps": next_steps
    }

    print(json.dumps(result, indent=2))


def main() -> None:
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Centralized git operations for Phase 2 agents"
    )
    parser.add_argument(
        '--type',
        required=True,
        choices=['claim', 'fetch', 'extract', 'complete', 'fail'],
        help='Type of commit'
    )
    parser.add_argument(
        '--id',
        required=True,
        help='ID of item being processed (e.g., search_abc123, page_xyz789)'
    )
    parser.add_argument(
        '--message',
        required=True,
        help='Additional context for commit message'
    )

    args = parser.parse_args()

    # Step 1: Stage all changes
    # Note: We don't pull here because:
    # - Calling scripts pull BEFORE modifying files
    # - Push retry logic pulls automatically on conflict
    # - git pull --rebase fails when index has staged changes
    success, error = git_add_all()
    if not success:
        output_result(
            success=False,
            message=f"Git add failed: {error}",
            next_steps=(
                "Git add failed. Automatic recovery:\n\n"
                "1. Calling script should retry this operation\n"
                "2. Check for file permission issues\n"
                "3. Check git repository health: git status"
            )
        )
        sys.exit(1)

    # Step 2: Commit
    commit_msg = format_commit_message(args.type, args.id, args.message)
    success, error = git_commit(commit_msg)
    if not success:
        output_result(
            success=False,
            message=f"Git commit failed: {error}",
            next_steps=(
                "Git commit failed. Automatic recovery:\n\n"
                "1. Calling script should retry this operation\n"
                "2. If 'nothing to commit', this is normal - continue anyway\n"
                "3. Check git repository health: git status"
            )
        )
        sys.exit(1)

    # Step 3: Push with retry (automatic pull on conflict)
    success, error, had_conflict = git_push_with_retry()
    if not success:
        output_result(
            success=False,
            message=f"Git push failed: {error}",
            next_steps=(
                "Git push failed after 3 retries. Automatic recovery:\n\n"
                "1. Calling script should handle this failure gracefully\n"
                "2. For claim operations: Abandon this work, select new work\n"
                "3. For save operations: Try manual commit/push, then continue\n"
                "4. Check network connectivity\n"
                "5. Check git repository health: git status"
            ),
            had_conflict=had_conflict
        )
        sys.exit(1)

    # Success!
    if had_conflict:
        # Had conflicts during push - agent needs to verify ownership
        if args.type == 'claim':
            next_steps = (
                f"Push succeeded after rebase. IMPORTANT: You MUST verify ownership of {args.id}. "
                f"Run: uv run scripts/check-ownership.py --type {args.id.split('_')[0]} --id {args.id}. "
                f"If ownership check fails, abandon this work and select different item."
            )
        else:
            next_steps = (
                f"Push succeeded after rebase. Changes committed: {commit_msg}. "
                f"Continue with next step in workflow."
            )
    else:
        # Clean push - no conflicts
        if args.type == 'claim':
            next_steps = (
                f"Claim successfully committed. You now own {args.id}. "
                f"Proceed with executing the work for this item."
            )
        elif args.type == 'fetch':
            next_steps = (
                f"URL fetch committed. Page saved and registered in tracker. "
                f"Continue with next work item."
            )
        elif args.type == 'extract':
            next_steps = (
                f"Data extraction committed. Raw data saved. "
                f"Continue with next work item."
            )
        elif args.type == 'complete':
            next_steps = (
                f"Work item {args.id} marked as completed. "
                f"Continue with next work item."
            )
        elif args.type == 'fail':
            next_steps = (
                f"Work item {args.id} marked as failed. "
                f"Continue with next work item."
            )
        else:
            next_steps = f"Changes committed: {commit_msg}. Continue with workflow."

    output_result(
        success=True,
        message=f"Successfully committed and pushed: {commit_msg}",
        next_steps=next_steps,
        had_conflict=had_conflict
    )


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        output_result(
            success=False,
            message="Interrupted by user",
            next_steps="Restart the git commit operation when ready."
        )
        sys.exit(130)
    except Exception as e:
        output_result(
            success=False,
            message=f"Unexpected error: {e}",
            next_steps="Check error message and try again. May need manual git intervention."
        )
        sys.exit(1)
