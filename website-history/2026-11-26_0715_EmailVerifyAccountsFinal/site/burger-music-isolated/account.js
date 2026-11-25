// Burger Chat accounts — email + password + email verification code, QR login, cloud sync.
// SMTP credentials live in Worker secrets (env.SMTP_PASS); they never reach the browser.

import { connect } from "cloudflare:sockets";

const REPO = "Hamburgerwow/Burger-Chat";
const BRANCH = "main";
const DIR = "music-data";
const COOKIE = "bm_auth";
const COOKIE_MAX = 60 * 60 * 24 * 30;
const CODE_TTL = 10 * 60 * 1000;
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

function b64bytes(bytes) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function b64file(text) {
  return b64bytes(enc(text));
}

function b64utf8(text) {
  return b64bytes(enc(String(text)));
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

function digits6() {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1000000;
  return String(n).padStart(6, "0");
}

const secretOf = (env) => env.ACCOUNT_SECRET || env.GH_TOKEN || "burger-music-account";

async function hmac(env, text) {
  const key = await crypto.subtle.importKey("raw", enc(secretOf(env)), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, enc(text)));
}

async function sha256(text) {
  return hex(await crypto.subtle.digest("SHA-256", enc(text)));
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
    if (!data || !data.e || !data.exp || data.exp < Date.now()) return null;
    return data;
  } catch (error) {
    return null;
  }
}

async function sessionCookie(env, url, user) {
  const payload = b64url(enc(JSON.stringify({ e: user.email, n: user.name, exp: Date.now() + COOKIE_MAX * 1000 })));
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

async function deleteFile(env, rel, message) {
  const existing = await gh(env, "GET", `/repos/${REPO}/contents/${rel}?ref=${BRANCH}`);
  if (!existing.ok) return;
  const sha = (await existing.json()).sha;
  const res = await gh(env, "DELETE", `/repos/${REPO}/contents/${rel}`, {
    message: message || "music account delete " + rel,
    sha,
    branch: BRANCH,
  });
  if (!res.ok) throw new Error("gh delete " + res.status);
}

/* ---------- email ---------- */
function mimeWord(text) {
  const s = String(text || "");
  return /^[\x20-\x7E]*$/.test(s) ? s : "=?UTF-8?B?" + b64utf8(s) + "?=";
}

function wrap76(text) {
  return String(text).replace(/(.{76})/g, "$1\r\n");
}

function mailMessage(cfg, to, subject, text) {
  return [
    "From: " + mimeWord(cfg.fromName) + " <" + cfg.from + ">",
    "To: <" + to + ">",
    "Subject: " + mimeWord(subject),
    "Date: " + new Date().toUTCString(),
    "Message-ID: <" + rid(12) + "@hamburgerwow.top>",
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    wrap76(b64utf8(text)),
  ].join("\r\n");
}

async function sendMail(env, to, subject, text) {
  const cfg = {
    host: String(env.SMTP_HOST || "smtp.qq.com"),
    port: Number(env.SMTP_PORT || 465),
    user: String(env.SMTP_USER || "a13535986820@qq.com"),
    pass: String(env.SMTP_PASS || ""),
    from: String(env.SMTP_FROM || env.SMTP_USER || "a13535986820@qq.com"),
    fromName: String(env.SMTP_FROM_NAME || "Burger Chat 账号中心"),
  };
  if (!cfg.pass) throw new Error("MAIL_NOT_CONFIGURED");
  const socket = connect({ hostname: cfg.host, port: cfg.port }, { secureTransport: "on" });
  const writer = socket.writable.getWriter();
  const reader = socket.readable.getReader();
  const dec = new TextDecoder();
  let buf = "";
  const timer = setTimeout(() => { try { socket.close(); } catch (e) {} }, 22000);
  try {
    await socket.opened;
    async function nextLine() {
      while (true) {
        const idx = buf.indexOf("\n");
        if (idx >= 0) {
          const line = buf.slice(0, idx).replace(/\r$/, "");
          buf = buf.slice(idx + 1);
          return line;
        }
        const chunk = await reader.read();
        if (chunk.done) throw new Error("SMTP_CLOSED");
        buf += dec.decode(chunk.value, { stream: true });
      }
    }
    async function reply() {
      const lines = [];
      while (true) {
        const line = await nextLine();
        lines.push(line);
        if (/^\d{3} /.test(line)) return { code: Number(line.slice(0, 3)), text: lines.join("\n") };
      }
    }
    async function send(line) {
      await writer.write(enc(line + "\r\n"));
    }
    async function expect(line, codes) {
      await send(line);
      const r = await reply();
      if (!codes.includes(r.code)) throw new Error("SMTP " + r.code + " " + r.text.slice(0, 80));
    }
    const hello = await reply();
    if (hello.code !== 220) throw new Error("SMTP GREETING " + hello.code);
    await expect("EHLO hamburgerwow.top", [250]);
    await expect("AUTH LOGIN", [334]);
    await expect(b64utf8(cfg.user), [334]);
    await expect(b64utf8(cfg.pass), [235]);
    await expect("MAIL FROM:<" + cfg.from + ">", [250]);
    await expect("RCPT TO:<" + to + ">", [250, 251]);
    await expect("DATA", [354]);
    const message = mailMessage(cfg, to, subject, text).replace(/\r\n\./g, "\r\n..");
    await writer.write(enc(message + "\r\n.\r\n"));
    const done = await reply();
    if (done.code !== 250) throw new Error("SMTP DATA " + done.code);
    try { await send("QUIT"); } catch (e) {}
  } finally {
    clearTimeout(timer);
    try { writer.releaseLock(); } catch (e) {}
    try { reader.releaseLock(); } catch (e) {}
    try { socket.close(); } catch (e) {}
  }
}

function maskedEmail(email) {
  const [a, b] = String(email).split("@");
  return (a || "").slice(0, 2) + "***@" + (b || "");
}

/* ---------- account storage ---------- */
const accountKey = (email) => sha256("account:" + email);
const accountPath = (key) => `${DIR}/accounts/${key}.json`;
const codePath = (key) => `${DIR}/_codes/${key}.json`;

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email || "")) && String(email).length <= 80;
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function cleanName(value, email) {
  const s = String(value || "").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 24);
  return s || String(email || "").split("@")[0].slice(0, 24) || "Burger";
}

