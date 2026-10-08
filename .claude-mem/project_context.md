# Project Memory & Knowledge Context — Ultra HRP Dashboard

**Last Updated:** 2026-10-02  
**System:** Claude-Mem Persistent Memory Layer  
**Target:** Ultra High Risk Pregnancy (UHRP) Care Dashboard — West Nimar (Khargone), MP  

---

## 1. Executive Summary & Architecture

The **Ultra High Risk Pregnancy (UHRP) Dashboard** is a clinical command center and tracking system designed for district health administrators, Medical Officers (MOs), and frontline health workers (ANMs, CHOs, ASHAs) in West Nimar (Khargone), Madhya Pradesh.

It strictly implements the **Sample 2** design palette and architecture:
- 6 Clinical Risk Factor tabs (Severe Anemia, PIH, GDM, Previous LSCS, Sickle Cell Disease, Teenage Pregnancy)
- 4 Clinical Status Resolution Tiers for Severe Anemia (Resolved > 11.0 g/dL, Mild 10.0-10.9, Moderate 7.0-9.9, Severe < 7.0)
- Trimester and Missed Visit filtering
- Full 12-visit attendance and Hb sparkline tracking with Iron Sucrose markers and FCM/BT administration in the expansion drawer
- Dedicated "Charts" section for clinical management visualizations (Iron Sucrose/FCM/BT for Anemia, Labetalol for PIH)

### Core File Structure
| File | Role & Function | Key Details |
| :--- | :--- | :--- |
| **`UHRP_Dashboard_Standalone.html`** | Primary production dashboard | 2.49 MB, completely self-contained (zero external web dependencies). Can be opened directly in any browser offline. |
| **`update_dashboard.py`** | Data extraction & ETL | Reads raw Excel linelists, processes 12 ANC visits, extracts clinical tags, and writes `data.js`. |
| **`build_standalone_html.py`** | Standalone compiler | Inlines `style.css`, `data.js`, and `app.js` into `UHRP_Dashboard_Standalone.html`. |
| **`app.js`** | Core frontend logic | Client-side reactive filtering, search, pagination, sparklines, drawer, and ApexCharts. |
| **`style.css`** | Styling & UI tokens | Implements the **Sample 2** color palette and compact responsive drawer design. |
| **`data.js`** | Structured data payload | Global `DASHBOARD_DATA` containing 1,745 refined high-risk patient records, block/facility metadata, and delivery tracking. |

---

## 2. Design System: Sample 2 Color Profile

The dashboard strictly uses the **Sample 2** visual aesthetic:
- **Canvas Background:** `#fcf1f4` (Light blush tone)
- **Cards & Surfaces:** `#ffffff` with `border: 1px solid #f1d7df` and `border-radius: 14px`
- **Table Headers & Hierarchy Bars:** `#1e2538` (Dark slate navy with high contrast white text)
- **Palette Tokens:**
  - **Neon Pink (`--primary`):** `#ff2a6d` (Primary branding, active tab indicator, severe alert, border highlights, MO Checkup Pending)
  - **Deep Violet / Purple:** `#7928ca` (Sickle Cell Disease tab, Iron Sucrose cross markers)
  - **Cyan / Sky Blue:** `#00b4d8` (Mild status, GDM/Diabetes, 1st Trimester)
  - **Amber / Warm Orange:** `#f77f00` (Moderate status, Missed visits, 2nd Trimester, PIH management)
  - **Emerald Green:** `#10b981` (Resolved clinical status, MO Exam Completed)

---

## 3. Clinical Definitions & Logic

### A. Severe Anemia Resolution (4 Clinical Categories)
Based on the latest recorded Hemoglobin (Hb) value across 12 ANC visits:
1. **✓ Resolved:** $\text{Latest Hb} > 11.0\text{ g/dL}$ (*Normal Hemoglobin*)
2. **Mild:** $10.0 \le \text{Latest Hb} \le 10.9\text{ g/dL}$ (*Mild Anemia*)
3. **Moderate:** $7.0 \le \text{Latest Hb} \le 9.9\text{ g/dL}$ (*Moderate Anemia*)
4. **⚠ Severe Anemia:** $\text{Latest Hb} < 7.0\text{ g/dL}$ (*Requires IV Iron / Blood Transfusion*)
*Operational Indicators:*
- **⚠ Missed 2+ ANC Visits:** Attendance gap detection.
- **🩺 Not Seen by MO:** High-risk mothers lacking a documented Medical Officer examination.

