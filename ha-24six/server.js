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

// ── Music API Routes ──────────────────────────────────────────────────────────
app.get('/api/home',            (req, res) => proxy(req, res, '/app/music'));
app.get('/api/banners',         (req, res) => proxy(req, res, '/app/music/banner'));
app.get('/api/browse/recent',   (req, res) => proxy(req, res, '/app/music/content/recent'));
app.get('/api/categories',      (req, res) => proxy(req, res, '/app/music/category'));
app.get('/api/categories/:id',  (req, res) => proxy(req, res, `/app/music/category/${req.params.id}`));
app.get('/api/artists',         (req, res) => proxy(req, res, '/app/music/artist'));
app.get('/api/artists/:id',     (req, res) => proxy(req, res, `/app/music/artist/${req.params.id}`));
app.get('/api/playlists',       (req, res) => proxy(req, res, '/app/music/playlist'));
app.get('/api/playlists/:id',   (req, res) => proxy(req, res, `/app/music/playlist/${req.params.id}`));
app.get('/api/stories',         (req, res) => proxy(req, res, '/app/story'));

// Collections
app.get('/api/collections',           (req, res) => proxy(req, res, '/app/music/collection'));
app.get('/api/collections/:id',       (req, res) => proxy(req, res, `/app/music/collection/${req.params.id}`));
app.get('/api/collections/:id/songs', (req, res) => proxy(req, res, `/app/content/${req.params.id}`));

// Songs
app.get('/api/songs/:id', (req, res) => proxy(req, res, `/app/content/${req.params.id}`));

// Search
app.get('/api/search', async (req, res) => {
  const { q, type = 'collection' } = req.query;
  if (!q) return res.json([]);
  proxy(req, res, `/app/music/${type}/search`, { params: { q } });
});

// ── Audio Streaming ───────────────────────────────────────────────────────────
app.get('/api/audio/:id', async (req, res) => {
  try {
    const playUrl = `${BASE_URL}/app/content/${req.params.id}/play?format=aac`;
    const redirect = await client.get(playUrl, {
      maxRedirects: 0,
      validateStatus: s => s === 302 || s === 200
    });

    const cdnUrl = redirect.headers?.location || playUrl;
    const rangeHeader = req.headers.range;
    const headers = { 'Accept': '*/*' };
    if (rangeHeader) headers['Range'] = rangeHeader;

    const audioResponse = await axios.get(cdnUrl, {
      responseType: 'stream',
      headers,
      validateStatus: () => true
    });

    res.status(audioResponse.status);
    ['content-type', 'content-length', 'content-range', 'accept-ranges'].forEach(h => {
      if (audioResponse.headers[h]) res.setHeader(h, audioResponse.headers[h]);
    });
    audioResponse.data.pipe(res);
  } catch (e) {
    console.error('[audio] Error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Stream redirect
app.get('/api/stream/:id', async (req, res) => {
  try {
    const playUrl = `${BASE_URL}/app/content/${req.params.id}/play?format=aac`;
    const redirect = await client.get(playUrl, {
      maxRedirects: 0,
      validateStatus: s => s === 302 || s === 200
    });
    const cdnUrl = redirect.headers?.location || playUrl;
    res.redirect(cdnUrl);
  } catch (e) {
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

// ── Serve React Frontend ──────────────────────────────────────────────────────
const DIST = path.join(__dirname, 'frontend', 'dist');
app.use(express.static(DIST));
app.get('*', (req, res) => {
  res.sendFile(path.join(DIST, 'index.html'));
});

// ── Start ─────────────────────────────────────────────────────────────────────
const server = http.createServer(app);

const wss = new WebSocket.Server({ server, path: '/ws/player' });
wss.on('connection', ws => {
  console.log('[ws] Client connected');
  ws.on('close', () => console.log('[ws] Client disconnected'));
});

server.listen(PORT, async () => {
  console.log(`[server] 24Six running on port ${PORT}`);
  await ensureAuth();
});