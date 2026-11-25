import { accountApi } from "./account.js";
const MUSIC_PREFIX = "/assets/music/";
const LYRICS_PATH = "/api/lyrics";
const BM_PREFIX = "/api/bm/";
const METING = "https://api.injahow.cn/meting/";
const BM_NETEASE_MIRRORS = ["https://api.qijieya.cn/meting/", "https://api.injahow.cn/meting/"];
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
    cf: options.noCache ? { cacheEverything: false } : { cacheTtl: options.cacheTtl || 600, cacheEverything: true },
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

async function bmJinaJson(target, cacheTtl = 60) {
  const url = "https://r.jina.ai/" + encodeURIComponent(target);
  const res = await fetch(url, {
    headers: { "User-Agent": UA_MUSIC, "Accept": "text/plain,*/*" },
    cf: { cacheTtl: cacheTtl, cacheEverything: true },
    redirect: "follow",
  });
  if (!res.ok) throw new Error("jina " + res.status);
  const text = await res.text();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("jina empty");
  return JSON.parse(text.slice(start, end + 1));
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

async function bmNeteaseTracks(id) {
  const data = await bmJsonFetch("https://music.163.com/api/v6/playlist/detail?id=" + encodeURIComponent(id) + "&n=1000&s=0", {
    referer: "https://music.163.com/",
    cacheTtl: 900,
  });
  const list = (data && data.playlist && data.playlist.tracks) || [];
  return list.map((track) =>
    bmSong("netease", {
      id: track.id,
      name: track.name,
      artist: track.ar || track.artists || [],
      album: (track.al && track.al.name) || track.album || "",
      cover: bmPicSize((track.al && track.al.picUrl) || track.album || ""),
      url: METING + "?" + new URLSearchParams({ server: "netease", type: "url", id: String(track.id) }).toString(),
      lrc: METING + "?" + new URLSearchParams({ server: "netease", type: "lrc", id: String(track.id) }).toString(),
      duration: track.dt ? Number(track.dt) / 1000 : (track.duration ? Number(track.duration) / 1000 : 0),
    })
  ).filter((t) => t.name && t.id);
}

async function bmNeteasePlaylist(id) {
  let tracks = [];
  try {
    tracks = await bmNeteaseTracks(id);
  } catch (error) {
    tracks = [];
  }
  if (!tracks.length) tracks = await bmMetingPlaylist("netease", id);
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

async function bmQQMeta(id) {
  try {
    const url = "https://c.y.qq.com/qzone/fcg-bin/fcg_ucc_getcdinfo_byids_cp.fcg?type=1&json=1&utf8=1&onlysong=0&disstid=" +
      encodeURIComponent(id) + "&format=json&g_tk=5381";
    const data = await bmJsonFetch(url, { referer: "https://y.qq.com/", cacheTtl: 1800 });
    const cd = ((data && data.cdlist) || [])[0] || {};
    return {
      title: String(cd.dissname || "").trim(),
      cover: String(cd.logo || "").replace(/^http:/, "https:"),
      creator: String(cd.nickname || "").trim(),
      songs: (cd.songlist || []).map((song) => ({
        mid: String(song.songmid || song.mid || ""),
        albummid: String(song.albummid || (song.album && song.album.mid) || ""),
        name: String(song.songname || song.name || song.title || "").trim(),
        singer: bmArtist(song.singer || song.singers || []),
        album: String((song.albumname || (song.album && song.album.name) || "")).trim(),
        interval: Number(song.interval) || 0,
      })).filter((song) => song.mid && song.albummid),
    };
  } catch (error) {
    return {};
  }
}

async function bmQQPlaylist(id) {
  const tracks = await bmMetingPlaylist("tencent", id);
  const meta = await bmQQMeta(id);
  const albumCovers = {};
  const metaByMid = {};
  (meta.songs || []).forEach((song) => {
    albumCovers[song.mid] = "https://y.gtimg.cn/music/photo_new/T002R300x300M000" + song.albummid + ".jpg";
    metaByMid[song.mid] = song;
  });
  tracks.forEach((track) => {
    if (albumCovers[track.id]) track.cover = albumCovers[track.id];
    const info = metaByMid[track.id];
    if (info) {
      if (!track.name && info.name) track.name = info.name;
      if ((!track.artist || track.artist === "未知歌手") && info.singer) track.artist = info.singer;
      if (!track.album && info.album) track.album = info.album;
      if (!track.duration && info.interval) track.duration = info.interval;
    }
  });
  return {
    ok: true,
    source: "tencent",
    sourceName: "QQ 音乐",
    id,
    title: meta.title || "QQ 音乐歌单",
    cover: meta.cover || (tracks[0] && tracks[0].cover) || "",
    creator: meta.creator || "QQ 音乐",
    count: tracks.length,
    tracks,
  };
}

function bmMd5(input) {
  const text = String(input || "");
  const bytes = Array.from(new TextEncoder().encode(text));
  const bitLen = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  for (let i = 0; i < 4; i++) bytes.push((bitLen >>> (8 * i)) & 0xff);
  for (let i = 0; i < 4; i++) bytes.push(0);
  const words = [];
  for (let i = 0; i < bytes.length; i += 4) {
    words.push(((bytes[i] | (bytes[i + 1] << 8) | (bytes[i + 2] << 16) | (bytes[i + 3] << 24)) >>> 0));
  }
  const K = [
    0xd76aa478,0xe8c7b756,0x242070db,0xc1bdceee,0xf57c0faf,0x4787c62a,0xa8304613,0xfd469501,
    0x698098d8,0x8b44f7af,0xffff5bb1,0x895cd7be,0x6b901122,0xfd987193,0xa679438e,0x49b40821,
    0xf61e2562,0xc040b340,0x265e5a51,0xe9b6c7aa,0xd62f105d,0x02441453,0xd8a1e681,0xe7d3fbc8,
    0x21e1cde6,0xc33707d6,0xf4d50d87,0x455a14ed,0xa9e3e905,0xfcefa3f8,0x676f02d9,0x8d2a4c8a,
    0xfffa3942,0x8771f681,0x6d9d6122,0xfde5380c,0xa4beea44,0x4bdecfa9,0xf6bb4b60,0xbebfbc70,
    0x289b7ec6,0xeaa127fa,0xd4ef3085,0x04881d05,0xd9d4d039,0xe6db99e5,0x1fa27cf8,0xc4ac5665,
    0xf4292244,0x432aff97,0xab9423a7,0xfc93a039,0x655b59c3,0x8f0ccc92,0xffeff47d,0x85845dd1,
    0x6fa87e4f,0xfe2ce6e0,0xa3014314,0x4e0811a1,0xf7537e82,0xbd3af235,0x2ad7d2bb,0xeb86d391,
  ];
  const S = [7,12,17,22,7,12,17,22,7,12,17,22,7,12,17,22,5,9,14,20,5,9,14,20,5,9,14,20,5,9,14,20,4,11,16,23,4,11,16,23,4,11,16,23,4,11,16,23,6,10,15,21,6,10,15,21,6,10,15,21,6,10,15,21];
  const rol = (x, n) => ((x << n) | (x >>> (32 - n))) | 0;
  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
  for (let off = 0; off < words.length; off += 16) {
    let A = a0, B = b0, C = c0, D = d0;
    for (let i = 0; i < 64; i++) {
      let F, g;
      if (i < 16) { F = (B & C) | (~B & D); g = i; }
      else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
      else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; }
      else { F = C ^ (B | ~D); g = (7 * i) % 16; }
      const tmp = D;
      D = C; C = B;
      B = (B + rol((A + F + K[i] + words[off + g]) | 0, S[i])) | 0;
      A = tmp;
    }
    a0 = (a0 + A) | 0; b0 = (b0 + B) | 0; c0 = (c0 + C) | 0; d0 = (d0 + D) | 0;
  }
  const hex = (n) => {
    let out = "";
    for (let i = 0; i < 4; i++) out += ((n >>> (i * 8)) & 0xff).toString(16).padStart(2, "0");
    return out;
  };
  return hex(a0) + hex(b0) + hex(c0) + hex(d0);
}

function bmKugouSignature(params, secret, body = "") {
  const sorted = String(params).split("&").filter(Boolean).sort().join("");
  return bmMd5(secret + sorted + body + secret);
}

function bmKugouShareTracks(html) {
  const clean = String(html || "")
    .replace(/&#34;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"').replace(/&amp;/g, "&");
  const found = [];
  const re = /dataobj='([^']+)'/g;
  let match;
  while ((match = re.exec(clean))) {
    try {
      const rows = JSON.parse(match[1]);
      if (Array.isArray(rows)) found.push(...rows);
    } catch (error) {}
  }
  const seen = new Set();
  const tracks = [];
  for (const row of found) {
    const hash = String((row && (row.Hash || row.hash)) || "").toUpperCase();
    if (!/^[0-9A-F]{32}$/.test(hash) || seen.has(hash)) continue;
    seen.add(hash);
    const track = bmKugouTrack({
      hash,
      filename: String(row.FileName || row.filename || ""),
      album_id: row.albumId || row.album_id || "",
      duration: row.timeLen || row.duration || 0,
    }, tracks.length);
    if (track.name) tracks.push(track);
  }
  return tracks;
}

