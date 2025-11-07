"""
ID generation utilities using cuid2.

Provides functions to generate unique IDs with appropriate prefixes for different entity types.
"""

from cuid2 import Cuid

# Initialize cuid2 generator
_cuid_generator = Cuid()


def generate_id(prefix: str) -> str:
    """
    Generate a cuid2 with the given prefix.

    Args:
        prefix: Prefix string (e.g., "page_", "url_", "agnt_")

    Returns:
        Prefixed cuid2 string
    """
    return f"{prefix}{_cuid_generator.generate()}"


def generate_page_id() -> str:
    """Generate a page ID (page_xxxxxxxxxx)."""
    return generate_id('page_')


def generate_url_id() -> str:
    """Generate a URL ID (url_xxxxxxxxxx)."""
    return generate_id('url_')


def generate_raw_id() -> str:
    """Generate a raw data ID (raw_xxxxxxxxxx)."""
    return generate_id('raw_')


def generate_extraction_id() -> str:
    """Generate an extraction ID (extr_xxxxxxxxxx)."""
    return generate_id('extr_')


def generate_search_id() -> str:
    """Generate a search ID (search_xxxxxxxxxx)."""
    return generate_id('search_')


def generate_websearch_id() -> str:
    """Generate a websearch ID (websearch_xxxxxxxxxx)."""
    return generate_id('websearch_')
