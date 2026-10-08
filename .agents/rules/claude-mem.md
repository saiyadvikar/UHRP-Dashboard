---
description: Automatically leverage and maintain claude-mem persistent memory for Ultra HRP Dashboard
always_on: true
---

# Claude-Mem Persistent Memory Rule

Whenever you work on this project:
1. **Consult Project Memory First**:
   Read `.claude-mem/project_context.md` to ground your understanding of current clinical definitions, data schemas, UI guidelines (Sample 2 palette), and component structures.

2. **Maintain Memory Continuity**:
   After completing major modifications, fixing bugs, or making architectural decisions:
   - Add a brief structured observation to `.claude-mem/memory.json`.
   - Update relevant sections in `.claude-mem/project_context.md`.

3. **Available Memory Skills**:
   - `claude-mem`: Core memory management workflow.
   - `mem-search`: Search past solutions and rationale.
   - `timeline-report`: Generate project narrative reports.
   - `learn-codebase`: Thoroughly prime and audit project files.
