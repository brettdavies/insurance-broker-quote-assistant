#!/usr/bin/env bun

/**
 * Programmatically update knowledge pack search tracker
 *
 * This utility updates search-tracker.json with proper field calculations
 * and prevents manual JSON editing errors.
 *
 * Usage:
 *   bun run scripts/update-tracker.ts claim <search-id> <agent-id>
 *   bun run scripts/update-tracker.ts complete <search-id> <raw-files...> --pages <page-ids...> [--notes "message"]
 *   bun run scripts/update-tracker.ts fail <search-id> <error-message>
 *
 * Examples:
 *   bun run scripts/update-tracker.ts claim search_abc123 agnt_xyz789
 *   bun run scripts/update-tracker.ts complete search_abc123 carriers/geico/discounts.raw.json --pages page_abc --notes "Found 8 discounts"
 *   bun run scripts/update-tracker.ts fail search_abc123 "WebFetch timeout after 3 retries"
 */

import fs from 'fs';
import path from 'path';

type SearchStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

interface TrackerSearch {
  id: string;
  query: string;
  category: string;
  carrier?: string;
  priority: string;
  status: SearchStatus;
  assignedTo: string | null;
  startedAt: string | null;
  completedAt: string | null;
  durationSeconds: number | null;
  rawDataFiles: string[];
  pageFiles: string[];
  commitHash: string | null;
  errorMessage: string | null;
  retryCount: number;
  notes: string | null;
}

interface TrackerCategory {
  name: string;
  description: string;
  searches: TrackerSearch[];
}

interface Tracker {
  meta: {
    version: string;
    createdDate: string;
    lastUpdated: string;
    totalSearches: number;
    description: string;
  };
  statusCounts: {
    pending: number;
    in_progress: number;
    completed: number;
    failed: number;
  };
  categories: TrackerCategory[];
}

const TRACKER_PATH = path.join(process.cwd(), 'knowledge_pack', 'search-tracker.json');

