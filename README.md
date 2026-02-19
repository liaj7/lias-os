# Lia's OS

Personal life dashboard — a single-file React app with 5 boards: Brain Dump, Command Center, Content Hub, Learning Center, and Finance.

## Quick Start (Local)

1. Open a terminal in this folder
2. Run a local server:
   ```
   python -m http.server 3000
   ```
3. Open http://localhost:3000/playground.html

That's it. The app works fully offline with localStorage — no Supabase needed for local use.

---

## Supabase Setup (Cross-Device Sync)

If you want your data to sync between phone and laptop:

### 1. Create a Supabase project

- Go to [supabase.com](https://supabase.com) and create a new project (free tier is fine)
- Note your **Project URL** and **anon public key** from Settings → API

### 2. Run the database schema

- Go to **SQL Editor** in your Supabase dashboard
- Paste the contents of `schema.sql` and click **Run**
- This creates two tables: `entries` (your items) and `user_settings` (your preferences)

### 3. Configure the app

Open `playground.html` and find these two lines near the top of the `<script>` block:

```js
const SUPABASE_URL      = 'TODO_MY_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'TODO_MY_SUPABASE_ANON_KEY';
```

Replace with your actual values:

```js
const SUPABASE_URL      = 'https://yourproject.supabase.co';
const SUPABASE_ANON_KEY = 'eyJ...your-anon-key...';
```

### 4. Enable email auth

In Supabase dashboard → Authentication → Providers:
- Make sure **Email** provider is enabled
- Under Email settings, "Enable Magic Link" should be on

### 5. Set the redirect URL

In Supabase → Authentication → URL Configuration:
- Add your deployed URL to **Redirect URLs** (e.g., `https://liaj7.github.io/lias-os/`)
- Also add `http://localhost:3000` for local development

---

## How Login Works

The app uses **magic link** authentication (no passwords):

1. Enter your email on the login screen
2. Click "Send magic link"
3. Check your email — click the link
4. You're signed in. Your data will sync to Supabase.

When Supabase is not configured (the `TODO_` placeholders are still there), the app runs in **local-only mode** — no login screen, data stays in your browser's localStorage.

---

## Install as a PWA (Phone App)

### iPhone (Safari)
1. Open the app URL in Safari
2. Tap the **Share** button (⬆️)
3. Scroll down → tap **"Add to Home Screen"**
4. Name it "Lia's OS" → tap Add

### Android (Chrome)
1. Open the app URL in Chrome
2. Tap the **three-dot menu** (⋮)
3. Tap **"Install app"** or **"Add to Home Screen"**

### Desktop (Chrome/Edge)
1. Open the app URL
2. Click the install icon (⊕) in the address bar
3. Click **"Install"**

After installing, the app opens in its own window — no browser chrome.

---

## Offline Use

The app works offline once you've loaded it at least once:

- **App shell** (HTML, CSS, JS) is cached by the service worker
- **Your data** is stored locally in IndexedDB (via localForage) and localStorage
- When you go back online, changes sync to Supabase automatically

The sync indicator in the header shows your status:
- 🟢 **Synced** — connected and up to date
- 🟡 **Syncing...** — pushing changes
- 🔴 **Offline** — working locally, will sync when online again

---

## Cross-Device Sync

Data syncs through Supabase (requires setup above):

1. Sign in with the same email on both devices
2. Changes made on one device push to Supabase within ~1.5 seconds
3. When you open the app on the other device, it pulls the latest data

**Sync strategy:** Last write wins. If you edit the same item on two devices while offline, the one that syncs last will overwrite the other.

**Export/Import backup:** Use the ⋯ menu → Export to save a JSON backup. You can import it on any device via ⋯ → Import.

---

## File Structure

```
playground.html   ← The entire app (single file)
manifest.json     ← PWA manifest (name, icons, display mode)
service-worker.js ← Offline caching (cache-first for shell)
schema.sql        ← Supabase database schema (run once)
icon-192.png      ← App icon (192x192)
icon-512.png      ← App icon (512x512)
README.md         ← This file
```

## Architecture Notes

- **React 18** via CDN (no build tools)
- **Tailwind CSS** via Play CDN
- **Supabase JS v2** via CDN for auth + database
- **localForage** via CDN for IndexedDB offline cache
- **State management:** React Context (`DataProvider`) with `useLocalStorage` hook
- **Sync flow:** localStorage (instant) → UI render → debounced push to Supabase + IndexedDB cache
- **Auth:** Email magic link via Supabase Auth. Falls back to local-only when Supabase is not configured.

## Trade-offs

| Decision | Why |
|---|---|
| Magic link over password | Simpler, more secure, no password to remember |
| Last-write-wins sync | Good enough for single user, avoids complex conflict resolution |
| JSONB payload column | Schema stays stable as app evolves — no migrations needed for new fields |
| Single HTML file | Zero build tooling, easy to deploy anywhere |
| localForage + localStorage | Belt and suspenders: localStorage for instant React state, IndexedDB for robust offline cache |
