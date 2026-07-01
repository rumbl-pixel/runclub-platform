---
name: run-runclub-platform
description: Build, run, and drive Corso (runclub-platform). Use when asked to start the app, serve it locally, take a screenshot of a page, exercise the student/admin login flows, or run its test suite.
---

Corso is a static multi-page app (plain HTML + `styles.css` + per-page
`.js`, no build step, no framework). There is no `chromium-cli` in
this environment — the driver is this Claude Code session's own
`mcp__Claude_Preview__*` toolset, which serves the app via
`.claude/launch.json` and drives a real headless-capable browser
against it. That MCP toolset (not a shell script) *is* the harness;
everything below is the exact call sequence to use it.

All paths below are relative to the repo root (`runclub-platform/`).

## Prerequisites

Node.js (any recent LTS) — used only to run `npx http-server` and the
test suite. No `npm install` is required for local serving; the only
`devDependency` (`supabase`) is for backend/CLI work, not the frontend.

## Setup

None. Nothing to install, nothing to configure. `.claude/launch.json`
already defines the static server:

```json
{
  "version": "0.0.1",
  "configurations": [
    {
      "name": "static",
      "runtimeExecutable": "npx",
      "runtimeArgs": ["--yes", "http-server", "-p", "8080", "-c-1", "--silent"],
      "port": 8080
    }
  ]
}
```

`-c-1` disables HTTP caching, so local edits are always picked up —
unlike the deployed Cloudflare Pages site (see Gotchas).

## Build

None. There is a Cloudflare-specific bundling script
(`npm run build:cloudflare` → `dist-pages/`) but it is for deployment,
not for running/driving the app locally — skip it for agent-driven
verification.

## Run (agent path)

Start the server, then drive it with the Preview MCP tools. Reuses an
already-running server by name, so it's safe to call repeatedly.

```
preview_start({ name: "static" })
  → { serverId, port: 8080 }
```

Use that `serverId` for every call below.

**1. Load a page and screenshot it:**

```
preview_eval({ serverId, expression: "window.location.href='/index.html'; 'ok'" })
preview_screenshot({ serverId })
```

There is no dedicated `navigate` tool in this MCP — set
`window.location.href` via `preview_eval` and re-screenshot/re-query
after. `preview_start` itself opens the server's root; on subsequent
pages, this `preview_eval` pattern is how you move around.

**2. Verify a computed style on a themed component (proves the CSS
actually applied, not just that the tag exists):**

```
preview_eval({ serverId, expression: "window.location.href='/about.html?cb='+Date.now(); 'ok'" })
preview_eval({ serverId, expression:
  "getComputedStyle(document.querySelector('.site-footer')).backgroundColor" })
  → e.g. "oklch(0.967 0.001 286.375)"   // shadcn --secondary
preview_screenshot({ serverId })
```

The shadcn look is the app's only theme — every page sets
`<html data-skin="shadcn">` statically, no toggle or query param
involved (see Gotchas: this used to be an A/B-toggleable overlay via
`skin.js`; that mechanism was removed and shadcn made permanent).

**3. Drive the student DEMO login (deterministic, no real credentials
needed — `student.js`'s `authenticateStudent` special-cases the
username `DEMO` to log in as the first demo student regardless of
password):**

```
preview_eval({ serverId, expression: "window.location.href='/student.html'; 'ok'" })
preview_fill({ serverId, selector: "#student-username", value: "DEMO" })
preview_eval({ serverId, expression: "document.getElementById('submit-btn').click(); 'clicked'" })
preview_eval({ serverId, expression: "location.pathname" })
  → poll until it returns "/student-profile.html" (login redirects via JS, not a real form POST)
preview_screenshot({ serverId })
```

Use `element.click()` via `preview_eval` here, not `preview_click` — see
Gotchas below, this specific submit button did not reliably fire its
JS listener via `preview_click` in this session.

**4. Check for runtime errors before declaring anything working:**

```
preview_console_logs({ serverId, level: "error" })
```

An empty/absent result is success — a page can render its shell while
a script silently throws.

**Other pages worth spot-checking the same way:** `admin.html` (staff
login), `admin-dashboard.html?tab=students` (the heaviest page —
375KB `admin-dashboard.js`), `leaderboard.html`, `kiosk.html`.

