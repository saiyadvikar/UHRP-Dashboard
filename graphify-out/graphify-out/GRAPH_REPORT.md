# Graph Report - Ultra HRP Dashboard  (2026-10-22)

## Corpus Check
- Large corpus: 8 files · ~6,071,729 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 122 nodes · 253 edges · 13 communities (6 shown, 7 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.87)
- Token cost: 1,250 input · 850 output

## Community Hubs (Navigation)
- Client Core & Date Calculators
- Cohort Filtering & Linelist Engine
- Clinical Governance & Standalone Bundle
- ETL Data Pipeline & NMR Matcher
- Delivery Categorization & Fiscal Year
- Location Hierarchy & Contact Mapping
- SOP PDF Generation Engine
- Analytics Charts & Management Visualizer
- Delivery Line List Ingestion
- Git Automation & Remote Sync
- Medical Officer Classifier
- Fast Excel Loader
- Excel Metadata Reader

## God Nodes (most connected - your core abstractions)
1. `renderLineList()` - 25 edges
2. `main()` - 16 edges
3. `exportToExcel()` - 14 edges
4. `renderKpiCards()` - 10 edges
5. `parseDate()` - 9 edges
6. `renderAnalyticsCharts()` - 9 edges
7. `setupEventListeners()` - 8 edges
8. `scrollToLinelistOnMobile()` - 7 edges
9. `clearFilters()` - 7 edges
10. `getFilteredAncPatients()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `Agent Guidelines & Memory` --references--> `UHRP Dashboard Web Interface`  [INFERRED]
  AGENTS.md → index.html

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **UHRP Clinical Management & Tracking Lifecycle** — uhrp_dashboard_sop_pdf, clinical_anemia_management, clinical_anc_tracker, app, update_dashboard [EXTRACTED 0.95]

## Communities (13 total, 7 thin omitted)

### Community 0 - "Client Core & Date Calculators"
Cohesion: 0.15
Nodes (25): buildHierarchyMappings(), calculateAncVisitDate(), calculateGestationalAge(), clearFilters(), formatDateDDMMYYYY(), handleInitialHash(), hasHighBpReading(), isAlbumin2Plus() (+17 more)

### Community 1 - "Cohort Filtering & Linelist Engine"
Cohesion: 0.22
Nodes (22): checkConsecutiveMissedAnc(), cleanVillageName(), exportToExcel(), getFilteredAncPatients(), getFilteredPatients(), getPatientClinicalStatus(), getPatientCurrentGaWeeks(), getPatientDiagnosedTrimester() (+14 more)

### Community 2 - "Clinical Governance & Standalone Bundle"
Cohesion: 0.10
Nodes (6): Agent Guidelines & Memory, 12 ANC Visit Timeline Tracking, Severe Anemia Management Protocol, PIH & GDM Clinical Pathways, UHRP Dashboard Web Interface, UHRP Dashboard SOP Document

### Community 4 - "Delivery Categorization & Fiscal Year"
Cohesion: 0.32
Nodes (6): categorize_delivery_facility(), clean_str(), get_fiscal_year(), main(), extract_row_fy(), map_delivery_place()

### Community 5 - "Location Hierarchy & Contact Mapping"
Cohesion: 0.33
Nodes (5): clean_phone(), clean_v_key(), get_hr_contacts(), load_location_hierarchy(), norm_sub_key()

### Community 8 - "Delivery Line List Ingestion"
Cohesion: 0.40
Nodes (3): clean_mobile(), format_to_dd_mmyyyy(), load_delivery_linelist()

## Knowledge Gaps
- **3 isolated node(s):** `Agent Guidelines & Memory`, `PIH & GDM Clinical Pathways`, `Neonatal Mortality Linkage Analysis`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 38 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `DASHBOARD_DATA Clinical Store` connect `ETL Data Pipeline & NMR Matcher` to `Client Core & Date Calculators`?**
  _High betweenness centrality (0.333) - this node is a cross-community bridge._
- **Why does `NumberedCanvas` connect `SOP PDF Generation Engine` to `Clinical Governance & Standalone Bundle`?**
  _High betweenness centrality (0.081) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `main()` (e.g. with `extract_row_fy()` and `map_delivery_place()`) actually correct?**
  _`main()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Agent Guidelines & Memory`, `PIH & GDM Clinical Pathways`, `Neonatal Mortality Linkage Analysis` to the rest of the system?**
  _3 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Client Core & Date Calculators` be split into smaller, more focused modules?**
  _Cohesion score 0.14814814814814814 - nodes in this community are weakly interconnected._
- **Should `Clinical Governance & Standalone Bundle` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._