### B. Authentic Anemia Clinical Management
Extracted directly from HRP Linelist columns 34–41:
- **Iron Sucrose Doses (Cols 34–38):** Dose dates mapped to ANC visit timeline and plotted as small purple crosses (`✕`) on the Hb sparkline without date text.
- **Inj. FCM (Ferric Carboxymaltose) (Cols 40–41):** `fcm` ('Yes'/'No') and `fcm_fac` (facility name where administered).
- **Blood Transfusion (BT) (Col 39):** `bt` (units administered).
*Displayed in the expansion drawer for Severe Anemia (`sa`), Sickle Cell Disease (`sc`), and any patient from other risk factors who was managed for Anemia (received Iron Sucrose doses, Inj FCM, or Blood Transfusion). For non-anemic mothers with no management, the bar is omitted.*

### C. GDM Cohort Qualification & Clinical Management
Only pregnant mothers who are:
1. Associated with at least one of the other 6 UHRP risk factors, OR
2. Documented on medical management in Col AT (`GDM Mangement == Yes`), Col AX (`On MNT == Yes`), Col AY (`On Metformin == Yes`), or Col AZ (`On Insulin == Yes`).
*Unmanaged, isolated GDM cases without treatment are excluded, resulting in 498 qualified GDM cases out of a refined 2,042 UHRP cohort. Dedicated GDM Clinical Management bar in drawer displays MNT, Metformin, and Insulin treatment status.*

### D. PIH Clinical Management Regimen
Extracted from Col AR (`PIH Management Done...`):
- Antihypertensive therapy (e.g. Labetalol, Methyldopa, MgSO4) displayed in dedicated orange-accented drawer bar for PIH patients.

### E. Delivery Tracking & Place Reclassification
Integrated from `Ultra HRP delivery linelist/Ultra_HRP_Delivery_Tracking_line_list_2026-09-28_14_26_03.xlsx`:
- Exact delivery facility from Column AC displayed in the table.
- Delivery Date from Column AD displayed in the table.
- Pie chart reclassifies delivery place into: Home, in transit, PHC, CHC, CH, DH, Medical College, Private hospitals, and Not Delivered.

---

## 4. Expansion Drawer & Visualizations

- **Dashboard Header:** Dynamic badge beside the title displays `'Last update on DD-MM-YYYY'` populated directly from `DASHBOARD_DATA.gen_date`.
- **Snug Expansion Drawer:** Vertical padding compacted to `0.75rem`, left border accent `#ff2a6d`, compact attendance chips with Gestational Age (GA) rectangular boxes.
- **Sparkline Line Graphs:**
  - X-Axis displays clean labels: **`Visit 1`, `Visit 2`, ..., `Visit 12`**.
  - Iron Sucrose doses plotted with small crosses (`✕`) at corresponding visit points.
  - Hb threshold reference lines: Red dotted at $7.0\text{ g/dL}$, Green dotted at $11.0\text{ g/dL}$.
- **Charts Section & Grid:**
  - **Risk Factor-wise Clinical Management Status (Top-Left):** Horizontal stacked bar chart visualizing active management for Severe Anemia (IS, FCM, BT: 93.8% managed) and PIH (Antihypertensive drugs: 86.2% managed). Ready for future addition of Sickle Cell and GDM.
  - **Block-wise Clinical Management Status (Top-Right):** Horizontal stacked bar chart showing management coverage (Yes vs No/Pending) across all 9 blocks.
  - **Block-wise MO Checkup Status:** Horizontal stacked sidebar (`horizontal: true`, `stacked: true`) with Emerald `#10b981` (Completed) and Neon Pink `#ff2a6d` (Pending).
  - **Risk Factor-wise MO Checkup Status:** Horizontal stacked sidebar (`horizontal: true`, `stacked: true`) with identical theme.
  - **Block-wise Case Distribution:** Horizontal sidebar with geographic breakdown.
  - **Delivery Place Distribution:** Donut pie chart with reclassified categories.
  - *Year-wise Registration, Comparative Identification, and Teenage Pregnancy treemap charts removed.*

