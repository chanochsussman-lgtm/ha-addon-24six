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
    const home = await client.get(`${BASE_URL}/`, {
      headers: { 'Accept': 'text/html' }
    });
    
    // Extract CSRF token from cookies or response
    const cookies = await jar.getCookies(BASE_URL);
    const xsrfCookie = cookies.find(c => c.key === 'XSRF-TOKEN');
    const csrfToken = xsrfCookie ? decodeURIComponent(xsrfCookie.value) : null;
    console.log('[auth] CSRF token:', csrfToken ? 'found' : 'not found');

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    };
    if (csrfToken) headers['X-XSRF-TOKEN'] = csrfToken;

    // Step 1: check-existing-user
    await client.post(`${BASE_URL}/check-existing-user`, {
      email: CREDENTIALS.email,
      password: CREDENTIALS.password
    }, { headers });
    console.log('[auth] Step 1 done');

    // Refresh CSRF token after step 1
    const cookies2 = await jar.getCookies(BASE_URL);
    const xsrf2 = cookies2.find(c => c.key === 'XSRF-TOKEN');
    if (xsrf2) headers['X-XSRF-TOKEN'] = decodeURIComponent(xsrf2.value);

    // Step 2: pin-check
    await client.post(`${BASE_URL}/pin-check`, {
      profile: CREDENTIALS.profile_id,
      pin: null
    }, { headers });
    console.log('[auth] Step 2 done');

    // Refresh CSRF again
    const cookies3 = await jar.getCookies(BASE_URL);
    const xsrf3 = cookies3.find(c => c.key === 'XSRF-TOKEN');
    if (xsrf3) headers['X-XSRF-TOKEN'] = decodeURIComponent(xsrf3.value);

    // Step 3: login
    await client.post(`${BASE_URL}/login`, {}, { headers });
    console.log('[auth] Step 3 done');

    saveAuth();
    console.log('[auth] Login complete');
    return true;
  } catch (e) {
    console.error('[auth] Login failed:', e.response?.status, e.message);
    return false;
  }
}

// ── Generic Proxy Helper ──────────────────────────────────────────────────────
async function proxy(req, res, urlPath, options = {}) {
  try {
    const url = `${BASE_URL}${urlPath}`;
    const method = options.method || 'GET';
    const response = await client({
      method,
      url,
      params: options.params || (method === 'GET' ? req.query : undefined),
      data: options.data,
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      validateStatus: () => true
    });

    if (response.status === 401 || response.status === 403) {
      console.log('[proxy] Auth expired, re-logging in...');
      await doLogin();
      // Retry once
      const retry = await client({
        method,
        url,
        params: options.params || (method === 'GET' ? req.query : undefined),
        data: options.data,
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }
      });
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
app.get('/api/home', (req, res) => proxy(req, res, '/featured-homepage'));
app.get('/api/banners', (req, res) => proxy(req, res, '/music/banner'));
app.get('/api/browse/recent', (req, res) => proxy(req, res, '/music/content/recent'));
app.get('/api/categories', (req, res) => proxy(req, res, '/music/category'));
app.get('/api/categories/:id', (req, res) => proxy(req, res, `/music/category/${req.params.id}`));
app.get('/api/artists', (req, res) => proxy(req, res, '/music/artist'));
app.get('/api/artists/:id', (req, res) => proxy(req, res, `/music/artist/${req.params.id}`));
app.get('/api/playlists', (req, res) => proxy(req, res, '/music/playlist'));
app.get('/api/playlists/:id', (req, res) => proxy(req, res, `/music/playlist/${req.params.id}`));
app.get('/api/stories', (req, res) => proxy(req, res, '/story'));

// Collections
app.get('/api/collections', (req, res) => proxy(req, res, '/music/collection'));
app.get('/api/collections/:id', (req, res) => proxy(req, res, `/music/collection/${req.params.id}`));
app.get('/api/collections/:id/songs', (req, res) =>
  proxy(req, res, '/music/content', { params: { collection_id: req.params.id } })
);

// Search
app.get('/api/search', async (req, res) => {
  const { q, type = 'collection' } = req.query;
  if (!q) return res.json([]);
  proxy(req, res, `/music/${type}/search`, { params: { q } });
});

// ── Audio Streaming ───────────────────────────────────────────────────────────
app.get('/api/audio/:id', async (req, res) => {
  try {
    // Get the play URL (302 redirect to CDN)
    const playUrl = `${BASE_URL}/content/${req.params.id}/play?format=aac`;
    const redirect = await client.get(playUrl, {
      maxRedirects: 0,
      validateStatus: s => s === 302 || s === 200
    });

    const cdnUrl = redirect.headers?.location || playUrl;

    // Pipe CDN audio with range support
    const rangeHeader = req.headers.range;
    const headers = { 'Accept': '*/*' };
    if (rangeHeader) headers['Range'] = rangeHeader;

    const audioResponse = await axios.get(cdnUrl, {
      responseType: 'stream',
      headers,
      validateStatus: () => true
    });

    res.status(audioResponse.status);
    const passthroughHeaders = ['content-type', 'content-length', 'content-range', 'accept-ranges'];
    passthroughHeaders.forEach(h => {
      if (audioResponse.headers[h]) res.setHeader(h, audioResponse.headers[h]);
    });
    audioResponse.data.pipe(res);
  } catch (e) {
    console.error('[audio] Error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Stream redirect (for direct browser use)
app.get('/api/stream/:id', async (req, res) => {
  try {
    const playUrl = `${BASE_URL}/content/${req.params.id}/play?format=aac`;
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

// CDN image proxy (avoids mixed content / CORS)
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

// WebSocket for player state sync (future use)
const wss = new WebSocket.Server({ server, path: '/ws/player' });
wss.on('connection', ws => {
  console.log('[ws] Client connected');
  ws.on('close', () => console.log('[ws] Client disconnected'));
});

server.listen(PORT, async () => {
  console.log(`[server] 24Six running on port ${PORT}`);
  await ensureAuth();
});
