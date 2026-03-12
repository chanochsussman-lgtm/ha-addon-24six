const express = require('express');
const axios = require('axios');
const { wrapper } = require('axios-cookiejar-support');
const { CookieJar } = require('tough-cookie');
const fs = require('fs');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const PORT = 8484;
const BASE_URL = 'https://24six.app';
const AUTH_FILE = '/data/auth.json';
const RECENT_FILE = '/data/recent_plays.json';
const MAX_RECENT = 30;

function loadRecent() {
  try { return JSON.parse(fs.readFileSync(RECENT_FILE, 'utf8')); } catch { return []; }
}
function saveRecent(items) {
  try { fs.writeFileSync(RECENT_FILE, JSON.stringify(items)); } catch {}
}
const CREDENTIALS = {
  email: 'mark@eingroup.net',
  password: 'Cacm3618!',
  profile_id: 89214
};

app.use(express.json());

// ── Cookie Jar Setup ──────────────────────────────────────────────────────────
let jar = new CookieJar();
let client = wrapper(axios.create({ jar, withCredentials: true }));

function saveAuth() {
  try {
    const serialized = jar.toJSON();
    fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
    fs.writeFileSync(AUTH_FILE, JSON.stringify(serialized));
    console.log('[auth] Cookies saved');
  } catch (e) {
    console.error('[auth] Failed to save cookies:', e.message);
  }
}

function loadAuth() {
  try {
    if (fs.existsSync(AUTH_FILE)) {
      const data = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8'));
      jar = CookieJar.fromJSON(data);
      client = wrapper(axios.create({ jar, withCredentials: true }));
      console.log('[auth] Cookies loaded from disk');
      return true;
    }
  } catch (e) {
    console.error('[auth] Failed to load cookies:', e.message);
  }
  return false;
}

// ── Auth Flow ─────────────────────────────────────────────────────────────────
async function doLogin() {
  console.log('[auth] Starting login flow...');
  try {
    // Step 0: GET homepage to get CSRF token
    console.log('[auth] Step 0: fetching homepage for CSRF...');
    const homeRes = await client.get(`${BASE_URL}/`, {
      headers: { 'Accept': 'text/html' },
      validateStatus: () => true
    });
    console.log('[auth] Step 0 status:', homeRes.status);

    // Extract CSRF token from cookies
    const cookies = await jar.getCookies(BASE_URL);
    console.log('[auth] All cookies:', cookies.map(c => c.key).join(', '));
    const xsrfCookie = cookies.find(c => c.key === 'XSRF-TOKEN');
    const csrfToken = xsrfCookie ? decodeURIComponent(xsrfCookie.value) : null;
    console.log('[auth] CSRF token:', csrfToken ? `found (${csrfToken.substring(0,20)}...)` : 'NOT FOUND');

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'Referer': `${BASE_URL}/`,
      'Origin': BASE_URL
    };
    if (csrfToken) headers['X-XSRF-TOKEN'] = csrfToken;

    // Step 1: check-existing-user
    console.log('[auth] Step 1: check-existing-user...');
    const step1 = await client.post(`${BASE_URL}/check-existing-user`, {
      email: CREDENTIALS.email,
      password: CREDENTIALS.password
    }, { headers, validateStatus: () => true });
    console.log('[auth] Step 1 status:', step1.status, JSON.stringify(step1.data));
    if (step1.status >= 400) throw new Error(`Step 1 failed: ${step1.status} ${JSON.stringify(step1.data)}`);

    // Refresh CSRF after step 1
    const cookies2 = await jar.getCookies(BASE_URL);
    console.log('[auth] Cookies after step 1:', cookies2.map(c => c.key).join(', '));
    const xsrf2 = cookies2.find(c => c.key === 'XSRF-TOKEN');
    if (xsrf2) {
      headers['X-XSRF-TOKEN'] = decodeURIComponent(xsrf2.value);
      console.log('[auth] CSRF refreshed after step 1');
    }

    // Step 2: pin-check
    console.log('[auth] Step 2: profiles/pin-check with profile_id:', CREDENTIALS.profile_id);
    const step2 = await client.post(`${BASE_URL}/profiles/pin-check`, {
      profile_id: CREDENTIALS.profile_id,
      pin: null
    }, { headers, validateStatus: () => true });
    console.log('[auth] Step 2 status:', step2.status, JSON.stringify(step2.data));
    if (step2.status >= 400) throw new Error(`Step 2 failed: ${step2.status} ${JSON.stringify(step2.data)}`);

    // Refresh CSRF after step 2
    const cookies3 = await jar.getCookies(BASE_URL);
    console.log('[auth] Cookies after step 2:', cookies3.map(c => c.key).join(', '));
    const xsrf3 = cookies3.find(c => c.key === 'XSRF-TOKEN');
    if (xsrf3) {
      headers['X-XSRF-TOKEN'] = decodeURIComponent(xsrf3.value);
      console.log('[auth] CSRF refreshed after step 2');
    }

    // Step 3: login
    console.log('[auth] Step 3: profiles/login...');
    const step3 = await client.post(`${BASE_URL}/profiles/login`, {
      profile: CREDENTIALS.profile_id
    }, { headers, validateStatus: () => true });
    console.log('[auth] Step 3 status:', step3.status, JSON.stringify(step3.data));
    if (step3.status >= 400) throw new Error(`Step 3 failed: ${step3.status} ${JSON.stringify(step3.data)}`);

    // Final cookies
    const finalCookies = await jar.getCookies(BASE_URL);
    console.log('[auth] Final cookies:', finalCookies.map(c => c.key).join(', '));

    saveAuth();
    console.log('[auth] Login complete!');
    return true;
  } catch (e) {
    console.error('[auth] Login failed:', e.response?.status, e.message);
    if (e.response?.data) console.error('[auth] Response body:', JSON.stringify(e.response.data));
    return false;
  }
}