---

## 5. Decision & Change History

| ID | Date | Type | Description |
| :--- | :--- | :--- | :--- |
| `DEC-001` | 2026-09-29 | Style | Adopted Sample 2 color profile across all KPIs, borders, canvas, and tables. |
| `DEC-002` | 2026-09-29 | Clinical | Modified Severe Anemia KPIs to 4 clinical tiers (Resolved, Mild, Moderate, Severe). |
| `DEC-003` | 2026-09-29 | Feature | Added Anemia Clinical Management (Iron Sucrose doses, FCM, BT units) to drawer and chart. |
| `DEC-004` | 2026-09-29 | UI | Shrunk expansion drawer vertical footprint by ~40% for snug viewing. |
| `DEC-005` | 2026-09-29 | Chart | Removed date strings from Hb sparkline X-axis (`Visit 1..12`). |
| `DEC-006` | 2026-09-29 | Analytics | Added Block-wise and Risk Factor-wise Medical Officer Checkup Status charts. |
| `DEC-007` | 2026-09-29 | Cleanup | Removed Labor Room Admission Hemoglobin KPI section and obsolete styles. |
| `DEC-008` | 2026-09-29 | Skill | Installed `claude-mem` persistent memory skill and companion tools for project continuity. |
| `DEC-009` | 2026-09-30 | Cleanup | Removed non-build files (test scripts, sample images, SOP scripts) preserving skills and memory. |
| `DEC-010` | 2026-09-30 | Clinical | Refined GDM cohort: kept only cases with other 6 risk factors OR on treatment in Col AT (201 GDM; cohort 1,745). |
| `DEC-011` | 2026-09-30 | Feature | Integrated Delivery Tracking Col AC facility names, Col AD dates, and reclassified pie chart categories. |
| `DEC-012` | 2026-09-30 | Feature | Extracted Col AR PIH management and displayed dedicated clinical management bar in drawer. |
| `DEC-013` | 2026-09-30 | Chart | Plotted Iron Sucrose doses as small crosses on Hb sparkline without printing dates. |
| `DEC-014` | 2026-09-30 | UI | Restricted Anemia Clinical Management bar strictly to Severe Anemia and Sickle Cell Disease. |
| `DEC-015` | 2026-09-30 | UI | Removed Medical Officer Examination banner from drawer, retaining table Complications badges. |
| `DEC-016` | 2026-09-30 | Chart | Converted Block-wise and Risk Factor-wise MO Checkup Status to horizontal stacked sidebars. |
| `DEC-017` | 2026-09-30 | Cleanup | Removed Year-wise Registration, Comparative Identification, and Teenage Age treemap charts. |
| `DEC-018` | 2026-09-30 | Feature | Added dynamic 'Last update on DD-MM-YYYY' badge beside dashboard title populated from data.js. |
| `DEC-019` | 2026-09-30 | Clinical | Incorporated Cols AX (MNT), AY (Metformin), AZ (Insulin) into GDM qualification (498 cases; cohort 2,042) and added GDM Management bar in drawer. |
| `DEC-020` | 2026-09-30 | UI | Maintained Anemia Clinical Management in drawer for other risk factors if managed for anemia (IS, FCM, BT), omitting it for non-anemic cases. |
| `DEC-021` | 2026-09-30 | UI | Renamed 'Interactive Analytics & Visualizations' navigation button, section title, and subtitles to 'Charts'. |
| `DEC-022` | 2026-09-30 | Chart | Added UHRP Clinical Management Status horizontal stacked bar charts (Risk Factor-wise and Block-wise) on top of the Charts section. |
| `DEC-023` | 2026-10-02 | Feature | Added ANC Linelist in Total ANC Registered card (17,475 records) with client-side responsive pagination (25/50/100/200/all). |
| `DEC-024` | 2026-10-02 | Clinical | Extracted Moderate Anemia cases from HRP Linelist Col AG (4,506 records) with complete Iron Sucrose, FCM, and BT management data. Added Moderate Anemia card to top risk grid. |
| `DEC-025` | 2026-10-02 | UI | Redesigned all KPI cards with sleek 9px radius, compact padding, and subtle gradients, adding Moderate Anemia, Resolved, and Mild Anemia KPIs above Gestational Age filter. |
| `DEC-026` | 2026-10-02 | UX | Set Undelivered filter (`del === 0`) as default selected upon opening the dashboard. |
| `DEC-027` | 2026-10-02 | UI | Moved NHM protocols and Hindi counselling guidance out of linelist table into a dedicated Section 3 ('📜 Protocols & Counselling') after Charts. |
| `DEC-028` | 2026-10-02 | Bugfix | Fixed critical startup crash: `renderCounsellingBanner('sa')` called at init referenced `#counselling-banner` element that was removed when protocols moved to Section 3. Added null guard (`if (!banner) return`) and removed the init call; also guarded against undefined `data` and `data.points`. |
| `DEC-029` | 2026-10-02 | UI | Reduced top view switcher (`.main-view-nav`) size: gap 1rem→0.35rem, padding 0.5rem→0.25rem/0.3rem, radius 12px→10px; `.main-view-btn` padding 0.75rem/1rem→0.4rem/0.7rem, font-size 0.9rem→0.78rem, radius 8px→7px. |
| `DEC-030` | 2026-10-02 | Clinical | ANC Visit Summary bar now counts attendance from `v_dates[i]` (actual attended visits) instead of relying on `hb_v`/`bp_v` presence. |
| `DEC-031` | 2026-10-02 | Clinical | ANC KPI cards redesigned: Severe Anemia removed; Resolved/Mild/Moderate cards now computed from `ma === 1` cohort's last valid `hb_v` reading (not full ANC population). Subtext shows "of N Mod. Anemia cohort". |
| `DEC-032` | 2026-10-02 | Feature | Added Moderate Anemia diagnosed trimester pill (🩺 Diagnosed in T1/T2/T3) to Gestational Age by Trimester KPI cards on MA tab. Detection: first visit where `hb_v[i] < 10.0`. `showDiag` now includes `currentTab === 'ma'`; `riskLabel` returns 'Moderate Anemia' for MA tab. |
| `DEC-033` | 2026-10-03 | Fix | ANC tab linelist columns restored to match all other tabs (Village, MP ID, Name, Age, Mobile, LMP, EDD, GA, Del Date, Del Place, Complications). `visitFilter` now uses `v_dates[vIdx]` non-null check. ANC expansion drawer hides chart header & sparkline graph (only shows 📋 Timeline Tracker). Timeline visit boxes now display BOTH Hb (color-coded: red <7, amber 7–10.9, green ≥11) AND BP values in every visit chip. Dead `renderAncTableHeader()` and `renderHrpTableHeader()` functions removed. |
| `DEC-034` | 2026-10-03 | Feature / UI | Implemented 9 dashboard enhancements: 1) Rearranged Moderate Anemia card before Severe Anemia in top risk grid. 2) Removed Moderate still, resolved, and mild KPI cards from ANC tab. 3) Extracted 12 ANC visit arrays (`v_dates`, `hb_v`, `bp_v`, `alb_v`, `mo_v`, and `mo_done`) for all 17,475 ANC registered mothers via `update_dashboard.py`, fixing 12-visit summary KPI cards, filtering, and timeline drawer chips with Hb and BP. 4) Hidden Clinical Management charts for tabs `anc`, `sc`, `gd`, `ls`, `tp`, and `bh`. 5) Fixed Block-wise MO Checkup chart for ANC tab with authentic MO data. 6) Added 'Developer: Dr Vikar Saiyad (Sankalp)' to header top-right. 7) Removed export dropdown and tab export button. 8) In ALL UHRP cohort KPI cards, excluded Moderate Anemia and included % against Total ANC registered for each card. 9) In linelist, Location column displays Village, Subcenter/Ward, and Block; renamed Complication header to Risk Factor; stripped 'yrs' suffix from Age column. |