async function loadAccount(env, email) {
  if (!validEmail(email)) return null;
  return readFile(env, accountPath(await accountKey(email)));
}

function sanitizeData(input) {
  const out = {};
  if (!input || typeof input !== "object") return out;
  for (const key of DATA_KEYS) {
    if (Object.prototype.hasOwnProperty.call(input, key)) out[key] = input[key];
  }
  return out;
}

async function body(request) {
  try {
    return await request.json();
  } catch (error) {
    return {};
  }
}

function codeDigest(env, email, scene, code) {
  return hmac(env, email + "|" + scene + "|" + code);
}

async function checkCode(env, email, scene, code) {
  if (!/^\d{6}$/.test(String(code || ""))) return "请填写 6 位邮箱验证码";
  const key = await accountKey(email);
  const doc = await readFile(env, codePath(key));
  if (!doc || !doc.h || doc.scene !== scene) return "请先获取邮箱验证码";
  if (Number(doc.exp || 0) < Date.now()) return "验证码已过期，请重新获取";
  if (Number(doc.tries || 0) >= 6) return "验证码错误次数过多，请重新获取";
  const want = await codeDigest(env, email, scene, String(code));
  if (want !== String(doc.h)) {
    doc.tries = Number(doc.tries || 0) + 1;
    try { await writeFile(env, codePath(key), doc, "music code attempt " + maskedEmail(email)); } catch (e) {}
    return "验证码不正确";
  }
  doc.h = "";
  doc.usedAt = Date.now();
  try { await writeFile(env, codePath(key), doc, "music code used " + maskedEmail(email)); } catch (e) {}
  return "";
}

