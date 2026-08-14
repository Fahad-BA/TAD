import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

const regionNames = {
  SA: ['السعودية', '🇸🇦'], AE: ['الإمارات', '🇦🇪'], KW: ['الكويت', '🇰🇼'], QA: ['قطر', '🇶🇦'],
  BH: ['البحرين', '🇧🇭'], OM: ['عُمان', '🇴🇲'], US: ['الولايات المتحدة', '🇺🇸'], GB: ['المملكة المتحدة', '🇬🇧'],
  CA: ['كندا', '🇨🇦'], AU: ['أستراليا', '🇦🇺'], DE: ['ألمانيا', '🇩🇪'], FR: ['فرنسا', '🇫🇷'],
  TR: ['تركيا', '🇹🇷'], EG: ['مصر', '🇪🇬'], IN: ['الهند', '🇮🇳'], PK: ['باكستان', '🇵🇰'],
};

const normalizeRegion = (value) => {
  if (!value) return null;
  const raw = String(value).trim();
  const code = raw.toUpperCase().replace(/[^A-Z]/g, '');
  if (regionNames[code]) return [code, ...regionNames[code]];
  const found = Object.entries(regionNames).find(([, [name]]) => name === raw || name.toLowerCase() === raw.toLowerCase());
  return found ? [found[0], ...found[1]] : ['—', raw, '🌐'];
};

