/* 站点共用脚本：顶栏外观 · GitHub 版本号 · 三端统一账号（登录卡片 + 弹窗）
   任何新页面只要引入 <script src="/assets/site-shared.js?v=2" defer></script> 就会自动带上登录入口与弹窗。 */
(function () {
  "use strict";

  var LOOK_KEY = "bc:nav-look";
  var API = "/burger-music/api/account/";
  var USER_CACHE = "bm:account-user";
  var META_KEY = "bm:account-meta";
  var DATA_KEYS = ["bm:playlists", "bm:lx-sources", "bm:stats", "bm:ach", "bm:favorites", "bm:history", "bm:quality", "bm:lyric-trans", "bm:volume"];
  var $ = function (sel, root) { return (root || document).querySelector(sel); };

  /* ================= 顶栏外观 ================= */
  function readLook() {
    try { return JSON.parse(localStorage.getItem(LOOK_KEY) || "{}") || {}; } catch (e) { return {}; }
  }
  function saveLook(next) {
    try { localStorage.setItem(LOOK_KEY, JSON.stringify(next)); } catch (e) {}
  }
  function applyLook(look) {
    var blur = Math.max(0, Math.min(30, Number(look.blur == null ? 20 : look.blur)));
    var alpha = Math.max(0.2, Math.min(1, Number(look.alpha == null ? 0.76 : look.alpha)));
    var iconBg = look.iconBg || "rgba(255,255,255,.07)";
    var root = document.documentElement.style;
    root.setProperty("--tm-blur", blur + "px");
    root.setProperty("--tm-alpha", String(alpha));
    root.setProperty("--tm-ico-bg", iconBg);
  }

  function hexToRgba(hex) {
    var v = String(hex || "").replace("#", "");
    if (v.length !== 6) return "rgba(255,255,255,.07)";
    return "rgba(" + parseInt(v.slice(0, 2), 16) + "," + parseInt(v.slice(2, 4), 16) + "," + parseInt(v.slice(4, 6), 16) + ",.42)";
  }

  function bindLook() {
    var blur = $("#lookBlur"), alpha = $("#lookAlpha"), color = $("#lookIconBg"), reset = $("#lookReset");
    var look = readLook();
    applyLook(look);
    if (blur && look.blur != null) blur.value = look.blur;
    if (alpha && look.alpha != null) alpha.value = Math.round(Number(look.alpha) * 100);
    if (!blur && !alpha && !color) return;
    sync();
    function sync() {
      var bv = $("#lookBlurVal"), av = $("#lookAlphaVal"), cv = $("#lookIconBgc");
      if (bv && blur) bv.textContent = blur.value;
      if (av && alpha) av.textContent = alpha.value;
      if (cv && color) cv.textContent = String(color.value).toLowerCase();
    }
    function persist() {
      var next = { blur: blur ? Number(blur.value) : 20, alpha: alpha ? Number(alpha.value) / 100 : 0.76, iconBg: color ? hexToRgba(color.value) : "rgba(255,255,255,.07)" };
      saveLook(next); applyLook(next); sync();
    }
    if (blur) blur.addEventListener("input", persist);
    if (alpha) alpha.addEventListener("input", persist);
    if (color) color.addEventListener("input", persist);
    if (reset) reset.addEventListener("click", function () {
      if (blur) blur.value = 20;
      if (alpha) alpha.value = 76;
      if (color) color.value = "#1b1a1f";
      persist();
    });
  }

  /* ================= 顶栏菜单兜底开关 ================= */
  function placeMenu(menu, btn) {
    var pad = 8;
    var width = Math.min(344, Math.max(260, window.innerWidth - pad * 2));
    var rect = btn.getBoundingClientRect();
    var left = Math.max(pad, Math.min(window.innerWidth - width - pad, rect.left + rect.width / 2 - width / 2));
    var top = Math.max(pad, rect.bottom + 10);
    menu.style.width = Math.round(width) + "px";
    menu.style.left = Math.round(left) + "px";
    menu.style.top = Math.round(top) + "px";
    menu.style.maxHeight = Math.max(140, window.innerHeight - top - 12) + "px";
  }

  function menuFallback() {
    var menu = document.getElementById("topMenu");
    if (!menu) return;
    function open(btn) {
      menu.hidden = false;
      placeMenu(menu, btn);
      var btns = [document.getElementById("topMenuBtn"), document.getElementById("dockMenuBtn")];
      btns.forEach(function (b) { if (b) b.setAttribute("aria-expanded", "true"); });
    }
    function close() {
      menu.hidden = true;
      var btns = [document.getElementById("topMenuBtn"), document.getElementById("dockMenuBtn")];
      btns.forEach(function (b) { if (b) b.setAttribute("aria-expanded", "false"); });
    }
    window.BCMenu = { open: open, close: close };
    document.addEventListener("click", function (e) {
      var btn = e.target.closest ? e.target.closest("#topMenuBtn,#dockMenuBtn") : null;
      if (btn) {
        e.preventDefault();
        e.stopPropagation();
        if (menu.hidden) open(btn); else close();
        return;
      }
      if (menu.hidden) return;
      var closeBtn = e.target.closest ? e.target.closest("#tmClose") : null;
      if (closeBtn) { close(); return; }
      if (e.target.closest && e.target.closest("#topMenu")) return;
      close();
    }, true);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
    window.addEventListener("resize", function () { if (!menu.hidden) placeMenu(menu, document.getElementById("topMenuBtn") || document.getElementById("dockMenuBtn")); });
  }

  /* ================= 版本号（GitHub 优先） ================= */
  function setVersion(ver) {
    if (!ver) return;
    Array.prototype.forEach.call(document.querySelectorAll("[data-version]"), function (n) { n.textContent = ver; });
    var bm = document.getElementById("bmVersion"); if (bm) bm.textContent = "v" + ver;
    var dev = document.getElementById("devVer"); if (dev) dev.textContent = "v" + ver;
  }
  function githubVersion() {
    var CACHE = "bc:gh-version";
    try {
      var c = JSON.parse(localStorage.getItem(CACHE) || "{}");
      if (c && c.ver && Date.now() - c.at < 300000) setVersion(c.ver);
    } catch (e) {}
    var bases = ["https://gh-proxy.com/https://api.github.com", "https://api.github.com"];
    var i = 0;
    (function run() {
      if (i >= bases.length) return;
      fetch(bases[i++] + "/repos/Hamburgerwow/Burger-Chat/releases/latest", { cache: "no-store", headers: { Accept: "application/vnd.github+json" } })
        .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
        .then(function (d) {
          var tag = d && (d.tag_name || d.name);
          if (!tag) throw new Error("no tag");
          var ver = String(tag).replace(/^v/i, "").trim();
          if (!/^\d+(\.\d+)+/.test(ver)) throw new Error("bad tag");
          setVersion(ver);
          try { localStorage.setItem(CACHE, JSON.stringify({ ver: ver, at: Date.now() })); } catch (e) {}
        })
        .catch(run);
    })();
  }

  /* ================= 账号弹窗 ================= */
  var acc = { user: "", nick: "", avatar: "", mood: "", tab: "login", qr: null, timer: 0, codeTimer: 0, busy: false, verify: false, verifyMsg: "", pendingEmail: "", key: "", keyHint: "", hasBlob: false };

  function abs(path) {
    return (location.protocol === "file:" ? "https://hamburgerwow.top/burger-music/api/account/" : API) + path;
  }
  function api(path, opts) {
    opts = opts || {};
    return fetch(abs(path), {
      method: opts.method || "GET",
      credentials: "include",
      headers: opts.body ? { "Content-Type": "application/json" } : undefined,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      cache: "no-store"
    }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return d || {}; }); });
  }

  function ensureStyles() {
    if (document.getElementById("siteAcctStyles")) return;
    var style = document.createElement("style");
    style.id = "siteAcctStyles";
    style.textContent = [
      ".sacc{position:fixed;inset:0;z-index:1200;display:none;align-items:center;justify-content:center;padding:18px;overflow:hidden}",
      ".sacc.is-open{display:flex}",
      ".sacc-scrim{position:absolute;inset:0;background:rgba(6,4,8,.62);backdrop-filter:blur(8px)}",
      ".sacc-card{position:relative;width:min(420px,calc(100vw - 24px));max-height:calc(100vh - 36px);overflow:auto;border-radius:26px;padding:24px 24px 20px;background:linear-gradient(160deg,rgba(38,20,30,.96),rgba(18,12,18,.98));border:1px solid rgba(255,255,255,.1);box-shadow:0 30px 80px rgba(0,0,0,.6);color:#fff3f8;overflow-wrap:anywhere}",
      ".sacc-x{position:absolute;right:14px;top:12px;width:32px;height:32px;border-radius:50%;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);color:#fff;font-size:17px;line-height:1;cursor:pointer}",
      ".sacc-kicker{font-size:10px;letter-spacing:.22em;color:rgba(255,243,248,.5)}",
      ".sacc-card h2{margin:6px 0;font-size:22px}",
      ".sacc-lead{margin:0 0 14px;font-size:12px;line-height:1.6;color:rgba(255,243,248,.62)}",
      ".sacc-prof{display:flex;align-items:center;gap:11px;padding:11px 13px;border-radius:16px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);margin-bottom:14px}",
      ".sacc-avatar{width:38px;height:38px;border-radius:12px;display:grid;place-items:center;font-weight:700;background:#ff5b7f center/cover no-repeat;color:#fff;flex:0 0 auto}",
      ".sacc-prof b{display:block;font-size:13px;overflow-wrap:anywhere}",
      ".sacc-prof small{display:block;font-size:11px;color:rgba(255,243,248,.55);margin-top:2px;overflow-wrap:anywhere}",
      ".sacc-mood{display:block;margin-top:5px;padding:5px 8px;border-radius:8px;background:rgba(255,255,255,.06);font-size:11px;color:#ffd9a6;overflow-wrap:anywhere}",
      ".sacc-edit{margin:0 0 12px;padding:11px 12px;border-radius:14px;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.08)}",
      ".sacc-edit[hidden]{display:none}",
      ".sacc-edit-row{display:flex;gap:8px;align-items:center}",
      ".sacc-edit .sacc-avatar{cursor:pointer;flex:0 0 auto}",
      ".sacc-edit .sacc-btn.small{width:auto;margin:0;padding:8px 11px;font-size:11.5px}",
      ".sacc-edit input[type=file]{display:none}",
      ".sacc-tabs{display:flex;gap:6px;padding:5px;border-radius:14px;background:rgba(255,255,255,.05);margin-bottom:14px}",
      ".sacc-tabs button{flex:1;min-width:0;padding:8px 0;border:0;border-radius:10px;background:transparent;color:rgba(255,243,248,.62);font-size:12px;cursor:pointer;white-space:nowrap}",
      ".sacc-tabs button.is-on{background:#ff5b7f;color:#fff;font-weight:600}",
      ".sacc-lb{display:block;font-size:11px;color:rgba(255,243,248,.55);margin:10px 0 6px}",
      ".sacc-card input[type=text],.sacc-card input[type=password],.sacc-card input[type=email]{width:100%;padding:12px 14px;border-radius:13px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);color:#fff;font-size:13px;outline:none}",
      ".sacc-card input:focus{border-color:rgba(255,91,127,.7)}",
      ".sacc-code{display:flex;gap:8px;align-items:center}",
      ".sacc-code input{flex:1 1 auto;min-width:0}",
      ".sacc-code .sacc-btn{flex:0 0 auto;margin:0;white-space:nowrap}",
      ".sacc-codehint{font-size:10.5px;line-height:1.5;color:rgba(255,243,248,.42);margin:6px 0 0}",
      ".sacc-btn{display:inline-flex;align-items:center;justify-content:center;width:100%;margin-top:14px;padding:13px 0;border:0;border-radius:14px;background:#ff5b7f;color:#fff;font-size:14px;font-weight:600;cursor:pointer}",
      ".sacc-btn.ghost{background:rgba(255,255,255,.08);color:rgba(255,243,248,.8);font-weight:500}",
      ".sacc-btn.small{width:auto;margin:0;padding:8px 12px;font-size:12px;border-radius:10px}",
      ".sacc-btn.pri{background:#ff5b7f}",
      ".sacc-btn:disabled{opacity:.5;cursor:not-allowed}",
      ".sacc-qr{display:flex;gap:14px;align-items:flex-start;margin-top:6px;padding:14px;border-radius:16px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08)}",
      ".sacc-qrbox{width:118px;height:118px;flex:0 0 auto;border-radius:12px;background:#fff;display:grid;place-items:center;padding:8px;overflow:hidden;font-size:11px;color:#666}",
      ".sacc-qrcopy b{display:block;font-size:12px}",
      ".sacc-qrcopy span{display:block;font-size:11px;line-height:1.5;color:rgba(255,243,248,.6);margin:4px 0 6px}",
      ".sacc-qrcopy a{display:block;font-size:10px;color:rgba(255,243,248,.42);word-break:break-all;text-decoration:none}",
      ".sacc-qrow{display:flex;gap:6px;margin:8px 0 6px;flex-wrap:wrap}",
      ".sacc-qrcopy small{font-size:10px;color:rgba(255,243,248,.4)}",
      ".sacc-status{margin-top:12px;font-size:12px;color:rgba(255,243,248,.55);min-height:16px}",
      ".sacc-status.is-ok{color:#45d6a8}",
      ".sacc-status.is-warn{color:#ffb44d}",
      ".sacc-keybox{margin-top:12px;padding:13px;border:1px dashed rgba(255,207,138,.5);border-radius:14px;background:rgba(255,207,138,.08);color:#ffe6bd}",
      ".sacc-keybox b{display:block;font-size:12px;margin-bottom:8px;color:#ffcf8a}",
      ".sacc-keyval{padding:9px 10px;border-radius:10px;background:rgba(0,0,0,.28);font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:11.5px;line-height:1.7;word-break:break-all;user-select:all;color:#fff1d4}",
      ".sacc-keybox small{display:block;margin-top:8px;font-size:10.5px;line-height:1.55;color:rgba(255,243,248,.55)}",
      ".sacc-keybox .sacc-btn{margin-top:10px;padding:9px 0;font-size:12px;border-radius:10px}",
      ".sacc-keyinfo{margin-top:10px;padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.08);font-size:11.5px;line-height:1.7;color:rgba(255,243,248,.65)}",
      ".sacc-keyinfo code{display:block;margin-top:4px;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:11.5px;color:#ffcf8a;word-break:break-all}",
      ".sacc-keyinfo .sacc-btn{margin-top:8px;padding:7px 10px;width:auto;font-size:11px}",
      ".sacc-keylead{margin:0 0 10px;font-size:12px;line-height:1.6;color:rgba(255,243,248,.62)}",
      ".sacc-actions{margin-top:6px;display:flex;justify-content:flex-end}",
      ".sacc-card [hidden]{display:none!important}",
      ".sacc-verify{margin:12px 0 0;padding:11px 12px;border:1px solid rgba(255,193,94,.45);border-radius:12px;background:rgba(255,193,94,.10);display:flex;flex-direction:column;gap:6px}",
      ".sacc-verify b{font-size:12.5px;color:#ffd18a}",
      ".sacc-verify span{font-size:11.5px;line-height:1.55;color:#f2e3cf;word-break:break-word}",
      ".sacc-verify .sacc-btn{align-self:flex-start;margin-top:2px}",
      ".sacc-link{border:0;background:none;color:#ffb4c6;font-size:12px;padding:10px 0 0;cursor:pointer;text-decoration:underline;text-underline-offset:3px}",
      ".site-acct-float{position:fixed;right:18px;bottom:18px;z-index:80;display:inline-flex;align-items:center;gap:7px;padding:7px 12px;border:1px solid rgba(255,91,127,.4);border-radius:999px;background:rgba(20,13,10,.72);box-shadow:0 8px 28px rgba(0,0,0,.35);backdrop-filter:blur(14px);color:#fff;font-size:12px;cursor:pointer}",
      ".site-acct-float:hover{background:rgba(255,91,127,.18)}",
      ".site-acct-float i{width:6px;height:6px;border-radius:50%;background:#ff5b7f;box-shadow:0 0 10px rgba(255,91,127,.75)}",
      "@media(max-width:520px){.sacc{align-items:center;padding:10px}.sacc-card{width:100%;max-height:calc(100vh - 20px);padding:22px 18px 18px;border-radius:22px}.sacc-card h2{font-size:20px}.site-acct-float{right:12px;bottom:12px;padding:7px 10px;font-size:11px}}",
      "@media(max-width:420px){.sacc-qr{flex-direction:column}.sacc-qrbox{width:100%;height:auto;aspect-ratio:1}}",
      "@media(max-height:560px) and (orientation:landscape){.sacc{align-items:flex-start;padding:8px}.sacc-card{max-height:calc(100vh - 16px);margin:auto}}"
    ].join("");
    document.head.appendChild(style);
  }

  function buildModal() {
    if (document.getElementById("siteAcctModal")) return;
    ensureStyles();
    var wrap = document.createElement("div");
    wrap.id = "siteAcctModal";
    wrap.className = "sacc";
    wrap.setAttribute("aria-hidden", "true");
    wrap.innerHTML =
      '<div class="sacc-scrim" data-sacc-close></div>' +
      '<div class="sacc-card" role="dialog" aria-modal="true" aria-label="账号登录">' +
      '  <button class="sacc-x" type="button" data-sacc-close aria-label="关闭">×</button>' +
      '  <span class="sacc-kicker">ACCOUNT · FIREBASE AUTH</span>' +
      '  <h2>登录 / 注册</h2>' +
      '  <p class="sacc-lead">同一账号在主页、开发者中心与音乐网站通用。注册后会发送验证邮件，点击邮件里的链接后才能登录。</p>' +
      '  <div class="sacc-prof"><span class="sacc-avatar" id="saccAvatar">B</span><div><b id="saccName">未登录</b><small id="saccSub">Firebase 邮箱登录 · 扫码登录</small><span class="sacc-mood" id="saccMood" hidden></span></div></div>' +
      '  <div class="sacc-edit" id="saccEdit" hidden>' +
      '    <div class="sacc-edit-row"><span class="sacc-avatar" id="saccEditAvatar" title="点击更换头像">B</span><button class="sacc-btn small ghost" id="saccAvatarPick" type="button">更换头像</button><input id="saccAvatarFile" type="file" accept="image/png,image/jpeg,image/webp"></div>' +
      '    <label class="sacc-lb">名称</label><input id="saccEditName" type="text" maxlength="24" placeholder="你的显示名称">' +
      '    <label class="sacc-lb">心情</label><input id="saccEditMood" type="text" maxlength="40" placeholder="写一句现在的心情">' +
      '    <button class="sacc-btn" id="saccProfileSave" type="button">保存资料</button>' +
      '    <p class="sacc-codehint" id="saccEditMsg">保存后会同步到电脑端和手机端。</p>' +
      '  </div>' +
      '  <div class="sacc-tabs" id="saccTabs"><button type="button" class="is-on" data-sacc-tab="login">登录</button><button type="button" data-sacc-tab="register">注册</button><button type="button" data-sacc-tab="key">密钥</button><button type="button" data-sacc-tab="scan">扫码</button></div>' +
      '  <div id="saccPwd">' +
      '    <label class="sacc-lb">邮箱</label><input id="saccEmail" type="email" maxlength="80" placeholder="you@example.com" autocomplete="email" spellcheck="false">' +
      '    <label class="sacc-lb">密码</label><input id="saccPass" type="password" maxlength="64" placeholder="至少 6 位" autocomplete="current-password">' +
      '    <div id="saccNameWrap" hidden><label class="sacc-lb">名称</label><input id="saccNameInput" type="text" maxlength="24" placeholder="你的显示名称" autocomplete="name"></div>' +
      '    <div class="sacc-verify" id="saccVerify" hidden><b id="saccVerifyTitle">请验证邮箱</b><span id="saccVerifyText"></span><button class="sacc-btn small" id="saccResend" type="button">重新发送验证邮件</button></div>' +
      '    <div class="sacc-codehint" id="saccCodeHint">注册后会向邮箱发送验证链接，点击后才能登录。</div>' +
      '    <button class="sacc-btn" id="saccSubmit" type="button">登录</button>' +
      '    <button class="sacc-link" id="saccForgot" type="button">忘记密码？发送重置邮件</button>' +
      '  </div>' +
      '  <div id="saccKey" hidden>' +
      '    <p class="sacc-keylead">输入另一台设备登录后生成的 BC1 同步密钥。验证通过后会登录这个账号，同步账号资料与加密用户文件。</p>' +
      '    <label class="sacc-lb">BC1 同步密钥</label><input id="saccKeyInput" type="text" maxlength="80" placeholder="BC1-XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX" autocomplete="off" spellcheck="false">' +
      '    <button class="sacc-btn" id="saccKeySubmit" type="button">用密钥登录并同步</button>' +
      '    <p class="sacc-codehint">密钥只用于验证和同步，不会显示在账号后台。丢失后可在账号页重置。</p>' +
      '  </div>' +
      '  <div id="saccScan" hidden>' +
      '    <div class="sacc-qr"><div class="sacc-qrbox" id="saccQrBox"><span>二维码生成中…</span></div><div class="sacc-qrcopy"><b>手机扫码登录</b><span>手机打开汉堡网站并登录后点「确认登录」</span><a id="saccQrLink" href="#" target="_blank" rel="noopener"></a><div class="sacc-qrow"><button class="sacc-btn small" id="saccQrRefresh" type="button">刷新二维码</button><button class="sacc-btn small pri" id="saccQrConfirm" type="button">手机端确认登录</button></div><small id="saccScanNote">二维码 5 分钟内有效</small></div></div>' +
      '  </div>' +
      '  <div class="sacc-keybox" id="saccKeyBox" hidden>' +
      '    <b>BC1 同步密钥（只显示这一次）</b>' +
      '    <div class="sacc-keyval" id="saccKeyText"></div>' +
      '    <button class="sacc-btn" id="saccKeyCopy" type="button">复制密钥</button>' +
      '    <small>请立刻复制并妥善保存。关闭后网页不会再次显示明文密钥；其他设备在「密钥」页输入它即可登录并同步。</small>' +
      '  </div>' +
      '  <div class="sacc-keyinfo" id="saccKeyInfo" hidden>当前账号的同步密钥：<code id="saccKeyHint"></code><button class="sacc-btn ghost" id="saccKeyReset" type="button">重置密钥</button></div>' +
      '  <div class="sacc-status" id="saccStatus">未登录</div>' +
      '  <div class="sacc-actions"><button class="sacc-btn ghost" id="saccLogout" type="button" hidden>退出登录</button></div>' +
      '</div>';
    document.body.appendChild(wrap);
    bindModal();
  }

  function status(text, tone) {
    var n = document.getElementById("saccStatus");
    if (!n) return;
    n.textContent = text;
    n.className = "sacc-status" + (tone ? " is-" + tone : "");
  }

  function metaNick() {
    try { return (JSON.parse(localStorage.getItem(META_KEY) || "{}") || {}).nickname || ""; } catch (e) { return ""; }
  }

  function avatarPaint(node, avatar, name) {
    if (!node) return;
    if (/^(data:|https?:|\/)/.test(avatar || "")) { node.style.backgroundImage = "url('" + avatar + "')"; node.textContent = ""; }
    else { node.style.backgroundImage = ""; node.textContent = (name || "B").slice(0, 1).toUpperCase(); }
  }

  function paint() {
    var logged = !!acc.user;
    var name = acc.nick || metaNick() || acc.user;
    avatarPaint(document.getElementById("saccAvatar"), acc.avatar, name);
    var nm = document.getElementById("saccName"); if (nm) nm.textContent = logged ? name : "未登录";
    var sb = document.getElementById("saccSub"); if (sb) sb.textContent = logged ? ("已登录 · " + acc.user) : "Firebase 邮箱登录 · 扫码登录";
    var moodEl = document.getElementById("saccMood");
    if (moodEl) {
      moodEl.hidden = !(logged && acc.mood);
      moodEl.textContent = logged && acc.mood ? ("心情 · " + acc.mood) : "";
    }
    var edit = document.getElementById("saccEdit");
    if (edit) {
      edit.hidden = !logged;
      if (logged) {
        avatarPaint(document.getElementById("saccEditAvatar"), acc.avatar, name);
        var en = document.getElementById("saccEditName");
        var em = document.getElementById("saccEditMood");
        if (en && document.activeElement !== en) en.value = acc.nick || "";
        if (em && document.activeElement !== em) em.value = acc.mood || "";
      }
    }

    var chip = document.getElementById("topAcctChip");
    if (chip) {
      chip.hidden = false;
      var s = chip.querySelector("span");
      if (s) s.textContent = logged ? name : "登录";
      chip.title = logged ? (name + (acc.mood ? " · " + acc.mood : "")) : "登录 / 注册";
    }
    var tmName = document.getElementById("tmAcctName"); if (tmName) tmName.textContent = logged ? name : "未登录";
    var tmHint = document.getElementById("tmAcctHint"); if (tmHint) tmHint.textContent = logged ? ("云端同步 · " + acc.user) : "主页 / 开发者 / 音乐共用同一账号";
    var tmBtn = document.getElementById("tmAcctBtn"); if (tmBtn) tmBtn.textContent = logged ? "管理账号" : "登录 / 注册";

    var dev = document.getElementById("devAcctChip");
    if (dev) dev.textContent = logged ? ("账号 · " + name) : "登录 / 注册";

    var vbox = document.getElementById("saccVerify");
    if (vbox) vbox.hidden = logged || !acc.verify;
    var vtext = document.getElementById("saccVerifyText"); if (vtext) vtext.textContent = acc.verifyMsg || "验证邮件已发送，请点击邮件里的链接完成验证。";
    var vtitle = document.getElementById("saccVerifyTitle"); if (vtitle) vtitle.textContent = acc.verify ? "请先完成邮箱验证" : "请验证邮箱";
    var forgot = document.getElementById("saccForgot"); if (forgot) forgot.hidden = logged || acc.tab === "register" || acc.tab === "key";
    var logout = document.getElementById("saccLogout"); if (logout) logout.hidden = !logged;
    var pwd = document.getElementById("saccPwd"); if (pwd) pwd.hidden = logged || acc.tab === "scan" || acc.tab === "key";
    var tabs = document.getElementById("saccTabs"); if (tabs) tabs.hidden = logged;
    var scan = document.getElementById("saccScan"); if (scan) scan.hidden = logged || acc.tab !== "scan";
    var keyPane = document.getElementById("saccKey"); if (keyPane) keyPane.hidden = logged || acc.tab !== "key";
    var keyBox = document.getElementById("saccKeyBox");
    if (keyBox) {
      keyBox.hidden = !acc.key;
      var keyText = document.getElementById("saccKeyText"); if (keyText) keyText.textContent = acc.key || "";
    }
    var keyInfo = document.getElementById("saccKeyInfo");
    if (keyInfo) {
      keyInfo.hidden = !(logged && (acc.keyHint || acc.key));
      var keyHint = document.getElementById("saccKeyHint");
      if (keyHint) keyHint.textContent = acc.keyHint || "已生成，请用首次登录时保存的密钥";
    }
  }

  function switchTab(tab) {
    acc.tab = tab;
    var tabs = document.getElementById("saccTabs");
    if (tabs) Array.prototype.forEach.call(tabs.querySelectorAll("[data-sacc-tab]"), function (b) {
      b.classList.toggle("is-on", b.getAttribute("data-sacc-tab") === tab);
    });
    var nameWrap = document.getElementById("saccNameWrap"); if (nameWrap) nameWrap.hidden = tab !== "register";
    var submit = document.getElementById("saccSubmit"); if (submit) submit.textContent = tab === "register" ? "注册并发送验证邮件" : "登录";
    var hint = document.getElementById("saccCodeHint");
    if (hint) hint.textContent = tab === "register" ? "注册后会向这个邮箱发送验证链接，点击后才能登录。" : tab === "key" ? "用另一台设备保存的 BC1 密钥登录，账号和加密用户文件会一起同步。" : "邮箱和密码交给 Firebase 校验，验证过的邮箱才能登录。";
    var forgot = document.getElementById("saccForgot"); if (forgot) forgot.hidden = tab === "register" || tab === "key";
    paint();
    if (tab === "scan") startScan(); else stopScan();
  }

  function openModal() {
    buildModal();
    var m = document.getElementById("siteAcctModal");
    try { window.dispatchEvent(new CustomEvent("bc:account-open")); } catch (e) {}
    m.classList.add("is-open");
    m.setAttribute("aria-hidden", "false");
    document.documentElement.style.overflow = "hidden";
    if (!acc.tab) switchTab("login"); else paint();
    var card = m.querySelector(".sacc-card");
    if (card) card.scrollTop = 0;
    setTimeout(function () {
      var u = document.getElementById("saccEmail");
      if (u && !acc.user && acc.tab !== "scan") { try { u.focus({ preventScroll: true }); } catch (e) {} }
    }, 80);
  }
  function closeModal() {
    var m = document.getElementById("siteAcctModal");
    if (!m) return;
    m.classList.remove("is-open");
    m.setAttribute("aria-hidden", "true");
    document.documentElement.style.overflow = "";
    stopScan();
  }

  function validEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || "")) && String(v).length <= 80;
  }

  function authFields() {
    return {
      email: ((document.getElementById("saccEmail") || {}).value || "").trim().toLowerCase(),
      pass: ((document.getElementById("saccPass") || {}).value || ""),
      name: ((document.getElementById("saccNameInput") || {}).value || "").trim()
    };
  }

  function showVerify(msg) {
    acc.verify = true;
    acc.verifyMsg = msg || "";
    acc.pendingEmail = authFields().email || acc.pendingEmail;
    paint();
  }

  function resendVerify() {
    if (acc.busy) return;
    var f = authFields();
    if (!validEmail(f.email)) { status("请输入正确的邮箱地址", "warn"); return; }
    if (!f.pass) { status("请先填写密码，再重新发送验证邮件", "warn"); return; }
    acc.busy = true;
    status("正在发送验证邮件…");
    api("send-code", { method: "POST", body: { email: f.email, password: f.pass, scene: "verify" } })
      .then(function (r) {
        if (!r.ok) { status(r.error || "发送失败", "warn"); return; }
        var msg = r.message || (r.alreadyVerified ? "邮箱已经验证过了，直接登录即可。" : "验证邮件已重新发送到 " + f.email + "。");
        acc.verify = !r.alreadyVerified;
        acc.verifyMsg = msg;
        status(msg, "ok");
        paint();
      })
      .catch(function (e) { status("发送失败：" + (e.message || "网络不可用"), "warn"); })
      .then(function () { acc.busy = false; });
  }

  function forgotPassword() {
    if (acc.busy) return;
    var f = authFields();
    if (!validEmail(f.email)) { status("请先填写要找回的邮箱", "warn"); return; }
    acc.busy = true;
    status("正在发送重置邮件…");
    api("reset", { method: "POST", body: { email: f.email } })
      .then(function (r) {
        if (!r.ok) { status(r.error || "发送失败", "warn"); return; }
        status(r.message || "如果这个邮箱已注册，重置密码邮件会发送到邮箱。", "ok");
      })
      .catch(function (e) { status("发送失败：" + (e.message || "网络不可用"), "warn"); })
      .then(function () { acc.busy = false; });
  }

  function submit() {
    if (acc.busy) return;
    var f = authFields();
    var register = acc.tab === "register";
    if (!validEmail(f.email)) { status("请输入正确的邮箱地址", "warn"); return; }
    if (f.pass.length < 6 || f.pass.length > 64) { status("密码需要 6-64 位", "warn"); return; }
    if (register && !f.name) { status("请填写名称", "warn"); return; }
    acc.busy = true;
    acc.pendingEmail = f.email;
    status(register ? "正在创建 Firebase 账号…" : "正在登录…");
    api(register ? "register" : "login", { method: "POST", body: { email: f.email, password: f.pass, name: f.name || f.email.split("@")[0] } })
      .then(function (r) {
        if (!r.ok) {
          if (r.code === "EMAIL_NOT_VERIFIED") {
            showVerify(r.error || "这个邮箱还没有完成验证。");
            status(r.error || "请先完成邮箱验证", "warn");
            return;
          }
          status(r.error || "失败", "warn");
          return;
        }
        if (register && r.verifySent) {
          acc.verify = true;
          acc.verifyMsg = r.message || "验证邮件已发送，请点击邮件里的链接完成验证，然后回来登录。";
          acc.key = r.key || "";
          acc.keyHint = r.keyHint || "";
          acc.registeredEmail = r.email || acc.pendingEmail;
          acc.tab = "login";
          switchTab("login");
          if (r.keyIssued && r.key) {
            status("注册成功 · 已生成同步密钥并上传到私有仓库，请立即复制保存", "ok");
          } else {
            status(acc.verifyMsg, "ok");
          }
          paint();
          return;
        }
        var sameRegistered = !!(acc.registeredEmail && acc.registeredEmail === (r.email || r.user));
        acc.user = r.email || r.user; acc.nick = r.name || r.nick || acc.user; acc.avatar = r.avatar || ""; acc.mood = r.mood || "";
        acc.verify = false; acc.verifyMsg = "";
        acc.key = r.key || (sameRegistered ? acc.key : "");
        acc.keyHint = r.keyHint || (sameRegistered ? acc.keyHint : "");
        acc.hasBlob = !!r.key || sameRegistered;
        if (!sameRegistered) acc.registeredEmail = "";
        try { localStorage.setItem(USER_CACHE, acc.user); } catch (e) {}
        try { localStorage.setItem(META_KEY, JSON.stringify({ nickname: acc.nick, avatar: acc.avatar, mood: acc.mood })) } catch (e) {}
        if (r.keyIssued && r.key) {
          status("登录成功 · 已生成密钥并上传到私有仓库，请立即复制保存", "ok");
        } else if (sameRegistered && acc.key) {
          status("登录成功 · 注册时的同步密钥仍显示在下方，请复制保存", "ok");
        } else if (r.syncError) {
          status("已登录，但密钥上传失败：" + r.syncError, "warn");
        } else {
          status("已登录 " + acc.user + " · 三端同步开启", "ok");
        }
        paint();
        if (!r.keyIssued && !sameRegistered) setTimeout(closeModal, 700);
      })
      .catch(function (e) { status("失败：" + (e.message || "网络不可用"), "warn"); })
      .then(function () { acc.busy = false; });
  }

  function saveProfile() {
    if (acc.busy) return;
    if (!acc.user) { status("请先登录", "warn"); return; }
    var nameEl = document.getElementById("saccEditName");
    var moodEl = document.getElementById("saccEditMood");
    var name = String(nameEl && nameEl.value || "").trim();
    var mood = String(moodEl && moodEl.value || "").trim().slice(0, 40);
    if (!name) { status("名称不能为空", "warn"); return; }
    acc.busy = true;
    status("正在同步资料到三端…");
    api("data", { method: "POST", body: { name: name, nick: name, mood: mood, avatar: acc.avatar || "", data: { "bm:account-meta": { nickname: name, avatar: acc.avatar || "", mood: mood } } } })
      .then(function (r) {
        if (!r.ok) { status(r.error || "保存失败", "warn"); return; }
        acc.nick = r.name || r.nick || name;
        acc.mood = r.mood != null ? r.mood : mood;
        if (typeof r.avatar === "string") acc.avatar = r.avatar;
        try { localStorage.setItem(META_KEY, JSON.stringify({ nickname: acc.nick, avatar: acc.avatar, mood: acc.mood })) } catch (e) {}
        paint();
        status("资料已保存 · 头像、名称、心情已同步到电脑端和手机端", "ok");
      })
      .catch(function (e) { status("保存失败：" + (e.message || "网络不可用"), "warn"); })
      .then(function () { acc.busy = false; });
  }

  function applyCloudData(data) {
    if (!data || typeof data !== "object") return;
    DATA_KEYS.forEach(function (key) {
      if (!(key in data)) return;
      var value = data[key];
      try { localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value)); } catch (e) {}
    });
  }

  function keyLogin() {
    if (acc.busy) return;
    var input = document.getElementById("saccKeyInput");
    var key = String(input && input.value || "").trim();
    if (!/^BC1/i.test(key)) { status("请输入 BC1- 开头的同步密钥", "warn"); return; }
    acc.busy = true;
    status("正在验证同步密钥…");
    api("key/login", { method: "POST", body: { key: key } })
      .then(function (r) {
        if (!r.ok) { status(r.error || "密钥登录失败", "warn"); return; }
        acc.user = r.email || r.user || acc.user;
        acc.nick = r.name || r.nick || r.user;
        acc.avatar = r.avatar || "";
        acc.mood = r.mood || (r.profile && r.profile.mood) || "";
        acc.key = "";
        acc.keyHint = r.keyHint || "";
        acc.hasBlob = !!r.hasBlob;
        acc.verify = false; acc.verifyMsg = "";
        try { localStorage.setItem(USER_CACHE, acc.user); } catch (e) {}
        try { localStorage.setItem(META_KEY, JSON.stringify({ nickname: acc.nick, avatar: acc.avatar, mood: acc.mood })) } catch (e) {}
        paint();
        applyCloudData(r.data || {});
        api("data").then(function (d) {
          if (d && d.ok) applyCloudData(d.data || {});
          var note = r.hasBlob ? "密钥登录成功 · 已同步账号与用户文件" : "密钥登录成功 · 账号已同步";
          if (d && !d.ok) note = "密钥登录成功 · 账号已同步，云端数据稍后重试";
          status(note, "ok");
          paint();
        }).catch(function () { status("密钥登录成功 · 稍后自动同步", "ok"); });
        setTimeout(closeModal, 1400);
      })
      .catch(function (e) { status("密钥登录失败：" + (e.message || "网络不可用"), "warn"); })
      .then(function () { acc.busy = false; });
  }

  function copyKey() {
    var text = acc.key || "";
    if (!text) return;
    var done = function () { status("密钥已复制，请妥善保存", "ok"); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(function () { fallbackCopy(text, done); });
    } else fallbackCopy(text, done);
  }

  function fallbackCopy(text, done) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); done(); } catch (e) {}
    document.body.removeChild(ta);
  }

  function resetKey() {
    if (acc.busy) return;
    if (!window.confirm("重置后旧密钥会立即失效，旧设备需要重新用新密钥登录。继续？")) return;
    acc.busy = true;
    status("正在重置密钥…");
    api("key/rotate", { method: "POST", body: {} })
      .then(function (r) {
        if (!r.ok) { status(r.error || "重置失败", "warn"); return; }
        acc.key = r.key || "";
        acc.keyHint = r.keyHint || "";
        acc.hasBlob = false;
        status("新密钥已生成，请立即复制保存", "ok");
        paint();
      })
      .catch(function (e) { status("重置失败：" + (e.message || "网络不可用"), "warn"); })
      .then(function () { acc.busy = false; });
  }

  function logout() {
    api("logout", { method: "POST" }).catch(function () {});
    acc.user = ""; acc.nick = ""; acc.avatar = ""; acc.mood = ""; acc.verify = false; acc.verifyMsg = "";
    acc.key = ""; acc.keyHint = ""; acc.hasBlob = false;
    try { localStorage.removeItem(USER_CACHE); } catch (e) {}
    status("已退出登录");
    paint();
  }

  /* 扫码 */
  function loadQr(cb) {
    if (typeof window.qrcode === "function") { cb(); return; }
    var s = document.createElement("script");
    s.src = "/burger-music/assets/qr-code.js?v=bm32";
    s.onload = cb;
    s.onerror = function () { status("二维码组件加载失败", "warn"); };
    document.head.appendChild(s);
  }
  function drawQr(url) {
    var box = document.getElementById("saccQrBox");
    if (!box) return;
    if (typeof window.qrcode !== "function") { box.textContent = "二维码组件不可用"; return; }
    var q = window.qrcode(0, "M");
    q.addData(url); q.make();
    box.innerHTML = q.createImgTag(4, 8);
    var img = box.querySelector("img");
    if (img) { img.alt = "扫码登录二维码"; img.style.width = "100%"; img.style.height = "auto"; }
  }
  function stopScan() {
    if (acc.timer) clearInterval(acc.timer);
    acc.timer = 0; acc.qr = null;
  }
  function startScan() {
    stopScan();
    status("正在生成二维码…");
    loadQr(function () {
      api("qr/new", { method: "POST", body: {} }).then(function (r) {
        if (!r.ok) { status(r.error || "二维码生成失败", "warn"); return; }
        acc.qr = r;
        drawQr(r.url);
        var link = document.getElementById("saccQrLink");
        if (link) { link.href = r.url; link.textContent = r.url.replace("https://", ""); }
        status("用手机扫码并在手机上确认登录");
        bindClaim(r);
      });
    });
  }
  function bindClaim(r) {
    function poll() {
      api("qr/status?t=" + r.ticket + "&s=" + r.secret).then(function (s) {
        if (s.status === "confirmed" && s.code) {
          stopScan();
          api("qr/claim", { method: "POST", body: { ticket: r.ticket, code: s.code, secret: r.secret } }).then(function (c) {
            if (!c.ok) { status(c.error || "登录失败", "warn"); return; }
            acc.user = c.user; acc.nick = c.nick || c.user;
            try { localStorage.setItem(USER_CACHE, acc.user); } catch (e) {}
            status("扫码登录成功 · " + acc.user, "ok");
            paint();
            setTimeout(closeModal, 700);
          });
        } else if (s.status === "expired" || s.status === "missing") {
          if (!poll.retried) { poll.retried = true; startScan(); }
          else status("二维码已过期，请点「刷新二维码」", "warn");
        }
      });
    }
    if (acc.timer) clearInterval(acc.timer);
    acc.timer = setInterval(poll, 2500);
  }

  function bindModal() {
    var wrap = document.getElementById("siteAcctModal");
    if (!wrap) return;
    wrap.addEventListener("click", function (e) {
      if (e.target.closest("[data-sacc-close]")) closeModal();
    });
    var avatarPick = document.getElementById("saccAvatarPick");
    var avatarFile = document.getElementById("saccAvatarFile");
    var avatarBox = document.getElementById("saccEditAvatar");
    var openAvatar = function () { if (avatarFile) avatarFile.click(); };
    if (avatarPick) avatarPick.addEventListener("click", openAvatar);
    if (avatarBox) avatarBox.addEventListener("click", openAvatar);
    if (avatarFile) avatarFile.addEventListener("change", function () {
      var f = this.files && this.files[0];
      if (!f) return;
      if (f.size > 8 * 1024 * 1024) { status("图片太大，请换一张小一点的", "warn"); this.value = ""; return; }
      var reader = new FileReader();
      reader.onload = function () {
        var img = new Image();
        img.onload = function () {
          try {
            var side = Math.min(img.width, img.height), c = document.createElement("canvas");
            c.width = c.height = 128;
            var ctx = c.getContext("2d");
            ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, 128, 128);
            ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, 128, 128);
            acc.avatar = c.toDataURL("image/jpeg", 0.82);
            paint();
            status("新头像已选好，点「保存资料」同步", "ok");
          } catch (e) { status("头像读取失败，换一张试试", "warn"); }
        };
        img.onerror = function () { status("头像读取失败，换一张试试", "warn"); };
        img.src = reader.result;
      };
      reader.onerror = function () { status("头像读取失败，换一张试试", "warn"); };
      reader.readAsDataURL(f);
      this.value = "";
    });
    var saveProfileBtn = document.getElementById("saccProfileSave");
    if (saveProfileBtn) saveProfileBtn.addEventListener("click", saveProfile);
    var tabs = document.getElementById("saccTabs");
    if (tabs) Array.prototype.forEach.call(tabs.querySelectorAll("[data-sacc-tab]"), function (b) {
      b.addEventListener("click", function () { switchTab(b.getAttribute("data-sacc-tab")); });
    });
    var submitBtn = document.getElementById("saccSubmit"); if (submitBtn) submitBtn.addEventListener("click", submit);
    var keyBtn = document.getElementById("saccKeySubmit"); if (keyBtn) keyBtn.addEventListener("click", keyLogin);
    var keyCopy = document.getElementById("saccKeyCopy"); if (keyCopy) keyCopy.addEventListener("click", copyKey);
    var keyReset = document.getElementById("saccKeyReset"); if (keyReset) keyReset.addEventListener("click", resetKey);
    var resendBtn = document.getElementById("saccResend"); if (resendBtn) resendBtn.addEventListener("click", resendVerify);
    var forgotBtn = document.getElementById("saccForgot"); if (forgotBtn) forgotBtn.addEventListener("click", forgotPassword);
    var logoutBtn = document.getElementById("saccLogout"); if (logoutBtn) logoutBtn.addEventListener("click", logout);
    var refresh = document.getElementById("saccQrRefresh"); if (refresh) refresh.addEventListener("click", startScan);
    var confirm = document.getElementById("saccQrConfirm");
    if (confirm) confirm.addEventListener("click", function () {
      var ticket = "";
      try { ticket = new URLSearchParams(location.search).get("qr") || ""; } catch (e) {}
      if (!ticket) { status("请用手机扫描二维码后再确认", "warn"); return; }
      api("qr/confirm", { method: "POST", body: { ticket: ticket } }).then(function (r) {
        status(r.ok ? "已确认，回到电脑即可完成登录" : (r.error || "确认失败"), r.ok ? "ok" : "warn");
      });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && wrap.classList.contains("is-open")) { e.preventDefault(); closeModal(); return; }
      if (e.key === "Enter" && wrap.classList.contains("is-open") && !acc.busy) {
        if (acc.tab === "key") { e.preventDefault(); keyLogin(); return; }
        if (acc.tab !== "scan") { e.preventDefault(); submit(); }
      }
    });
  }

  function ensureChip() {
    ensureStyles();
    var actions = document.querySelector(".topbar .top-actions");
    if (actions && !document.getElementById("topAcctChip")) {
      var a = document.createElement("button");
      a.id = "topAcctChip";
      a.type = "button";
      a.className = "ver-pill acct-pill";
      a.style.cssText = "cursor:pointer";
      a.innerHTML = "<i></i><span>登录</span>";
      var pill = document.getElementById("verPill");
      if (pill && pill.parentNode) pill.parentNode.insertBefore(a, pill);
      else actions.insertBefore(a, actions.firstChild);
      a.addEventListener("click", openModal);
    }
    if (!document.getElementById("topAcctChip") && !document.getElementById("accountEntry") && !document.getElementById("siteAcctFloat")) {
      var f = document.createElement("button");
      f.id = "siteAcctFloat";
      f.type = "button";
      f.className = "ver-pill acct-pill site-acct-float";
      f.title = "登录 / 注册";
      f.innerHTML = "<i></i><span>登录 / 注册</span>";
      f.addEventListener("click", openModal);
      document.body.appendChild(f);
    }
    var devBar = document.querySelector(".topbar");
    if (devBar && document.getElementById("pageTitle") && !document.getElementById("devAcctChip")) {
      var loginBtn = document.getElementById("devLoginBtn");
      var b = null;
      var scope = (loginBtn && loginBtn.parentNode) || devBar;
      Array.prototype.forEach.call(scope.querySelectorAll(".btn.sm"), function (c) {
        if (!b && c !== loginBtn && !c.id) b = c;
      });
      if (!b) {
        b = document.createElement("button");
        b.className = "btn sm";
        b.type = "button";
        if (loginBtn && loginBtn.parentNode) loginBtn.parentNode.insertBefore(b, loginBtn);
        else devBar.appendChild(b);
      }
      b.id = "devAcctChip";
      if (b.tagName === "A") b.removeAttribute("href");
      b.setAttribute("role", "button");
      b.textContent = "登录 / 注册";
      b.addEventListener("click", function (e) { e.preventDefault(); openModal(); });
    }
  }

  function refreshAccount() {
    api("me").then(function (r) {
      if (r && r.logged) {
        acc.user = r.email || r.user; acc.nick = r.name || r.nick || r.user; acc.avatar = r.avatar || ""; acc.mood = r.mood || "";
        try { localStorage.setItem(USER_CACHE, acc.user); } catch (e) {}
        try { localStorage.setItem(META_KEY, JSON.stringify({ nickname: acc.nick, avatar: acc.avatar, mood: acc.mood })) } catch (e) {}
        api("key/status").then(function (k) {
          if (k && k.ok) { acc.keyHint = k.keyHint || ""; acc.hasBlob = !!k.hasBlob; }
          paint();
        }).catch(function () { paint(); });
      } else if (acc.user) { acc.user = ""; acc.nick = ""; acc.avatar = ""; acc.mood = ""; }
      paint();
    }).catch(function () { paint(); });
  }

  function boot() {
    bindLook();
    menuFallback();
    githubVersion();
    ensureChip();
    acc.user = "";
    try { acc.user = localStorage.getItem(USER_CACHE) || ""; } catch (e) {}
    paint();
    refreshAccount();
    var tmBtn = document.getElementById("tmAcctBtn");
    if (tmBtn) tmBtn.addEventListener("click", function (e) { e.preventDefault(); openModal(); });
  }

  window.BCAccount = { open: openModal, close: closeModal, refresh: refreshAccount };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();

