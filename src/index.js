/**
 * Digital Visual Studio — Worker Cloudflare
 *
 * Rôles :
 *  - Servir les fichiers statiques du dossier /public (géré par le binding ASSETS)
 *  - API publique  : GET /api/services, GET /api/projects, GET /media/*
 *  - API admin     : login + CRUD services & réalisations (protégée par cookie signé)
 *
 * Secret requis : ADMIN_PASSWORD (mot de passe de l'espace admin)
 */

const SESSION_COOKIE = 'dvs_session';
const SESSION_DURATION = 60 * 60 * 24 * 7; // 7 jours
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20 Mo (limite KV : 25 Mo)

const ALLOWED_IMAGE_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;

    try {
      if (pathname.startsWith('/media/')) {
        return serveMedia(request, env, pathname.slice('/media/'.length));
      }
      if (pathname.startsWith('/api/')) {
        return handleApi(request, env, pathname);
      }
      // Tout le reste : fichiers statiques
      return env.ASSETS.fetch(request);
    } catch (err) {
      console.error('Erreur Worker :', err);
      return json({ error: 'Erreur interne du serveur.' }, 500);
    }
  },
};

/* ============================================================
   ROUTAGE API
============================================================ */
async function handleApi(request, env, pathname) {
  const method = request.method;

  // --- Authentification -------------------------------------
  if (pathname === '/api/login' && method === 'POST') return login(request, env);
  if (pathname === '/api/logout' && method === 'POST') return logout();
  if (pathname === '/api/session' && method === 'GET') {
    return json({ authenticated: await isAuthenticated(request, env) });
  }

  // --- Lecture publique -------------------------------------
  if (pathname === '/api/services' && method === 'GET') {
    const { results } = await env.DB.prepare(
      'SELECT id, title, description, icon FROM services ORDER BY sort_order, id'
    ).all();
    return json(results);
  }
  if (pathname === '/api/projects' && method === 'GET') {
    const { results } = await env.DB.prepare(
      'SELECT id, title, category, description, image_key, created_at FROM projects ORDER BY sort_order, id DESC'
    ).all();
    return json(results.map((p) => ({ ...p, image_url: `/media/${p.image_key}` })));
  }

  // --- Routes admin (protégées) ------------------------------
  if (pathname.startsWith('/api/admin/')) {
    if (!(await isAuthenticated(request, env))) {
      return json({ error: 'Non autorisé. Veuillez vous connecter.' }, 401);
    }
    return handleAdmin(request, env, pathname, method);
  }

  return json({ error: 'Route introuvable.' }, 404);
}

async function handleAdmin(request, env, pathname, method) {
  // ---- Services ----
  if (pathname === '/api/admin/services' && method === 'POST') {
    const body = await request.json();
    if (!body.title || !body.description) {
      return json({ error: 'Titre et description sont obligatoires.' }, 400);
    }
    const icon = body.icon && body.icon.trim() ? body.icon.trim() : 'fa-solid fa-star';
    const res = await env.DB.prepare(
      'INSERT INTO services (title, description, icon, sort_order) VALUES (?, ?, ?, COALESCE((SELECT MAX(sort_order) + 1 FROM services), 1))'
    ).bind(body.title.trim(), body.description.trim(), icon).run();
    return json({ ok: true, id: res.meta.last_row_id });
  }

  const serviceMatch = pathname.match(/^\/api\/admin\/services\/(\d+)$/);
  if (serviceMatch) {
    const id = Number(serviceMatch[1]);
    if (method === 'PUT') {
      const body = await request.json();
      await env.DB.prepare(
        'UPDATE services SET title = ?, description = ?, icon = ? WHERE id = ?'
      ).bind(body.title.trim(), body.description.trim(), (body.icon || 'fa-solid fa-star').trim(), id).run();
      return json({ ok: true });
    }
    if (method === 'DELETE') {
      await env.DB.prepare('DELETE FROM services WHERE id = ?').bind(id).run();
      return json({ ok: true });
    }
  }

  // ---- Réalisations (portfolio) ----
  if (pathname === '/api/admin/projects' && method === 'POST') {
    return createProject(request, env);
  }

  const projectMatch = pathname.match(/^\/api\/admin\/projects\/(\d+)$/);
  if (projectMatch) {
    const id = Number(projectMatch[1]);
    if (method === 'PUT') {
      const body = await request.json();
      await env.DB.prepare(
        'UPDATE projects SET title = ?, category = ?, description = ? WHERE id = ?'
      ).bind((body.title || '').trim(), (body.category || 'Création').trim(), (body.description || '').trim(), id).run();
      return json({ ok: true });
    }
    if (method === 'DELETE') {
      const row = await env.DB.prepare('SELECT image_key FROM projects WHERE id = ?').bind(id).first();
      if (row?.image_key) await env.MEDIA.delete(row.image_key);
      await env.DB.prepare('DELETE FROM projects WHERE id = ?').bind(id).run();
      return json({ ok: true });
    }
  }

  return json({ error: 'Route admin introuvable.' }, 404);
}

