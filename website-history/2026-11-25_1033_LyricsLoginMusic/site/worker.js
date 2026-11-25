const MUSIC_PREFIX = "/assets/music/";
const LYRICS_PATH = "/api/lyrics";
const BM_PREFIX = "/api/bm/";
const METING = "https://api.injahow.cn/meting/";
const UA_MUSIC = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0 Safari/537.36";

function rangeFromHeader(value, size) {
  if (!value || !value.startsWith("bytes=")) return null;
  const spec = value.slice(6).split(",")[0].trim();
  const match = /^(\d*)-(\d*)$/.exec(spec);
  if (!match) return null;
  let start;
  let end;
  if (match[1] === "") {
    if (match[2] === "") return null;
    const suffix = Number(match[2]);
    if (!Number.isFinite(suffix) || suffix <= 0) return null;
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] === "" ? size - 1 : Number(match[2]);
  }
  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= size || end < start) {
    return null;
  }
  return { start, end: Math.min(end, size - 1) };
}

async function serveMusic(request, env) {
  const url = new URL(request.url);
  const assetUrl = new URL(url.pathname, url.origin).toString();
  const upstream = await env.ASSETS.fetch(
    new Request(assetUrl, { method: "GET", headers: { Accept: "*/*" } })
  );
  if (!upstream.ok) return upstream;

  const buffer = await upstream.arrayBuffer();
  const size = buffer.byteLength;
  const baseHeaders = {
    "Content-Type": "audio/mpeg",
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=31536000, immutable",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges",
  };

  const rangeHeader = request.headers.get("Range");
  if (rangeHeader) {
    const range = rangeFromHeader(rangeHeader, size);
    if (!range) {
      return new Response(null, {
        status: 416,
        headers: { ...baseHeaders, "Content-Range": `bytes */${size}` },
      });
    }
    const length = range.end - range.start + 1;
    const body = request.method === "HEAD" ? null : buffer.slice(range.start, range.end + 1);
    return new Response(body, {
      status: 206,
      headers: {
        ...baseHeaders,
        "Content-Length": String(length),
        "Content-Range": `bytes ${range.start}-${range.end}/${size}`,
      },
    });
  }

  const body = request.method === "HEAD" ? null : buffer;
  return new Response(body, {
    status: 200,
    headers: { ...baseHeaders, "Content-Length": String(size) },
  });
}

function jsonResponse(data, status = 200, cacheSeconds = 0) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,HEAD,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      ...(cacheSeconds > 0 ? { "Cache-Control": `public, max-age=${cacheSeconds}` } : { "Cache-Control": "no-store" }),
    },
  });
}

function cleanQuery(value, max = 120) {
  return String(value || "").replace(/[\u0000-\u001f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

async function neteaseProvider(title, artist) {
  const q = [title, artist].filter(Boolean).join(" ");
  const searchUrl = "https://music.163.com/api/search/get/web?csrf_token=&s=" +
    encodeURIComponent(q) + "&type=1&offset=0&total=true&limit=5";
  const searchRes = await fetch(searchUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; BurgerChatLyrics/1.0)",
      "Accept": "application/json,text/plain,*/*",
    },
    cf: { cacheTtl: 1800, cacheEverything: true },
  });
  if (!searchRes.ok) throw new Error("search " + searchRes.status);
  const search = await searchRes.json();
  const songs = (((search || {}).result || {}).songs || []);
  if (!songs.length) return null;
  const pick = songs.find((s) => String(s.name || "").toLowerCase() === title.toLowerCase()) || songs[0];
  const lyricUrl = "https://music.163.com/api/song/lyric?id=" + encodeURIComponent(String(pick.id)) +
    "&lv=-1&kv=-1&tv=-1";
  const lyricRes = await fetch(lyricUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; BurgerChatLyrics/1.0)",
      "Accept": "application/json,text/plain,*/*",
    },
    cf: { cacheTtl: 3600, cacheEverything: true },
  });
  if (!lyricRes.ok) throw new Error("lyric " + lyricRes.status);
  const lyric = await lyricRes.json();
  const lrc = String((((lyric || {}).lrc || {}).lyric) || "").trim();
  const translation = String((((lyric || {}).tlyric || {}).lyric) || "").trim();
  if (!lrc) return null;
  const artists = (pick.artists || []).map((a) => a && a.name).filter(Boolean).join("/");
  return {
    provider: "netease",
    providerName: "网易云音乐",
    matchedTitle: String(pick.name || title),
    matchedArtist: artists || artist,
    lrc,
    translation,
    timed: (lrc.match(/\[\d{1,3}:\d{1,2}/g) || []).length,
  };
}