async function ensureAuth() {
  console.log('[auth] ensureAuth called');
  const loaded = loadAuth();
  if (!loaded) {
    console.log('[auth] No saved auth, doing fresh login');
    return await doLogin();
  }
  // Validate session
  try {
    console.log('[auth] Validating saved session...');
    const res = await client.get(`${BASE_URL}/app/profile`, {
      headers: { 'Accept': 'application/json' },
      validateStatus: () => true
    });
    console.log('[auth] Session check status:', res.status);
    if (res.status >= 400) throw new Error(`Session invalid: ${res.status}`);
    console.log('[auth] Session valid');
    return true;
  } catch (e) {
    console.log('[auth] Session invalid, re-logging in...', e.message);
    return await doLogin();
  }
}

// ── Generic Proxy Helper ──────────────────────────────────────────────────────
async function proxy(req, res, urlPath, options = {}) {
  try {
    const url = `${BASE_URL}${urlPath}`;
    const method = options.method || 'GET';
    console.log(`[proxy] ${method} ${url}`, options.params || req.query);
    const response = await client({
      method,
      url,
      params: options.params || (method === 'GET' ? req.query : undefined),
      data: options.data,
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      validateStatus: () => true
    });
    console.log(`[proxy] ${method} ${urlPath} → ${response.status}`);
    // Shape log for debugging
    if (process.env.DEBUG_SHAPE || ['/app/music/banner','/app/music/search/quick','/app/music/search'].some(p => urlPath.startsWith(p)) || urlPath.match(/\/app\/music\/artist\/\d+/)) {
      const d = response.data;
      const preview = typeof d === 'object' ? JSON.stringify(d).slice(0, 400) : String(d).slice(0, 200);
      console.log(`[shape] ${urlPath} keys=${Array.isArray(d)?'array['+d.length+']':Object.keys(d||{}).join(',')} preview=${preview}`);
    }

    if (response.status === 401 || response.status === 403) {
      console.log('[proxy] Auth expired, re-logging in...');
      await doLogin();
      const retry = await client({
        method,
        url,
        params: options.params || (method === 'GET' ? req.query : undefined),
        data: options.data,
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }
      });
      console.log(`[proxy] Retry → ${retry.status}`);
      return res.json(retry.data);
    }

    res.json(response.data);
  } catch (e) {
    console.error(`[proxy] Error ${urlPath}:`, e.message);
    res.status(500).json({ error: e.message });
  }
}

// ── Setup / Auth Routes ───────────────────────────────────────────────────────
app.get('/api/setup/status', (req, res) => {
  const hasAuth = fs.existsSync(AUTH_FILE);
  res.json({ authenticated: hasAuth });
});

