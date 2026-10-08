---
name: claude-mem
description: >-
  Persistent cross-session memory compression system. Preserves project context,
  architectural decisions, data schemas, clinical protocols, and UI refinements
  across sessions. Use when recalling past work, recording new project decisions,
  or synchronizing project memory.
---

# Claude-Mem Persistent Memory System

`claude-mem` provides persistent long-term memory for coding agents across sessions and turns. It prevents context amnesia by compressing interactions into structured observations (architectural decisions, bug fixes, data schemas, UI enhancements, and user preferences) and storing them locally in `.claude-mem/`.

---

## Architecture & Storage

For this project (**Ultra HRP Dashboard**), memory is organized in `.claude-mem/`:

```text
.claude-mem/
├── project_context.md   # Human-readable, high-density project state & knowledge
├── memory.json          # Structured machine-readable database of observations & sessions
└── settings.json        # Configuration and sync settings
```

### Observation Types
- `decision`: Key architectural, clinical, or design choices.
- `bugfix`: Root cause analyses, fixes applied, and verification steps.
- `discovery`: Codebase quirks, data structure findings, and API specifics.
- `change`: Significant feature additions, UI modifications, or refactors.
- `protocol`: Clinical definitions, government guidelines (e.g. NHM UHRP SOP).

---

## Core Workflows

### 1. Recalling Context at Session Start
When starting work or answering questions about past decisions:
1. Read `.claude-mem/project_context.md` for a comprehensive overview of the active project state.
2. If looking for a specific historical event or rationale, search `.claude-mem/memory.json` or use the `mem-search` skill.

### 2. Recording New Observations
Whenever a significant decision, fix, or requirement is implemented:
1. Update `.claude-mem/project_context.md` under the appropriate section (Architecture, Data Schema, UI Components, or Changelog).
2. Append a structured record to `.claude-mem/memory.json` with timestamp, type, title, and summary:
   ```json
   {
     "id": "obs_unique_id",
     "timestamp": "2026-09-29T21:00:00Z",
     "type": "decision|bugfix|change|discovery|protocol",
     "title": "Short descriptive title",
     "content": "Details, rationale, and consequences."
   }
   ```

### 3. Progressive Disclosure
To save tokens:
- Rely on concise summaries in `project_context.md`.
- Deep-dive into specific files or historical memory entries only when specifically queried.

---

## Companion Skills
- **`mem-search`** (`.agents/skills/mem-search/SKILL.md`): Search past observations and decisions across sessions.
- **`how-it-works`** (`.agents/skills/how-it-works/SKILL.md`): Understanding memory injection and lifecycle hooks.
- **`timeline-report`** (`.agents/skills/timeline-report/SKILL.md`): Generating comprehensive project journey reports.
- **`learn-codebase`** (`.agents/skills/learn-codebase/SKILL.md`): Systematic initial priming of the codebase.