async function bmKugouSharePlaylist(shareUrl) {
  let res = await bmFetch(shareUrl, { referer: "https://m.kugou.com/", cacheTtl: 600 });
  if (!res.ok) throw new Error("酷狗分享页 " + res.status);
  let html = await res.text();
  let tracks = bmKugouShareTracks(html);
  if (!tracks.length) {
    try {
      const finalUrl = new URL(res.url || shareUrl);
      const gcid = finalUrl.searchParams.get("global_collection_id") || "";
      const chain = finalUrl.searchParams.get("chain") || "";
      if (gcid) {
        const canonical = "https://wwwapi.kugou.com/share/zlist.html?global_collection_id=" +
          encodeURIComponent(gcid) + (chain ? "&chain=" + encodeURIComponent(chain) : "");
        res = await bmFetch(canonical, { referer: "https://m.kugou.com/", cacheTtl: 600 });
        html = await res.text();
        tracks = bmKugouShareTracks(html);
      }
    } catch (error) {}
  }
  if (!tracks.length) throw new Error("酷狗分享页未找到可播放歌曲");
  return {
    ok: true,
    source: "kugou",
    sourceName: "酷狗音乐",
    id: String(res.url || shareUrl),
    title: "酷狗分享歌单",
    cover: (tracks[0] && tracks[0].cover) || "",
    creator: "酷狗音乐",
    count: tracks.length,
    tracks,
  };
}

