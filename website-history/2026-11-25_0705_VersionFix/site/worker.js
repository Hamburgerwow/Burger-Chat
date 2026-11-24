const MUSIC_PREFIX = "/assets/music/";

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

export default {
  async fetch(request, env) {
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

    if (url.pathname === "/api/latest") {
      const assetUrl = new URL("/api/latest-v057", url.origin).toString();
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
