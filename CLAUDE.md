# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Chrome extension (Manifest V3) providing a Pomodoro timer with background music and task management, rendered in the browser side panel.

## Architecture

- **manifest.json** — Extension manifest (MV3). Permissions: `storage`, `notifications`, `alarms`, `sidePanel`. Has `host_permissions` for `radio-browser.info` API and a CSP allowing external media sources.
- **background.js** — Service worker. Manages the timer via `chrome.alarms` (the source of truth for timing). Handles `startTimer`, `pauseTimer`, `resetTimer`, and `getTimerState` messages from the side panel. Also fires notifications on session completion and persists stats to `chrome.storage.sync`.
- **sidepanel.js** — Single `PomodoroTimer` class. Drives all UI: timer display, task CRUD, music/radio playback, and daily statistics. On load, calls `syncWithBackground()` to recover timer state (handles running, paused, and completed-while-closed scenarios).
- **sidepanel.html / sidepanel.css** — Markup and styles for the side panel UI.
- **sounds/** — Audio assets (e.g., `notification.mp3`).
- **icons/** — Extension icons at 16/48/128px.

### Timer: background ↔ sidepanel contract

The timer is authoritative in `background.js` (via `chrome.alarms`). The side panel sends messages to start/pause/reset and polls `getTimerState` each second during `_startDisplayInterval()` to stay in sync. When the alarm fires while the side panel is closed, `background.js` sets `timerSessionComplete: true` in `chrome.storage.local`; the panel picks this up on next open via `syncWithBackground()`.

### Music playback

Two sources, both played via `<audio>` in the side panel:
1. **Sounds tab** — Curated internet streams per category (focus, nature, white noise, rain) with automatic fallback URLs.
2. **Radio tab** — Fetches stations from the `radio-browser.info` API by genre tag, rendered as a scrollable list.

## Development

No build step, bundler, or package manager. Load the extension directly in Chrome:

1. Navigate to `chrome://extensions`, enable "Developer mode"
2. Click "Load unpacked" and select this directory
3. After editing files, click the reload button on the extension card to pick up changes

## Key Details

- **Storage split**: `chrome.storage.sync` for user data (tasks, stats, active task). `chrome.storage.local` for ephemeral timer state (end time, running flag, session-complete flag).
- Timer durations are configurable via the UI (work: 1-60 min, break: 1-30 min).
- Stats (pomodoro count, focus time) reset daily, keyed by `lastStatsDate`. Background handles stat persistence on alarm fire; the side panel updates local counters for immediate UI feedback.
- Task text is inserted into the DOM via `textContent` — if adding `innerHTML` usage, sanitize inputs to prevent XSS.
- `renderTasks()` rebuilds the full task list DOM each time — no virtual DOM or diffing.
