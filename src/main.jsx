import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

import regions from './regions.json';

// Flag emoji is generated from the ISO code (regional indicator symbols).
const flagOf = (code) => /^[A-Z]{2}$/.test(code) ? [...code].map((c) => String.fromCodePoint(127397 + c.charCodeAt())).join('') : '🌐';

const i18n = {
  en: {
    dir: 'ltr', statusReady: 'Ready', statusLoading: 'Loading…', statusReal: 'Real data',
    heroA: 'Get any', heroB: 'account details in seconds.',
    placeholder: 'Enter username…', submit: 'Show Info', loading: 'Loading…',
    realLabel: 'Real data', verified: 'Verified',
    statsTitle: 'Account Stats', followers: 'Followers', following: 'Following', hearts: 'Likes', videos: 'Videos',
    countryTitle: 'Country & Settings', country: 'Actual Country/Region', privacy: 'Privacy',
    privateAcc: 'Private account', publicAcc: 'Public account',
    errorPrefix: 'Failed to fetch real data:', errorSuffix: 'Check the username or source settings.',
    langButton: 'عربي', footer: 'Built with 💚 in Riyadh, Saudi Arabia',
  },
  ar: {
    dir: 'rtl', statusReady: 'جاهز', statusLoading: 'جارٍ الجلب…', statusReal: 'بيانات حقيقية',
    heroA: 'اعرف تفاصيل حساب', heroB: 'في ثوانٍ.',
    placeholder: 'أدخل اسم المستخدم…', submit: 'عرض المعلومات', loading: 'جارٍ…',
    realLabel: 'بيانات حقيقية', verified: 'موثّق',
    statsTitle: 'إحصائيات الحساب', followers: 'المتابعون', following: 'يتابع', hearts: 'الإعجابات', videos: 'الفيديوهات',
    countryTitle: 'الدولة والإعدادات', country: 'الدولة/المنطقة الفعلية', privacy: 'الخصوصية',
    privateAcc: 'حساب خاص', publicAcc: 'حساب عام',
    errorPrefix: 'تعذر جلب البيانات الحقيقية:', errorSuffix: 'تحقق من اسم المستخدم أو إعدادات المصدر.',
    langButton: 'English', footer: 'صُنع بـ💚 في الرياض، السعودية العظمى',
  },
};

const GitHubIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.27-.01-1.17-.02-2.12-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.76 2.69 1.25 3.35.96.1-.75.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.15 1.18a10.9 10.9 0 0 1 5.74 0c2.19-1.49 3.15-1.18 3.15-1.18.62 1.58.23 2.75.11 3.04.73.81 1.18 1.83 1.18 3.09 0 4.42-2.7 5.39-5.26 5.68.41.35.77 1.05.77 2.12 0 1.53-.01 2.76-.01 3.14 0 .31.21.67.8.56A10.52 10.52 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z"/></svg>
);
const EmailIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
);

const env = import.meta.env;
const envValue = (name) => env[`VITE_${name}`] || env[name] || '';
const defaultRapidApiKey = envValue('RAPIDAPI_KEY');
const defaultRapidApiHost = envValue('RAPIDAPI_HOST');
const defaultRapidApiEndpoint = envValue('RAPIDAPI_ENDPOINT');

const normalizeRegion = (value) => {
  if (!value) return ['—', { en: 'Not provided by source', ar: 'غير محددة من المصدر' }, '🌐'];
  const raw = String(value).trim();
  const code = raw.toUpperCase().replace(/[^A-Z]/g, '');
  if (regions[code]) return [code, { en: regions[code][0], ar: regions[code][1] }, flagOf(code)];
  const found = Object.entries(regions).find(([, names]) => names.some((name) => name.toLowerCase() === raw.toLowerCase()));
  return found ? [found[0], { en: found[1][0], ar: found[1][1] }, flagOf(found[0])] : ['—', { en: raw, ar: raw }, '🌐'];
};

function findValue(value, keys, depth = 0) {
  if (!value || depth > 8 || typeof value !== 'object') return null;
  for (const key of keys) if (value[key] !== null && value[key] !== undefined && value[key] !== '') return value[key];
  for (const child of Object.values(value)) {
    if (typeof child !== 'object' || child === null) continue;
    const result = findValue(child, keys, depth + 1);
    if (result !== null) return result;
  }
  return null;
}

