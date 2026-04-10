# Chrome Web Store Listing

Reference document for the Developer Dashboard submission fields.

## Short description (manifest)

> Pomodoro timer with task tracking, ambient sounds, and internet radio -- all in your sidebar.

## Detailed description

A focused productivity timer that lives in Chrome's side panel. Set a work session, pick a task, and start the clock -- complete with ambient sound streams and live internet radio to keep you in the zone.

**Features**

- Configurable work (1-60 min) and break (1-30 min) durations
- Visual countdown with animated progress ring
- Focus / Break mode toggle
- Task management with active-task banner
- Curated ambient streams: Focus, Nature, White Noise, Rain (SomaFM, MyNoise, and more)
- Internet radio browser with 6 genres (Ambient, Lo-fi, Classical, Jazz, Chill, Nature) powered by the open-source Radio Browser API
- Daily statistics: completed pomodoros and total focus time
- Desktop notifications when sessions end

**Your data stays with you.** Tasks and stats are saved locally via Chrome's built-in sync storage. No accounts, no analytics, no tracking.

## Permission justifications

### storage
Saves your tasks, timer settings, and daily statistics so they persist across browser sessions and sync across your Chrome devices. No data is sent to external servers.

### notifications
Sends a desktop notification when your focus or break session ends, so you never miss a transition even if the browser is in the background.

### sidePanel
The entire extension UI lives in Chrome's side panel, giving you quick access without opening a new tab or popup.

### host_permissions: de1.api.radio-browser.info
This host permission allows the extension to query the Radio Browser API (https://www.radio-browser.info), an open-source community database of internet radio stations. When a user opens the Radio tab and selects a genre, the extension sends a search request to this API to retrieve a list of matching stations. Only the genre tag is sent as a query parameter. No user data, personal information, or browsing history is transmitted.

## CSP justification (media-src http://* https://*)

The extension requires broad media-src permissions because it plays audio streams from internet radio stations discovered at runtime via the Radio Browser API (an open-source community directory of 30,000+ stations). Station stream URLs span thousands of domains and cannot be predicted at build time. The media-src directive only affects audio loading -- script-src remains restricted to 'self' and object-src is 'none', maintaining a secure execution environment.

The curated Sounds tab also streams from multiple domains (somafm.com, radioca.st, torontocast.com, internet-radio.com, radio.mynoise.net) which may change as providers rotate infrastructure.
