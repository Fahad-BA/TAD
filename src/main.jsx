import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

const regionNames = {
  SA: ['السعودية', '🇸🇦'], AE: ['الإمارات', '🇦🇪'], KW: ['الكويت', '🇰🇼'], QA: ['قطر', '🇶🇦'],
  BH: ['البحرين', '🇧🇭'], OM: ['عُمان', '🇴🇲'], US: ['الولايات المتحدة', '🇺🇸'], GB: ['المملكة المتحدة', '🇬🇧'],
  CA: ['كندا', '🇨🇦'], AU: ['أستراليا', '🇦🇺'], DE: ['ألمانيا', '🇩🇪'], FR: ['فرنسا', '🇫🇷'],
  TR: ['تركيا', '🇹🇷'], EG: ['مصر', '🇪🇬'], IN: ['الهند', '🇮🇳'], PK: ['باكستان', '🇵🇰'],
};

const env = import.meta.env;
const envValue = (name) => env[`VITE_${name}`] || env[name] || '';
const defaultRapidApiKey = envValue('RAPIDAPI_KEY');
const defaultRapidApiHost = envValue('RAPIDAPI_HOST');
const defaultRapidApiEndpoint = envValue('RAPIDAPI_ENDPOINT');

const normalizeRegion = (value) => {
  if (!value) return ['—', 'غير محددة من المصدر', '🌐'];
  const raw = String(value).trim();
  const code = raw.toUpperCase().replace(/[^A-Z]/g, '');
  if (regionNames[code]) return [code, ...regionNames[code]];
  const found = Object.entries(regionNames).find(([, [name]]) => name === raw || name.toLowerCase() === raw.toLowerCase());
  return found ? [found[0], ...found[1]] : ['—', raw, '🌐'];
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
  const [username, setUsername] = useState(''); const [profile, setProfile] = useState(null);
  const [endpoint, setEndpoint] = useState(defaultRapidApiEndpoint);
  const [key, setKey] = useState(defaultRapidApiKey); const [host, setHost] = useState(defaultRapidApiHost);
  const [loading, setLoading] = useState(false); const [error, setError] = useState('');
  async function search(event) {
    event.preventDefault(); const name = username.trim().replace(/^@/, '') || 'creator'; setLoading(true); setError('');
    try { const result = await fetchTikTokProfile(name, endpoint, key, host); setProfile(profileFrom(result.data, name, result.region, result.source)); }
    catch (err) { setProfile(null); setError(`تعذر جلب البيانات الحقيقية: ${err.message}. تحقق من اسم المستخدم أو إعدادات المصدر.`); }
    finally { setLoading(false); }
  }
  return <main dir="rtl"><header><div className="brand"><b>TAD</b></div><div className="status"><i/> {loading ? 'جارٍ الجلب...' : profile ? `بيانات حقيقية` : 'جاهز'}</div></header>
    <section className="hero"><h1>اعرف تفاصيل حساب<br/><em>TikTok</em> في ثوانٍ.</h1><br></br><form onSubmit={search}><span>@</span><input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="أدخل اسم المستخدم..."/><button disabled={loading}>{loading ? 'جارٍ...' : 'عرض المعلومات'}</button></form>{error && <p className="error">{error}</p>}</section>
    {profile && <section className="result"><div className="profile card"><img src={profile.avatar}/><div><h2>{profile.nick} {profile.verified === true && <small>✓ موثّق</small>}</h2><p className="handle">@{profile.name}</p><p>{profile.sig}</p></div><label>بيانات حقيقية</label></div><div className="grid"><article className="card"><h3>إحصائيات الحساب</h3><div className="stats"><div><strong>{profile.followers}</strong><span>المتابعون</span></div><div><strong>{profile.following}</strong><span>يتابع</span></div><div><strong>{profile.hearts}</strong><span>الإعجابات</span></div><div><strong>{profile.videos}</strong><span>الفيديوهات</span></div></div></article><article className="card"><h3>الدولة والإعدادات</h3><dl><dt>الدولة/المنطقة الفعلية</dt><dd className="country">{profile.reg[2]} {profile.reg[1]} <b>{profile.reg[0]}</b></dd><dt>الخصوصية</dt><dd>{profile.private === true ? '🔒 حساب خاص' : '🌐 حساب عام'}</dd></dl></article></div></section>}
  </main>;
}
createRoot(document.getElementById('root')).render(<App/>);
