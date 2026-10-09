# Ultra HRP Dashboard — Agent Guidelines & Memory

## Claude-Mem Integration
This project uses **`claude-mem`** for persistent cross-session memory and context preservation.
- **Active Memory & Architecture:** Read `.claude-mem/project_context.md` before starting work to understand current project state, clinical protocols, data mappings, and design tokens.
- **Observation History:** Structured observations are recorded in `.claude-mem/memory.json`.
- **Skills Available:**
  - `claude-mem`: Persistent cross-session memory management (`.agents/skills/claude-mem/SKILL.md`)
  - `mem-search`: Search past decisions and solutions (`.agents/skills/mem-search/SKILL.md`)
  - `how-it-works`: Claude-mem mechanics and memory lifecycle (`.agents/skills/how-it-works/SKILL.md`)
  - `timeline-report`: Full project journey and history generation (`.agents/skills/timeline-report/SKILL.md`)
  - `learn-codebase`: Systematic codebase review and priming (`.agents/skills/learn-codebase/SKILL.md`)

## Key Project Rules & Invariants
1. **Primary Output:** The single self-contained file is `index.html`. Source markup is in `template.html`. When changes are made to `template.html`, `style.css`, `data.js`, or `app.js`, compile using `python build_standalone_html.py`.
2. **Design Palette:** Always maintain the **Sample 2** palette (`#fcf1f4` canvas, `#ff2a6d` neon pink, `#7928ca` purple, `#00b4d8` cyan, `#f77f00` orange, `#10b981` emerald, `#1e2538` dark slate table headers).
3. **Severe Anemia KPIs:** 4 clinical tiers: Resolved (> 11.0 g/dL), Mild (10.0-10.9), Moderate (7.0-9.9), Severe Anemia (< 7.0 g/dL), plus Missed 2+ ANC and Not Seen by MO.
4. **Anemia Clinical Management:** Iron Sucrose doses tracked in Hb linegraph subtitle; Inj. FCM and Blood Transfusion (BT) tracked in the expansion drawer.
5. **Drawer Cleanliness:** Expansion drawer is snug and compact; line graph X-axis must never duplicate dates (displays `Visit 1` through `Visit 12`).
6. **Documentation Integrity:** Update `.claude-mem/project_context.md` and `.claude-mem/memory.json` after implementing new features or making architectural decisions.
