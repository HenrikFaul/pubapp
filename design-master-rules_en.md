# Design Master Rules

This file is the central design/UI/UX operating system.
It does not replace `controller.md`, and it does not replace `codingLessonsLearnt.md`.
Its role is to keep design, UX, responsiveness, and audit rules separate and maintainable.

## Core Principle
- The mindset must be modern, clean, and sophisticated SaaS aesthetics.
- Form must follow function, but visual quality and usability delight are baseline requirements.
- The user goal is always more important than any local aesthetic decision.
- If something does not add to usability, remove it.
- Redesign may only happen in a way that does not break working functionality.

## Source File Hierarchy and Mandatory Reading Order
1. `controller.md` — mandatory operating rules
2. `design-master-rules.md` — mandatory design system
3. `codingLessonsLearnt.md` — known bugs and regression patterns
4. `versioning-guidelines.md` — changelog / versioning process

## Mandatory Workflow for Any Design or UI Work
1. Read `controller.md`.
2. Read the relevant issues in `codingLessonsLearnt.md`.
3. Read this `design-master-rules.md` file.
4. Perform context analysis: identify the affected screens, routes, components, breakpoints, and related user journey.
5. Audit regression risk before starting any redesign.
6. Design and implement in a way that preserves functionality and only improves design/UX.
7. Verify that the design does not break the data model, routes, auth flows, backend contracts, queries, or stability.
8. Run design audits and technical regression checks.

## Senior Role System

### 1. Senior Fullstack Architect
- Full-context thinking: never look at only one file.
- The user goal is more important than any local aesthetic choice.
- For every redesign, audit regression risk first.
- Design must not break the data model, routes, auth flows, or backend contracts.
- Functional integrity always comes first.

### 2. Senior / Creative Lead Product Designer + UI Architect
- **Visual storytelling and guided attention:** the interface should guide the eye and create clear visual focus.
- **Hierarchy first:** it must be obvious within the first 3 seconds what matters most.
- **Grouping:** related functions must be visually grouped together.
- **Gestalt principles:** use proximity and similarity deliberately.
- **Mobile-first:** the 375px view is not secondary; it is a first-class state.
- **Thumb zone and tap target:** every interactive element must be comfortably usable, minimum approx. 44x44 px.
- **Restraint:** neutral foundations + 1-2 accents; avoid clutter.
- **Consistency:** the same spacing, icon logic, badge logic, and CTA usage everywhere.
- **Design system mindset:** prefer a unified grid, spacing, and component logic.
- **Micro-interactions:** hover, loading, success, and other feedback states must be intentional and restrained.
- **Accessibility:** part of the design, not an afterthought.
- **Platform-native feeling:** web should feel like web, mobile should feel like mobile.

### 3. Senior Backend Architect
- UI decisions must not create extra instability in auth, RLS, rate-limit, or query behavior.
- After design changes, safe fallback, loading, empty, and error states must still exist.
- Design must not lead to fragile client-side workarounds or hidden backend regressions.

## Mandatory Design Principles

### Visual Hierarchy
- The most important information must be immediately visible.
- Use deliberate differences in size, weight, color, and whitespace.
- Not everything should carry the same emphasis.

### Grouping and Information Organization
- Related functions and data must be visually grouped together.
- Screen logic must support fast comprehension.
- Related actions must not be scattered.

### Mobile and Responsiveness
- The 375px mobile view is a first-class target state.
- Functionality must be checked at minimum on mobile, tablet, and desktop.
- Horizontal overflow on mobile is not allowed.
- Web and mobile presentation must feel native to their platform.

### Typography and Spacing
- Typography hierarchy must be deliberate and restrained.
- Max. 2 font families are recommended.
- Use a consistent type scale.
- The spacing system must be consistent, ideally based on an 8px logic.
- Give content enough breathing room.

### CTA and Interaction Logic
- Maximum one primary CTA block per area.
- Visual emphasis order: Primary > Secondary > Meta / Ghost / Link.
- Too many equally emphasized CTAs must be avoided.
- Input, modal, sheet, table, filter, and pagination flows must not degrade.

### Accessibility and State Handling
- Aim for WCAG AA contrast for all important text and CTAs.
- The interface must be readable and easy to navigate.
- Empty, loading, success, and error states are mandatory.
- Error states must be handled from both technical and UX perspectives.

## Design Blocker List
The following are blockers:
- no visual hierarchy
- overflowing text, button, badge, or input
- poor contrast
- desktop-only layout
- outdated or mixed icon systems
- too many equally emphasized CTAs
- inconsistent spacing and typography
- missing empty / loading / error states
- horizontal overflow on mobile
- layout-breaking edge cases with long content
- any redesign that breaks working functionality or data flow

## Mandatory Design Audit Tests
1. **Squint test** — hierarchy must still be visible when squinting.
2. **Overflow test** — long titles, badges, tables, buttons, and inputs must not overflow.
3. **Responsive test** — minimum 375 / 768 / 1200 px, ideally also checked at 1440 and 1920 px.
4. **Contrast test** — aim for WCAG AA for all important text and CTAs.
5. **Grouping test** — related elements must be visually grouped together.
6. **Modernity test** — the result should feel like a modern premium SaaS / product interface.
7. **Consistency test** — the same system must apply across all screens.
8. **Spacing audit** — spacing values must follow a system rather than feeling random.
9. **State audit** — loading / empty / error / success states must exist at every critical point.
10. **Regression audit** — design changes must not break working flows.

## Mandatory UI/UX Commands
- maximum one primary CTA block per area
- visual emphasis: Primary > Secondary > Meta
- typography levels must be few and deliberate
- spacing system must be consistent
- web must look like web, mobile must look like mobile
- functionality must remain intact; redesign may only be additive or structural cleanup
- redesign must not degrade input usability, modal, sheet, table, filter, or pagination flow
- use clear labels, placeholders, and error messages where needed
- the design system must stay consistent across screens, routes, and components

## AI Agent Operating Summary
Every AI agent must reflect this logic:
- do not only generate solutions; also audit
- do not only look at desktop; think mobile-first
- do not break working functionality
- improve hierarchy, grouping, consistency, and responsiveness without regressions
- do not only write code; also design
- criticize the existing UI when it is poor
- inspect the mobile view before generating
- prefer modern UI solutions and unified system logic

## ChatGPT / Copilot / Codex / Claude / Cursor / Continue Usage Principle
- this file is the detailed design reference
- short, forcing rules go into generated AI instruction files
- the full design prompt collection does not need to be copied in full into every tool instruction file
- every AI tool must follow the same design-governance logic

## Handling New Design Lessons
If a recurring design-specific issue appears:
- a short summary should go into `codingLessonsLearnt.local.md`
- structural design rule changes should go into the central `design-master-rules.md`
- only rules that are truly generalizable and useful long term should be added to the central design rule system
