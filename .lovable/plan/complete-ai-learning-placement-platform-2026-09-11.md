# Complete AI Learning & Placement Platform

## Goal
Extend the current Codex platform into the requested 21-module ecosystem without removing or replacing existing routes, APIs, navigation entries, visual tokens, authentication, compiler, AI tools, progress, rewards, or saved user data.

## Current foundation to preserve
- Already available: five-mode AI mock interviews with saved reports; 18-company preparation hub; compiler-integrated AI code review; GitHub repository import/review and portfolio export; analytics; XP, coins, levels, badges and streaks; placement readiness; responsive navigation; resume scoring; MCP agent integrations.
- Existing route URLs remain valid. Enhancements land inside current pages or on additive routes linked through the existing navigation pattern.
- Existing tables remain intact; new migrations only add tables, columns, indexes, policies, and secure functions needed by new modules.

## Release 1 — Complete and strengthen existing flagship modules
- Upgrade GitHub from public username linking to per-user GitHub authorization, private/public repository import, commit history, contribution activity, and richer project-health evidence. Preserve username-only public analysis as a fallback.
- Expand compiler submissions into saved runs and test-case suites; trigger AI review after successful submissions without blocking code output.
- Extend analytics with coding time, topic mastery, company/interview readiness, assignment, contest, GitHub, resume-history, and AI-usage views using batched indexed reads.
- Improve placement scoring with contest and GitHub signals while preserving the current score and recommendations when those signals are unavailable.
- Harden AI request error handling, input limits, upload validation, authenticated server boundaries, and session-aware data access.

## Release 2 — Personalized learning, notes, and planning
- Add a personalized learning page that derives strong/weak topics from roadmap progress, assignments, compiler activity, interviews, and resume results.
- Generate and save personal roadmaps, daily goals, weekly goals, and assignments with completion tracking.
- Add an AI notes workspace sourced from DSA topics, explanations, compiler solutions, and assignments, with Markdown and print-ready PDF export.
- Add a calendar/planner for practice, assignments, assessments, interviews, mock interviews, and revision.
- Add optional per-user Google Calendar synchronization through managed authorization; local planning remains fully usable without Google.

## Release 3 — Portfolio, resume, and applications
- Add a portfolio generator using profile details, resume analysis, GitHub projects, skills, and optional LinkedIn data supplied by the user; provide multiple templates plus share, HTML, and PDF export.
- Extend the resume checker with editable professional templates, AI drafting and ATS optimization, version history, and PDF/DOCX/LaTeX exports.
- Add company-specific cover-letter generation with saved versions and export.
- Add a job and internship tracker with applications, stages, interview dates, offers/rejections, reminders, and calendar links.

## Release 4 — Visual learning and contests
- Add an interactive algorithm simulator for arrays, linked lists, stacks, queues, trees/BST, heaps, tries, graphs, DFS/BFS, Dijkstra, A*, sorting, and dynamic programming.
- Use a common playback engine with play/pause, step, reset, speed control, editable input, pseudocode highlighting, and accessible reduced-motion behavior.
- Add weekly/monthly contests with timed participation, rankings, submissions, AI performance summaries, and completion certificates.
- Add a certificate center for roadmap, assignments, contests, interviews, and streak milestones with secure verification identifiers.

## Release 5 — Gamification expansion and external companion architecture
- Add daily missions, weekly missions, monthly challenges, seasonal events, exclusive badges, a reward store, and unlockable theme choices while keeping the current default theme unchanged.
- Make rewards server-authoritative and idempotent so users cannot spoof XP, coins, mission completion, contest results, or purchases.
- Define a versioned, authenticated browser-extension API for future LeetCode, CodeChef, HackerRank, and GeeksforGeeks companions; document permissions and token revocation without shipping an extension in this web-app release.

## Data and security
- Every new user-owned table includes explicit grants, row-level access policies, ownership checks, constraints, and supporting indexes in the same migration.
- AI and compiler operations remain server-side and authenticated. Inputs use schemas, bounded payload sizes, safe file-type verification, and provider error messages that reach the user.
- External account tokens use managed per-user authorization and never browser storage or repository files.
- Add rate controls for expensive operations, idempotency for rewards/certificates, safe rendered Markdown, and audit-friendly activity records.
- Preserve password reset and existing sign-in behavior; add email-verification enforcement only where it does not lock out existing valid accounts.

## Performance and mobile quality
- Lazy-load heavy editors, document parsers, charts, simulator code, and export libraries at the feature boundary.
- Cache stable catalog data, deduplicate account/API requests, paginate histories and repositories, index new query paths, and move expensive generation to explicit user actions.
- Verify every existing and new page at phone, tablet, laptop, and wide desktop sizes; preserve the current visual language and navigation ordering while preventing overflow and improving touch targets.

## Verification
- Add targeted tests for scoring, rewards, contest ranking, mission completion, exports, authorization, and input validation.
- Exercise compiler, AI, GitHub, resume, interview, planner, contest, and export flows in the running preview.
- Run responsive checks, accessibility checks, metadata checks for every new content route, database policy checks, and a final security scan.

## Technical sequence
1. Create a lean project roadmap and shared domain types.
2. Apply additive migrations with rollback-safe defaults and seed only required shared catalog rows.
3. Build server functions and external authorization boundaries before their pages.
4. Build pages in release order using existing cards, buttons, forms, typography, and semantic tokens.
5. Add navigation entries only when their destination route is implemented in the same change.
6. Validate each release before starting the next; existing feature regression checks are mandatory at every milestone.
