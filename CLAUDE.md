# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Chrome extension (Manifest V3) providing a Pomodoro timer with background music and task management, rendered in the browser side panel.

## Architecture

- **manifest.json** — Extension manifest (MV3). Declares permissions: `storage`, `notifications`, `activeTab`, `sidePanel`.
- **background.js** — Service worker. Opens the side panel on action click and routes notification clicks back to the panel.
- **sidepanel.html / sidepanel.js / sidepanel.css** — The entire UI lives here. `PomodoroTimer` class in `sidepanel.js` manages timer state, task CRUD, music playback, and daily statistics. Stats reset daily via `chrome.storage.sync`.
- **sounds/** — Audio assets (e.g., `notification.mp3`).
- **icons/** — Extension icons at 16/48/128px.

## Critical: sidepanel.js is a scaffold

`sidepanel.js` is **incomplete**. The `PomodoroTimer` class has placeholder comments (`// ... existing methods ...`) where core logic (constructor wiring, `startTimer`, `updateDisplay`, task CRUD, music playback) should be. Any work on this file must either fill in the missing methods or account for their absence. Do not assume the class is functional as-is.

## Development

No build step, bundler, or package manager. Load the extension directly in Chrome:

1. Navigate to `chrome://extensions`, enable "Developer mode"
2. Click "Load unpacked" and select this directory
3. After editing files, click the reload button on the extension card to pick up changes

## Key Details

- All persistent state uses `chrome.storage.sync` (tasks, pomodoro count, focus time, last-stats date).
- Timer durations are configurable via the UI (work: 1-60 min, break: 1-30 min).
- Music selection offers category options (focus, nature, white noise, rain) but actual audio source wiring is not yet implemented.
- Task text is inserted into the DOM via `textContent` properties — if adding innerHTML usage, sanitize inputs to prevent XSS.
