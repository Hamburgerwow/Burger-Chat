'use strict';
/* Burger Chat 官网静态服务 + 安装包转发（同源下载，避免跨域下载被浏览器拦）。
   零依赖，只发同目录文件。 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT || 54971);
/* 发布端在 NAS 本机上：容器里 172.17.0.1 是宿主网关，主机 IP 作为备选（有些系统会拦容器到宿主的网段） */
const PUB_HOSTS = (process.env.PUB_HOSTS || '172.17.0.1,192.168.31.185').split(',').map(s => s.trim()).filter(Boolean);
const PUB_PORT = Number(process.env.PUB_PORT || 54970);
const ROOT = __dirname;
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8'
};

/* /api/latest ：把发布端的版本信息转发过来，公网访问官网时走同源，不依赖其它公网入口 */
function proxyJson(req, res) {
  let hostIdx = 0;
  const tryNext = () => {
    if (hostIdx >= PUB_HOSTS.length) {
      try { res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' }); res.end('{"error":"发布端没响应"}'); } catch (e) {}
      return;
    }
    const host = PUB_HOSTS[hostIdx++];
    const up = http.request({ host, port: PUB_PORT, path: '/api/latest', method: 'GET' }, r => {
      if (r.statusCode !== 200) { r.resume(); return tryNext(); }
      let buf = '';
      r.setEncoding('utf8');
      r.on('data', c => { buf += c; });
      r.on('end', () => {
        try {
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
          res.end(buf);
        } catch (e) {}
      });
    });
    up.setTimeout(8000, () => { up.destroy(new Error('timeout')); });
    up.on('error', () => { tryNext(); });
    up.end();
  };
  tryNext();
}

/* /dl?id=xxx&name=yyy ：把发布端的 /f/<id> 原样转发过来，页面和下载同源，可以随便重复点 */
function proxyFile(req, res, q) {
  const id = String(q.get('id') || '').replace(/[^\w\-]/g, '');
  if (!id) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('缺少文件 id');
  }
  let name = String(q.get('name') || 'download.bin');
  name = name.replace(/[\\/:*?"<>|\r\n]/g, '_').slice(0, 120) || 'download.bin';
  let hostIdx = 0;
  const tryNext = () => {
    if (hostIdx >= PUB_HOSTS.length) {
      try {
        if (!res.headersSent) res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('发布端没响应');
      } catch (e) {}
      return;
    }
    const host = PUB_HOSTS[hostIdx++];
    const up = http.request({
      host, port: PUB_PORT, path: '/f/' + id, method: 'GET',
      headers: { 'Accept-Encoding': 'identity' }
    }, r => {
      if (r.statusCode !== 200) {
        r.resume();
        if (r.statusCode === 404) {
          try {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('发布端取不到这个安装包');
          } catch (e) {}
          return;
        }
        return tryNext();
      }
      res.writeHead(200, {
        'Content-Type': r.headers['content-type'] || 'application/octet-stream',
        'Content-Length': r.headers['content-length'] || '',
        'Content-Disposition': "attachment; filename*=UTF-8''" + encodeURIComponent(name),
        'Cache-Control': 'no-store'
      });
      r.pipe(res);
    });
    up.setTimeout(8000, () => { up.destroy(new Error('timeout')); });
    up.on('error', () => { if (!res.headersSent) tryNext(); });
    req.on('close', () => { try { up.destroy(); } catch (e) {} });
    up.end();
  };
  tryNext();
}

http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('只支持 GET');
  }
  let url;
  try { url = new URL(req.url, 'http://x'); } catch (e) { url = null; }
  if (!url) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('400');
  }
  if (url.pathname === '/dl') return proxyFile(req, res, url.searchParams);
  if (url.pathname === '/api/latest') return proxyJson(req, res);

  let p = url.pathname;
  try { p = decodeURIComponent(p); } catch (e) { p = '/'; }
  if (p === '/' || p === '') p = '/index.html';
  if (p.indexOf('..') >= 0) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('403');
  }
  const f = path.join(ROOT, p);
  fs.readFile(f, (e, buf) => {
    if (e) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' });
      return res.end('404 没有这个页面');
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    res.end(req.method === 'HEAD' ? undefined : buf);
  });
}).listen(PORT, () => console.log('Burger Chat 官网已启动，端口 ' + PORT + '，发布端 ' + PUB_HOSTS.join('/') + ':' + PUB_PORT));
