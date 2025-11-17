"""
Git utilities for Phase 2 scraper agents.

Handles git pull, commit, and push operations with automatic conflict resolution.
"""

import subprocess
import time
from typing import Optional
from pathlib import Path


def git_pull() -> bool:
    """
    Pull latest changes from remote with rebase.

    Returns:
        True if pull succeeded, False otherwise
    """
    try:
        result = subprocess.run(
            ['git', 'pull', '--rebase'],
            capture_output=True,
            text=True,
            cwd=Path.cwd().parent  # Run from repo root
        )
        return result.returncode == 0
    except Exception as e:
        print(f"Git pull failed: {e}")
        return False


def git_commit(message: str) -> bool:
    """
    Commit changes to git.

    Adds both scraper trackers and output data to staging.

    Args:
        message: Commit message

    Returns:
        True if commit succeeded or nothing to commit, False on error
    """
    try:
        # Add scraper directory (includes trackers and raw/ data)
        subprocess.run(
            ['git', 'add', 'knowledge-pack-scraper/'],
            cwd=Path.cwd().parent,
            check=False
        )

        result = subprocess.run(
            ['git', 'commit', '-m', message],
            capture_output=True,
            text=True,
            cwd=Path.cwd().parent
        )

        # Return code 1 with "nothing to commit" message is OK
        if result.returncode == 1 and 'nothing to commit' in result.stdout:
            return True

        return result.returncode == 0
    except Exception as e:
        print(f"Git commit failed: {e}")
        return False


def git_push_with_retry(max_retries: int = 3) -> bool:
    """
    Push with automatic retry on conflict.

    If push fails, automatically rebases and retries.

    Args:
        max_retries: Maximum number of push attempts

    Returns:
        True if push succeeded, False after max retries exhausted
    """
    for attempt in range(max_retries):
        try:
            result = subprocess.run(
                ['git', 'push'],
                capture_output=True,
                text=True,
                cwd=Path.cwd().parent
            )

            if result.returncode == 0:
                return True

            # Push failed, probably conflict
            print(f"Push failed (attempt {attempt + 1}/{max_retries}), rebasing...")

            if not git_pull():
                print("Rebase failed!")
                return False

            time.sleep(1)  # Brief pause before retry

        except Exception as e:
            print(f"Push attempt {attempt + 1} failed: {e}")
            if attempt < max_retries - 1:
                time.sleep(1)
            else:
                return False

    return False


def commit_and_push(message: str) -> bool:
    """
    Atomic commit and push with retry.

    Commits changes and pushes to remote. If push fails due to conflict,
    automatically rebases and retries.

    Args:
        message: Commit message

    Returns:
        True if changes were committed and pushed successfully
    """
    if not git_commit(message):
        print("Nothing to commit or commit failed")
        return True  # No changes is OK

    return git_push_with_retry()


def check_git_status() -> dict:
    """
    Get current git status information.

    Returns:
        Dict with keys: clean (bool), branch (str), ahead (int), behind (int)
    """
    try:
        # Check if working tree is clean
        status_result = subprocess.run(
            ['git', 'status', '--porcelain'],
            capture_output=True,
            text=True,
            cwd=Path.cwd().parent
        )
        clean = len(status_result.stdout.strip()) == 0

        # Get current branch
        branch_result = subprocess.run(
            ['git', 'branch', '--show-current'],
            capture_output=True,
            text=True,
            cwd=Path.cwd().parent
        )
        branch = branch_result.stdout.strip()

        return {
            'clean': clean,
            'branch': branch,
            'ahead': 0,  # TODO: Parse from git status if needed
            'behind': 0  # TODO: Parse from git status if needed
        }
    except Exception as e:
        print(f"Failed to get git status: {e}")
        return {
            'clean': False,
            'branch': 'unknown',
            'ahead': 0,
            'behind': 0
        }