async function qqProvider(title, artist) {
  const q = [title, artist].filter(Boolean).join(" ");
  const searchUrl = "https://c.y.qq.com/soso/fcgi-bin/client_search_cp?format=json&p=1&n=5&w=" +
    encodeURIComponent(q);
  const searchRes = await fetch(searchUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; BurgerChatLyrics/1.0)",
      "Referer": "https://y.qq.com/",
      "Accept": "application/json,text/plain,*/*",
    },
    cf: { cacheTtl: 1800, cacheEverything: true },
  });
  if (!searchRes.ok) throw new Error("qq search " + searchRes.status);
  const search = await searchRes.json();
  const songs = (((search || {}).data || {}).song || {}).list || [];
  if (!songs.length) return null;
  const pick = songs.find((s) => String(s.songname || "").toLowerCase() === title.toLowerCase()) || songs[0];
  const lyricUrl = "https://c.y.qq.com/lyric/fcgi-bin/fcg_query_lyric_new.fcg?format=json&nobase64=1&songmid=" +
    encodeURIComponent(String(pick.songmid)) + "&g_tk=5381";
  const lyricRes = await fetch(lyricUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; BurgerChatLyrics/1.0)",
      "Referer": "https://y.qq.com/",
      "Accept": "application/json,text/plain,*/*",
    },
    cf: { cacheTtl: 3600, cacheEverything: true },
  });
  if (!lyricRes.ok) throw new Error("qq lyric " + lyricRes.status);
  const lyric = await lyricRes.json();
  const lrc = String((lyric || {}).lyric || "").trim();
  if (!lrc) return null;
  const singers = (pick.singer || []).map((a) => a && a.name).filter(Boolean).join("/");
  return {
    provider: "qqmusic",
    providerName: "QQ 音乐",
    matchedTitle: String(pick.songname || title),
    matchedArtist: singers || artist,
    lrc,
    translation: String((lyric || {}).trans || "").trim(),
    timed: (lrc.match(/\[\d{1,3}:\d{1,2}/g) || []).length,
  };
}

async function serveLyrics(request, env, ctx) {
  const url = new URL(request.url);
  const title = cleanQuery(url.searchParams.get("title"));
  const artist = cleanQuery(url.searchParams.get("artist"));
  const provider = cleanQuery(url.searchParams.get("provider"), 16) || "auto";
  if (!title) return jsonResponse({ ok: false, error: "missing title" }, 400);

  const cacheKey = new Request(url.toString(), { method: "GET" });
  const cache = caches.default;
  if (ctx && ctx.waitUntil) {
    const hit = await cache.match(cacheKey);
    if (hit) return hit;
  }

  const providers = provider === "qqmusic" ? [qqProvider] : provider === "netease" ? [neteaseProvider] : [qqProvider, neteaseProvider];
  const errors = [];
  for (const fn of providers) {
    try {
      const result = await fn(title, artist);
      if (result && result.lrc) {
        const response = jsonResponse({
          ok: true,
          query: { title, artist },
          ...result,
        }, 200, 21600);
        if (ctx && ctx.waitUntil) ctx.waitUntil(cache.put(cacheKey, response.clone()));
        return response;
      }
    } catch (error) {
      errors.push(String((error && error.message) || error));
    }
  }
  return jsonResponse({ ok: false, query: { title, artist }, errors }, 404, 0);
}

