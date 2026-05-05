# Chrome Web Store Listing

Reference document for the Developer Dashboard submission fields.

## Short description (manifest, under 132 chars)

> Focus timer with task tracking, ambient sounds, and internet radio -- right in your Chrome sidebar.

## Single-purpose description (Developer Dashboard)

> A Pomodoro focus timer that lives in Chrome's side panel, with task tracking and optional ambient audio to help users sustain deep work sessions.

## Detailed description

A focused productivity timer that lives in Chrome's side panel. Set a work session, pick a task, and start the clock — complete with ambient sound streams and live internet radio to keep you in the zone.

**Features**
- Configurable work (1–60 min) and break (1–30 min) durations
- Visual countdown with animated progress ring
- Focus / Break mode toggle
- Task management with active-task banner showing what you're working on
- Curated ambient streams: Focus, Nature, White Noise, Rain (SomaFM, MyNoise, and more)
- Internet radio browser with 6 genres (Ambient, Lo-fi, Classical, Jazz, Chill, Nature) powered by the open-source Radio Browser API
- Daily statistics: completed pomodoros and total focus time
- Desktop notifications when sessions end — even if the sidebar is closed
- Timer keeps running in the background via Chrome Alarms

**Your data stays with you.** Tasks and stats are saved locally via Chrome's built-in sync storage. No accounts, no analytics, no tracking. See our privacy policy for details.

**100% free. No ads. Open source.**

## Permission justifications

### storage
Saves your tasks, timer settings, and daily statistics so they persist across browser sessions and sync across your Chrome devices. No data is sent to external servers.

### notifications
Sends a desktop notification when your focus or break session ends, so you never miss a transition even if the browser is in the background.

### alarms
Keeps the timer running accurately in the background when the sidebar is closed. A one-shot alarm fires at the session end time to trigger the completion notification.

### sidePanel
The entire extension UI lives in Chrome's side panel, giving you quick access without opening a new tab or popup.

### host_permissions: *.api.radio-browser.info
This host permission allows the extension to query the Radio Browser API (https://www.radio-browser.info), an open-source community database of internet radio stations. When a user opens the Radio tab and selects a genre, the extension sends a search request to this API to retrieve a list of matching stations. Only the genre tag is sent as a query parameter. No user data, personal information, or browsing history is transmitted.

## Reviewer note: external audio sources

The extension plays audio via the HTML `<audio>` element from internet radio stations discovered at runtime through the Radio Browser API (an open-source community directory of 30,000+ stations). Station stream URLs span thousands of domains and cannot be enumerated at build time. The curated Sounds tab also streams from a small set of providers (somafm.com, radioca.st, torontocast.com) that may rotate infrastructure.

No additional CSP or `host_permissions` entries are required for these media loads — `<audio>` and `<img>` element loads in MV3 extension pages are not gated by `host_permissions`, and the default extension-pages CSP permits them. The manifest CSP (`script-src 'self'; object-src 'none'`) keeps script execution locked down.