/* ===== 主网页：音乐网站背景音乐 + 三端账号悬停卡片 ===== */
(function () {
  if (!document.getElementById("tmAcct")) return;
  var NP_KEY = "bm:np";
  var ACCOUNT_API = "/burger-music/api/account/";

  var style = document.createElement("style");
  style.textContent = [
    ".bc-bgm{position:fixed;left:18px;bottom:18px;z-index:60;display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:16px;",
    "background:rgba(20,17,26,.82);backdrop-filter:blur(18px);border:1px solid rgba(255,255,255,.16);box-shadow:0 14px 34px rgba(0,0,0,.38);color:#f5ede1;font-size:12px}",
    ".bc-bgm[hidden]{display:none}",
    ".bc-bgm img{width:38px;height:38px;border-radius:10px;object-fit:cover;background:linear-gradient(140deg,#3a2a12,#221a33)}",
    ".bc-bgm .bc-bgm-copy{min-width:0;max-width:190px}",
    ".bc-bgm b{display:block;font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
    ".bc-bgm small{display:block;color:#b9adbd;font-size:10.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
    ".bc-bgm button{border:0;border-radius:9px;background:rgba(255,255,255,.1);color:#f6efe3;width:28px;height:28px;cursor:pointer}",
    ".bc-bgm a{color:#ffcf82;text-decoration:none;font-size:11px;white-space:nowrap}",
    ".bc-acct-pop{position:fixed;z-index:80;width:260px;padding:14px;border-radius:16px;border:1px solid rgba(255,255,255,.16);",
    "background:rgba(22,19,28,.96);backdrop-filter:blur(18px);box-shadow:0 22px 48px rgba(0,0,0,.5);color:#f5ede1;display:none}",
    ".bc-acct-pop.is-on{display:block}",
    ".bc-acct-head{display:flex;align-items:center;gap:10px}",
    ".bc-acct-ava{width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,.1) center/cover no-repeat;display:grid;place-items:center;font-size:18px;flex:0 0 auto}",
    ".bc-acct-name{font-size:14px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:170px}",
    ".bc-acct-mail{font-size:10.5px;color:#a99fb2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:170px}",
    ".bc-acct-mood{margin-top:10px;padding:7px 9px;border-radius:9px;background:rgba(255,255,255,.06);font-size:11.5px;color:#e9dcc4;overflow-wrap:anywhere}",
    ".bc-acct-src{margin-top:7px;font-size:10px;color:#8f8499}",
    ".bc-acct-pop a{display:inline-block;margin-top:10px;font-size:11.5px;color:#ffcf82;text-decoration:none}"
  ].join("");
  document.head.appendChild(style);

  /* —— 背景音乐 —— */
  var bar = document.createElement("div");
  bar.className = "bc-bgm"; bar.hidden = true;
  bar.innerHTML = '<img alt=""><div class="bc-bgm-copy"><b>—</b><small>—</small></div>' +
    '<button type="button" data-bgm="toggle" title="播放 / 暂停">▶</button>' +
    '<a href="/burger-music" title="打开音乐网站">音乐 ↗</a>' +
    '<button type="button" data-bgm="close" title="关闭背景音乐">×</button>';
  document.body.appendChild(bar);
  var img = bar.querySelector("img"), titleEl = bar.querySelector("b"), subEl = bar.querySelector("small"), toggleBtn = bar.querySelector('[data-bgm="toggle"]');
  var audio = new Audio(); audio.loop = true; audio.volume = 0.32;
  var state = { src: "", playing: false, userPaused: false, started: false };

  function readNP() {
    try { return JSON.parse(localStorage.getItem(NP_KEY) || "null"); } catch (e) { return null; }
  }
  function paint() {
    var np = readNP();
    if (!np || !np.src) { bar.hidden = true; return; }
    bar.hidden = false;
    titleEl.textContent = np.name || "音乐网站正在播放";
    subEl.textContent = (np.artist || "Burger Music") + (np.playing ? " · 播放中" : " · 已暂停");
    if (np.cover && img.src !== np.cover) img.src = np.cover; else if (!np.cover) img.removeAttribute("src");
    if (state.src !== np.src) { state.src = np.src; audio.src = np.src; }
    toggleBtn.textContent = audio.paused ? "▶" : "⏸";
    if (np.playing && !state.userPaused && audio.paused && state.started) { audio.play().catch(function(){}); }
  }
  function startFromNP() {
    var np = readNP();
    if (!np || !np.src) return;
    state.started = true;
    state.src = np.src; audio.src = np.src;
    try { audio.currentTime = Math.max(0, Number(np.t) || 0); } catch (e) {}
    if (np.playing) audio.play().catch(function(){ subEl.textContent = "点击 ▶ 开始背景音乐"; });
  }
  toggleBtn.addEventListener("click", function () {
    if (!state.started) { state.started = true; startFromNP(); state.userPaused = false; }
    else if (audio.paused) { state.userPaused = false; audio.play().catch(function(){}); }
    else { state.userPaused = true; audio.pause(); }
    setTimeout(paint, 30);
  });
  bar.querySelector('[data-bgm="close"]').addEventListener("click", function () {
    state.userPaused = true; audio.pause(); bar.hidden = true;
  });
  window.addEventListener("storage", function (e) { if (e.key === NP_KEY) paint(); });
  setInterval(paint, 4000);
  document.addEventListener("pointerdown", function once() {
    document.removeEventListener("pointerdown", once);
    if (!state.started) startFromNP();
  }, { passive: true });
  paint();

  /* —— 账号悬停卡片 —— */
  var anchor = document.getElementById("tmAcct");
  var pop = document.createElement("div");
  pop.className = "bc-acct-pop";
  pop.innerHTML = '<div class="bc-acct-head"><span class="bc-acct-ava"></span><div><div class="bc-acct-name">未登录</div><div class="bc-acct-mail"></div></div></div>' +
    '<div class="bc-acct-mood">心情：—</div><div class="bc-acct-src">头像 / 名称 / 心情由手机端与电脑端同步</div><a href="/burger-music">管理三端账号 ↗</a>';
  document.body.appendChild(pop);
  var avaEl = pop.querySelector(".bc-acct-ava"), nameEl = pop.querySelector(".bc-acct-name"), mailEl = pop.querySelector(".bc-acct-mail"), moodEl = pop.querySelector(".bc-acct-mood");
  var hideTimer = 0, activeAnchor = null;
  function place(a) {
    a = a || activeAnchor || anchor;
    if (!a) return;
    var r = a.getBoundingClientRect();
    var width = 260, height = pop.offsetHeight || 170;
    pop.style.left = Math.max(10, Math.min(window.innerWidth - width - 10, r.left + r.width / 2 - width / 2)) + "px";
    var top = r.bottom + 8;
    if (top + height > window.innerHeight - 10) top = Math.max(10, r.top - height - 8);
    pop.style.top = top + "px";
  }
  function cacheProfile() {
    var meta = {};
    try { meta = JSON.parse(localStorage.getItem("bm:account-meta") || "{}") || {}; } catch (e) {}
    var user = {};
    try { user = JSON.parse(localStorage.getItem("bm:account-user") || "null") || {}; } catch (e) {}
    return { name: meta.nickname || meta.name || user.nick || user.name || "未登录", mood: meta.mood || "—", avatar: meta.avatar || user.avatar || "", email: user.user || user.email || "" };
  }
  function fill(p) {
    var name = p.name || "未登录";
    nameEl.textContent = name;
    mailEl.textContent = p.email || "登录后同步头像 / 心情 / 名称";
    moodEl.textContent = "心情：" + (p.mood || "—");
    if (p.avatar && /^(data:|https?:|\/)/.test(p.avatar)) { avaEl.style.backgroundImage = "url('" + p.avatar + "')"; avaEl.textContent = ""; }
    else { avaEl.style.backgroundImage = ""; avaEl.textContent = (p.avatar || name.slice(0, 1)).toUpperCase(); }
  }
  function show(a) {
    clearTimeout(hideTimer);
    activeAnchor = a;
    fill(cacheProfile());
    place(a);
    pop.classList.add("is-on");
    refreshProfile();
  }
  function hideSoon() {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(function () { pop.classList.remove("is-on"); }, 220);
  }
  async function refreshProfile() {
    try {
      var r = await fetch(ACCOUNT_API + "me", { credentials: "include", cache: "no-store" });
      var j = await r.json().catch(function(){ return {}; });
      if (!j || !j.ok || !j.logged) return;
      var data = {};
      try {
        var d = await fetch(ACCOUNT_API + "data", { credentials: "include", cache: "no-store" });
        var dj = await d.json().catch(function(){ return {}; });
        if (dj && dj.ok) data = dj.data || {};
      } catch (e) {}
      var meta = data["bm:account-meta"] || {};
      fill({
        name: j.nick || j.name || meta.nickname || "未登录",
        email: j.email || "",
        avatar: j.avatar || meta.avatar || "",
        mood: j.mood || meta.mood || "—"
      });
      if (activeAnchor) place(activeAnchor);
    } catch (e) {}
  }
  document.addEventListener("mouseover", function (e) {
    var a = e.target.closest && e.target.closest("#topAcctChip,#siteAcctFloat,#tmAcct");
    if (a) show(a);
  });
  document.addEventListener("mouseout", function (e) {
    var a = e.target.closest && e.target.closest("#topAcctChip,#siteAcctFloat,#tmAcct");
    if (a && !pop.contains(e.relatedTarget)) hideSoon();
  });
  pop.addEventListener("mouseenter", function () { clearTimeout(hideTimer); });
  pop.addEventListener("mouseleave", hideSoon);
  window.addEventListener("resize", function () { if (pop.classList.contains("is-on")) place(); });
  window.addEventListener("scroll", function () { if (pop.classList.contains("is-on")) place(); }, { passive: true });
})();
