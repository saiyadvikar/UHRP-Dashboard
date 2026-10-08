---
trigger: always_on
description: Consult UI/UX Pro Max intelligence when designing, styling, building, or reviewing UI/UX, dashboards, components, CSS/Tailwind, or mobile layouts.
---

## UI/UX Pro Max

This project has the `ui-ux-pro-max` design intelligence system installed in `.agents/skills/ui-ux-pro-max/`.

### Rules & Workflow:
1. **Design System & Visual Direction:**
   - Before building new UI components, dashboards, or mobile screens, generate a tailored design system:
     ```powershell
     python .agents/skills/ui-ux-pro-max/scripts/search.py "<domain/industry/keywords>" --design-system -p "<ProjectName>"
     ```
   - Persist when establishing project design defaults:
     ```powershell
     python .agents/skills/ui-ux-pro-max/scripts/search.py "<query>" --design-system --persist -p "<ProjectName>" --output-dir "."
     ```

2. **Domain-Specific Queries:**
   - **Styles:** `python .agents/skills/ui-ux-pro-max/scripts/search.py "<query>" --domain style`
   - **Color Palettes:** `python .agents/skills/ui-ux-pro-max/scripts/search.py "<query>" --domain color`
   - **Typography:** `python .agents/skills/ui-ux-pro-max/scripts/search.py "<query>" --domain typography`
   - **Charts & Data Viz:** `python .agents/skills/ui-ux-pro-max/scripts/search.py "<data_type>" --domain chart`
   - **UX & Accessibility:** `python .agents/skills/ui-ux-pro-max/scripts/search.py "<issue>" --domain ux`
   - **Icons:** `python .agents/skills/ui-ux-pro-max/scripts/search.py "<icon_role>" --domain icons`

3. **Stack Best Practices:**
   - Web/Tailwind: `--stack html-tailwind`
   - Mobile: `--stack flutter` or `--stack react-native`
   - React/Next.js: `--stack react` / `--stack nextjs` / `--stack shadcn`

4. **Pre-Delivery Verification:**
   - Always avoid industry anti-patterns flagged by the engine (e.g. gratuitous AI purple/neon gradients, poor contrast).
   - Ensure WCAG AA contrast (4.5:1 minimum for body text).
   - Verify keyboard focus states and `prefers-reduced-motion` responsiveness.