/* ============================================================
   RÉALISATIONS — création avec upload d'image
============================================================ */
async function createProject(request, env) {
  const form = await request.formData();
  const file = form.get('image');
  const title = (form.get('title') || '').toString().trim();
  const category = (form.get('category') || 'Création').toString().trim();
  const description = (form.get('description') || '').toString().trim();

  if (!title) return json({ error: 'Le titre est obligatoire.' }, 400);
  if (!file || typeof file === 'string') return json({ error: 'Une image est obligatoire.' }, 400);

  const ext = ALLOWED_IMAGE_TYPES[file.type];
  if (!ext) return json({ error: `Format d'image non supporté (${file.type}). Utilisez JPG, PNG, WebP ou GIF.` }, 400);
  if (file.size > MAX_UPLOAD_BYTES) {
    return json({ error: 'Image trop lourde (max 20 Mo). Réduisez sa taille et réessayez.' }, 400);
  }

  const key = `projects/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  await env.MEDIA.put(key, await file.arrayBuffer(), {
    metadata: { contentType: file.type },
  });

  const res = await env.DB.prepare(
    'INSERT INTO projects (title, category, description, image_key, content_type) VALUES (?, ?, ?, ?, ?)'
  ).bind(title, category, description, key, file.type).run();

  return json({ ok: true, id: res.meta.last_row_id, image_url: `/media/${key}` });
}

/* ============================================================
   MÉDIAS — images stockées dans KV
============================================================ */
async function serveMedia(request, env, key) {
  if (!key) return new Response('Introuvable', { status: 404 });

  // Cache CDN : évite de relire KV à chaque visite
  const cache = caches.default;
  const cached = await cache.match(request);
  if (cached) return cached;

  const { value, metadata } = await env.MEDIA.getWithMetadata(key, { type: 'arrayBuffer' });
  if (!value) return new Response('Image introuvable', { status: 404 });

  const response = new Response(value, {
    headers: {
      'Content-Type': metadata?.contentType || 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
  await cache.put(request, response.clone());
  return response;
}

/* ============================================================
   AUTHENTIFICATION — cookie signé HMAC-SHA256
============================================================ */
async function login(request, env) {
  if (!env.ADMIN_PASSWORD) {
    return json({ error: "Le mot de passe admin n'est pas configuré. Ajoutez le secret ADMIN_PASSWORD dans Cloudflare." }, 500);
  }
  const body = await request.json().catch(() => ({}));
  const password = (body.password || '').toString();

  if (!password || !timingSafeEqual(password, env.ADMIN_PASSWORD)) {
    return json({ error: 'Mot de passe incorrect.' }, 401);
  }

  const expiry = Math.floor(Date.now() / 1000) + SESSION_DURATION;
  const signature = await hmacHex(env.ADMIN_PASSWORD, `session:${expiry}`);
  const token = `${expiry}.${signature}`;

  return json({ ok: true }, 200, {
    'Set-Cookie': `${SESSION_COOKIE}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${SESSION_DURATION}`,
  });
}

function logout() {
  return json({ ok: true }, 200, {
    'Set-Cookie': `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`,
  });
}

async function isAuthenticated(request, env) {
  if (!env.ADMIN_PASSWORD) return false;
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
  if (!match) return false;

  const [expiryStr, signature] = match[1].split('.');
  const expiry = Number(expiryStr);
  if (!expiry || !signature || expiry < Math.floor(Date.now() / 1000)) return false;

  const expected = await hmacHex(env.ADMIN_PASSWORD, `session:${expiry}`);
  return timingSafeEqual(signature, expected);
}

async function hmacHex(secret, data) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(`dvs-v1:${secret}`),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(a, b) {
  const bufA = new TextEncoder().encode(a);
  const bufB = new TextEncoder().encode(b);
  if (bufA.length !== bufB.length) return false;
  let diff = 0;
  for (let i = 0; i < bufA.length; i++) diff |= bufA[i] ^ bufB[i];
  return diff === 0;
}

/* ============================================================
   UTILITAIRES
============================================================ */
function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...extraHeaders },
  });
}
