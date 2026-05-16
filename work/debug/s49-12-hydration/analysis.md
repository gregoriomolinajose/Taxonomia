# S49.13 Debug Analysis: Temporal Graph Subtitle Resolution

## Tier Classification
**Tier:** M (Multiple possible causes).
**Method:** Genchi Genbutsu & Ishikawa (Code Analysis).

## Problem Definition
**WHAT:** The `TXSearchable` component shows `Sin Identificar` for all entries when rendering the `Persona` entity list.
**WHEN:** Rendering the inner list for related lookup items where the subtitle is driven by an `id_cargo`.
**WHERE:** `UI_Component_TXSearchable.client.js` in `buildListItems()`.
**EXPECTED:** It should look up the `Cargo` name and display it (e.g. `Gerente de Producto`).

## Ishikawa Analysis (Hypotheses)

| Hypothesis | Test | Result | Conclusion |
|------------|------|--------|------------|
| 1. `subtitleLookup` attribute is missing | Checked `UI_Factory_Searchables.client.js` | Attribute is correctly transferred from `Schema_Engine.js`. | Eliminated |
| 2. `DATASTORE::CHANGED` event firing before DataStore is populated | Added reactive updates in previous fix | Component receives the event and correctly triggers `_scheduleRender` and `buildListItems`. | Eliminated |
| 3. `Persona` tuples from backend are missing `id_cargo` | Traced `Persona` schema vs `Engine_DB.list('Persona')` behavior | `id_cargo` has `isTemporalGraph: true`, meaning it is **NOT stored** on the Persona row, but inside `Sys_Graph_Edges`. | **Confirmed** |

## Root Cause
The `TXSearchable` code relied on `item[subtitleField]` (e.g., `item["id_cargo"]`) being explicitly present on the object. Because `id_cargo` is a temporal graph relation, the property does not exist directly on the `Persona` row tuple hydrated by `Engine_DB`. Thus, `item[subtitleField]` evaluated to `undefined`, immediately falling back to `Sin Identificar` without even querying `window.DataStore.get('Cargo')`.

## Countermeasure & Fix
Extracted the resolution logic into a new internal helper: `_resolveSubtitle(item, idVal)`.
1. It attempts to read `item[subtitleField]`.
2. If undefined, it cross-references `window.APP_SCHEMAS` for the `targetEntity` to check if the `subtitleField` is a temporal graph edge (`isTemporalGraph`).
3. If it is, it queries `window.DataStore.get('Sys_Graph_Edges')` using the `graphEdgeType` to locate the missing ID.
4. Once the relational ID is found (either directly or via the graph), it queries the `subtitleLookup` store (e.g., `Cargo`) to extract the semantic name.

## Prevention
- No direct regression test can be written for UI logic without Jest DOM, but the centralized `_resolveSubtitle` method ensures all areas of `TXSearchable` (Inline list and Multi-cards container) correctly handle Graph topologies gracefully.
- Future components needing relation lookups should use the same `Sys_Graph_Edges` pattern.
