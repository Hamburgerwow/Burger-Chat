// Burger music accounts — password auth, QR login, cloud sync.
// GitHub token lives in the Worker secret (env.GH_TOKEN); it never reaches the browser.

const REPO = "Hamburgerwow/Burger-Chat";
const BRANCH = "main";
const DIR = "music-data";
const COOKIE = "bm_auth";
const COOKIE_MAX = 60 * 60 * 24 * 30;
const DATA_KEYS = [
  "bm:playlists", "bm:lx-sources", "bm:stats", "bm:ach", "bm:favorites",
  "bm:history", "bm:quality", "bm:lyric-trans", "bm:volume", "bm:account-meta",
];

const enc = (s) => new TextEncoder().encode(s);

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extra,
    },
  });
}

function b64url(buf) {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64file(text) {
  const bytes = enc(text);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function fromB64(text) {
  const bin = atob(String(text).replace(/\n/g, ""));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function hex(buf) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function rid(n = 8) {
  const bytes = crypto.getRandomValues(new Uint8Array(n));
  return hex(bytes);
}

const secretOf = (env) => env.ACCOUNT_SECRET || env.GH_TOKEN || "burger-music-account";

async function hmac(env, text) {
  const key = await crypto.subtle.importKey("raw", enc(secretOf(env)), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, enc(text)));
}

async function hashPassword(pass, salt) {
  const material = await crypto.subtle.importKey("raw", enc(pass), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: enc(salt), iterations: 100000, hash: "SHA-256" },
    material,
    256,
  );
  return hex(bits);
}

function cookieValue(request, name) {
  const raw = request.headers.get("Cookie") || "";
  for (const part of raw.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return rest.join("=");
  }
  return "";
}

async function currentUser(request, env) {
  const raw = cookieValue(request, COOKIE);
  if (!raw || !raw.includes(".")) return null;
  const [payload, sig] = raw.split(".");
  if (!payload || !sig) return null;
  if ((await hmac(env, payload)) !== sig) return null;
  try {
    const data = JSON.parse(fromB64(payload.replace(/-/g, "+").replace(/_/g, "/")));
    if (!data || !data.u || !data.exp || data.exp < Date.now()) return null;
    return data;
  } catch (error) {
    return null;
  }
}

async function sessionCookie(env, url, user) {
  const payload = b64url(enc(JSON.stringify({ u: user.u, n: user.n, exp: Date.now() + COOKIE_MAX * 1000 })));
  const sig = await hmac(env, payload);
  const domain = /(^|\.)hamburgerwow\.top$/i.test(url.hostname) ? "; Domain=hamburgerwow.top" : "";
  const secure = url.protocol === "https:" ? "; Secure" : "";
  return `${COOKIE}=${payload}.${sig}; Path=/; Max-Age=${COOKIE_MAX}; HttpOnly; SameSite=Lax${secure}${domain}`;
}

function clearCookie(url) {
  const domain = /(^|\.)hamburgerwow\.top$/i.test(url.hostname) ? "; Domain=hamburgerwow.top" : "";
  return `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${domain}`;
}

async function gh(env, method, path, payload) {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "burger-music-account",
    Authorization: "token " + (env.GH_TOKEN || ""),
  };
  if (payload) headers["Content-Type"] = "application/json";
  return fetch("https://api.github.com" + path, {
    method,
    headers,
    body: payload ? JSON.stringify(payload) : undefined,
  });
}