app.post('/api/setup/login', async (req, res) => {
  const success = await doLogin();
  res.json({ success });
});

app.post('/api/setup/reset', (req, res) => {
  try {
    if (fs.existsSync(AUTH_FILE)) fs.unlinkSync(AUTH_FILE);
    jar = new CookieJar();
    client = wrapper(axios.create({ jar, withCredentials: true }));
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Debug - raw home data
app.get('/api/debug/home',             (req, res) => proxy(req, res, '/app/music'));
app.get('/api/debug/banners',          (req, res) => proxy(req, res, '/app/music/banner'));
app.get('/api/debug/artist/:id',       (req, res) => proxy(req, res, `/app/music/artist/${req.params.id}`));
app.get('/api/debug/collection/:id',   (req, res) => proxy(req, res, `/app/music/collection/${req.params.id}`));
app.get('/api/debug/content/:id',      (req, res) => proxy(req, res, `/app/content/${req.params.id}`));
app.get('/api/debug/playlist/:id',     (req, res) => proxy(req, res, `/app/music/playlist/${req.params.id}`));
app.get('/api/debug/recent',           (req, res) => proxy(req, res, '/app/music/content/recent'));

// Music API Routes ──────────────────────────────────────────────────────────
app.get('/api/home',            (req, res) => proxy(req, res, '/app/music'));
app.get('/api/banners', async (req, res) => {
  try {
    const url = `${BASE_URL}/app/music/banner`;
    const response = await client({ method:'GET', url, headers:{ 'Accept':'application/json','Content-Type':'application/json' }, validateStatus:()=>true });
    const d = response.data;
    const arr = Array.isArray(d) ? d : (Array.isArray(d?.data) ? d.data : [d]);
    console.log(`[banners] count=${arr.length} first_keys=${arr[0]?Object.keys(arr[0]).join(','):'n/a'} preview=${JSON.stringify(arr[0]).slice(0,300)}`);
    res.json(arr);
  } catch(e) { console.error('[banners] error:', e.message); res.json([]); }
});
app.get('/api/browse/recent', (req, res) => {
  // Serve locally tracked plays (so it updates immediately)
  const local = loadRecent();
  if (local.length > 0) return res.json(local);
  // Fallback to API if nothing local yet
  proxy(req, res, '/app/music/content/recent');
});

// Record a play (called by frontend when track starts)
app.post('/api/browse/record-play', (req, res) => {
  const { id, title, artist, img } = req.body;
  if (!id) return res.json({ ok: false });
  let items = loadRecent();
  // Remove if already exists (move to top)
  items = items.filter(i => i.id !== id);
  items.unshift({ id, title, subtitle: artist, img, type: 'song', playedAt: Date.now() });
  if (items.length > MAX_RECENT) items = items.slice(0, MAX_RECENT);
  saveRecent(items);
  res.json({ ok: true });
});
app.get('/api/categories',      (req, res) => proxy(req, res, '/app/music/category'));
app.get('/api/categories/:id',  (req, res) => proxy(req, res, `/app/music/category/${req.params.id}`));
app.get('/api/artists',         (req, res) => proxy(req, res, '/app/music/artist'));
app.get('/api/artists/:id', async (req, res) => {
  try {
    const url = `${BASE_URL}/app/music/artist/${req.params.id}`;
    const response = await client({ method:'GET', url, headers:{ 'Accept':'application/json','Content-Type':'application/json' }, validateStatus:()=>true });
    console.log(`[artist/${req.params.id}] status=${response.status}`);
    const d = response.data;
    console.log(`[artist/${req.params.id}] keys=${Object.keys(d||{}).join(',')} preview=${JSON.stringify(d).slice(0,400)}`);
    if (response.status === 401 || response.status === 403) { await doLogin(); return res.redirect(req.originalUrl); }
    // Normalize: always return { artist, top_songs, collections }
    let artist = d.artist || d.data?.artist || (d.id ? d : null) || {};
    let top_songs = d.top_songs || d.data?.top_songs || d.songs || d.data?.songs || d.content || d.data?.content || [];
    let collections = d.collections || d.data?.collections || d.albums || d.data?.albums || [];
    res.json({ artist, top_songs, collections, _raw_keys: Object.keys(d) });
  } catch(e) { console.error('[artist] error:', e.message); res.status(500).json({ error: e.message }); }
});
app.get('/api/playlists',       (req, res) => proxy(req, res, '/app/music/playlist'));
app.get('/api/playlists/:id',   (req, res) => proxy(req, res, `/app/music/playlist/${req.params.id}`));
app.get('/api/stories',         (req, res) => proxy(req, res, '/app/story'));

// Collections
app.get('/api/collections',           (req, res) => proxy(req, res, '/app/music/collection'));
app.get('/api/collections/:id',       (req, res) => proxy(req, res, `/app/music/collection/${req.params.id}`));
app.get('/api/collections/:id/songs', (req, res) => proxy(req, res, `/app/content/${req.params.id}`));

// Songs
app.get('/api/songs/:id', (req, res) => proxy(req, res, `/app/content/${req.params.id}`));

// Search - quick autocomplete (typeahead)
app.get('/api/search/quick', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.json([]);
  try {
    const url = `${BASE_URL}/app/music/search/quick`;
    const response = await client({ method:'GET', url, params:{ q }, headers:{ 'Accept':'application/json','Content-Type':'application/json' }, validateStatus:()=>true });
    const d = response.data;
    console.log(`[search/quick] q="${q}" status=${response.status} keys=${Array.isArray(d)?'array['+d.length+']':Object.keys(d||{}).join(',')} preview=${JSON.stringify(d).slice(0,300)}`);
    // Normalize to flat array
    let items = [];
    if (Array.isArray(d)) items = d;
    else if (Array.isArray(d?.data)) items = d.data;
    else if (Array.isArray(d?.results)) items = d.results;
    else {
      // merge sections
      ['songs','content','tracks','artists','albums','collections','playlists'].forEach(k => {
        if (Array.isArray(d?.[k])) items.push(...d[k].slice(0,3).map(x => ({...x, _type:k})));
      });
    }
    res.json(items);
  } catch(e) { console.error('[search/quick] error:', e.message); res.json([]); }
});

// Search - full results (songs, artists, albums, playlists by category)
app.get('/api/search', (req, res) => {
  const { q } = req.query;
  if (!q) return res.json({});
  proxy(req, res, `/app/music/search`, { params: { q } });
});

// ── Favorites / Library ───────────────────────────────────────────────────────
app.get('/api/library/favorites', async (req, res) => {
  try {
    const url = `${BASE_URL}/app/music/favorite`;
    const response = await client({ method:'GET', url, headers:{ 'Accept':'application/json','Content-Type':'application/json' }, validateStatus:()=>true });
    const d = response.data;
    console.log(`[favorites] status=${response.status} keys=${Object.keys(d||{}).join(',')} preview=${JSON.stringify(d).slice(0,300)}`);
    if (response.status === 401 || response.status === 403) { await doLogin(); return res.redirect(req.originalUrl); }
    // Normalize to { playlist: {title, img}, songs: [...] }
    // API may return: array of songs, { content:[...] }, { data:{songs:[...]} }, etc.
    let songs = [];
    if (Array.isArray(d)) songs = d;
    else if (Array.isArray(d.content)) songs = d.content;
    else if (Array.isArray(d.data)) songs = d.data;
    else if (Array.isArray(d.songs)) songs = d.songs;
    else if (Array.isArray(d.favorites)) songs = d.favorites;
    else if (d.data && Array.isArray(d.data.content)) songs = d.data.content;
    const playlist = { title: 'My Favorites', img: songs[0]?.img || null, id: 'favorites' };
    res.json({ playlist, songs, _raw_keys: Object.keys(d) });
  } catch(e) { console.error('[favorites] error:', e.message); res.status(500).json({ error: e.message }); }
});

app.post('/api/library/favorites/:id', async (req, res) => {
  try {
    const r = await client.post(`${BASE_URL}/app/music/content/${req.params.id}/favorite`, {}, {
      headers: { 'X-XSRF-TOKEN': csrfToken, 'X-Requested-With': 'XMLHttpRequest' }
    });
    res.json(r.data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/library/favorites/:id', async (req, res) => {
  try {
    const r = await client.delete(`${BASE_URL}/app/music/content/${req.params.id}/favorite`, {
      headers: { 'X-XSRF-TOKEN': csrfToken, 'X-Requested-With': 'XMLHttpRequest' }
    });
    res.json(r.data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Audio Streaming ───────────────────────────────────────────────────────────
// Get the CDN URL and redirect the client directly - Mux URLs must be hit by the client
app.get('/api/audio/:id', async (req, res) => {
  try {
    const playUrl = `${BASE_URL}/app/content/${req.params.id}/play`;
    const redirect = await client.get(playUrl, {
      maxRedirects: 0,
      validateStatus: s => s === 302 || s === 200
    });

    const cdnUrl = redirect.headers?.location;
    if (!cdnUrl) {
      console.error('[audio] no redirect for id:', req.params.id, 'status:', redirect.status);
      return res.status(404).json({ error: 'No audio URL' });
    }

    console.log('[audio] redirecting client to:', cdnUrl.slice(0, 80));
    // Send the URL to the client - let the browser fetch it directly
    res.json({ url: cdnUrl });
  } catch (e) {
    console.error('[audio] Error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── Audio Stream Proxy (stable URL for WiiM/DLNA casting) ────────────────────
// This endpoint fetches a fresh Mux URL and pipes audio — WiiM hits this directly
app.get('/api/stream/:id', async (req, res) => {
  try {
    const playUrl = `${BASE_URL}/app/content/${req.params.id}/play`;
    const redirect = await client.get(playUrl, {
      maxRedirects: 0,
      validateStatus: s => s === 302 || s === 200
    });
    const cdnUrl = redirect.headers?.location;
    if (!cdnUrl) return res.status(404).json({ error: 'No stream URL' });

    const rangeHeader = req.headers.range;
    const upstream = await axios.get(cdnUrl, {
      responseType: 'stream',
      headers: {
        'Accept': '*/*',
        'User-Agent': 'Mozilla/5.0',
        ...(rangeHeader ? { 'Range': rangeHeader } : {})
      },
      validateStatus: () => true
    });

    res.status(upstream.status);
    // Force audio content-type so WiiM/DLNA accepts it
    res.setHeader('Content-Type', upstream.headers['content-type'] || 'audio/mp4');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'no-cache');
    if (upstream.headers['content-length'])  res.setHeader('Content-Length',  upstream.headers['content-length']);
    if (upstream.headers['content-range'])   res.setHeader('Content-Range',   upstream.headers['content-range']);

    req.on('close', () => upstream.data.destroy())
    upstream.data.pipe(res);
  } catch (e) {
    console.error('[stream] error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// CDN image proxy
app.get('/api/img', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url || !url.startsWith('https://24six.app/cdn/')) {
      return res.status(400).json({ error: 'Invalid URL' });
    }
    const imgRes = await axios.get(url, { responseType: 'stream' });
    res.setHeader('content-type', imgRes.headers['content-type'] || 'image/jpeg');
    res.setHeader('cache-control', 'public, max-age=86400');
    imgRes.data.pipe(res);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


// ── HA Media Players ──────────────────────────────────────────────────────────
const HA_URL    = 'http://supervisor/core';
const HA_TOKEN  = process.env.SUPERVISOR_TOKEN;
const haHeaders = () => ({ 'Authorization': `Bearer ${HA_TOKEN}`, 'Content-Type': 'application/json' });

// Detect addon's own LAN IP so WiiM can reach back to us
async function getAddonStreamBase() {
  try {
    // HA supervisor tells us the addon hostname
    const r = await axios.get('http://supervisor/addons/self/info', {
      headers: { 'Authorization': `Bearer ${HA_TOKEN}` }
    });
    // Use HA host IP - addon is reachable at port 8484 on the HA host
    const haInfo = await axios.get('http://supervisor/host/info', {
      headers: { 'Authorization': `Bearer ${HA_TOKEN}` }
    });
    const ip = haInfo.data?.data?.hostname || 'homeassistant.local';
    return `http://${ip}:${PORT}`;
  } catch {
    return `http://homeassistant.local:${PORT}`;
  }
}

// List all media_player entities
app.get('/api/ha/speakers', async (req, res) => {
  try {
    const r = await axios.get(`${HA_URL}/api/states`, { headers: haHeaders() });
    const players = r.data
      .filter(e => e.entity_id.startsWith('media_player.'))
      .map(e => ({
        entity_id: e.entity_id,
        name: e.attributes.friendly_name || e.entity_id,
        state: e.state,
        volume: e.attributes.volume_level ?? null,
        platform: e.attributes.platform || null,
      }));
    res.json(players);
  } catch (e) {
    console.error('[ha] speakers error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Cast a track to a HA media player using stable stream URL
app.post('/api/ha/play', async (req, res) => {
  try {
    const { entity_id, track_id, track_title } = req.body;
    if (!entity_id || !track_id) return res.status(400).json({ error: 'entity_id and track_id required' });

    // Build stable stream URL reachable by the media player on LAN
    const base = await getAddonStreamBase();
    const streamUrl = `${base}/api/stream/${track_id}`;
    console.log('[ha] casting to', entity_id, 'url:', streamUrl);

    // Wake device first if off (WiiM needs this)
    const stateRes = await axios.get(`${HA_URL}/api/states/${entity_id}`, { headers: haHeaders() }).catch(() => null);
    const state = stateRes?.data?.state;
    if (state === 'off') {
      await axios.post(`${HA_URL}/api/services/media_player/turn_on`, { entity_id }, { headers: haHeaders() }).catch(() => {});
      await new Promise(r => setTimeout(r, 1500)); // wait for device to wake
    }

    // Play via HA service
    await axios.post(`${HA_URL}/api/services/media_player/play_media`, {
      entity_id,
      media_content_id: streamUrl,
      media_content_type: 'music',
      extra: {
        title: track_title || 'Now Playing',
        metadata: { mediaType: 3 } // MUSIC type for Chromecast/WiiM
      }
    }, { headers: haHeaders() });

    res.json({ ok: true, stream_url: streamUrl });
  } catch (e) {
    console.error('[ha] play error:', e.message, e.response?.data);
    res.status(500).json({ error: e.message });
  }
});

// Set volume
app.post('/api/ha/volume', async (req, res) => {
  try {
    const { entity_id, volume } = req.body;
    await axios.post(`${HA_URL}/api/services/media_player/volume_set`, {
      entity_id, volume_level: volume
    }, { headers: haHeaders() });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Serve React Frontend ──────────────────────────────────────────────────────
const DIST = path.join(__dirname, 'frontend', 'dist');
app.use(express.static(DIST));
app.get('*', (req, res) => {
  res.sendFile(path.join(DIST, 'index.html'));
});

// ── Start ─────────────────────────────────────────────────────────────────────
const server = http.createServer(app);

// ── HA WebSocket bridge ───────────────────────────────────────────────────────
// Connects to HA WS API, subscribes to state_changed events for media_player entities,
// and fans them out to all connected frontend clients instantly (no polling).
const wss = new WebSocket.Server({ server, path: '/ws/player' });

let haWs = null;
let haWsReady = false;
let haWsQueue = [];
let haMsgId = 1;
const haCallbacks = {};          // msgId → resolve fn for request/response
const subscribedEntities = new Set();

function haWsSend(obj) {
  if (haWsReady && haWs && haWs.readyState === WebSocket.OPEN) {
    haWs.send(JSON.stringify(obj));
  } else {
    haWsQueue.push(obj);
  }
}

function connectHAWebSocket() {
  const wsUrl = (HA_URL || 'http://supervisor/core').replace(/^http/, 'ws') + '/api/websocket';
  console.log('[ha-ws] Connecting to', wsUrl);
  haWs = new WebSocket(wsUrl);

  haWs.on('open', () => console.log('[ha-ws] Connected'));

  haWs.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    if (msg.type === 'auth_required') {
      haWs.send(JSON.stringify({ type: 'auth', access_token: HA_TOKEN }));
      return;
    }
    if (msg.type === 'auth_ok') {
      console.log('[ha-ws] Authenticated');
      haWsReady = true;
      // Flush queued messages
      haWsQueue.forEach(m => haWs.send(JSON.stringify(m)));
      haWsQueue = [];
      // Subscribe to ALL state_changed events for media_player domain
      const id = haMsgId++;
      haWs.send(JSON.stringify({
        id,
        type: 'subscribe_events',
        event_type: 'state_changed',
      }));
      return;
    }
    if (msg.type === 'auth_invalid') {
      console.error('[ha-ws] Auth failed');
      return;
    }

    // Resolve pending request/response callbacks
    if (msg.id && haCallbacks[msg.id]) {
      haCallbacks[msg.id](msg);
      delete haCallbacks[msg.id];
      return;
    }

    // Fan out state_changed events for media_player entities to frontend clients
    if (msg.type === 'event' && msg.event?.event_type === 'state_changed') {
      const ed = msg.event.data;
      const entity_id = ed?.entity_id || '';
      if (!entity_id.startsWith('media_player.')) return;

      const ns = ed.new_state;
      if (!ns) return;

      const attrs = ns.attributes || {};
      const payload = JSON.stringify({
        type: 'speaker_state',
        entity_id,
        state:    ns.state,
        volume:   attrs.volume_level,
        position: attrs.media_position,
        duration: attrs.media_duration,
        title:    attrs.media_title,
        artist:   attrs.media_artist,
      });

      // Broadcast to all connected frontend clients
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(payload);
        }
      });
    }
  });

  haWs.on('close', () => {
    console.log('[ha-ws] Disconnected — reconnecting in 3s');
    haWsReady = false;
    setTimeout(connectHAWebSocket, 3000);
  });

  haWs.on('error', (e) => {
    console.error('[ha-ws] Error:', e.message);
  });
}

// Start the HA WS connection after server boots
connectHAWebSocket();

wss.on('connection', (ws) => {
  console.log('[ws] Frontend client connected');
  ws.on('close', () => console.log('[ws] Frontend client disconnected'));
  ws.on('error', () => {});
});



// ── Cast metadata (push title/artist/artwork to HA speaker) ──────────────────
app.post('/api/ha/cast-metadata', async (req, res) => {
  const { entity_id, title, artist, album, img } = req.body
  if (!entity_id) return res.status(400).json({ error: 'entity_id required' })
  try {
    // Use media_player.play_media with announce=false just to push metadata
    // Most integrations (WiiM/LinkPlay, Sonos, Cast) surface this in their native app
    await axios.post(`${HA_URL}/api/services/media_player/play_media`, {
      entity_id,
      media_content_id: img || '',
      media_content_type: 'image/jpeg',
      extra: { title, artist, album, thumb: img }
    }, { headers: haHeaders() }).catch(() => {})
    // Also update media_player attributes via metadata service if available
    await axios.post(`${HA_URL}/api/services/media_player/shuffle_set`, {
      entity_id, shuffle: false
    }, { headers: haHeaders() }).catch(() => {})
    res.json({ ok: true })
  } catch (e) { res.json({ ok: false, error: e.message }) }
})

// ── Speaker state (for polling remote control changes) ───────────────────────
app.get('/api/ha/speaker-state/:entity_id', async (req, res) => {
  try {
    const r = await axios.get(
      `${HA_URL}/api/states/${req.params.entity_id}`,
      { headers: haHeaders() }
    )
    const attrs = r.data.attributes || {}
    res.json({
      state:    r.data.state,
      position: attrs.media_position,
      duration: attrs.media_duration,
      title:    attrs.media_title,
      volume:   attrs.volume_level,
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Remote control passthrough (play/pause/seek on cast speaker) ─────────────
app.post('/api/ha/control', async (req, res) => {
  const { entity_id, action, position } = req.body
  if (!entity_id || !action) return res.status(400).json({ error: 'entity_id + action required' })
  const serviceMap = {
    play:  'media_play',
    pause: 'media_pause',
    stop:  'media_stop',
    next:  'media_next_track',
    prev:  'media_previous_track',
  }
  try {
    if (action === 'seek' && position != null) {
      await axios.post(`${HA_URL}/api/services/media_player/media_seek`, {
        entity_id, seek_position: position
      }, { headers: haHeaders() })
    } else if (serviceMap[action]) {
      await axios.post(`${HA_URL}/api/services/media_player/${serviceMap[action]}`, {
        entity_id
      }, { headers: haHeaders() })
    } else {
      return res.status(400).json({ error: `Unknown action: ${action}` })
    }
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})


// ── Player state API (for Lovelace card polling) ─────────────────────────────
// In-memory player state — updated by frontend via POST /api/player/update
let playerState = { title: null, artist: null, img: null, playing: false, progress: 0, duration: 0, updatedAt: 0 }

app.get('/api/player/state', (req, res) => {
  res.json({ type: 'player_state', ...playerState })
})

// Frontend posts its current state here so the card can reflect it
app.post('/api/player/update', (req, res) => {
  playerState = { ...playerState, ...req.body, updatedAt: Date.now() }
  // Broadcast to all WS clients (Lovelace cards)
  const payload = JSON.stringify({ type: 'player_state', ...playerState })
  wss.clients.forEach(client => {
    if (client.readyState === 1) client.send(payload)
  })
  res.json({ ok: true })
})

// Lovelace card sends control actions here
app.post('/api/player/control', (req, res) => {
  const { action } = req.body
  if (!action) return res.status(400).json({ error: 'action required' })
  // Broadcast control command to all frontend WS clients
  const payload = JSON.stringify({ type: 'player_control', action })
  wss.clients.forEach(client => {
    if (client.readyState === 1) client.send(payload)
  })
  res.json({ ok: true })
})

server.listen(PORT, async () => {
  console.log(`[server] 24Six running on port ${PORT}`);
  await ensureAuth();
});

// ── Speaker Presets (stored in /data/presets.json) ────────────────────────────
const PRESETS_FILE = '/data/presets.json'
function loadPresets() {
  try { return JSON.parse(fs.readFileSync(PRESETS_FILE, 'utf8')) } catch { return [] }
}
function savePresets(p) { fs.writeFileSync(PRESETS_FILE, JSON.stringify(p, null, 2)) }

app.get('/api/ha/presets', (req, res) => res.json(loadPresets()))

app.post('/api/ha/presets', (req, res) => {
  const presets = loadPresets()
  const preset = { id: Date.now().toString(), ...req.body }
  presets.push(preset)
  savePresets(presets)
  res.json(preset)
})

app.put('/api/ha/presets/:id', (req, res) => {
  const presets = loadPresets().map(p => p.id === req.params.id ? { ...p, ...req.body } : p)
  savePresets(presets)
  res.json({ ok: true })
})

app.delete('/api/ha/presets/:id', (req, res) => {
  savePresets(loadPresets().filter(p => p.id !== req.params.id))
  res.json({ ok: true })
})

// Play to a preset group (cast to all speakers in group simultaneously)
app.post('/api/ha/presets/:id/play', async (req, res) => {
  const preset = loadPresets().find(p => p.id === req.params.id)
  if (!preset) return res.status(404).json({ error: 'Preset not found' })
  const { track_id, track_title } = req.body
  if (!track_id) return res.status(400).json({ error: 'track_id required' })

  const base = await getAddonStreamBase()
  const streamUrl = `${base}/api/stream/${track_id}`

  const results = await Promise.allSettled(
    preset.entity_ids.map(entity_id =>
      axios.post(`${HA_URL}/api/services/media_player/play_media`, {
        entity_id,
        media_content_id: streamUrl,
        media_content_type: 'music',
        extra: { title: track_title || 'Now Playing' }
      }, { headers: haHeaders() })
    )
  )
  res.json({ ok: true, results: results.map((r, i) => ({ entity_id: preset.entity_ids[i], ok: r.status === 'fulfilled' })) })
})

// Sync volume across a preset group
app.post('/api/ha/presets/:id/volume', async (req, res) => {
  const preset = loadPresets().find(p => p.id === req.params.id)
  if (!preset) return res.status(404).json({ error: 'Preset not found' })
  const { volume } = req.body
  await Promise.allSettled(
    preset.entity_ids.map(entity_id =>
      axios.post(`${HA_URL}/api/services/media_player/volume_set`, { entity_id, volume_level: volume }, { headers: haHeaders() })
    )
  )
  res.json({ ok: true })
})

// Speaker hidden/visible preferences
const SPEAKER_PREFS_FILE = '/data/speaker_prefs.json'
function loadSpeakerPrefs() { try { return JSON.parse(fs.readFileSync(SPEAKER_PREFS_FILE, 'utf8')) } catch { return {} } }
function saveSpeakerPrefs(p) { fs.writeFileSync(SPEAKER_PREFS_FILE, JSON.stringify(p, null, 2)) }

app.get('/api/ha/speaker-prefs', (req, res) => res.json(loadSpeakerPrefs()))
app.post('/api/ha/speaker-prefs', (req, res) => {
  saveSpeakerPrefs(req.body)
  res.json({ ok: true })
})