async function bmKugouCodePlaylist(code) {
  const body = {
    appid: 1001, clientver: 9020,
    mid: "21511157a05844bd085308bc76ef3343",
    clienttime: Math.floor(Date.now() / 1000),
    key: "36164c4015e704673c588ee202b9ecb8",
    data: String(code),
  };
  const res = await fetch("https://t.kugou.com/command/", {
    method: "POST",
    headers: { "User-Agent": UA_MUSIC, "Content-Type": "application/json", "Referer": "https://m.kugou.com/" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  const row = (data && data.data && data.data[0]) || {};
  const info = row.info || {};
  if (info.global_collection_id) {
    return await bmKugouSharePlaylist("https://wwwapi.kugou.com/share/zlist.html?global_collection_id=" + encodeURIComponent(info.global_collection_id));
  }
  if (info.id && Number(info.type) !== 4) {
    return await bmKugouPlaylist(String(info.id));
  }
  throw new Error("酷狗码已失效");
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
    cover: (String(item.union_cover || item.album_img || (item.trans_param && item.trans_param.union_cover) || "").replace(/\{size\}/g, "400") ||
      (albumId ? "https://imge.kugou.com/stdmusic/400/" + encodeURIComponent(albumId) + ".jpg" : "")),
    url: "/burger-music/api/bm/kugou-stream?" + new URLSearchParams({ hash, album_id: albumId }).toString(),
    duration: (() => {
      const raw = Number(item.duration || item.timelength || 0);
      return raw > 10000 ? Math.round(raw / 1000) : Math.max(0, Math.round(raw));
    })(),
  });
}

async function bmKugouPlaylist(id) {
  const cleanId = String(id || "").trim();
  if (cleanId.startsWith("chain:")) {
    const code = cleanId.slice(6);
    return await bmKugouSharePlaylist("https://t.kugou.com/" + encodeURIComponent(code));
  }
  if (cleanId.startsWith("gcid:")) {
    const gcid = cleanId.slice(5);
    if (gcid.startsWith("collection_")) {
      return await bmKugouSharePlaylist("https://wwwapi.kugou.com/share/zlist.html?global_collection_id=" + encodeURIComponent(gcid));
    }
  }
  if (cleanId.startsWith("code:")) {
    const code = cleanId.slice(5);
    try { return await bmKugouCodePlaylist(code); } catch (error) {}
    try { return await bmKugouPlaylist(code); }
    catch (error) { throw new Error("酷狗码已失效或需要改用分享链接"); }
  }
  const data = await bmKugouFetch("/api/v3/special/song?" + new URLSearchParams({
    specialid: cleanId, page: "1", pagesize: "120", version: "8000",
  }).toString());
  const info = (((data || {}).data || {}).info) || [];
  if (!info.length) throw new Error("酷狗歌单为空或 ID 无效");
  const tracks = info.map(bmKugouTrack).filter((t) => t.name);
  const page = await bmPageTitle("https://www.kugou.com/yy/special/single/" + encodeURIComponent(cleanId) + ".html", "https://www.kugou.com/");
  return {
    ok: true,
    source: "kugou",
    sourceName: "酷狗音乐",
    id: cleanId,
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
  }).toString(), { referer: "https://m.kugou.com/", noCache: true });
  return data || {};
}

async function bmKugouSongViaJina(hash, albumId) {
  const target = "https://m.kugou.com/app/i/getSongInfo.php?" + new URLSearchParams({
    cmd: "playInfo", hash, album_id: albumId || "",
  }).toString();
  return await bmJinaJson(target, 60);
}

