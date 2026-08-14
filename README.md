<div align="center">

# TAD

### TikTok Account Details

A bilingual (EN/AR) installable PWA for retrieving real TikTok account details — stats, privacy, and country — via a RapidAPI TikTok Scraper endpoint with public-source fallbacks.

[![React](https://img.shields.io/badge/React-18%2B-61DAFB?logo=react&logoColor=20232A)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-Frontend-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![PWA](https://img.shields.io/badge/PWA-Installable-5A0FC8?logo=pwa&logoColor=white)](https://web.dev/learn/pwa/)
[![RapidAPI](https://img.shields.io/badge/RapidAPI-TikTok%20Scraper-00AEEF?logo=rapid&logoColor=white)](https://rapidapi.com/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)

[Features](#features) · [Architecture](#architecture) · [Getting Started](#getting-started) · [Configuration](#configuration) · [Deployment](#deployment) · [Troubleshooting](#troubleshooting)

</div>

---

## Overview

TAD looks up a TikTok account by username and presents its profile identity, accurate statistics, verification and privacy status, and the country/region returned by the data source.

The interface defaults to **English (LTR)** with a one-tap switch to **Arabic (RTL)** — layout direction, labels, and country names all flip together, and the choice is remembered per browser.

> Important: TAD displays region data only when the upstream source returns it. It does not infer or guess a user's country.

## Features

### Lookup

- TikTok profile lookup by username, with or without the `@` prefix.
- **Two-step RapidAPI flow**: `/user/search` (finds the user, returns `user_id` + region) followed by `/user/info?user_id=` for accurate, fresh statistics and privacy status. Search results alone can be stale.
- Automatic parameter handling: `keywords` for search endpoints, `username`/`unique_id` for info endpoints, plus `count=1`.
- Automatic `https://` scheme normalization for endpoints missing it.
- **Region fallback**: if the primary response has no region field, TikWM is queried for it.
- **Bio fallback**: private accounts often hide the bio from scrapers; TikWM is tried as a secondary source.
- Full fallback chain when RapidAPI fails: TikTok SSR → TikWM.
- Profile details: username, display name, avatar, user ID, `secUid`, bio, followers/following/likes/videos, verification, privacy, region.

### Internationalization

- English default (LTR) ⇄ Arabic (RTL) via a header toggle; preference persisted in `localStorage`.
- **237 countries/territories** in `src/regions.json` with English and Arabic names.
- Flag emojis generated automatically from the ISO code (regional indicator symbols) — no icon assets needed.
- Country lookup works by ISO code or by name (English or Arabic).
- All styling uses CSS **logical properties** (`border-inline-start`, `inset-inline-end`, …) so every alignment flips correctly with the direction.

### PWA & Mobile

- Installable: web manifest, service worker, generated app icons (192/512 + maskable).
- Offline-capable app shell; API calls are never cached — lookups always return live data.
- iOS support: apple-touch-icon, standalone status bar, no auto-zoom inputs (`font-size: 16px`).
- Touch-friendly: ≥48px interactive targets, safe-area insets for notched screens, single-line search form on small screens.

## Architecture

```text
┌────────────────────────────┐
│  React UI (EN/AR, LTR/RTL) │
│  src/main.jsx              │
└─────────────┬──────────────┘
              │ username
              ▼
┌────────────────────────────────────────┐
│ RapidAPI /user/search                  │
│   → user_id + region                   │
│ RapidAPI /user/info?user_id=           │
│   → fresh stats + privacy              │
│ TikWM (region / bio fallback)          │
└─────────────┬──────────────────────────┘
              │ on RapidAPI failure
              ▼
┌────────────────────────────┐
│ TikTok SSR  →  TikWM       │
└─────────────┬──────────────┘
              ▼
┌────────────────────────────┐
│ Merge + normalize regions  │
│ (src/regions.json)         │
└─────────────┬──────────────┘
              ▼
┌────────────────────────────┐
│ Profile dashboard          │
└────────────────────────────┘
```

### Project structure

```text
TAD/
├── .env.example            # Environment variable template
├── index.html              # App entry, PWA metadata, SW registration
├── vite.config.js          # Preview host allowlist
├── package.json
├── public/
│   ├── manifest.webmanifest
│   ├── sw.js               # Service worker (app-shell cache)
│   └── icons/              # 192 / 512 / maskable PNGs
└── src/
    ├── main.jsx            # React app, i18n, data-fetching logic
    ├── regions.json        # 237 countries [English, Arabic]
    └── style.css           # Logical-property styles (RTL/LTR safe)
```

## Requirements

- Node.js 18+ recommended.
- npm 9+ recommended.
- A RapidAPI account with a TikTok Scraper subscription (e.g. `tiktok-scraper7`) for RapidAPI mode.
- A modern browser with `fetch` and ES module support.

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/Fahad-BA/TAD.git
cd TAD
npm install
```

### 2. Configure RapidAPI

```bash
cp .env.example .env
```

Open `.env` and fill in:

```dotenv
VITE_RAPIDAPI_KEY=your_rapidapi_key
VITE_RAPIDAPI_HOST=tiktok-scraper7.p.rapidapi.com
VITE_RAPIDAPI_ENDPOINT=https://tiktok-scraper7.p.rapidapi.com/user/search?cursor=0&follower_count=0&profile_type=0&other_pref=0
```

The app appends `keywords=<username>` and `count=1` automatically for `/search` endpoints, then enriches with `/user/info?user_id=`.

### 3. Run

```bash
npm run dev       # development
npm run build     # production build
npm run preview   # serve the production build
```

## Configuration

| Variable | Required | Description |
| --- | :---: | --- |
| `VITE_RAPIDAPI_KEY` | Yes | RapidAPI key sent as `X-RapidAPI-Key`. |
| `VITE_RAPIDAPI_HOST` | Yes | RapidAPI host sent as `X-RapidAPI-Host`. |
| `VITE_RAPIDAPI_ENDPOINT` | Yes | Full endpoint URL. Search endpoints are recommended (they return region). |

Unprefixed aliases (`RAPIDAPI_*`) are kept in `.env.example` for future server-side adapters; Vite only exposes `VITE_` variables to the browser.

### Security note

This is a browser-based SPA — any `VITE_` value in a production build (including the API key) is inspectable in the browser. For private-key deployments, put the RapidAPI request behind a server-side proxy. Never commit `.env`.

## Deployment

The production build (`dist/`) is a fully static site — host it anywhere:

- Any static host / CDN.
- `vite preview` behind a reverse proxy or tunnel (the included `vite.config.js` allows all preview hosts).
- A systemd service running `npm run preview` is a simple self-hosted option.

For the PWA to install correctly, serve over **HTTPS** with `manifest.webmanifest` and `sw.js` reachable at the site root.

## Troubleshooting

### RapidAPI returns 401/403
- Verify `VITE_RAPIDAPI_KEY` is active and subscribed to the same API as the host.
- Restart the dev server after editing `.env` (Vite reads it at startup).

### Stats look stale or wrong
- Stale numbers usually mean the search response was used without enrichment. The two-step flow (`/user/search` → `/user/info?user_id=`) exists for this reason — make sure the configured endpoint path contains `/search` so the app can detect it.

### Bio shows "—" for a private account
- TikTok hides bios of private accounts from anonymous requests. TAD tries TikWM as a fallback; if that also fails, the bio simply is not available without an authorized session.

### No region shown
- The source did not return region metadata. TAD never guesses a country. The TikWM fallback usually covers this.

### Blank page after changes

```bash
rm -rf node_modules && npm install && npm run build
```

### Old version still showing (PWA)
- The service worker updates in the background. Close and reopen the app, or bump the `CACHE` name in `public/sw.js`.

## Contributing

1. Branch from `main`.
2. Keep both languages (EN/AR) in sync — new strings belong in the `i18n` dict, and new countries in `src/regions.json`.
3. Use CSS logical properties only — no physical `left`/`right`.
4. Run `npm run build` before opening a pull request.

## License

This project is licensed under the [MIT License](./LICENSE).

## Disclaimer

TAD is an interface for data returned by third-party services. Respect TikTok's terms of service, RapidAPI provider policies, applicable laws, and user privacy. Do not use it to bypass access controls or collect data irresponsibly.

<div align="center">

Built with React and Vite · Bilingual · Installable · RTL/LTR safe

</div>