function bmJson(data, status = 200, cacheSeconds = 0) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,HEAD,OPTIONS",
    "Cache-Control": cacheSeconds > 0 ? `public, max-age=${cacheSeconds}` : "no-store",
  };
  return new Response(JSON.stringify(data), { status, headers });
}

function bmQuery(url, key, max = 180) {
  return cleanQuery(url.searchParams.get(key), max);
}

function bmNumber(value, max = 100) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.min(Math.floor(n), max) : 0;
}

function bmHttps(value) {
  return String(value || "").replace(/^http:/i, "https:");
}

function bmIdFromUrl(value) {
  try {
    return new URL(String(value || "")).searchParams.get("id") || "";
  } catch (error) {
    return "";
  }
}

function bmArtist(value) {
  if (Array.isArray(value)) return value.map((v) => (v && (v.name || v)).toString()).filter(Boolean).join(" / ");
  return String(value || "").trim();
}

function bmSong(source, item) {
  const id = String(item.id || "");
  return {
    id,
    source,
    name: String(item.name || "").trim(),
    artist: bmArtist(item.artist),
    album: String(item.album || "").trim(),
    cover: bmHttps(item.cover || ""),
    url: String(item.url || ""),
    lrc: String(item.lrc || ""),
    duration: Number(item.duration) || 0,
  };
}

async function bmFetch(url, options = {}) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA_MUSIC,
      "Accept": "application/json,text/plain,text/html,*/*",
      "Referer": options.referer || "https://music.163.com/",
      ...(options.headers || {}),
    },
    cf: { cacheTtl: options.cacheTtl || 600, cacheEverything: true },
    redirect: "follow",
  });
  return res;
}

async function bmText(url, options = {}) {
  const res = await bmFetch(url, options);
  if (!res.ok) throw new Error("upstream " + res.status);
  return res.text();
}

async function bmJsonFetch(url, options = {}) {
  const text = await bmText(url, options);
  return JSON.parse(text);
}

async function bmNeteaseMeta(id) {
  try {
    const data = await bmJsonFetch("https://music.163.com/api/v6/playlist/detail?id=" + encodeURIComponent(id), {
      referer: "https://music.163.com/",
      cacheTtl: 1800,
    });
    const playlist = (data && data.playlist) || {};
    return {
      title: String(playlist.name || ""),
      cover: bmHttps(playlist.coverImgUrl || playlist.picUrl || ""),
      count: Number(playlist.trackCount || 0),
      creator: String((playlist.creator && playlist.creator.nickname) || ""),
    };
  } catch (error) {
    return {};
  }
}

async function bmPageTitle(url, referer) {
  try {
    const html = await bmText(url, { referer, cacheTtl: 1800 });
    const match = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
    return match ? match[1].replace(/\s+/g, " ").trim() : "";
  } catch (error) {
    return "";
  }
}

async function bmMetingPlaylist(server, id) {
  const url = METING + "?" + new URLSearchParams({ server, type: "playlist", id }).toString();
  const data = await bmJsonFetch(url, { referer: "https://music.163.com/", cacheTtl: 900 });
  if (!Array.isArray(data)) throw new Error("playlist data unavailable");
  return data.map((item) => {
    const sid = bmIdFromUrl(item.url) || bmIdFromUrl(item.lrc) || bmIdFromUrl(item.pic) || "";
    return bmSong(server, {
      id: sid,
      name: item.name,
      artist: item.artist,
      cover: item.pic,
      url: item.url,
      lrc: item.lrc,
      duration: 0,
    });
  }).filter((t) => t.name && t.id);
}