async function sendCode(request, env, url) {
  const data = await body(request);
  const email = normalizeEmail(data.email);
  const scene = String(data.scene || "register") === "login" ? "login" : "register";
  const name = cleanName(data.name, email);
  if (!validEmail(email)) return json({ ok: false, error: "请输入正确的邮箱地址" }, 400);
  const exists = await loadAccount(env, email);
  if (scene === "register" && exists) return json({ ok: false, error: "这个邮箱已经注册过，直接登录即可" }, 409);
  if (scene === "login" && !exists) return json({ ok: false, error: "这个邮箱还没有注册" }, 404);
  const key = await accountKey(email);
  const old = await readFile(env, codePath(key));
  const now = Date.now();
  if (old && Number(old.lastSent || 0) && now - Number(old.lastSent) < 60000) {
    const wait = Math.ceil((60000 - (now - Number(old.lastSent))) / 1000);
    return json({ ok: false, error: "请求过于频繁，请 " + wait + " 秒后再试" }, 429);
  }
  const sends = ((old && old.sends) || []).filter((t) => now - Number(t) < 3600);
  if (sends.length >= 5) return json({ ok: false, error: "这个邮箱一小时内发送次数过多" }, 429);
  const code = digits6();
  const doc = {
    e: email, scene, h: await codeDigest(env, email, scene, code),
    exp: now + CODE_TTL, tries: 0, lastSent: now, sends: sends.concat([now]),
  };
  await writeFile(env, codePath(key), doc, "music code send " + maskedEmail(email) + " (" + scene + ")");
  const subject = scene === "register" ? "Burger Chat 注册验证码" : "Burger Chat 登录验证码";
  const text = [
    "你好" + (name ? " " + name : "") + "，",
    "",
    "你正在" + (scene === "register" ? "注册" : "登录") + " Burger Chat 账号，验证码是：",
    "",
    "    " + code,
    "",
    "验证码 10 分钟内有效，仅用于本次邮箱验证。",
    "如果不是你本人操作，请忽略这封邮件。",
    "",
    "Burger Chat 账号中心",
    "https://hamburgerwow.top/",
  ].join("\n");
  try {
    await sendMail(env, email, subject, text);
  } catch (error) {
    try { doc.h = ""; doc.lastSent = 0; await writeFile(env, codePath(key), doc, "music code failed " + maskedEmail(email)); } catch (e) {}
    console.log("send-code failed", String((error && error.message) || error));
    return json({ ok: false, error: "验证码邮件发送失败，请稍后再试" }, 502);
  }
  return json({ ok: true, sent: true, expiresIn: 600 });
}

async function register(request, env, url) {
  const data = await body(request);
  const email = normalizeEmail(data.email);
  const pass = String(data.password || data.pass || "");
  const name = cleanName(data.name || data.nick, email);
  if (!validEmail(email)) return json({ ok: false, error: "请输入正确的邮箱地址" }, 400);
  if (pass.length < 6 || pass.length > 64) return json({ ok: false, error: "密码需要 6-64 位" }, 400);
  if (name.length < 1) return json({ ok: false, error: "请填写名称" }, 400);
  const exists = await loadAccount(env, email);
  if (exists) return json({ ok: false, error: "这个邮箱已经注册过，直接登录即可" }, 409);
  const bad = await checkCode(env, email, "register", data.code);
  if (bad) return json({ ok: false, error: bad }, 400);
  const salt = rid(16);
  const doc = {
    email, name,
    salt,
    passwordHash: await hashPassword(pass, salt),
    avatar: "",
    createdAt: new Date().toISOString(),
    updatedAt: Date.now(),
    data: sanitizeData(data.data),
  };
  await writeFile(env, accountPath(await accountKey(email)), doc, "music account register " + maskedEmail(email));
  return json({ ok: true, user: email, email, nick: name, name }, 200, { "Set-Cookie": await sessionCookie(env, url, doc) });
}

