<div align="center">

# TAD

### TikTok Account Details

A modern RTL single-page application for retrieving real TikTok account details and regional metadata from public profile data or a configured RapidAPI TikTok Scraper endpoint.

[![React](https://img.shields.io/badge/React-18%2B-61DAFB?logo=react&logoColor=20232A)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-Frontend-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![RapidAPI](https://img.shields.io/badge/RapidAPI-TikTok%20Scraper-00AEEF?logo=rapid&logoColor=white)](https://rapidapi.com/)
[![License](https://img.shields.io/badge/license-private-lightgrey)](#license)

[Features](#features) · [Architecture](#architecture) · [Getting Started](#getting-started) · [Configuration](#configuration) · [Troubleshooting](#troubleshooting)

</div>

---

## Overview

TAD provides a focused interface for looking up TikTok account information by username. It presents profile identity, account identifiers, public statistics, verification status, privacy state, and the region returned by the configured data source.

The interface is Arabic-first, right-to-left (RTL), responsive, and designed to keep the lookup workflow simple: enter a username, select a data source if needed, and review the returned profile details.

> Important: TAD displays region data only when the upstream source returns it. It does not infer or guess a user's country.

## Features

- Arabic RTL interface with responsive layout.
- TikTok profile lookup by username, with or without the `@` prefix.
- RapidAPI TikTok Scraper integration.
- Required RapidAPI headers: `X-RapidAPI-Key` and `X-RapidAPI-Host`.
- Automatic `username` parameter handling.
- Automatic `count=1` parameter for endpoints that support result limits.
- Support for `{username}` as an endpoint path placeholder.
- Profile details including:
  - Username and display name
  - Avatar
  - TikTok user ID and `secUid`
  - Biography/signature
  - Followers, following, likes, and video counts
  - Verification and privacy status
  - Region/country returned by the source
- Advanced settings panel for runtime API configuration.
- Fallback lookup flow when RapidAPI is not configured:
  1. TikTok public profile SSR data
  2. TikWM public API
- Clear loading and error states.

## Architecture

```text
┌─────────────────────┐
│  React UI (RTL)     │
│  src/main.jsx       │
└──────────┬──────────┘
           │ username + configuration
           ▼
┌─────────────────────┐
│ Source selector     │
│ RapidAPI or fallback│
└───────┬─────────────┘
        │
        ├── RapidAPI TikTok Scraper
        │   ├── X-RapidAPI-Key
        │   ├── X-RapidAPI-Host
        │   ├── username
        │   └── count=1
        │
        ├── TikTok public profile SSR
        │
        └── TikWM public API
                │
                ▼
┌─────────────────────┐
│ Normalize response  │
│ Extract region/data  │
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ Profile dashboard   │
└─────────────────────┘
```

### Project structure

```text
TAD/
├── .env.example       # Environment variable template
├── index.html         # Application entry document
├── package.json       # Scripts and dependencies
├── README.md          # Project documentation
└── src/
    ├── main.jsx       # React application and data-fetching logic
    └── style.css      # Application styles
```

## Requirements

- Node.js 18 or newer recommended.
- npm 9 or newer recommended.
- A RapidAPI account and an active TikTok Scraper subscription for RapidAPI mode.
- A modern browser with `fetch` and ES module support.

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/Fahad-BA/TAD.git
cd TAD
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create your local environment file

```bash
cp .env.example .env
```

On Windows PowerShell, use:

```powershell
Copy-Item .env.example .env
```

### 4. Configure RapidAPI

Open `.env` and replace the placeholder values with the host, endpoint, and key provided by your RapidAPI TikTok Scraper subscription. See [Configuration](#configuration).

### 5. Start the development server

```bash
npm run dev
```

Vite will print the local development URL in the terminal. Open that URL in a browser and search for a TikTok username.

### 6. Create a production build

```bash
npm run build
```

To preview the production build locally:

```bash
npm run preview
```

## Configuration

The browser-facing application reads the `VITE_` variables below. The unprefixed variables are included in `.env.example` for compatibility with a future server-side adapter, but Vite does not expose unprefixed variables to client-side code.

| Variable | Required in RapidAPI mode | Description | Example |
| --- | :---: | --- | --- |
| `VITE_RAPIDAPI_KEY` | Yes | RapidAPI subscription key sent as `X-RapidAPI-Key`. | `your_rapidapi_key` |
| `VITE_RAPIDAPI_HOST` | Yes | RapidAPI host sent as `X-RapidAPI-Host`. | `tiktok-scraper-api.p.rapidapi.com` |
| `VITE_RAPIDAPI_ENDPOINT` | Yes | TikTok Scraper request URL. | `https://tiktok-scraper-api.p.rapidapi.com/user/info` |
| `RAPIDAPI_KEY` | No | Server-side-compatible alias; not read by the browser build. | `your_rapidapi_key` |
| `RAPIDAPI_HOST` | No | Server-side-compatible host alias. | `tiktok-scraper-api.p.rapidapi.com` |
| `RAPIDAPI_ENDPOINT` | No | Server-side-compatible endpoint alias. | `https://.../user/info` |

Example `.env`:

```dotenv
VITE_RAPIDAPI_KEY=your_rapidapi_key
VITE_RAPIDAPI_HOST=your-rapidapi-host.p.rapidapi.com
VITE_RAPIDAPI_ENDPOINT=https://your-rapidapi-host.p.rapidapi.com/your/tiktok/scraper/path
```

### Request behavior

When a RapidAPI endpoint is configured, TAD:

1. Removes a leading `@` from the username.
2. Replaces `{username}` in the endpoint path when present.
3. Adds `username=<username>` when the endpoint does not already define it.
4. Adds `count=1` when the endpoint does not already define it.
5. Preserves existing query parameters.
6. Sends `X-RapidAPI-Key` and `X-RapidAPI-Host` headers.

You may also enter the endpoint, host, and key in the Advanced Settings panel. Runtime values take precedence over the environment defaults.

### Security note

This is a browser-based SPA. Any `VITE_` value included in a production build can be inspected by users in the browser, including the RapidAPI key. For production deployments where the key must remain private, place the RapidAPI request behind a server-side proxy or backend and have the frontend call that proxy instead.

Never commit `.env` or real API credentials to the repository.

## Data source fallback

If `VITE_RAPIDAPI_ENDPOINT` is empty and no runtime endpoint is supplied, TAD attempts:

1. TikTok's public profile page and embedded SSR JSON.
2. TikWM's public user information endpoint.

The application searches common fields such as `region`, `regionCode`, `countryCode`, `country`, `region_code`, and `country_code`. If no region is returned, TAD shows an error rather than presenting an inferred value.

## Available scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server. |
| `npm run build` | Build the application for production. |
| `npm run preview` | Preview the production build locally. |

## Troubleshooting

### RapidAPI returns HTTP 401 or 403

- Confirm that `VITE_RAPIDAPI_KEY` is valid and active.
- Confirm that the key belongs to the RapidAPI account with access to the selected API.
- Restart the Vite server after changing `.env`.
- Do not include extra quotes or accidental whitespace in the environment values.

### RapidAPI returns HTTP 404

- Copy the endpoint URL from the RapidAPI provider's documentation.
- Confirm that the endpoint path matches the subscribed TikTok Scraper API.
- Confirm that `VITE_RAPIDAPI_HOST` exactly matches the provider's displayed host.
- Check whether the provider expects the username in a query parameter or a path placeholder.

### The application says RapidAPI is not configured

Verify that all three browser variables are present:

```text
VITE_RAPIDAPI_KEY
VITE_RAPIDAPI_HOST
VITE_RAPIDAPI_ENDPOINT
```

Then restart `npm run dev`. Vite reads environment variables when the server starts.

### The lookup returns no region

The upstream source may not expose regional metadata for that account. TAD intentionally does not guess a country. Try a different supported endpoint or inspect the provider's response schema for the correct region field.

### CORS errors appear in the browser

The selected API must allow browser requests from your deployed origin. If it does not, use a server-side proxy. Do not solve CORS problems by exposing additional credentials or disabling browser security.

### The page is blank after a code change

Run a clean dependency installation and rebuild:

```bash
rm -rf node_modules
npm install
npm run build
```

On Windows, remove `node_modules` manually or use the equivalent PowerShell command.

## Contributing

1. Create a feature branch from `main`.
2. Keep changes focused and preserve the RTL experience.
3. Run `npm run build` before opening a pull request.
4. Describe configuration or API behavior changes in the pull request.

## License

This repository does not currently declare an open-source license. Unless the repository owner adds a license, all rights are reserved by the copyright holder.

## Disclaimer

TAD is an interface for retrieving information returned by third-party services. Respect TikTok's terms of service, RapidAPI provider policies, applicable laws, and user privacy. Do not use the project to bypass access controls or collect data irresponsibly.

<div align="center">

Built with React and Vite · Designed for a clean TikTok account lookup workflow

</div>
