# Orbit — AI agent studio

A mobile-first Android app for creating AI agents with persistent, user-reviewed memory, opt-in schedules, and third-party HTTPS integrations. A browser preview is included; closed-app AI runs are an **Android-only** feature.

## Run it

```bash
npm ci
npm run dev                 # browser preview at http://localhost:5173
npm test                    # UI, permission, memory and scheduling-handoff tests
npm run build               # type-check and bundle
```

The Android project is in `android/`. With Android Studio, Android SDK 35, and JDK 21 installed:

```bash
npm run android:sync        # rebuild web assets and copy them into the Android project
npm run android:open        # open the native project in Android Studio
# Or: cd android && ./gradlew assembleDebug
```

Run on an emulator or device. A debug build writes `android/app/build/outputs/apk/debug/app-debug.apk`. **This sandbox has no Android SDK/JDK, so the native worker has not been compiled or device-tested here.** The web build, automated tests, Capacitor sync, and Java syntax parsing were verified. Test Android scheduling, notification permission, and provider connectivity on a device before relying on unattended runs.

## Getting started

1. Use the three-step guide or pick a Research, Writing, or Planning starter. Give an agent instructions and a task.
2. In **Settings**, add your own OpenAI, OpenRouter, or other OpenAI-compatible **chat completions** endpoint and API key. Without a key, runs are explicitly labeled local previews and do not contact a model. Provider usage may incur charges.
3. Optionally add a tool in **Integrations** (Tavily search, Slack webhook, generic webhook, or custom HTTPS GET/POST API). Assign it to an agent. A tool can use `{{input}}` / `{{query}}` in its URL or body. A test request is real and may have side effects.
4. After a successful run, review the suggested memory in the result or on the **Memory** page. Edit and **Save memory** to make it available to future runs, or **Don't save**. You can also add, pin, edit, search, and delete memories yourself. Up to 20 saved memories per agent are sent to the model; pending suggestions are never used as context.

**Tool permissions:** POST tools ask for approval by default, including older POST tools without a saved setting. Any GET or POST tool can be set to **Ask me before every use**. Before a manual call, Orbit shows the method, destination URL, agent-provided input, generated body, and header names (but not credential values). Allow once or reject; unattended runs never grant permission. Test requests for approval-required tools also ask first. Disabling approval lets that tool run without asking. Assign tools only to agents you trust, and review the destination before approving. Native and preview HTTP requests do not follow redirects.

Workspace data (including tool headers) is stored locally; Settings can export/import a JSON backup. The provider key is **not** included in workspace exports. Reset and import clear Android background scheduling and pending results before replacing workspace data.

## Scheduled runs

- **Browser / Android without background opt-in:** An hourly/daily recurring goal is checked once a minute **only while Orbit is open** and a provider key is active. Scheduled runs use saved memories but no connected tools.
- **Android with background opt-in:** Set an agent's schedule and recurring goal in **Edit agent → Make it your own**. Save a provider key, then choose **Enable on Android** in **Settings → Background runs**. A native Android WorkManager job checks for due goals with network connectivity, makes an OpenAI-compatible model request without a WebView, stores the answer on-device, and can notify you. Results appear in Activity and as pending memory suggestions when Orbit is opened or refreshed. The worker runs at most one due agent per invocation and pauses after 100 results awaiting import.
- **Timing is not exact.** Android's minimum periodic interval is 15 minutes, and battery, network, and OS policies can delay or skip work. Hourly/daily means eligible after that interval, **not** guaranteed at a specific time. Notifications require permission on Android 13+; declining notifications does not stop scheduled work. A model or endpoint error appears in the background status and Activity when a run is saved.
- **Background limitations:** Unattended jobs never use connected API tools, even GET tools configured not to ask. They cannot search live web content or approve actions; agent instructions should not assume they can. They use only explicitly saved memories and the configured model. In-flight provider requests may already have been sent when you turn the switch off; future work is cancelled. Provider calls may incur charges.

**Key security:** Ordinarily the AI provider key is kept in session storage. When background runs are enabled, a separate copy is encrypted with a non-exportable AES-GCM key in Android Keystore and stored in app-private preferences; Android backup is disabled. It is restored into the running app session when needed and removed from background storage on disable. Agent instructions, approved memories, and pending results are app-private but **not encrypted**. Tool headers and webhook URLs remain locally stored without encryption; avoid sensitive tool credentials on a shared device. Changing the provider, endpoint, or model disables background runs until you explicitly re-enable them for the new configuration.

## Boundaries

- The Android app uses native HTTPS requests. The browser preview uses Vite's `/api/relay` middleware to work around browser CORS. That relay rejects local/private addresses, non-HTTPS URLs, redirects, and oversized responses. It is a development utility, **not** an authenticated production gateway. A static website deployment needs its own secure backend relay.
- Third-party APIs and AI providers receive the inputs you choose to send them. Orbit has no multi-user accounts, cloud sync, or included AI subscription. Review provider and integration terms, limits, and costs.

Built with React, TypeScript, Vite, Capacitor 7, Android WorkManager, and local-first storage.
