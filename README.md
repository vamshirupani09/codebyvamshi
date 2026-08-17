# Codex

PROMPT: Multi-Agent AI Coding Assistant Web App

Act as a senior full-stack developer, UI/UX designer, and AI architect. Build a complete production-ready web application based on the following requirements.

🔷 Project Title

Multi-Agent AI Coding Assistant

🔷 1. Landing Page (Authentication First Screen)

Design a modern, minimalist landing page with authentication:

Left side:

Display project logo and branding

Clean illustration related to coding/AI

Minimalist theme inspired by Astra, OceanWP, and creative portfolio styles

Right side:

Login / Signup form

Fields:

Email

Password

Buttons:

Sign In

Sign Up

Sign in with Google

“Forgot Password” option

Authentication Features:

Google OAuth login integration

Email/password authentication

Forgot password via email verification code (OTP system)

Secure session handling using JWT or Firebase Auth

🔷 2. Dashboard (After Login)

Design a clean, modern dashboard with sidebar navigation and top notification bar.

🔷 3. Core Features

(1) Online Compiler

Multi-language support:

Java, Python, C++, JavaScript

Features:

Code editor (Monaco Editor)

Run button

Submit button

Custom input support

Test cases panel

Output console

Optional:

Judge0 API or Docker-based execution

(2) DSA Roadmap Section

Structured roadmap:

Arrays

Strings

Linked Lists

Trees

Graphs

Dynamic Programming

Visual progress tracker

Mark topics as completed

(3) Weekly Coding Assignments

Auto-generated weekly tasks

Direct links to LeetCode problems

Track completion status

Show deadlines

(4) AI Coding Assistant (Multi-Agent System)

Implement multiple AI agents:

Coder Agent → Generates solutions

Debugger Agent → Fixes errors

Testcase Agent → Creates test cases

Explainer Agent → Explains code step-by-step

Features:

Input problem statement

Generate optimized code

Show explanation

Show complexity analysis

(5) DSA Resources Section

Curated:

Books

Websites

YouTube links

Categorized by topic

(6) Notification System

Notification bell in top navbar

Alerts for:

Weekly assignments

Upcoming assessments

Real-time or scheduled notifications

Email alerts for important updates

🔷 4. UI/UX Design Requirements

Theme:

Minimalist (Astra, OceanWP inspiration)

Clean spacing, soft shadows, rounded cards

Layout:

Sidebar + main content

Responsive design (mobile + desktop)

Colors:

Light mode default

Optional dark mode toggle

🔷 5. Tech Stack

Frontend:

React.js / Next.js

Tailwind CSS

Backend:

Node.js (Express) or FastAPI

Authentication:

Firebase Auth or JWT + OAuth

Database:

MongoDB / Firebase Firestore

AI Integration:

OpenAI API / Claude API

Compiler:

Judge0 API or Docker sandbox

🔷 6. Additional Features

Save user progress

Bookmark problems

User profile section

Activity tracking dashboard

🔷 7. Output Requirements

Generate:

Full project folder structure

Frontend UI code (React + Tailwind)

Backend API (Auth, Compiler, AI agents)

Database schema

Integration for AI agents

Clean, modular, scalable code

Comments and documentation

🔷 8. Goal

The final product should be:

Resume-worthy

Scalable

Modern UI

Real-world usable AI coding assistant platform

Build the complete system step-by-step with clean architecture and best practices.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://codebyvamshi.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/73e96f25-660d-43d3-956d-14134c733c91).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