async function bmNeteasePlaylist(id) {
  const tracks = await bmMetingPlaylist("netease", id);
  const meta = await bmNeteaseMeta(id);
  return {
    ok: true,
    source: "netease",
    sourceName: "网易云音乐",
    id,
    title: meta.title || "网易云歌单",
    cover: meta.cover || (tracks[0] && tracks[0].cover) || "",
    creator: meta.creator || "网易云音乐",
    count: tracks.length || meta.count,
    tracks,
  };
}

async function bmQQPlaylist(id) {
  const tracks = await bmMetingPlaylist("tencent", id);
  const page = await bmPageTitle("https://y.qq.com/n/ryqq/playlist/" + encodeURIComponent(id), "https://y.qq.com/");
  return {
    ok: true,
    source: "tencent",
    sourceName: "QQ 音乐",
    id,
    title: page.replace(/\s*-\s*QQ音乐.*$/i, "").replace(/\s*_QQ音乐.*$/i, "") || "QQ 音乐歌单",
    cover: (tracks[0] && tracks[0].cover) || "",
    creator: "QQ 音乐",
    count: tracks.length,
    tracks,
  };
}

async function bmKugouFetch(path) {
  const errors = [];
  for (const base of ["https://mobilecdn.kugou.com", "http://mobilecdn.kugou.com"]) {
    try {
      const res = await bmFetch(base + path, { referer: "https://www.kugou.com/", cacheTtl: 600 });
      if (!res.ok) throw new Error("upstream " + res.status);
      return await res.json();
    } catch (error) {
      errors.push(String((error && error.message) || error));
    }
  }
  throw new Error(errors.join(" | "));
}

function bmKugouTrack(item, index = 0) {
  const hash = String(item.hash || item.hash_128 || "").toUpperCase();
  const albumId = String(item.album_id || item.albumid || "");
  const fileName = String(item.filename || item.songname || "");
  let name = String(item.songname || "").trim();
  let artist = String(item.singername || "").trim();
  if (!name && fileName.includes(" - ")) {
    const parts = fileName.split(" - ");
    artist = parts.shift().trim();
    name = parts.join(" - ").trim();
  }
  return bmSong("kugou", {
    id: hash || ("kg-" + index + "-" + name),
    name,
    artist,
    album: String(item.album_name || "").trim(),
    cover: (String(item.union_cover || item.album_img || "").replace("{size}", "400")),
    url: "/api/bm/kugou-stream?" + new URLSearchParams({ hash, album_id: albumId }).toString(),
    duration: Number(item.duration || item.timelength || 0) > 10000
      ? Math.round(Number(item.duration || item.timelength) / 1000)
      : Number(item.duration || 0),
  });
}

async function bmKugouPlaylist(id) {
  const data = await bmKugouFetch("/api/v3/special/song?" + new URLSearchParams({
    specialid: id, page: "1", pagesize: "120", version: "8000",
  }).toString());
  const info = (((data || {}).data || {}).info) || [];
  if (!info.length) throw new Error("酷狗歌单为空或 ID 无效");
  const tracks = info.map(bmKugouTrack).filter((t) => t.name);
  const page = await bmPageTitle("https://www.kugou.com/yy/special/single/" + encodeURIComponent(id) + ".html", "https://www.kugou.com/");
  return {
    ok: true,
    source: "kugou",
    sourceName: "酷狗音乐",
    id,
    title: page.replace(/\s*_精选集_.*$/i, "").replace(/\s*_酷狗音乐.*$/i, "") || "酷狗精选集",
    cover: (tracks[0] && tracks[0].cover) || "",
    creator: "酷狗音乐",
    count: tracks.length,
    tracks,
  };
}

async function bmKugouSong(hash, albumId) {
  const data = await bmJsonFetch("https://m.kugou.com/app/i/getSongInfo.php?" + new URLSearchParams({
    cmd: "playInfo", hash, album_id: albumId || "",
  }).toString(), { referer: "https://m.kugou.com/", cacheTtl: 120 });
  return data || {};
}

