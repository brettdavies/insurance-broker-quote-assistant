#!/usr/bin/env python3
"""
Brave Search API client with rate limiting and token management.

Features:
- Rate limiting (1.1s between requests)
- Dual token management (FREE → PAID when exhausted)
- Error handling (auth, rate limit, network)
- Request logging

Environment Variables:
- BRAVE_WEB_API_TOKEN_FREE: Free tier token (used first)
- BRAVE_WEB_API_TOKEN_PAID: Paid tier token (used after free exhausted)
"""

import json
import os
import sys
import time
from typing import Optional

import requests


class BraveAPIClient:
    """
    Brave Search API client with rate limiting.

    Attributes:
        endpoint: Brave API endpoint URL
        token_free: Free tier API token
        token_paid: Paid tier API token
        current_token: Currently active token
        last_request_time: Timestamp of last API request
        free_exhausted: Whether free tier credits are exhausted
    """

    ENDPOINT = "https://api.search.brave.com/res/v1/web/search"
    RATE_LIMIT_DELAY = 1.1  # seconds

    def __init__(self):
        """Initialize client with environment tokens."""
        self.token_free = os.getenv("BRAVE_WEB_API_TOKEN_FREE")
        self.token_paid = os.getenv("BRAVE_WEB_API_TOKEN_PAID")

        if not self.token_free and not self.token_paid:
            print(json.dumps({
                "success": False,
                "error": "MISSING_TOKENS",
                "message": "Neither BRAVE_WEB_API_TOKEN_FREE nor BRAVE_WEB_API_TOKEN_PAID found in environment"
            }, indent=2), file=sys.stderr)
            sys.exit(1)

        # Start with free token if available
        self.current_token = self.token_free if self.token_free else self.token_paid
        self.free_exhausted = not bool(self.token_free)
        self.last_request_time: Optional[float] = None

        print(json.dumps({
            "message": f"Brave API client initialized (using {'PAID' if self.free_exhausted else 'FREE'} token)",
            "has_free": bool(self.token_free),
            "has_paid": bool(self.token_paid)
        }, indent=2), file=sys.stderr)

    def _enforce_rate_limit(self):
        """Enforce 1.1s delay between API requests."""
        if self.last_request_time is not None:
            elapsed = time.time() - self.last_request_time
            if elapsed < self.RATE_LIMIT_DELAY:
                sleep_time = self.RATE_LIMIT_DELAY - elapsed
                time.sleep(sleep_time)

    def _switch_to_paid(self):
        """Switch from free to paid token when free credits exhausted."""
        if self.free_exhausted or not self.token_paid:
            return False

        print(json.dumps({
            "message": "Free tier credits exhausted - switching to paid token",
            "token_type": "PAID"
        }, indent=2), file=sys.stderr)

        self.current_token = self.token_paid
        self.free_exhausted = True
        return True

    def search(self, query: str, params: Optional[dict] = None) -> tuple[bool, dict]:
        """
        Execute Brave API search.

        Args:
            query: Search query string
            params: Optional additional parameters (merged with defaults)

        Returns:
            Tuple of (success, response_dict)

        Raises:
            SystemExit: On fatal errors (auth failure, network issues)
        """
        # Enforce rate limit
        self._enforce_rate_limit()

        # Default parameters
        default_params = {
            "q": query,
            "safesearch": "strict",
            "freshness": "py",  # Past year
            "text_decorations": "false",
            "result_filter": "web,query",
            "extra_snippets": "false",
            "summary": "false",
            "count": 20,
            "offset": 0
        }

        # Merge with custom params
        if params:
            default_params.update(params)

        # Prepare headers
        headers = {
            "Accept": "application/json",
            "Accept-Encoding": "gzip",
            "X-Subscription-Token": self.current_token
        }

        # Make request
        try:
            response = requests.get(
                self.ENDPOINT,
                params=default_params,
                headers=headers,
                timeout=30
            )

            self.last_request_time = time.time()

            # Handle HTTP errors
            if response.status_code == 401:
                # Unauthorized - try switching to paid if possible
                if not self.free_exhausted and self.token_paid:
                    if self._switch_to_paid():
                        # Retry with paid token
                        return self.search(query, params)

                # Auth failed even with paid token
                print(json.dumps({
                    "success": False,
                    "error": "AUTH_FAILED",
                    "message": "Brave API authentication failed",
                    "details": "Check BRAVE_WEB_API_TOKEN_FREE and BRAVE_WEB_API_TOKEN_PAID"
                }, indent=2), file=sys.stderr)
                sys.exit(1)

            elif response.status_code == 429:
                # Rate limit exceeded
                retry_after = response.headers.get("Retry-After", "unknown")
                print(json.dumps({
                    "success": False,
                    "error": "RATE_LIMIT",
                    "message": "Brave API rate limit exceeded",
                    "retry_after": retry_after
                }, indent=2), file=sys.stderr)
                sys.exit(2)

            elif response.status_code != 200:
                # Other HTTP error
                print(json.dumps({
                    "success": False,
                    "error": "HTTP_ERROR",
                    "message": f"HTTP {response.status_code}: {response.text[:200]}"
                }, indent=2), file=sys.stderr)
                sys.exit(3)

            # Parse JSON response
            try:
                data = response.json()
                return True, data
            except json.JSONDecodeError as e:
                print(json.dumps({
                    "success": False,
                    "error": "INVALID_JSON",
                    "message": f"Failed to parse JSON response: {e}"
                }, indent=2), file=sys.stderr)
                sys.exit(4)

        except requests.Timeout:
            print(json.dumps({
                "success": False,
                "error": "TIMEOUT",
                "message": "Request timed out after 30 seconds"
            }, indent=2), file=sys.stderr)
            sys.exit(5)

        except requests.RequestException as e:
            print(json.dumps({
                "success": False,
                "error": "NETWORK_ERROR",
                "message": f"Network error: {e}"
            }, indent=2), file=sys.stderr)
            sys.exit(6)


# Singleton instance
_client: Optional[BraveAPIClient] = None


def get_client() -> BraveAPIClient:
    """Get or create singleton BraveAPIClient instance."""
    global _client
    if _client is None:
        _client = BraveAPIClient()
    return _client


def search(query: str, params: Optional[dict] = None) -> tuple[bool, dict]:
    """
    Convenience function for searching.

    Args:
        query: Search query string
        params: Optional additional parameters

    Returns:
        Tuple of (success, response_dict)
    """
    client = get_client()
    return client.search(query, params)
