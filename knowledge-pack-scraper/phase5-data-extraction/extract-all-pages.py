#!/usr/bin/env python3
"""
Extract insurance data from all filtered pages using LLM.

This script:
1. Loads pending pages from page-tracker
2. Reads filtered markdown content
3. Calls LLM (Claude or OpenAI) with extraction prompt
4. Validates JSON output against schema
5. Pipes results to save-extraction.py
6. Handles rate limiting and concurrent processing

Usage:
    # Using Claude Sonnet 4.5 (default, higher quality)
    uv run extract-all-pages.py --limit 100

    # Using OpenAI GPT-4o-mini (cheaper)
    uv run extract-all-pages.py --provider openai --limit 100

    # Full run (2,925 pages)
    uv run extract-all-pages.py --workers 10

    # Test single page
    uv run extract-all-pages.py --page-id page_abc123
"""

import argparse
import asyncio
import json
import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

# Add lib directory to path
sys.path.insert(0, str(Path(__file__).parent.parent / 'lib'))

from tracker_manager import TrackerManager

# LLM provider imports (conditional)
try:
    from anthropic import Anthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False

try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False


class ExtractionOrchestrator:
    """Orchestrate LLM extraction across all filtered pages."""

    def __init__(
        self,
        provider: str = "anthropic",
        model: Optional[str] = None,
        workers: int = 10,
        limit: Optional[int] = None
    ):
        self.provider = provider
        self.workers = workers
        self.limit = limit

        # Initialize tracker manager
        self.tm = TrackerManager()

        # Load extraction prompt
        self.extraction_prompt = self._load_extraction_prompt()

        # Initialize LLM client
        if provider == "anthropic":
            if not ANTHROPIC_AVAILABLE:
                raise ImportError("anthropic package not installed. Run: uv add anthropic")
            self.client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
            self.model = model or "claude-sonnet-4-20250514"
        elif provider == "openai":
            if not OPENAI_AVAILABLE:
                raise ImportError("openai package not installed. Run: uv add openai")
            self.client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
            self.model = model or "gpt-4o-mini"
        else:
            raise ValueError(f"Unknown provider: {provider}")

        # Stats
        self.stats = {
            "total": 0,
            "success": 0,
            "failed": 0,
            "empty": 0,
            "start_time": datetime.now()
        }

    def _load_extraction_prompt(self) -> str:
        """Load the extraction prompt from markdown file."""
        prompt_file = Path(__file__).parent / "extraction-prompt.md"
        if not prompt_file.exists():
            raise FileNotFoundError(f"Extraction prompt not found: {prompt_file}")

        with open(prompt_file, encoding='utf-8') as f:
            return f.read()

    def _get_pending_pages(self) -> List[Dict]:
        """Load pending pages from tracker."""
        with open(self.tm.trackers_dir / 'page-tracker.json', encoding='utf-8') as f:
            tracker = json.load(f)

        # Filter to pending pages with filtered markdown
        pending = []
        for page_id, page_data in tracker['pages'].items():
            if page_data['status'] == 'pending':
                # Check if filtered markdown exists
                prefix = page_id[5:7]  # Extract 2-char prefix from page_id
                filtered_file = self.tm.output_base / 'pages' / prefix / f"{page_id}_filtered.md"

                if filtered_file.exists():
                    pending.append({
                        'id': page_id,
                        'url': page_data.get('url', 'unknown'),
                        'filtered_file': str(filtered_file),
                        'accessed_date': page_data.get('fetchedAt', '').split('T')[0]  # YYYY-MM-DD
                    })

        # Apply limit if specified
        if self.limit:
            pending = pending[:self.limit]

        return pending

    async def extract_page(self, page: Dict) -> Dict:
        """Extract data from a single page using LLM."""
        page_id = page['id']

        try:
            # Read filtered markdown
            with open(page['filtered_file'], encoding='utf-8') as f:
                markdown_content = f.read()

            # Prepare user message
            user_message = f"""Extract insurance data from this filtered page content.

Page ID: {page_id}
Source URL: {page['url']}
Accessed Date: {page['accessed_date']}

---

{markdown_content}

---

Return JSON following the extraction schema. If no relevant insurance data is found, return an empty data_points array."""

            # Call LLM
            if self.provider == "anthropic":
                response = await self._call_claude(user_message)
            elif self.provider == "openai":
                response = await self._call_openai(user_message)
            else:
                raise ValueError(f"Unknown provider: {self.provider}")

            # Parse JSON response
            extracted_data = self._parse_llm_response(response)

            # Validate schema
            self._validate_extraction(extracted_data)

            # Save via existing pipeline
            self._save_extraction(page_id, extracted_data)

            # Update stats
            if len(extracted_data.get('data_points', [])) == 0:
                self.stats['empty'] += 1
            else:
                self.stats['success'] += 1

            return {
                "page_id": page_id,
                "status": "success",
                "data_points": len(extracted_data.get('data_points', []))
            }

        except Exception as e:
            self.stats['failed'] += 1
            return {
                "page_id": page_id,
                "status": "failed",
                "error": str(e)
            }

    async def _call_claude(self, user_message: str) -> str:
        """Call Claude API for extraction."""
        message = self.client.messages.create(
            model=self.model,
            max_tokens=4096,
            system=self.extraction_prompt,
            messages=[{"role": "user", "content": user_message}]
        )

        return message.content[0].text

    async def _call_openai(self, user_message: str) -> str:
        """Call OpenAI API for extraction."""
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": self.extraction_prompt},
                {"role": "user", "content": user_message}
            ],
            max_tokens=4096,
            response_format={"type": "json_object"}
        )

        return response.choices[0].message.content

    def _parse_llm_response(self, response: str) -> Dict:
        """Parse LLM response as JSON."""
        # Try to find JSON in response (handle markdown code blocks)
        if "```json" in response:
            response = response.split("```json")[1].split("```")[0].strip()
        elif "```" in response:
            response = response.split("```")[1].split("```")[0].strip()

        return json.loads(response)

    def _validate_extraction(self, data: Dict) -> None:
        """Validate extracted data against schema."""
        # Basic validation (could add JSON Schema validation here)
        if not isinstance(data, dict):
            raise ValueError("Extracted data must be a dict")

        if 'carrier' not in data:
            raise ValueError("Missing required field: carrier")

        if 'data_points' not in data:
            raise ValueError("Missing required field: data_points")

        if not isinstance(data['data_points'], list):
            raise ValueError("data_points must be a list")

    def _save_extraction(self, page_id: str, extracted_data: Dict) -> None:
        """Save extraction via existing save-extraction.py script."""
        # Prepare data for save-extraction.py
        # It expects just the data_points array
        data_points = extracted_data.get('data_points', [])

        # Call save-extraction.py
        result = subprocess.run(
            [
                'uv', 'run',
                str(Path(__file__).parent / 'save-extraction.py'),
                '--page-id', page_id
            ],
            input=json.dumps(data_points),
            capture_output=True,
            text=True,
            cwd=Path(__file__).parent.parent
        )

        if result.returncode != 0:
            raise RuntimeError(f"save-extraction.py failed: {result.stderr}")

    async def run(self) -> None:
        """Run extraction across all pending pages."""
        print(f"🚀 Starting extraction orchestrator")
        print(f"   Provider: {self.provider} ({self.model})")
        print(f"   Workers: {self.workers}")
        print(f"   Limit: {self.limit or 'None (all pages)'}")
        print()

        # Load pending pages
        pages = self._get_pending_pages()
        self.stats['total'] = len(pages)

        if len(pages) == 0:
            print("❌ No pending pages found")
            return

        print(f"📄 Found {len(pages)} pending pages")
        print()

        # Process pages in batches (concurrent workers)
        batch_size = self.workers
        for i in range(0, len(pages), batch_size):
            batch = pages[i:i + batch_size]

            # Process batch concurrently
            tasks = [self.extract_page(page) for page in batch]
            results = await asyncio.gather(*tasks, return_exceptions=True)

            # Report batch progress
            batch_num = (i // batch_size) + 1
            total_batches = (len(pages) + batch_size - 1) // batch_size

            print(f"✅ Batch {batch_num}/{total_batches} complete ({len(batch)} pages)")

            # Show sample results from this batch
            for result in results[:3]:  # Show first 3 results
                if isinstance(result, dict):
                    status = result['status']
                    page_id = result['page_id']
                    if status == 'success':
                        data_points = result.get('data_points', 0)
                        print(f"   ✓ {page_id}: {data_points} data points")
                    else:
                        error = result.get('error', 'unknown')
                        print(f"   ✗ {page_id}: {error}")

        # Final stats
        elapsed = (datetime.now() - self.stats['start_time']).total_seconds()
        print()
        print("="* 60)
        print(f"🎉 Extraction complete!")
        print(f"   Total pages: {self.stats['total']}")
        print(f"   Success: {self.stats['success']}")
        print(f"   Empty (no data): {self.stats['empty']}")
        print(f"   Failed: {self.stats['failed']}")
        print(f"   Elapsed: {elapsed:.1f}s ({elapsed/60:.1f} minutes)")
        print(f"   Rate: {self.stats['total']/elapsed:.1f} pages/sec")
        print("="* 60)


async def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Extract insurance data from filtered pages using LLM"
    )
    parser.add_argument(
        '--provider',
        choices=['anthropic', 'openai'],
        default='anthropic',
        help='LLM provider to use (default: anthropic)'
    )
    parser.add_argument(
        '--model',
        help='Model to use (default: claude-sonnet-4-20250514 or gpt-4o-mini)'
    )
    parser.add_argument(
        '--workers',
        type=int,
        default=10,
        help='Number of concurrent workers (default: 10)'
    )
    parser.add_argument(
        '--limit',
        type=int,
        help='Limit to first N pages (for testing)'
    )
    parser.add_argument(
        '--page-id',
        help='Extract single page by ID (for testing)'
    )

    args = parser.parse_args()

    # Check API keys
    if args.provider == 'anthropic' and not os.environ.get('ANTHROPIC_API_KEY'):
        print("❌ ANTHROPIC_API_KEY not set")
        print("   export ANTHROPIC_API_KEY='your-key-here'")
        sys.exit(1)

    if args.provider == 'openai' and not os.environ.get('OPENAI_API_KEY'):
        print("❌ OPENAI_API_KEY not set")
        print("   export OPENAI_API_KEY='your-key-here'")
        sys.exit(1)

    # Initialize orchestrator
    orchestrator = ExtractionOrchestrator(
        provider=args.provider,
        model=args.model,
        workers=args.workers,
        limit=args.limit
    )

    # Run extraction
    await orchestrator.run()


if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n❌ Interrupted by user")
        sys.exit(130)