async function bmKugouStream(url) {
  const hash = bmQuery(url, "hash", 64).toUpperCase();
  const albumId = bmQuery(url, "album_id", 32);
  if (!hash) return new Response("missing hash", { status: 400 });
  try {
    const data = await bmKugouSong(hash, albumId);
    const target = bmHttps(data.url || ((data.backup_url || [])[0]) || "");
    if (!target) return new Response("audio unavailable", { status: 404 });
    return new Response(null, {
      status: 302,
      headers: {
        "Location": target,
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    return new Response("audio resolve failed", { status: 502 });
  }
}

async function bmNeteaseSearch(keyword, limit) {
  const data = await bmJsonFetch("https://music.163.com/api/search/get/web?" + new URLSearchParams({
    csrf_token: "", s: keyword, type: "1", offset: "0", total: "true", limit: String(limit),
  }).toString(), { referer: "https://music.163.com/", cacheTtl: 600 });
  const songs = (((data || {}).result || {}).songs) || [];
  return songs.map((song) => bmSong("netease", {
    id: song.id,
    name: song.name,
    artist: (song.artists || []).map((a) => a.name).join(" / "),
    album: (song.album || {}).name || "",
    cover: METING + "?" + new URLSearchParams({ server: "netease", type: "pic", id: String(song.id) }).toString(),
    url: METING + "?" + new URLSearchParams({ server: "netease", type: "url", id: String(song.id) }).toString(),
    lrc: METING + "?" + new URLSearchParams({ server: "netease", type: "lrc", id: String(song.id) }).toString(),
    duration: Math.round(Number(song.duration || 0) / 1000),
  })).filter((t) => t.name && t.id);
}

async function bmQQSearch(keyword, limit) {
  const data = await bmJsonFetch("https://c.y.qq.com/soso/fcgi-bin/client_search_cp?" + new URLSearchParams({
    format: "json", p: "1", n: String(limit), w: keyword,
  }).toString(), { referer: "https://y.qq.com/", cacheTtl: 600 });
  const songs = ((((data || {}).data || {}).song || {}).list) || [];
  return songs.map((song) => bmSong("tencent", {
    id: song.songmid,
    name: song.songname,
    artist: (song.singer || []).map((s) => s.name).join(" / "),
    album: song.albumname || "",
    cover: METING + "?" + new URLSearchParams({ server: "tencent", type: "pic", id: String(song.songmid) }).toString(),
    url: METING + "?" + new URLSearchParams({ server: "tencent", type: "url", id: String(song.songmid) }).toString(),
    lrc: METING + "?" + new URLSearchParams({ server: "tencent", type: "lrc", id: String(song.songmid) }).toString(),
    duration: Number(song.interval) || 0,
  })).filter((t) => t.name && t.id);
}

async function bmKugouSearch(keyword, limit) {
  const data = await bmKugouFetch("/api/v3/search/song?" + new URLSearchParams({
    keyword, page: "1", pagesize: String(limit), version: "8000",
  }).toString());
  const songs = (((data || {}).data || {}).info) || [];
  return songs.map(bmKugouTrack).filter((t) => t.name);
}

async function bmSearch(url) {
  const keyword = bmQuery(url, "keyword", 80);
  const server = bmQuery(url, "server", 16) || "netease";
  const limit = bmNumber(url.searchParams.get("limit"), 24) || 12;
  if (!keyword) return bmJson({ ok: false, error: "missing keyword" }, 400);
  const map = { netease: bmNeteaseSearch, tencent: bmQQSearch, kugou: bmKugouSearch };
  const fn = map[server];
  if (!fn) return bmJson({ ok: false, error: "unknown server" }, 400);
  try {
    const tracks = await fn(keyword, limit);
    return bmJson({ ok: true, server, keyword, tracks }, 200, 300);
  } catch (error) {
    return bmJson({ ok: false, error: String((error && error.message) || error) }, 502);
  }
}

async function bmLyric(url) {
  const server = bmQuery(url, "server", 16) || "netease";
  const id = bmQuery(url, "id", 120);
  const hash = bmQuery(url, "hash", 64);
  const duration = bmNumber(url.searchParams.get("duration"), 100000);
  try {
    if (server === "kugou") {
      if (!hash) return bmJson({ ok: false, error: "missing hash" }, 400);
      const query = new URLSearchParams({ cmd: "100", hash, timelength: String((duration || 200) * 1000) });
      const lrc = await bmText("https://m.kugou.com/app/i/krc.php?" + query.toString(), {
        referer: "https://m.kugou.com/", cacheTtl: 3600,
      });
      return bmJson({ ok: true, server, lrc }, 200, 3600);
    }
    if (!id) return bmJson({ ok: false, error: "missing id" }, 400);
    const metingServer = server === "tencent" ? "tencent" : "netease";
    const lrcUrl = METING + "?" + new URLSearchParams({ server: metingServer, type: "lrc", id }).toString();
    const lrc = await bmText(lrcUrl, { referer: "https://music.163.com/", cacheTtl: 3600 });
    return bmJson({ ok: true, server: metingServer, lrc }, 200, 3600);
  } catch (error) {
    return bmJson({ ok: false, error: String((error && error.message) || error) }, 502);
  }
}

async function bmPlaylist(url) {
  const source = bmQuery(url, "source", 16) || "netease";
  const id = bmQuery(url, "id", 80);
  if (!id) return bmJson({ ok: false, error: "missing playlist id" }, 400);
  try {
    const map = { netease: bmNeteasePlaylist, tencent: bmQQPlaylist, kugou: bmKugouPlaylist };
    const fn = map[source];
    if (!fn) return bmJson({ ok: false, error: "unknown source" }, 400);
    return bmJson(await fn(id), 200, 900);
  } catch (error) {
    return bmJson({ ok: false, source, id, error: String((error && error.message) || error) }, 502);
  }
}

async function bmApi(request) {
  const url = new URL(request.url);
  const action = url.pathname.slice(BM_PREFIX.length).replace(/\/$/, "");
  if (action === "playlist") return bmPlaylist(url);
  if (action === "search") return bmSearch(url);
  if (action === "lyric") return bmLyric(url);
  if (action === "kugou-stream") return bmKugouStream(url);
  if (action === "kugou-url") {
    const hash = bmQuery(url, "hash", 64).toUpperCase();
    try {
      const data = await bmKugouSong(hash, bmQuery(url, "album_id", 32));
      return bmJson({
        ok: !!data.url,
        url: bmHttps(data.url || ""),
        backup: bmHttps(((data.backup_url || [])[0]) || ""),
        name: data.songName || "",
        artist: data.singerName || "",
      }, 200, 60);
    } catch (error) {
      return bmJson({ ok: false, error: String((error && error.message) || error) }, 502);
    }
  }
  return bmJson({ ok: false, error: "not found" }, 404);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET,HEAD,OPTIONS",
          "Access-Control-Allow-Headers": "Range,Content-Type",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    if (url.pathname.startsWith(MUSIC_PREFIX)) {
      return serveMusic(request, env);
    }

    if (url.pathname.startsWith(BM_PREFIX)) {
      return bmApi(request);
    }

    if (url.pathname === LYRICS_PATH) {
      return serveLyrics(request, env, ctx);
    }

    if (url.pathname === "/api/latest") {
      const assetUrl = new URL("/api/latest-v065", url.origin).toString();
      const upstream = await env.ASSETS.fetch(
        new Request(assetUrl, { method: "GET", headers: { Accept: "application/json" } })
      );
      const headers = new Headers(upstream.headers);
      headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
      headers.set("Pragma", "no-cache");
      return new Response(upstream.body, { status: upstream.status, headers });
    }

    return env.ASSETS.fetch(request);
  },
};