function findValue(value, keys, depth = 0) {
  if (!value || depth > 8 || typeof value !== 'object') return null;
  for (const key of keys) if (typeof value[key] === 'string' && value[key].trim()) return value[key];
  for (const child of Object.values(value)) {
    const result = findValue(child, keys, depth + 1);
    if (result) return result;
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

async function fetchTikTokProfile(username, endpoint, apiKey) {
  const clean = username.replace(/^@/, '');
  if (endpoint.trim()) {
    const url = endpoint.trim().replace('{username}', encodeURIComponent(clean));
    const data = await fetchJson(url, apiKey ? { headers: { Authorization: `Bearer ${apiKey}`, 'X-API-Key': apiKey } } : {});
    const region = findValue(data, ['region', 'regionCode', 'countryCode', 'country', 'country_code']);
    return { data, region, source: 'Custom API' };
  }

  // TikTok's public profile page contains the same SSR hydration data used by its web client.
  try {
    const html = await (await fetch(`https://www.tiktok.com/@${encodeURIComponent(clean)}`, { headers: { Accept: 'text/html' } })).text();
    const parsed = parseProfileJson(html);
    if (parsed?.__region) return { data: parsed, region: parsed.__region, source: 'TikTok SSR' };
  } catch { /* Try the public fallback below. */ }

  // TikWM is a public, no-key fallback. Its user object exposes region/region_code when TikTok does.
  const data = await fetchJson(`https://www.tikwm.com/api/user/info?unique_id=${encodeURIComponent(clean)}`);
  const region = findValue(data, ['region', 'regionCode', 'countryCode', 'country', 'region_code', 'country_code']);
  if (!region) throw new Error('لم يتم العثور على الدولة في مصادر TikTok العامة');
  return { data, region, source: 'TikWM fallback' };
}

function profileFrom(data, username, region, source) {
  const user = data?.data?.user || data?.user || data?.data?.userInfo?.user || data?.userInfo?.user || data;
  const value = (keys, fallback = '—') => findValue(user, keys) || fallback;
  const followers = value(['followerCount', 'followers', 'fans'], '—');
  const following = value(['followingCount', 'following'], '—');
  const hearts = value(['heartCount', 'heart', 'likes'], '—');
  return {
    name: value(['uniqueId', 'unique_id'], username), nick: value(['nickname', 'nickName'], username),
    avatar: value(['avatarLarger', 'avatarMedium', 'avatar'], `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(username)}`),
    id: value(['id', 'uid']), sec: value(['secUid', 'sec_uid']), sig: value(['signature', 'bioDescription'], '—'),
    followers, following, hearts, videos: value(['videoCount', 'videos']), private: value(['privateAccount', 'private_account'], false),
    verified: value(['verified'], false), reg: normalizeRegion(region), source,
  };
}

function App() {
  const [username, setUsername] = useState(''); const [profile, setProfile] = useState(null);
  const [advanced, setAdvanced] = useState(false); const [endpoint, setEndpoint] = useState(''); const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false); const [error, setError] = useState('');
  async function search(event) {
    event.preventDefault(); const name = username.trim().replace(/^@/, '') || 'creator'; setLoading(true); setError('');
    try { const result = await fetchTikTokProfile(name, endpoint, key); setProfile(profileFrom(result.data, name, result.region, result.source)); }
    catch (err) { setProfile(null); setError(`تعذر جلب البيانات الحقيقية: ${err.message}. تحقق من اسم المستخدم أو إعدادات المصدر.`); }
    finally { setLoading(false); }
  }
  return <main dir="rtl"><header><div className="brand"><b>TAD</b><span>TikTok Account Details</span></div><div className="status"><i/> {loading ? 'جارٍ الجلب...' : profile ? `بيانات حقيقية · ${profile.source}` : 'جاهز'}</div></header>
    <section className="hero"><p className="eyebrow">لوحة تحكم ذكية للحسابات</p><h1>اعرف تفاصيل حساب<br/><em>TikTok</em> في ثوانٍ.</h1><p className="lead">أدخل اسم المستخدم لاستخراج الدولة/المنطقة الفعلية من بيانات الملف العامة.</p><form onSubmit={search}><span>@</span><input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="أدخل اسم المستخدم..."/><button disabled={loading}>{loading ? 'جارٍ...' : 'عرض المعلومات'}</button></form>{error && <p className="error">{error}</p>}</section>
    {profile && <section className="result"><div className="profile card"><img src={profile.avatar}/><div><h2>{profile.nick} {profile.verified === true && <small>✓ موثّق</small>}</h2><p className="handle">@{profile.name}</p><p>{profile.sig}</p></div><label>بيانات حقيقية</label></div><div className="grid"><article className="card"><h3>معرّفات المستخدم</h3><dl><dt>Unique ID</dt><dd>{profile.id}</dd><dt>secUid</dt><dd className="mono">{profile.sec}</dd><dt>حالة التحقق</dt><dd>{profile.verified === true ? 'حساب موثّق' : 'غير موثّق'}</dd></dl></article><article className="card"><h3>إحصائيات الحساب</h3><div className="stats"><div><strong>{profile.followers}</strong><span>المتابعون</span></div><div><strong>{profile.following}</strong><span>يتابع</span></div><div><strong>{profile.hearts}</strong><span>الإعجابات</span></div><div><strong>{profile.videos}</strong><span>الفيديوهات</span></div></div></article><article className="card"><h3>الدولة والإعدادات</h3><dl><dt>الدولة/المنطقة الفعلية</dt><dd className="country">{profile.reg[2]} {profile.reg[1]} <b>{profile.reg[0]}</b></dd><dt>المصدر</dt><dd>{profile.source}</dd><dt>الخصوصية</dt><dd>{profile.private === true ? '🔒 حساب خاص' : '🌐 حساب عام'}</dd></dl></article></div></section>}
    <section className="advanced card"><button className="expand" onClick={() => setAdvanced(!advanced)}>⚙ الإعدادات المتقدمة <span>{advanced ? '−' : '+'}</span></button>{advanced && <div className="fields"><label>Custom API Endpoint<input value={endpoint} onChange={(e) => setEndpoint(e.target.value)} placeholder="https://api.example.com/user/{username}"/></label><label>API Key<input type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="أدخل المفتاح اختيارياً"/></label><p>اترك الحقول فارغة لاستخدام TikTok SSR ثم TikWM تلقائياً. يدعم endpoint استبدال {`{username}`}، ويرسل المفتاح كـ Bearer و X-API-Key.</p></div>}</section><footer>TAD · تُعرض الدولة فقط عندما تعيدها البيانات العامة؛ لا يتم تخمينها أو توليدها محلياً</footer></main>;
}
createRoot(document.getElementById('root')).render(<App/>);