async function bmKugouStream(url) {
  const hash = bmQuery(url, "hash", 64).toUpperCase();
  const albumId = bmQuery(url, "album_id", 32);
  if (!hash) return new Response("missing hash", { status: 400 });
  try {
    let data = {};
    try { data = await bmKugouSong(hash, albumId); } catch (error) {}
    let target = bmHttps(data.url || ((data.backup_url || [])[0]) || "");
    if (!target) {
      try {
        data = await bmKugouSongViaJina(hash, albumId);
        target = bmHttps(data.url || ((data.backup_url || [])[0]) || "");
      } catch (error) {}
    }
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

function bmPicSize(url) {
  const value = bmHttps(url || "");
  if (!value) return "";
  if (!/music\.126\.net|126\.net/i.test(value)) return value;
  if (/param=/.test(value)) return value;
  return value + (value.includes("?") ? "&" : "?") + "param=240y240";
}

function bmNeteaseSongFromSearch(song, cloud) {
  const artists = cloud ? (song.ar || []) : (song.artists || []);
  const album = cloud ? (song.al || {}) : (song.album || {});
  const duration = cloud ? Number(song.dt || 0) : Number(song.duration || 0);
  return bmSong("netease", {
    id: song.id,
    name: song.name,
    artist: artists.map((a) => a && a.name).filter(Boolean).join(" / "),
    album: album.name || "",
    cover: bmPicSize(album.picUrl || "") || (METING + "?" + new URLSearchParams({ server: "netease", type: "pic", id: String(song.id) }).toString()),
    url: METING + "?" + new URLSearchParams({ server: "netease", type: "url", id: String(song.id) }).toString(),
    lrc: METING + "?" + new URLSearchParams({ server: "netease", type: "lrc", id: String(song.id) }).toString(),
    duration: Math.round(duration / 1000),
  });
}

async function bmNeteaseSearch(keyword, limit) {
  try {
    const cloud = await bmJsonFetch("https://music.163.com/api/cloudsearch/pc?" + new URLSearchParams({
      s: keyword, type: "1", offset: "0", limit: String(limit),
    }).toString(), { referer: "https://music.163.com/", cacheTtl: 300 });
    const songs = (((cloud || {}).result || {}).songs) || [];
    if (songs.length) return songs.map((song) => bmNeteaseSongFromSearch(song, true)).filter((t) => t.name && t.id);
  } catch (error) { /* fall back to the legacy endpoint */ }
  const data = await bmJsonFetch("https://music.163.com/api/search/get/web?" + new URLSearchParams({
    csrf_token: "", s: keyword, type: "1", offset: "0", total: "true", limit: String(limit),
  }).toString(), { referer: "https://music.163.com/", cacheTtl: 300 });
  const songs = (((data || {}).result || {}).songs) || [];
  return songs.map((song) => bmNeteaseSongFromSearch(song, false)).filter((t) => t.name && t.id);
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

function bmNormName(value) {
  return String(value || "").toLowerCase().replace(/[\s·・\-_—()（）[\]【】,.，。!！?？'"“”]/g, "");
}

function bmArtistMatches(trackArtist, wanted) {
  const hay = bmNormName(trackArtist);
  return String(wanted || "").split(/[\/&,，、\s]+/).filter(Boolean)
    .some((name) => name.length > 1 && hay.includes(bmNormName(name)));
}

async function bmFindNeteaseMatch(name, artist) {
  const keyword = [name, artist].filter(Boolean).join(" ").trim();
  if (!keyword) return null;
  const tracks = await bmNeteaseSearch(keyword, 8);
  const wanted = bmNormName(name);
  const exact = tracks.filter((track) => bmNormName(track.name) === wanted);
  return exact.find((track) => bmArtistMatches(track.artist, artist)) || exact[0] || null;
}

async function bmNeteaseAudioUrl(id) {
  const songId = String(id || "").trim();
  if (!songId) return "";
  try {
    const query = new URLSearchParams({ ids: "[" + songId + "]", br: "128000" });
    const data = await bmJsonFetch("https://music.163.com/api/song/enhance/player/url?" + query.toString(), {
      referer: "https://music.163.com/",
      cacheTtl: 30,
    });
    const item = (data && data.data && data.data[0]) || {};
    const direct = bmHttps(item.url || "");
    if (direct) return direct;
  } catch (error) {}
  // 兜底一：网易官方外层地址（302 跳到真实 mp3），手动跟随跳转拿到最终直链
  const outer = "https://music.163.com/song/media/outer/url?id=" + encodeURIComponent(songId) + ".mp3";
  const followManual = async (target) => {
    try {
      const res = await fetch(target, {
        redirect: "manual",
        headers: { "User-Agent": UA_MUSIC, "Referer": "https://music.163.com/" },
      });
      const loc = (res.headers.get("Location") || "").replace(/^http:/i, "https:");
      if (res.status >= 300 && res.status < 400 && /music\.126\.net\/.+\.mp3/i.test(loc)) return loc;
      const ctype = (res.headers.get("Content-Type") || "").toLowerCase();
      if (res.ok && /audio|octet-stream/.test(ctype) && /\.mp3/i.test(target)) return target;
    } catch (error) {}
    return "";
  };
  const fromOuter = await followManual(outer);
  if (fromOuter) return fromOuter;
  // 兜底二：第三方 meting 镜像（网易官方地址在 Cloudflare 出口常被判 404）
  for (const mirror of BM_NETEASE_MIRRORS) {
    const hit = await followManual(mirror + "?" + new URLSearchParams({ server: "netease", type: "url", id: songId }).toString());
    if (hit) return hit;
  }
  return "";
}

async function bmResolveAudio(url) {
  const source = bmQuery(url, "source", 16) || "netease";
  const id = bmQuery(url, "id", 120);
  const name = bmQuery(url, "name", 120);
  const artist = bmQuery(url, "artist", 120);
  const hash = bmQuery(url, "hash", 64).toUpperCase();
  const albumId = bmQuery(url, "album_id", 32);

  if (source === "netease" && id) {
    const direct = await bmNeteaseAudioUrl(id);
    if (direct) {
      return bmJson({ ok: true, source, url: direct, matched: "netease" }, 200, 30);
    }
    return bmJson({
      ok: true, source, url: METING + "?" + new URLSearchParams({ server: "netease", type: "url", id }).toString(),
    }, 200, 120);
  }

  if (source === "kugou" && hash) {
    try {
      const data = await bmKugouSong(hash, albumId);
      const target = bmHttps(data.url || ((data.backup_url || [])[0]) || "");
      if (target) return bmJson({ ok: true, source, url: target, matched: "kugou" }, 200, 60);
    } catch (error) { /* the browser-side resolver handles this next */ }
  }

  try {
    const match = await bmFindNeteaseMatch(name, artist);
    if (match && match.id) {
      const direct = await bmNeteaseAudioUrl(match.id);
      if (direct) {
        return bmJson({
          ok: true,
          source: "netease",
          url: direct,
          matched: match.name,
          matchedArtist: match.artist,
        }, 200, 30);
      }
    }
  } catch (error) { /* fall through */ }

  return bmJson({ ok: false, error: "no playable source", source }, 200, 30);
}

async function bmQQCoverUrl(id) {
  try {
    const url = "https://c.y.qq.com/v8/fcg-bin/fcg_play_single_song.fcg?songmid=" +
      encodeURIComponent(id) + "&format=json&platform=yqq";
    const data = await bmJsonFetch(url, { referer: "https://y.qq.com/", cacheTtl: 86400 });
    const song = ((data && data.data) || [])[0] || {};
    const albummid = String(song.albummid || (song.album && song.album.mid) || "");
    return albummid ? "https://y.gtimg.cn/music/photo_new/T002R300x300M000" + albummid + ".jpg" : "";
  } catch (error) {
    return "";
  }
}

async function bmNeteaseCoverUrl(id) {
  if (!id) return "";
  try {
    const data = await bmJsonFetch("https://music.163.com/api/song/detail/?ids=[" + encodeURIComponent(id) + "]", {
      referer: "https://music.163.com/",
      cacheTtl: 86400,
    });
    const song = (data && data.songs && data.songs[0]) || {};
    const pic = bmPicSize((song.al && song.al.picUrl) || song.picUrl || "");
    if (pic) return pic;
  } catch (error) {}
  return METING + "?" + new URLSearchParams({ server: "netease", type: "pic", id: String(id) }).toString();
}

async function bmImage(url) {
  const source = bmQuery(url, "source", 16);
  let target = bmQuery(url, "url", 2048);
  if (source === "tencent") target = await bmQQCoverUrl(bmQuery(url, "id", 64));
  if (source === "netease") target = await bmNeteaseCoverUrl(bmQuery(url, "id", 64));
  if (source === "kugou") {
    const hash = bmQuery(url, "hash", 64).toUpperCase();
    const albumId = bmQuery(url, "album_id", 32);
    if (hash && (!target || /imge\.kugou\.com\/stdmusic\/400\/[0-9]+\.jpg/i.test(target))) {
      const data = await bmKugouSong(hash, albumId).catch(() => null);
      target = bmHttps(String((data && (data.album_img || data.img || (data.trans_param && data.trans_param.union_cover))) || "").replace(/\{size\}/g, "400"));
    }
  }
  if (!/^https?:\/\//i.test(target)) return new Response("invalid image url", { status: 400 });
  try {
    const host = new URL(target).hostname.toLowerCase();
    if (host === "localhost" || host === "0.0.0.0" || host.endsWith(".local") ||
        /^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host) ||
        /^169\.254\./.test(host) || /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) {
      return new Response("private host blocked", { status: 400 });
    }
    const referer = /qq\.com|gtimg|qqmusic/.test(host)
      ? "https://y.qq.com/"
      : /kugou/.test(host)
        ? "https://www.kugou.com/"
        : "https://music.163.com/";
    const upstream = await fetch(target, {
      headers: { "User-Agent": UA_MUSIC, "Accept": "image/*,*/*", "Referer": referer },
      redirect: "follow",
    });
    if (!upstream.ok) return new Response("image upstream " + upstream.status, { status: 502 });
    const type = upstream.headers.get("Content-Type") || "image/jpeg";
    if (!/image\//i.test(type)) return new Response("upstream returned non-image", { status: 502 });
    return new Response(upstream.body, {
      headers: {
        "Content-Type": type,
        "Cache-Control": "public, max-age=86400",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    return new Response("image upstream failed", { status: 502 });
  }
}

async function bmAudioStream(request, url) {
  const source = bmQuery(url, "source", 16);
  let target = bmQuery(url, "url", 2048);

  if (source === "netease") {
    let id = bmQuery(url, "id", 120);
    if (!id && /api\.injahow\.cn\/meting/i.test(target)) {
      try { id = new URL(target).searchParams.get("id") || ""; } catch (error) { id = ""; }
    }
    if (id) {
      const direct = await bmNeteaseAudioUrl(id);
      if (direct) target = direct;
      else if (/api\.injahow\.cn\/meting/i.test(target)) {
        return new Response("audio upstream unavailable", { status: 502 });
      }
    }
  }

  if (source === "kugou") {
    const hash = bmQuery(url, "hash", 64).toUpperCase();
    if (!hash) return new Response("missing hash", { status: 400 });
    try {
      const data = await bmKugouSong(hash, bmQuery(url, "album_id", 32));
      target = bmHttps(data.url || ((data.backup_url || [])[0]) || "");
    } catch (error) {}
    if (!target) {
      try {
        const data = await bmKugouSongViaJina(hash, bmQuery(url, "album_id", 32));
        target = bmHttps(data.url || ((data.backup_url || [])[0]) || "");
      } catch (error) {}
    }
  }

  // 兼容旧链接：meting 代理的网易地址统一换成真实 mp3 直链
  if (/^https?:\/\/(api\.injahow\.cn|api\.qijieya\.cn)\/meting/i.test(target)) {
    try {
      const p = new URL(target);
      const server = p.searchParams.get("server") || "";
      const mId = p.searchParams.get("id") || "";
      if (server === "netease" && mId) {
        const direct = await bmNeteaseAudioUrl(mId);
        if (direct) target = direct;
      }
    } catch (error) {}
  }

  if (!/^https?:\/\//i.test(target)) return new Response("invalid audio url", { status: 400 });
  try {
    const parsed = new URL(target);
    const host = parsed.hostname.toLowerCase();
    if (host === "localhost" || host === "0.0.0.0" || host.endsWith(".local") ||
        /^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host) ||
        /^169\.254\./.test(host) || /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) ||
        host === "[::1]") {
      return new Response("private host blocked", { status: 400 });
    }
  } catch (error) {
    return new Response("invalid audio url", { status: 400 });
  }

  const range = request.headers.get("Range");
  const host = new URL(target).hostname.toLowerCase();
  const referer = /kugou\.com|kugou\.net/.test(host)
    ? "https://www.kugou.com/"
    : /qq\.com|qqmusic|music\.qq/.test(host)
      ? "https://y.qq.com/"
      : "https://music.163.com/";

  let upstream;
  try {
    upstream = await fetch(target, {
      method: request.method === "HEAD" ? "HEAD" : "GET",
      headers: {
        "User-Agent": UA_MUSIC,
        "Accept": "audio/mpeg,audio/*,application/octet-stream,*/*",
        "Referer": referer,
        ...(range ? { "Range": range } : {}),
      },
      redirect: "follow",
      cf: { cacheEverything: false },
    });
  } catch (error) {
    return new Response("audio upstream failed", { status: 502 });
  }
  if (!upstream.ok && upstream.status !== 206) {
    return new Response("audio upstream " + upstream.status, { status: 502 });
  }

  const headers = {
    "Content-Type": upstream.headers.get("Content-Type") || "audio/mpeg",
    "Accept-Ranges": upstream.headers.get("Accept-Ranges") || "bytes",
    "Cache-Control": "public, max-age=3600",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges, Content-Type",
  };
  if (/text\/html|application\/json/i.test(headers["Content-Type"])) {
    return new Response("audio upstream returned non-audio", { status: 502 });
  }
  for (const name of ["Content-Length", "Content-Range", "ETag", "Last-Modified"]) {
    const value = upstream.headers.get(name);
    if (value) headers[name] = value;
  }
  return new Response(request.method === "HEAD" ? null : upstream.body, {
    status: upstream.status,
    headers,
  });
}

async function bmSourceText(url) {
  const target = bmQuery(url, "url", 2048);
  if (!/^https?:\/\//i.test(target)) return bmJson({ ok: false, error: "invalid url" }, 400);
  try {
    const parsed = new URL(target);
    const host = parsed.hostname.toLowerCase();
    if (host === "localhost" || host === "0.0.0.0" || host.endsWith(".local") ||
        /^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host) ||
        /^169\.254\./.test(host) || /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) {
      return bmJson({ ok: false, error: "private host blocked" }, 400);
    }
    const res = await bmFetch(target, { referer: "https://github.com/", cacheTtl: 60 });
    if (!res.ok) throw new Error("upstream " + res.status);
    const text = await res.text();
    if (!text || text.length < 20) throw new Error("empty script");
    if (text.length > 1200000) throw new Error("script too large");
    return bmJson({ ok: true, text, url: target }, 200, 600);
  } catch (error) {
    return bmJson({ ok: false, error: String((error && error.message) || error) }, 502);
  }
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
      return bmJson({ ok: true, server, lrc, trans: "" }, 200, 3600);
    }
    if (!id) return bmJson({ ok: false, error: "missing id" }, 400);

    if (server === "netease") {
      try {
        const data = await bmJsonFetch("https://music.163.com/api/song/lyric?id=" + encodeURIComponent(id) + "&lv=-1&tv=-1&kv=-1", {
          referer: "https://music.163.com/", cacheTtl: 3600,
        });
        const lrc = (data && data.lrc && data.lrc.lyric) || "";
        if (lrc) {
          return bmJson({
            ok: true, server: "netease", lrc,
            trans: (data.tlyric && data.tlyric.lyric) || "",
            roma: (data.romalrc && data.romalrc.lyric) || "",
          }, 200, 3600);
        }
      } catch (error) {}
    }

    if (server === "tencent") {
      try {
        const q = new URLSearchParams({ songmid: id, format: "json", nobase64: "1", g_tk: "5381" });
        const data = await bmJsonFetch("https://c.y.qq.com/lyric/fcgi-bin/fcg_query_lyric_new.fcg?" + q.toString(), {
          referer: "https://y.qq.com/", cacheTtl: 3600,
        });
        const unescape = (value) => String(value || "")
          .replace(/&apos;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
          .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
        const lrc = unescape(data && data.lyric);
        if (lrc) return bmJson({ ok: true, server: "tencent", lrc, trans: unescape(data.trans), roma: "" }, 200, 3600);
      } catch (error) {}
    }

    const metingServer = server === "tencent" ? "tencent" : "netease";
    const lrcUrl = METING + "?" + new URLSearchParams({ server: metingServer, type: "lrc", id }).toString();
    const lrc = await bmText(lrcUrl, { referer: "https://music.163.com/", cacheTtl: 3600 });
    return bmJson({ ok: true, server: metingServer, lrc, trans: "", roma: "" }, 200, 3600);
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

const METING_MIRRORS = [METING, "https://api.qijieya.cn/meting/"];

function bmMetingUrl(server, type, id, mirror) {
  if (!id) return "";
  return (mirror || METING) + "?" + new URLSearchParams({ server, type, id: String(id) }).toString();
}

function bmAudioReferer(target) {
  try {
    const host = new URL(target).hostname.toLowerCase();
    if (/kugou\.com|kugou\.net/.test(host)) return "https://www.kugou.com/";
    if (/qq\.com|qqmusic|gtimg/.test(host)) return "https://y.qq.com/";
  } catch (error) {}
  return "https://music.163.com/";
}

async function bmProbeAudio(target) {
  if (!/^https?:\/\//i.test(String(target || ""))) return { ok: false, status: 0, type: "" };
  try {
    const res = await fetch(target, {
      headers: {
        "User-Agent": UA_MUSIC,
        "Accept": "audio/mpeg,audio/*,*/*",
        "Referer": bmAudioReferer(target),
        "Range": "bytes=0-2047",
      },
      redirect: "follow",
    });
    const type = res.headers.get("Content-Type") || "";
    const ok = (res.status === 200 || res.status === 206) && /audio|mpeg|octet-stream/i.test(type);
    try { if (res.body) await res.body.cancel(); } catch (error) {}
    return { ok, status: res.status, type };
  } catch (error) {
    return { ok: false, status: 0, type: "" };
  }
}

function bmBestTrack(list, name, artist, duration) {
  const wanted = bmNormName(name);
  const all = Array.isArray(list) ? list.filter((t) => t && t.name) : [];
  const exact = all.filter((t) => bmNormName(t.name) === wanted);
  const pool = exact.length ? exact : all;
  const byArtist = pool.filter((t) => bmArtistMatches(t.artist, artist));
  const finalPool = byArtist.length ? byArtist : pool;
  if (duration) {
    finalPool.sort((a, b) => Math.abs(Number(a.duration || 0) - duration) - Math.abs(Number(b.duration || 0) - duration));
  }
  return finalPool[0] || null;
}

async function bmAutoSource(url) {
  const name = bmQuery(url, "name", 80);
  const artist = bmQuery(url, "artist", 80);
  const source = bmQuery(url, "source", 16);
  const id = bmQuery(url, "id", 64);
  const duration = Number(bmQuery(url, "duration", 16)) || 0;
  const cands = [];
  const add = (src, target, matched, provider) => {
    if (!target) return;
    if (cands.some((c) => c.url === target)) return;
    cands.push({ source: src, url: target, matched: matched || name, provider: provider || src });
  };

  if (source === "netease" && id) {
    METING_MIRRORS.forEach((m) => add("netease", bmMetingUrl("netease", "url", id, m), name, "网易云"));
  }
  if (source === "tencent" && id) {
    METING_MIRRORS.forEach((m) => add("tencent", bmMetingUrl("tencent", "url", id, m), name, "QQ"));
  }

  const keyword = [name, artist].filter(Boolean).join(" ").trim();
  if (keyword) {
    await Promise.all([
      bmNeteaseSearch(keyword, 6).then((list) => {
        const pick = bmBestTrack(list, name, artist, duration);
        if (!pick) return;
        METING_MIRRORS.forEach((m) => add("netease", bmMetingUrl("netease", "url", pick.id, m), pick.name, "网易云"));
      }).catch(() => {}),
      bmQQSearch(keyword, 6).then((list) => {
        const pick = bmBestTrack(list, name, artist, duration);
        if (!pick) return;
        METING_MIRRORS.forEach((m) => add("tencent", bmMetingUrl("tencent", "url", pick.id, m), pick.name, "QQ"));
      }).catch(() => {}),
      bmKugouSearch(keyword, 6).then(async (list) => {
        const pick = bmBestTrack(list, name, artist, duration);
        if (!pick) return;
        try {
          const info = await bmKugouSong(pick.id);
          const target = bmHttps(info.url || ((info.backup_url || [])[0]) || "");
          if (target) add("kugou", target, pick.name, "酷狗");
        } catch (error) {}
      }).catch(() => {}),
    ]);
  }

  const tried = [];
  for (const cand of cands.slice(0, 8)) {
    const probe = await bmProbeAudio(cand.url);
    tried.push({ provider: cand.provider, providerKey: cand.source, status: probe.status, ok: probe.ok });
    if (probe.ok) {
      let finalUrl = cand.url;
      // 网易候选尽量换成真实 mp3 直链，避免依赖第三方 meting 代理
      if (cand.source === "netease") {
        const idMatch = /[?&]id=([^&]+)/.exec(cand.url);
        if (idMatch) {
          const direct = await bmNeteaseAudioUrl(decodeURIComponent(idMatch[1]));
          if (direct) finalUrl = direct;
        }
      }
      return bmJson({
        ok: true,
        url: finalUrl,
        source: cand.source,
        provider: cand.provider,
        matched: cand.matched,
        tried,
      }, 200, 600);
    }
  }
  return bmJson({ ok: false, tried }, 200, 0);
}

async function bmApi(request) {
  const url = new URL(request.url);
  const action = url.pathname.slice(BM_PREFIX.length).replace(/\/$/, "");
  if (action === "playlist") return bmPlaylist(url);
  if (action === "search") return bmSearch(url);
  if (action === "lyric") return bmLyric(url);
  if (action === "resolve") return bmResolveAudio(url);
  if (action === "auto") return bmAutoSource(url);
  if (action === "source") return bmSourceText(url);
  if (action === "stream") return bmAudioStream(request, url);
  if (action === "image") return bmImage(url);
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
    let url = new URL(request.url);

    if (url.pathname === "/burger-music" || url.pathname === "/burger-music/") {
      const target = new URL(request.url);
      target.pathname = "/burger-music.html";
      request = new Request(target.toString(), request);
      url = new URL(request.url);
    } else if (url.pathname.startsWith("/burger-music/")) {
      const target = new URL(request.url);
      target.pathname = url.pathname.slice("/burger-music".length);
      request = new Request(target.toString(), request);
      url = new URL(request.url);
    }

    if (url.pathname.startsWith("/api/account/")) {
      return accountApi(request, env, url);
    }

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

    if (url.pathname === "/api/__warm-home" && url.searchParams.get("token") === "bcpurge28g") {
      const fresh = await env.ASSETS.fetch(new Request(new URL("/index.html", url.origin).toString(), { method: "GET" }));
      const html = await fresh.text();
      const headers = new Headers(fresh.headers);
      headers.set("Content-Type", "text/html; charset=utf-8");
      headers.set("Cache-Control", "public, max-age=300");
      const results = [];
      for (const p of ["/", "/?v=28c", "/?v=28e", "/?v=28f", "/index.html", "/index"]) {
        results.push([p, await caches.default.put(new Request(new URL(p, url.origin).toString(), { method: "GET" }), new Response(html, { status: 200, headers }))]);
      }
      return new Response(JSON.stringify({ ok: true, len: html.length, results }), {
        headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
      });
    }

    if (url.pathname === "/api/__purge-home" && url.searchParams.get("token") === "bcpurge28g") {
      const paths = ["/", "/index.html", "/index", "/index-tw.html", "/index-en.html", "/index-ja.html", "/index-ko.html"];
      const results = [];
      for (const p of paths) {
        results.push([p, await caches.default.delete(new Request(new URL(p, url.origin).toString(), { method: "GET" }))]);
      }
      return new Response(JSON.stringify({ ok: true, results }), {
        headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
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
      headers.set("Content-Type", "application/json; charset=utf-8");
      headers.set("Access-Control-Allow-Origin", "*");
      headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
      headers.set("Pragma", "no-cache");
      return new Response(upstream.body, { status: upstream.status, headers });
    }

    const lowerPath = url.pathname.toLowerCase();
    if (lowerPath === "/" || lowerPath === "/index.html" || lowerPath.startsWith("/index-")) {
      const upstream = await env.ASSETS.fetch(request);
      const headers = new Headers(upstream.headers);
      headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
      headers.set("CDN-Cache-Control", "no-store");
      headers.set("Pragma", "no-cache");
      return new Response(upstream.body, { status: upstream.status, headers });
    }

    return env.ASSETS.fetch(request);
  },
};



