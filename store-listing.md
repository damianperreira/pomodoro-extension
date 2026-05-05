# Chrome Web Store Listing

Copy-paste source for the Developer Dashboard submission. Each section is labeled to match the dashboard field name.

---

## Short description (Summary field, max 132 chars)

> Free Pomodoro focus timer with task tracking, ambient sounds, and live radio — right in your Chrome sidebar.

(108 chars. Mirrored in `manifest.json` `description`.)

---

## Detailed description (Description field)

Most days, the hardest part of focused work isn't deciding what to do — it's staying on it for longer than ten minutes. The Pomodoro technique helps, but most timer apps live in their own tab or window, demanding a context switch every time you want to start a session.

This extension solves that by living in Chrome's side panel. Open it once and it stays accessible alongside whatever you're working on — a document, an inbox, a code editor, a research page. There's no separate window to alt-tab to, no popup that disappears when you click away.

Set your work and break durations (1 to 60 minutes for focus, 1 to 30 for breaks), pick a task from your list to mark as the active one, and start the timer. A clean countdown ring shows your progress at a glance, and a desktop notification tells you when it's time to switch — even if the side panel is closed.

The thing that sets this extension apart is the built-in audio. Most focus timers leave background sound to a separate tab; this one bundles it. The Sounds tab streams curated ambient tracks for focus, nature, white noise, and rain. The Radio tab pulls live internet radio stations from the open-source Radio Browser API — six genres including Ambient, Lo-fi, Classical, Jazz, Chill, and Nature — and plays any of them with one click. SomaFM, ABC Lounge, and thousands of community-curated stations are all reachable in the same panel as your timer.

Your tasks are stored locally and sync across your Chrome devices through Chrome's built-in storage. The active task is always pinned to the top of the panel, so you remember what each Pomodoro is for. As you complete sessions, daily statistics — Pomodoros finished and total focus time — accumulate automatically and reset each morning.

No accounts, no signups, no subscriptions, no ads. The extension is free, open source, and works the moment you install it. Your tasks, settings, and statistics never leave your browser; the only outbound network call is to the Radio Browser API when you open a genre, and only the genre tag is sent.

Privacy policy: https://damianperreira.github.io/pomodoro-extension/privacy-policy.html

---

## Keyword tags (search optimization)

1. pomodoro timer
2. focus timer
3. task tracker
4. ambient sounds
5. lofi radio

---

## Single-purpose description (Privacy practices tab)

> A Pomodoro focus timer that lives in Chrome's side panel, with task tracking and optional ambient audio to help users sustain deep work sessions.

---

## Privacy policy URL

> https://damianperreira.github.io/pomodoro-extension/privacy-policy.html

---

## Permission justifications (Privacy practices tab)

### storage
Saves your tasks, timer settings, and daily statistics so they persist across browser sessions and sync across your Chrome devices. No data is sent to external servers.

### notifications
Sends a desktop notification when your focus or break session ends, so you never miss a transition even if the browser is in the background.

### alarms
Keeps the timer running accurately in the background when the sidebar is closed. A one-shot alarm fires at the session end time to trigger the completion notification.

### sidePanel
The entire extension UI lives in Chrome's side panel, giving users quick access without opening a new tab or popup.

### host_permissions: *.api.radio-browser.info
This host permission allows the extension to query the Radio Browser API (https://www.radio-browser.info), an open-source community database of internet radio stations. When a user opens the Radio tab and selects a genre, the extension sends a search request to this API to retrieve a list of matching stations. Only the genre tag is sent as a query parameter. No user data, personal information, or browsing history is transmitted.

---

## Reviewer note: external audio sources

The extension plays audio via the HTML `<audio>` element from internet radio stations discovered at runtime through the Radio Browser API (an open-source community directory of 30,000+ stations). Station stream URLs span thousands of domains and cannot be enumerated at build time. The curated Sounds tab also streams from a small set of providers (somafm.com, radioca.st, torontocast.com) that may rotate infrastructure.

No additional CSP or `host_permissions` entries are required for these media loads — `<audio>` and `<img>` element loads in MV3 extension pages are not gated by `host_permissions`, and the default extension-pages CSP permits them. The manifest CSP (`script-src 'self'; object-src 'none'`) keeps script execution locked down.