async function readFile(env, rel) {
  const res = await gh(env, "GET", `/repos/${REPO}/contents/${rel}?ref=${BRANCH}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("gh read " + res.status);
  const data = await res.json();
  const parsed = JSON.parse(fromB64(data.content));
  parsed.__sha = data.sha;
  return parsed;
}

async function writeFile(env, rel, obj, message) {
  const existing = await gh(env, "GET", `/repos/${REPO}/contents/${rel}?ref=${BRANCH}`);
  const payload = {
    message: message || "music account update " + rel,
    content: b64file(JSON.stringify(obj, null, 2)),
    branch: BRANCH,
  };
  if (existing.ok) payload.sha = (await existing.json()).sha;
  const res = await gh(env, "PUT", `/repos/${REPO}/contents/${rel}`, payload);
  if (!res.ok) throw new Error("gh write " + res.status + " " + (await res.text()).slice(0, 120));
  return res.json();
}

const accountPath = (user) => `${DIR}/accounts/${encodeURIComponent(user)}.json`;
const ticketPath = (ticket) => `${DIR}/_qr/${encodeURIComponent(ticket)}.json`;

function validName(name) {
  return /^[A-Za-z0-9_-]{2,20}$/.test(name);
}

async function loadAccount(env, user) {
  if (!validName(user)) return null;
  return readFile(env, accountPath(user));
}

async function body(request) {
  try {
    return await request.json();
  } catch (error) {
    return {};
  }
}

function sanitizeData(input) {
  const out = {};
  if (!input || typeof input !== "object") return out;
  for (const key of DATA_KEYS) {
    if (Object.prototype.hasOwnProperty.call(input, key)) out[key] = input[key];
  }
  return out;
}

async function register(request, env, url) {
  const data = await body(request);
  const user = String(data.user || "").trim();
  const pass = String(data.pass || "");
  if (!validName(user)) return json({ ok: false, error: "用户名需 2-20 位字母、数字、下划线" }, 400);
  if (pass.length < 6) return json({ ok: false, error: "密码至少 6 位" }, 400);
  const exists = await loadAccount(env, user);
  if (exists) return json({ ok: false, error: "用户名已被注册" }, 409);
  const salt = rid(16);
  const doc = {
    u: user,
    salt,
    hash: await hashPassword(pass, salt),
    nick: String(data.nick || user).slice(0, 24),
    avatar: "",
    createdAt: new Date().toISOString(),
    updatedAt: Date.now(),
    data: sanitizeData(data.data),
  };
  await writeFile(env, accountPath(user), doc, "music account register " + user);
  return json({ ok: true, user: doc.u, nick: doc.nick }, 200, { "Set-Cookie": await sessionCookie(env, url, doc) });
}

async function login(request, env, url) {
  const data = await body(request);
  const user = String(data.user || "").trim();
  const pass = String(data.pass || "");
  const doc = await loadAccount(env, user);
  if (!doc || !doc.salt || !doc.hash) return json({ ok: false, error: "账号不存在" }, 404);
  const hash = await hashPassword(pass, doc.salt);
  if (hash !== doc.hash) return json({ ok: false, error: "密码不正确" }, 401);
  return json({ ok: true, user: doc.u, nick: doc.nick, avatar: doc.avatar || "" }, 200, {
    "Set-Cookie": await sessionCookie(env, url, doc),
  });
}

async function me(request, env) {
  const session = await currentUser(request, env);
  if (!session) return json({ ok: false, logged: false });
  const doc = await loadAccount(env, session.u);
  if (!doc) return json({ ok: false, logged: false });
  return json({ ok: true, logged: true, user: doc.u, nick: doc.nick, avatar: doc.avatar || "", createdAt: doc.createdAt });
}

async function logout(request, env, url) {
  return json({ ok: true }, 200, { "Set-Cookie": clearCookie(url) });
}

async function dataPull(request, env) {
  const session = await currentUser(request, env);
  if (!session) return json({ ok: false, error: "未登录" }, 401);
  const doc = await loadAccount(env, session.u);
  if (!doc) return json({ ok: false, error: "账号不存在" }, 404);
  return json({ ok: true, user: doc.u, nick: doc.nick, avatar: doc.avatar || "", updatedAt: doc.updatedAt || 0, data: doc.data || {} });
}

async function dataPush(request, env) {
  const session = await currentUser(request, env);
  if (!session) return json({ ok: false, error: "未登录" }, 401);
  const doc = await loadAccount(env, session.u);
  if (!doc) return json({ ok: false, error: "账号不存在" }, 404);
  const incoming = await body(request);
  doc.data = { ...doc.data, ...sanitizeData(incoming.data) };
  if (typeof incoming.nick === "string" && incoming.nick.trim()) doc.nick = incoming.nick.trim().slice(0, 24);
  if (typeof incoming.avatar === "string" && incoming.avatar.length < 200000) doc.avatar = incoming.avatar;
  doc.updatedAt = Date.now();
  await writeFile(env, accountPath(doc.u), doc, "music account sync " + doc.u);
  return json({ ok: true, updatedAt: doc.updatedAt, nick: doc.nick });
}

async function qrNew(request, env, url) {
  const session = await currentUser(request, env);
  const ticket = rid(10);
  const secret = rid(12);
  await writeFile(env, ticketPath(ticket), {
    t: ticket,
    secret,
    status: "waiting",
    created: Date.now(),
    exp: Date.now() + 5 * 60 * 1000,
    by: session ? session.u : "",
  }, "music qr ticket " + ticket);
  const origin = "https://hamburgerwow.top";
  return json({ ok: true, ticket, secret, url: `${origin}/burger-music?qr=${ticket}`, exp: Date.now() + 5 * 60 * 1000 });
}

async function qrStatus(request, env, url) {
  const ticket = String(url.searchParams.get("t") || "");
  const secret = String(url.searchParams.get("s") || "");
  if (!/^[a-f0-9]{20}$/.test(ticket)) return json({ ok: false, error: "ticket" }, 400);
  const doc = await readFile(env, ticketPath(ticket));
  if (!doc) return json({ ok: false, status: "missing" });
  if (doc.exp && doc.exp < Date.now()) return json({ ok: true, status: "expired" });
  if (doc.status === "confirmed") {
    if (!secret || secret !== doc.secret) return json({ ok: true, status: "waiting" });
    return json({ ok: true, status: "confirmed", code: doc.code || "", user: doc.user || "" });
  }
  return json({ ok: true, status: "waiting" });
}

async function qrConfirm(request, env, url) {
  const session = await currentUser(request, env);
  if (!session) return json({ ok: false, error: "请先在手机上登录" }, 401);
  const data = await body(request);
  const ticket = String(data.ticket || "");
  if (!/^[a-f0-9]{20}$/.test(ticket)) return json({ ok: false, error: "ticket" }, 400);
  const doc = await readFile(env, ticketPath(ticket));
  if (!doc || (doc.exp && doc.exp < Date.now())) return json({ ok: false, error: "二维码已过期" }, 410);
  const code = rid(12);
  await writeFile(env, ticketPath(ticket), { ...doc, status: "confirmed", user: session.u, code, confirmedAt: Date.now() }, "music qr confirm " + ticket);
  return json({ ok: true });
}

async function qrClaim(request, env, url) {
  const data = await body(request);
  const ticket = String(data.ticket || "");
  const code = String(data.code || "");
  const secret = String(data.secret || "");
  const doc = await readFile(env, ticketPath(ticket));
  if (!doc || doc.status !== "confirmed" || doc.code !== code || !secret || secret !== doc.secret) {
    return json({ ok: false, error: "二维码状态无效" }, 400);
  }
  const account = await loadAccount(env, doc.user);
  if (!account) return json({ ok: false, error: "账号不存在" }, 404);
  await writeFile(env, ticketPath(ticket), { ...doc, status: "claimed", code: "" }, "music qr claim " + ticket);
  return json({ ok: true, user: account.u, nick: account.nick }, 200, {
    "Set-Cookie": await sessionCookie(env, url, account),
  });
}

export async function accountApi(request, env, url) {
  const cors = {
    "Access-Control-Allow-Origin": "https://hamburgerwow.top",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  const action = url.pathname.slice("/api/account/".length).replace(/\/+$/, "");
  try {
    let res;
    if (action === "register" && request.method === "POST") res = await register(request, env, url);
    else if (action === "login" && request.method === "POST") res = await login(request, env, url);
    else if (action === "me") res = await me(request, env);
    else if (action === "logout" && request.method === "POST") res = await logout(request, env, url);
    else if (action === "data" && request.method === "GET") res = await dataPull(request, env);
    else if (action === "data" && request.method === "POST") res = await dataPush(request, env);
    else if (action === "qr/new" && request.method === "POST") res = await qrNew(request, env, url);
    else if (action === "qr/status") res = await qrStatus(request, env, url);
    else if (action === "qr/confirm" && request.method === "POST") res = await qrConfirm(request, env, url);
    else if (action === "qr/claim" && request.method === "POST") res = await qrClaim(request, env, url);
    else res = json({ ok: false, error: "not found" }, 404);
    if (res.headers.has("Set-Cookie")) {
      const headers = new Headers(res.headers);
      for (const [k, v] of Object.entries(cors)) headers.set(k, v);
      return new Response(res.body, { status: res.status, headers });
    }
    const headers = new Headers(res.headers);
    for (const [k, v] of Object.entries(cors)) headers.set(k, v);
    return new Response(res.body, { status: res.status, headers });
  } catch (error) {
    return json({ ok: false, error: String((error && error.message) || error) }, 502, cors);
  }
}
