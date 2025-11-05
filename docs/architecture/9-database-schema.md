# 9. Database Schema

**No traditional database - JSON files as knowledge pack**

**What We Use:**
- Structured JSON files in `knowledge_pack/` directory
- Loaded at startup (async, non-blocking) into in-memory Maps for fast O(1) lookups
- 3 carriers × 5 states = 15 carrier files + 5 state requirement files

**Why JSON Files Instead of Database:**
- **PEAK6 spec requirement:** "Offline guarantee" - no runtime database queries, no web scraping
- **Simplicity for 5-day timeline:** No database setup, migrations, or ORM complexity
- **Version control friendly:** JSON files commit to git, easy to review data changes during curation
- **Demo scale appropriate:** 20 files × ~2KB each = ~40KB total, fits easily in memory

**Directory Structure:**
```
knowledge_pack/
├── carriers/
│   ├── geico.json          # GEICO: states, products, eligibility, discounts, compensation
│   ├── progressive.json    # Progressive: same structure
│   └── state-farm.json     # State Farm: same structure
├── states/
│   ├── CA.json             # California minimum requirements
│   ├── TX.json             # Texas minimum requirements
│   ├── FL.json             # Florida minimum requirements
│   ├── NY.json             # New York minimum requirements
│   └── IL.json             # Illinois minimum requirements
└── README.md               # Citations for all data sources (public carrier websites)
```

**Key Design Decisions:**
- **Startup loading (async, non-blocking):** Files loaded during initialization ensures data is immediately available, async prevents blocking container startup
- **Citation tracking:** cuid2-based IDs for all entities provide compliance audit trail (see `docs/knowledge-pack/id-conventions.md`)
- **No database needed:** PEAK6 judges can run demo without database setup
- **Immutable at runtime:** Knowledge pack is read-only after load (no writes during execution)

---