function parseProfileJson(html) {
  const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)].map((match) => match[1].trim());
  for (const script of scripts) {
    if (!script.startsWith('{') || (!script.includes('region') && !script.includes('country'))) continue;
    try {
      const json = JSON.parse(script);
      const user = findValue(json, ['region', 'regionCode', 'countryCode', 'country', 'country_code']);
      if (user) return { ...json, __region: user };
    } catch { /* TikTok includes non-JSON scripts; continue to the next one. */ }
  }
  return null;
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { Accept: 'application/json', ...(options.headers || {}) } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function rapidApiUrl(endpoint, username) {
  // Add the https scheme automatically when the endpoint lacks it.
  const normalized = /^[a-z][a-z0-9+.-]*:\/\//i.test(endpoint) ? endpoint : `https://${endpoint}`;
  const url = new URL(normalized.replace('{username}', encodeURIComponent(username)));
  // RapidAPI TikTok Scraper APIs commonly accept username and count. Existing
  // endpoint parameters are preserved, while count=1 limits the lookup.
  if (url.pathname.includes('search')) {
    // Search endpoints (e.g. /user/search) look up users by the `keywords` parameter.
    if (!url.searchParams.has('keywords')) url.searchParams.set('keywords', username);
  } else {
    if (!url.searchParams.has('username') && !url.searchParams.has('unique_id')) {
      url.searchParams.set('username', username);
      url.searchParams.set('unique_id', username);
    }
  }
  if (!url.searchParams.has('count')) url.searchParams.set('count', '1');
  return url.toString();
}

async function fetchRapidApiProfile(username, endpoint, apiKey, host) {
  if (!endpoint) throw new Error('RapidAPI endpoint is not configured');
  if (!apiKey) throw new Error('RapidAPI key is not configured');
  if (!host) throw new Error('RapidAPI host is not configured');
  const headers = { 'X-RapidAPI-Key': apiKey, 'X-RapidAPI-Host': host };
  const data = await fetchJson(rapidApiUrl(endpoint, username), { headers });
  const region = findValue(data, ['region', 'regionCode', 'countryCode', 'country', 'region_code', 'country_code']);

  // Search endpoints return stale stats — enrich with /user/info?user_id= for accurate
  // follower/following counts, video count and privacy status.
  const userId = data?.data?.user_list?.[0]?.user?.id;
  const origin = new URL(endpoint).origin;
  if (userId && origin) {
    try {
      const detail = await fetchJson(`${origin}/user/info?user_id=${encodeURIComponent(userId)}`, { headers });
      const detailUser = detail?.data?.user;
      if (detail?.code === 0 && detailUser) {
        // Merge: keep the region from search (info has none), take fresh user + stats from info.
        const mergedUser = { ...detailUser, ...detail.data.stats, region: detailUser.region ?? region };
        // Private accounts: RapidAPI omits the bio — try TikWM as a public fallback.
        if (!mergedUser.signature) {
          try {
            const wm = await fetchJson(`https://www.tikwm.com/api/user/info?unique_id=${encodeURIComponent(username)}`);
            const wmUser = wm?.data?.user;
            if (wm?.code === 0 && wmUser?.signature) {
              mergedUser.signature = wmUser.signature;
              return { data: { ...detail, data: { ...detail.data, user: mergedUser } }, region: mergedUser.region, source: 'RapidAPI search + user/info + TikWM (bio)' };
            }
          } catch { /* Bio stays hidden; TikWM may be unreachable. */ }
        }
        return { data: { ...detail, data: { ...detail.data, user: mergedUser } }, region: mergedUser.region, source: 'RapidAPI search + user/info' };
      }
    } catch (err) { console.warn('user/info enrichment failed, using search data:', err.message); }
  }
  return { data, region, source: 'RapidAPI TikTok Scraper (search)' };
}

async function fetchTikTokProfile(username, endpoint, apiKey, host) {
  const clean = username.replace(/^@/, '');
  const configuredEndpoint = endpoint.trim() || defaultRapidApiEndpoint;
  const configuredKey = apiKey.trim() || defaultRapidApiKey;
  const configuredHost = host.trim() || defaultRapidApiHost;
  if (configuredEndpoint) {
    try {
      const result = await fetchRapidApiProfile(clean, configuredEndpoint, configuredKey, configuredHost);
      // tiktok-scraper7 /user/info returns no region field — fetch it from TikWM.
      if (!result.region) {
        try {
          const wm = await fetchJson(`https://www.tikwm.com/api/user/info?unique_id=${encodeURIComponent(clean)}`);
          result.region = findValue(wm, ['region', 'regionCode', 'countryCode', 'country', 'region_code', 'country_code']);
          if (result.region) result.source = 'RapidAPI + TikWM (region)';
        } catch { /* Region stays unknown; the UI handles it gracefully. */ }
      }
      return result;
    } catch (err) {
      // RapidAPI failed (bad config, quota, network) — fall back to public sources below.
      console.warn('RapidAPI lookup failed, falling back to public sources:', err.message);
    }
  }

  // TikTok's public profile page contains the same SSR hydration data used by its web client.
  try {
    const html = await (await fetch(`https://www.tiktok.com/@${encodeURIComponent(clean)}`, { headers: { Accept: 'text/html' } })).text();
    const parsed = parseProfileJson(html);
    if (parsed?.__region) return { data: parsed, region: parsed.__region, source: 'TikTok SSR' };
  } catch { /* Try the public fallback below. */ }

  const data = await fetchJson(`https://www.tikwm.com/api/user/info?unique_id=${encodeURIComponent(clean)}`);
  const region = findValue(data, ['region', 'regionCode', 'countryCode', 'country', 'region_code', 'country_code']);
  if (!region) throw new Error('لم يتم العثور على الدولة في مصادر TikTok العامة');
  return { data, region, source: 'TikWM fallback' };
}

