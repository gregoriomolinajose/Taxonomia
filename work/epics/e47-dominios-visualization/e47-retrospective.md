# Epic Retrospective: E47 - Dominios Import and Visualization

## Overview
Epic E47 focused on elevating the "Dominios" entity to structural parity with "Capacidades", primarily targeting mass ETL data ingestion and the complex hierarchical Treemap visualization.

## Key Outcomes & Learnings

1. **Topological Synchronization Challenges (CSVs)**:
   - **Issue**: Uploading flat CSV files bypasses the native UI Graph edge creation (`Sys_Graph_Edges`), resulting in hundreds of orphaned nodes.
   - **Solution**: We injected an **Auto-Inference Fallback** (`S47.4`). When edges are absent, the system mathematically maps relationships in memory based on the string taxonomy of `orden_path` (e.g. `02.01` links inside `02`).

2. **Data Integrity (Invisible Whitespaces)**:
   - **Issue**: Google Sheets / CSV ingestion often introduces silent trailing spaces in text cells. For generated UUIDs, `"DOM-W5WPDX9M "` vs `"DOM-W5WPDX9M"` breaks the relational dictionary mapping entirely.
   - **Solution**: We implemented strict `.trim()` sanitization across all relation loops (`S47.5`), guaranteeing that string keys are matched accurately regardless of spreadsheet anomalies.

3. **Strict Root Visualization (Treemaps)**:
   - **Issue**: The Treemap renderer traditionally assumes any orphan node is a root. In a database of 500+ records where relationships fail, the UI degrades by placing Level 1, 2, and 3 nodes directly into the Nivel 0 canvas.
   - **Solution**: We established a **Strict Root Enforcement** rule (`S47.6`). Roots can *only* be drawn if their `nivel_tipo == 0` (or empty). If a sub-node is orphaned, it is silently purged from the visual tree to protect the integrity of the canvas.

4. **Visual Depth Control**:
   - We updated the ECharts Treemap parameter `leafDepth` from `1` to `2` (`S47.7`), allowing users to immediately perceive the underlying hierarchy (Nivel 0 containing Nivel 1 and Nivel 2) directly upon loading, drastically reducing the number of deep-clicks required.

## Next Steps
With the Dominios visualization and ingestion fully hardened against bad flat-file data, the architectural lessons learned here (trimming, strict roots, auto-inference) can be propagated to any future deeply nested entities.