async function login(request, env, url) {
  const data = await body(request);
  const email = normalizeEmail(data.email);
  const pass = String(data.password || data.pass || "");
  if (!validEmail(email)) return json({ ok: false, error: "请输入正确的邮箱地址" }, 400);
  if (pass.length < 6 || pass.length > 64) return json({ ok: false, error: "密码需要 6-64 位" }, 400);
  const doc = await loadAccount(env, email);
  if (!doc || !doc.salt || !doc.passwordHash) return json({ ok: false, error: "这个邮箱还没有注册" }, 404);
  const hash = await hashPassword(pass, doc.salt);
  if (hash !== doc.passwordHash) return json({ ok: false, error: "邮箱或密码不正确" }, 401);
  const bad = await checkCode(env, email, "login", data.code);
  if (bad) return json({ ok: false, error: bad }, 400);
  return json({ ok: true, user: email, email, nick: doc.name, name: doc.name, avatar: doc.avatar || "" }, 200, {
    "Set-Cookie": await sessionCookie(env, url, doc),
  });
}

async function me(request, env) {
  const session = await currentUser(request, env);
  if (!session) return json({ ok: false, logged: false });
  const doc = await loadAccount(env, session.e);
  if (!doc) return json({ ok: false, logged: false });
  return json({
    ok: true, logged: true, user: doc.email, email: doc.email,
    nick: doc.name, name: doc.name, avatar: doc.avatar || "", createdAt: doc.createdAt,
  });
}

async function logout(request, env, url) {
  return json({ ok: true }, 200, { "Set-Cookie": clearCookie(url) });
}

async function dataPull(request, env) {
  const session = await currentUser(request, env);
  if (!session) return json({ ok: false, error: "未登录" }, 401);
  const doc = await loadAccount(env, session.e);
  if (!doc) return json({ ok: false, error: "账号不存在" }, 404);
  return json({ ok: true, user: doc.email, email: doc.email, nick: doc.name, name: doc.name, avatar: doc.avatar || "", updatedAt: doc.updatedAt || 0, data: doc.data || {} });
}

async function dataPush(request, env) {
  const session = await currentUser(request, env);
  if (!session) return json({ ok: false, error: "未登录" }, 401);
  const doc = await loadAccount(env, session.e);
  if (!doc) return json({ ok: false, error: "账号不存在" }, 404);
  const incoming = await body(request);
  doc.data = { ...doc.data, ...sanitizeData(incoming.data) };
  if (typeof incoming.nick === "string" && incoming.nick.trim()) doc.name = cleanName(incoming.nick, doc.email);
  if (typeof incoming.name === "string" && incoming.name.trim()) doc.name = cleanName(incoming.name, doc.email);
  if (typeof incoming.avatar === "string" && incoming.avatar.length < 200000) doc.avatar = incoming.avatar;
  doc.updatedAt = Date.now();
  await writeFile(env, accountPath(await accountKey(doc.email)), doc, "music account sync " + maskedEmail(doc.email));
  return json({ ok: true, updatedAt: doc.updatedAt, nick: doc.name, name: doc.name });
}

/* ---------- QR login ---------- */
async function qrNew(request, env, url) {
  const session = await currentUser(request, env);
  const ticket = rid(10);
  const secret = rid(12);
  await writeFile(env, ticketPath(ticket), {
    t: ticket, secret, status: "waiting", created: Date.now(),
    exp: Date.now() + 5 * 60 * 1000, by: session ? session.e : "",
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
  await writeFile(env, ticketPath(ticket), { ...doc, status: "confirmed", user: session.e, code, confirmedAt: Date.now() }, "music qr confirm " + ticket);
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
  return json({ ok: true, user: account.email, email: account.email, nick: account.name, name: account.name }, 200, {
    "Set-Cookie": await sessionCookie(env, url, account),
  });
}

function ticketPath(ticket) {
  return `${DIR}/_qr/${encodeURIComponent(ticket)}.json`;
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
    if (action === "send-code" && request.method === "POST") res = await sendCode(request, env, url);
    else if (action === "code" && request.method === "POST") res = await sendCode(request, env, url);
    else if (action === "register" && request.method === "POST") res = await register(request, env, url);
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
    const headers = new Headers(res.headers);
    for (const [k, v] of Object.entries(cors)) headers.set(k, v);
    return new Response(res.body, { status: res.status, headers });
  } catch (error) {
    console.log("account-api failed", String((error && error.message) || error));
    return json({ ok: false, error: "账号服务暂时不可用，请稍后再试" }, 502, cors);
  }
}