function loadTracker(): Tracker {
  try {
    const content = fs.readFileSync(TRACKER_PATH, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error loading tracker from ${TRACKER_PATH}:`, error);
    process.exit(1);
  }
}

function saveTracker(tracker: Tracker): void {
  try {
    tracker.meta.lastUpdated = new Date().toISOString();
    fs.writeFileSync(TRACKER_PATH, JSON.stringify(tracker, null, 2) + '\n');
  } catch (error) {
    console.error(`Error saving tracker to ${TRACKER_PATH}:`, error);
    process.exit(1);
  }
}

function findSearch(tracker: Tracker, searchId: string): { search: TrackerSearch; category: TrackerCategory } | null {
  for (const category of tracker.categories) {
    for (const search of category.searches) {
      if (search.id === searchId) {
        return { search, category };
      }
    }
  }
  return null;
}

function claimSearch(searchId: string, agentId: string): void {
  const tracker = loadTracker();
  const result = findSearch(tracker, searchId);

  if (!result) {
    console.error(`Error: Search ${searchId} not found in tracker`);
    process.exit(1);
  }

  const { search } = result;

  if (search.status !== 'pending') {
    console.error(`Error: Search ${searchId} is already ${search.status}`);
    process.exit(1);
  }

  search.status = 'in_progress';
  search.assignedTo = agentId;
  search.startedAt = new Date().toISOString();

  tracker.statusCounts.pending--;
  tracker.statusCounts.in_progress++;

  saveTracker(tracker);
  console.log(`✅ Claimed search ${searchId} for agent ${agentId}`);
}

function completeSearch(searchId: string, rawDataFiles: string[], pageFiles: string[], notes: string | null): void {
  const tracker = loadTracker();
  const result = findSearch(tracker, searchId);

  if (!result) {
    console.error(`Error: Search ${searchId} not found in tracker`);
    process.exit(1);
  }

  const { search } = result;

  if (search.status !== 'in_progress') {
    console.error(`Error: Search ${searchId} is not in progress (current status: ${search.status})`);
    process.exit(1);
  }

  if (!search.startedAt) {
    console.error(`Error: Search ${searchId} has no startedAt timestamp`);
    process.exit(1);
  }

  const completedAt = new Date().toISOString();
  const startedTime = new Date(search.startedAt).getTime();
  const completedTime = new Date(completedAt).getTime();
  const durationSeconds = Math.floor((completedTime - startedTime) / 1000);

  search.status = 'completed';
  search.completedAt = completedAt;
  search.durationSeconds = durationSeconds;
  search.rawDataFiles = rawDataFiles;
  search.pageFiles = pageFiles;
  search.notes = notes;

  tracker.statusCounts.in_progress--;
  tracker.statusCounts.completed++;

  saveTracker(tracker);
  console.log(`✅ Completed search ${searchId} (${durationSeconds}s)`);
  console.log(`   Raw files: ${rawDataFiles.join(', ')}`);
  console.log(`   Pages: ${pageFiles.join(', ')}`);
}

function failSearch(searchId: string, errorMessage: string): void {
  const tracker = loadTracker();
  const result = findSearch(tracker, searchId);

  if (!result) {
    console.error(`Error: Search ${searchId} not found in tracker`);
    process.exit(1);
  }

  const { search } = result;

  if (search.status !== 'in_progress' && search.status !== 'pending') {
    console.error(`Error: Search ${searchId} is already ${search.status}`);
    process.exit(1);
  }

  const wasInProgress = search.status === 'in_progress';

  search.status = 'failed';
  search.errorMessage = errorMessage;
  search.completedAt = new Date().toISOString();

  if (search.startedAt) {
    const durationSeconds = Math.floor(
      (new Date(search.completedAt).getTime() - new Date(search.startedAt).getTime()) / 1000
    );
    search.durationSeconds = durationSeconds;
  }

  if (wasInProgress) {
    tracker.statusCounts.in_progress--;
  } else {
    tracker.statusCounts.pending--;
  }
  tracker.statusCounts.failed++;

  saveTracker(tracker);
  console.log(`❌ Failed search ${searchId}`);
  console.log(`   Error: ${errorMessage}`);
}

function printUsage(): void {
  console.log(`Usage:
  bun run scripts/update-tracker.ts claim <search-id> <agent-id>
  bun run scripts/update-tracker.ts complete <search-id> <raw-files...> --pages <page-ids...> [--notes "message"]
  bun run scripts/update-tracker.ts fail <search-id> <error-message>

Examples:
  bun run scripts/update-tracker.ts claim search_abc123 agnt_xyz789
  bun run scripts/update-tracker.ts complete search_abc123 carriers/geico/discounts.raw.json --pages page_abc --notes "Found 8 discounts"
  bun run scripts/update-tracker.ts fail search_abc123 "WebFetch timeout"
`);
}

// Main CLI
const args = process.argv.slice(2);

if (args.length < 2) {
  printUsage();
  process.exit(1);
}

const command = args[0];
const searchId = args[1];

switch (command) {
  case 'claim': {
    if (args.length !== 3) {
      console.error('Error: claim requires <search-id> <agent-id>');
      printUsage();
      process.exit(1);
    }
    const agentId = args[2];
    claimSearch(searchId, agentId);
    break;
  }

  case 'complete': {
    const pagesIndex = args.indexOf('--pages');
    const notesIndex = args.indexOf('--notes');

    if (pagesIndex === -1) {
      console.error('Error: complete requires --pages flag');
      printUsage();
      process.exit(1);
    }

    const rawDataFiles = args.slice(2, pagesIndex);
    const pageFilesEndIndex = notesIndex !== -1 ? notesIndex : args.length;
    const pageFiles = args.slice(pagesIndex + 1, pageFilesEndIndex);
    const notes = notesIndex !== -1 ? args.slice(notesIndex + 1).join(' ') : null;

    completeSearch(searchId, rawDataFiles, pageFiles, notes);
    break;
  }

  case 'fail': {
    if (args.length < 3) {
      console.error('Error: fail requires <search-id> <error-message>');
      printUsage();
      process.exit(1);
    }
    const errorMessage = args.slice(2).join(' ');
    failSearch(searchId, errorMessage);
    break;
  }

  default:
    console.error(`Error: Unknown command "${command}"`);
    printUsage();
    process.exit(1);
}
