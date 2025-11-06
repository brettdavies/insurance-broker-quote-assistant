#!/usr/bin/env bun

/**
 * Select a random pending search from the tracker
 * Outputs shell commands to set SEARCH_ID and SEARCH_QUERY environment variables
 */

import { readFileSync } from "fs";
import { join } from "path";

const TRACKER_PATH = "knowledge_pack/search-tracker.json";

interface SearchEntry {
  id: string;
  query: string;
  category: string;
  carrier?: string;
  priority: string;
  status: string;
}

interface Category {
  name: string;
  description: string;
  searches: SearchEntry[];
}

interface Tracker {
  meta: any;
  statusCounts: any;
  categories: Category[];
}

try {
  // Read tracker
  const tracker: Tracker = JSON.parse(readFileSync(TRACKER_PATH, "utf-8"));

  // Collect all pending searches
  const pendingSearches: SearchEntry[] = [];
  for (const category of tracker.categories) {
    for (const search of category.searches) {
      if (search.status === "pending") {
        pendingSearches.push(search);
      }
    }
  }

  // Check if any pending searches found
  if (pendingSearches.length === 0) {
    console.error("No pending searches found - Phase 2 complete");
    process.exit(1);
  }

  // Select one at random
  const randomIndex = Math.floor(Math.random() * pendingSearches.length);
  const selected = pendingSearches[randomIndex];

  // Output shell commands to set environment variables
  // Escape double quotes in the query for shell safety
  const escapedQuery = selected.query.replace(/"/g, '\\"');

  console.log(`export SEARCH_ID="${selected.id}"`);
  console.log(`export SEARCH_QUERY="${escapedQuery}"`);

  // Output to stderr for visibility (won't interfere with eval)
  console.error(`✓ Selected: ${selected.id}`);
  console.error(`✓ Query: ${selected.query}`);
  console.error(`✓ Category: ${selected.category}`);
  if (selected.carrier) {
    console.error(`✓ Carrier: ${selected.carrier}`);
  }
  console.error(`✓ Priority: ${selected.priority}`);

  process.exit(0);
} catch (error) {
  console.error("Error selecting random search:", error);
  process.exit(1);
}
