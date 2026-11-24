const MUSIC_PREFIX = "/assets/music/";
const LYRICS_PATH = "/api/lyrics";

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

  const providers = provider === "qqmusic" ? [qqProvider] : provider === "netease" ? [neteaseProvider] : [neteaseProvider, qqProvider];
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