## Run (human path)

```bash
npx http-server -p 8080 -c-1
```

Then open `http://localhost:8080/index.html` in a real browser.
`Ctrl+C` to stop.

## Test

```bash
npm test
```

Runs `tests/*.test.js` — plain Node scripts (no browser, no test
runner framework) that assert specific files exist and that brand
strings (`Corso`, not the old product name) appear across the HTML/MD
files. This is the layer most content/copy PRs actually touch; the
Preview MCP flow above is for anything that changes rendered
layout/CSS/interactive behavior.

```bash
node --check admin-dashboard.js && node --check theme.js
```

Fast syntax-only check on the two largest hand-written JS files
(mirrors what `npm run cloudflare:check` does before a deploy).

---

## Gotchas

- **`preview_click` didn't reliably fire JS `click` listeners on this
  app's own hand-rolled interactive elements** (the mobile nav's
  `[data-mobile-menu-toggle]` button, `student.html`'s `#submit-btn`)
  — the tool reports `"Successfully clicked"` but `document.body`'s
  toggled class / the form's submit handler never ran. Confirmed by
  checking state immediately after (`document.body.className`, or
  `location.pathname` for the login redirect) and seeing no change.
  Workaround that reliably worked both times: dispatch the click
  yourself — `preview_eval({ expression:
  "document.getElementById('submit-btn').click()" })` — instead of
  `preview_click`. `preview_fill` was reliable throughout; this issue
  was specific to `preview_click` in this session.
- **`background-image` beats `background-color`.** The Corso base
  CSS uses gold gradient `background-image` layers on some buttons
  (e.g. `.feature-suggestion-btn`). A skin override that only sets
  `background-color` silently does nothing — the gradient still shows
  through. Set `background` (shorthand) and `background-image: none`
  explicitly, then re-screenshot to confirm (checking `computedStyle`
  alone can lie if you only inspect the property you set).
- **The shadcn overlay is scoped to `html[data-skin="shadcn"]`.** Every
  page sets that attribute statically now (no toggle, no query param,
  no localStorage) — it's the app's only theme, not an A/B option
  anymore. If you ever see a page *not* picking up a `theme-shadcn.css`
  change, check the `<html>` tag has the attribute before suspecting
  the CSS itself.
- **Cache-buster query strings (`?v=N`) must be bumped by hand** on
  every `<link>`/`<script>` tag across all ~11 HTML pages whenever the
  referenced file changes. The local dev server (`-c-1`, no caching)
  hides this — it always serves the latest file regardless of `?v=`.
  The deployed Cloudflare Pages site does cache, so a stale `?v=` there
  means real users get the old file. Don't skip the bump just because
  it "looks fine" locally.
- **`preview_eval` navigation, not a `navigate` tool.** Setting
  `window.location.href` inside `preview_eval` is the only way to
  change pages with this MCP surface; there's no separate navigate
  call. Poll `location.pathname` afterward rather than assuming
  instant navigation, especially after a JS-driven redirect (e.g. the
  student login flow above).
- **Demo lock must stay intact.** `config.js` ships with
  `demoMode: true, syncEnabled: false, liveDataMode: false`. Never
  flip these while driving the app for verification, and don't leave
  them flipped if you touch them for a test — this project is
  deliberately not wired to real backend data yet.

## Troubleshooting

- **Bash/MCP tool calls intermittently return "temporarily
  unavailable, so auto mode cannot determine the safety of `<tool>`
  right now"**: a transient host-side safety-classifier outage tied to
  "auto" permission mode, not a bug in this project or the app. Plain
  reads (`Read`/`Grep`/`Glob`) are unaffected and keep working — use
  the outage window to prep/verify file contents, then retry the
  gated tool call once it recovers. Switching out of "auto" permission
  mode removes the classifier from the path entirely.
- **`preview_start` returns `reused: true` with no new process**:
  expected and fine — it means a server from an earlier call in this
  session is already serving on port 8080; reuse its `serverId`
  rather than starting a second one (which would just hit
  `EADDRINUSE` and self-resolve to the same server anyway).
