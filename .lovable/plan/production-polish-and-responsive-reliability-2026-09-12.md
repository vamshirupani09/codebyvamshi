# Production polish and responsive reliability

## Goal
Keep every existing feature, route, visual token, API, and workflow intact while fixing verified responsiveness, loading, performance, accessibility, and reliability issues.

## Changes

1. **Shared shell and navigation**
   - Replace the blank full-screen session wait with a branded layout skeleton.
   - Stop reloading notifications and user statistics on every route change; refresh them on user/session changes and after relevant updates.
   - Improve mobile header touch targets, notification accessibility, and menu scrolling.
   - Preserve the existing sidebar, route order, colors, and AI Mentor.

2. **Compiler mobile experience and safety**
   - Use a compact, wrapping mobile toolbar with full-width selectors where needed.
   - Give editor controls accessible names and 44px touch targets.
   - Use a viewport-aware editor height on phones while retaining the desktop editor size and full-screen mode.
   - Keep local code persistence, Judge0 execution, all languages, metrics, uploads, downloads, themes, and AI review unchanged.
   - Add friendly timeout/network feedback without exposing internal errors.

3. **Responsive route fixes**
   - Fix the verified analytics heatmap clipping with an intentional horizontal scroll region and accessible label.
   - Correct the company selector’s inverted mobile/desktop columns.
   - Make assistant, company, and resume tabs scroll or wrap safely on narrow screens.
   - Remove touch scroll traps where content can expand naturally.
   - Ensure long labels, cards, charts, and controls stay inside the viewport.

4. **Loading, errors, and accessibility**
   - Replace generic loading text in major authenticated screens with meaningful skeleton/status states.
   - Associate labels with inputs, expose toggle state, and label icon-only buttons.
   - Add reduced-motion-safe global transitions and preserve visible keyboard focus.
   - Convert user-facing raw request errors to clear retryable messages while retaining detailed diagnostics in logs.

5. **AI reliability**
   - Strengthen existing agent instructions to prioritize correctness, valid language syntax, edge cases, test compatibility, and complexity reporting.
   - Keep the existing multi-agent API and response formats backward compatible.

6. **Verification**
   - Re-test all current content routes at 360, 375, 390, 412, 768, 820, 1024, 1280, 1366, 1440, 1920, and 2560 widths.
   - Verify no horizontal page overflow, console/runtime errors, broken navigation, or missing page headings.
   - Exercise the compiler, AI assistant, notifications, and key authenticated data screens without changing user data unnecessarily.
   - Check the latest build signal and route metadata before completion.

## Technical notes
- Changes stay in existing React/TanStack route and shared presentation files.
- No database schema, authentication provider, route, API contract, design token, or navigation-item changes are planned.
- Heavy modules remain route-split; Monaco will keep its existing lazy loader behavior.
- Improvements will favor CSS layout and request lifecycle fixes over new dependencies.