function profileFrom(data, username, region, source) {
  // /user/search returns { data: { user_list: [{ user, stats }] } } — merge stats into the user object.
  const entry = data?.data?.user_list?.[0];
  const searchUser = entry ? { ...entry.user, ...entry.stats } : null;
  const user = searchUser || data?.data?.user || data?.user || data?.data?.userInfo?.user || data?.userInfo?.user || data;
  const value = (keys, fallback = '—') => findValue(user, keys) ?? fallback;
  return {
    name: value(['uniqueId', 'unique_id'], username), nick: value(['nickname', 'nickName'], username),
    avatar: value(['avatarLarger', 'avatarMedium', 'avatar'], `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(username)}`),
    id: value(['id', 'uid']), sec: value(['secUid', 'sec_uid']), sig: value(['signature', 'bioDescription'], '—'),
    followers: value(['followerCount', 'followers', 'fans']), following: value(['followingCount', 'following']),
    hearts: value(['heartCount', 'heart', 'likes']), videos: value(['videoCount', 'videos']),
    private: value(['privateAccount', 'private_account'], false), verified: value(['verified'], false),
    reg: normalizeRegion(region), source,
  };
}

function App() {
  const [lang, setLang] = useState(() => localStorage.getItem('tad-lang') || 'en');
  const [username, setUsername] = useState(''); const [profile, setProfile] = useState(null);
  const [endpoint, setEndpoint] = useState(defaultRapidApiEndpoint);
  const [key, setKey] = useState(defaultRapidApiKey); const [host, setHost] = useState(defaultRapidApiHost);
  const [loading, setLoading] = useState(false); const [error, setError] = useState('');
  const t = i18n[lang];
  useEffect(() => {
    document.documentElement.dir = t.dir;
    document.documentElement.lang = lang;
    localStorage.setItem('tad-lang', lang);
  }, [lang]);

  async function search(event) {
    event.preventDefault(); const name = username.trim().replace(/^@/, '') || 'creator'; setLoading(true); setError('');
    try { const result = await fetchTikTokProfile(name, endpoint, key, host); setProfile(profileFrom(result.data, name, result.region, result.source)); }
    catch (err) { setProfile(null); setError(`${t.errorPrefix} ${err.message}. ${t.errorSuffix}`); }
    finally { setLoading(false); }
  }
  return <main dir={t.dir}><header><div className="brand"><b>TAD</b></div><div className="header-actions"><div className="status"><i/> {loading ? t.statusLoading : profile ? t.statusReal : t.statusReady}</div><button className="lang" onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}>{t.langButton}</button></div></header>
    <section className="hero"><h1>{t.heroA} <em>TikTok</em> {t.heroB}</h1><br></br><form onSubmit={search}><span>@</span><input value={username} onChange={(e) => setUsername(e.target.value)} placeholder={t.placeholder}/><button disabled={loading}>{loading ? t.loading : t.submit}</button></form>{error && <p className="error">{error}</p>}</section>
    {profile && <section className="result"><div className="profile card"><img src={profile.avatar}/><div><h2>{profile.nick} {profile.verified === true && <small>✓ {t.verified}</small>}</h2><p className="handle">@{profile.name}</p><p>{profile.sig}</p></div><label>{t.realLabel}</label></div><div className="grid"><article className="card"><h3>{t.statsTitle}</h3><div className="stats"><div><strong>{profile.followers}</strong><span>{t.followers}</span></div><div><strong>{profile.following}</strong><span>{t.following}</span></div><div><strong>{profile.hearts}</strong><span>{t.hearts}</span></div><div><strong>{profile.videos}</strong><span>{t.videos}</span></div></div></article><article className="card"><h3>{t.countryTitle}</h3><dl><dt>{t.country}</dt><dd className="country">{profile.reg[2]} {profile.reg[1][lang]} <b>{profile.reg[0]}</b></dd><dt>{t.privacy}</dt><dd>{profile.private === true ? `🔒 ${t.privateAcc}` : `🌐 ${t.publicAcc}`}</dd></dl></article></div></section>}
    <footer><p>{t.footer}</p><div className="social"><a href="https://github.com/Fahad-BA/TAD" target="_blank" rel="noopener noreferrer" aria-label="GitHub"><GitHubIcon/></a><a href="mailto:TAD@fhidan.com" aria-label="Email"><EmailIcon/></a></div></footer>
  </main>;
}
createRoot(document.getElementById('root')).render(<App/>);
