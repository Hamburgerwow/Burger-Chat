/* 站点共用脚本：顶栏外观 · GitHub 版本号 · 三端统一账号（登录卡片 + 弹窗）
   任何新页面只要引入 <script src="/assets/site-shared.js?v=2" defer></script> 就会自动带上登录入口与弹窗。 */
(function () {
  "use strict";

  var LOOK_KEY = "bc:nav-look";
  var API = "/burger-music/api/account/";
  var USER_CACHE = "bm:account-user";
  var META_KEY = "bm:account-meta";
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
  var acc = { user: "", nick: "", avatar: "", tab: "login", qr: null, timer: 0, busy: false };

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

  function buildModal() {
    if (document.getElementById("siteAcctModal")) return;
    var wrap = document.createElement("div");
    wrap.id = "siteAcctModal";
    wrap.className = "sacc";
    wrap.setAttribute("aria-hidden", "true");
    wrap.innerHTML =
      '<div class="sacc-scrim" data-sacc-close></div>' +
      '<div class="sacc-card" role="dialog" aria-modal="true" aria-label="账号登录">' +
      '  <button class="sacc-x" type="button" data-sacc-close aria-label="关闭">×</button>' +
      '  <span class="sacc-kicker">ACCOUNT · CLOUD SYNC</span>' +
      '  <h2>登录 / 注册</h2>' +
      '  <p class="sacc-lead">同一账号在主页、开发者中心与音乐网站通用，歌单与成就云端同步。</' +
      '  <div class="sacc-prof"><span class="sacc-avatar" id="saccAvatar">B</span><div><b id="saccName">未登录</b><small id="saccSub">账号密码登录 · 扫码登录</small></div></div>' +
      '  <div class="sacc-tabs" id="saccTabs"><button type="button" class="is-on" data-sacc-tab="login">登录</button><button type="button" data-sacc-tab="register">注册</button><button type="button" data-sacc-tab="scan">扫码登录</button></div>' +
      '  <div id="saccPwd">' +
      '    <label class="sacc-lb">用户名</label><input id="saccUser" type="text" maxlength="20" placeholder="2-20 位字母 / 数字 / _" autocomplete="username">' +
      '    <label class="sacc-lb">密码</label><input id="saccPass" type="password" maxlength="64" placeholder="至少 6 位" autocomplete="current-password">' +
      '    <div id="saccNickWrap" hidden><label class="sacc-lb">昵称</label><input id="saccNick" type="text" maxlength="24" placeholder="可留空，默认用用户名"></div>' +
      '    <div class="sacc-key"><i></i>密钥已自动填写<em>服务端托管 · 不写入网页</em></div>' +
      '    <button class="sacc-btn" id="saccSubmit" type="button">登录</button>' +
      '  </div>' +
      '  <div id="saccScan" hidden>' +
      '    <div class="sacc-qr"><div class="sacc-qrbox" id="saccQrBox"><span>二维码生成中…</span></div><div class="sacc-qrcopy"><b>手机扫码登录</b><span>手机打开汉堡网站并登录后点「确认登录」</span><a id="saccQrLink" href="#" target="_blank" rel="noopener"></a><div class="sacc-qrow"><button class="sacc-btn small" id="saccQrRefresh" type="button">刷新二维码</button><button class="sacc-btn small pri" id="saccQrConfirm" type="button">手机端确认登录</button></div><small id="saccScanNote">二维码 5 分钟内有效</small></div></div>' +
      '  </div>' +
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

  function paint() {
    var logged = !!acc.user;
    var name = acc.nick || metaNick() || acc.user;
    var avatar = document.getElementById("saccAvatar");
    if (avatar) {
      if (acc.avatar) { avatar.style.backgroundImage = "url('" + acc.avatar + "')"; avatar.textContent = ""; }
      else { avatar.style.backgroundImage = ""; avatar.textContent = (name || "B").slice(0, 1).toUpperCase(); }
    }
    var nm = document.getElementById("saccName"); if (nm) nm.textContent = logged ? name : "未登录";
    var sb = document.getElementById("saccSub"); if (sb) sb.textContent = logged ? ("已登录 · " + acc.user) : "账号密码登录 · 扫码登录";

    var chip = document.getElementById("topAcctChip");
    if (chip) {
      chip.hidden = false;
      var s = chip.querySelector("span");
      if (s) s.textContent = logged ? name : "登录";
    }
    var tmName = document.getElementById("tmAcctName"); if (tmName) tmName.textContent = logged ? name : "未登录";
    var tmHint = document.getElementById("tmAcctHint"); if (tmHint) tmHint.textContent = logged ? ("云端同步 · " + acc.user) : "主页 / 开发者 / 音乐共用同一账号";
    var tmBtn = document.getElementById("tmAcctBtn"); if (tmBtn) tmBtn.textContent = logged ? "管理账号" : "登录 / 注册";

    var dev = document.getElementById("devAcctChip");
    if (dev) dev.textContent = logged ? ("账号 · " + name) : "登录 / 注册";

    var logout = document.getElementById("saccLogout"); if (logout) logout.hidden = !logged;
    var pwd = document.getElementById("saccPwd"); if (pwd) pwd.hidden = logged || acc.tab === "scan";
    var tabs = document.getElementById("saccTabs"); if (tabs) tabs.hidden = logged;
    var scan = document.getElementById("saccScan"); if (scan) scan.hidden = logged || acc.tab !== "scan";
  }

  function switchTab(tab) {
    acc.tab = tab;
    var tabs = document.getElementById("saccTabs");
    if (tabs) Array.prototype.forEach.call(tabs.querySelectorAll("[data-sacc-tab]"), function (b) {
      b.classList.toggle("is-on", b.getAttribute("data-sacc-tab") === tab);
    });
    var nick = document.getElementById("saccNickWrap"); if (nick) nick.hidden = tab !== "register";
    var submit = document.getElementById("saccSubmit"); if (submit) submit.textContent = tab === "register" ? "注册并登录" : "登录";
    paint();
    if (tab === "scan") startScan(); else stopScan();
  }

  function openModal() {
    buildModal();
    var m = document.getElementById("siteAcctModal");
    m.classList.add("is-open");
    m.setAttribute("aria-hidden", "false");
    document.documentElement.style.overflow = "hidden";
    if (!acc.tab) switchTab("login"); else paint();
  }
  function closeModal() {
    var m = document.getElementById("siteAcctModal");
    if (!m) return;
    m.classList.remove("is-open");
    m.setAttribute("aria-hidden", "true");
    document.documentElement.style.overflow = "";
    stopScan();
  }

  function submit() {
    if (acc.busy) return;
    var u = (document.getElementById("saccUser") || {}).value || "";
    var p = (document.getElementById("saccPass") || {}).value || "";
    var n = (document.getElementById("saccNick") || {}).value || "";
    u = u.trim();
    if (!/^[A-Za-z0-9_-]{2,20}$/.test(u)) { status("用户名需 2-20 位字母、数字或下划线", "warn"); return; }
    if (p.length < 6) { status("密码至少 6 位", "warn"); return; }
    var register = acc.tab === "register";
    acc.busy = true;
    status(register ? "正在注册…" : "正在登录…");
    api(register ? "register" : "login", { method: "POST", body: { user: u, pass: p, nick: n || u } })
      .then(function (r) {
        if (!r.ok) { status(r.error || "失败", "warn"); return; }
        acc.user = r.user; acc.nick = r.nick || r.user; acc.avatar = r.avatar || "";
        try { localStorage.setItem(USER_CACHE, acc.user); } catch (e) {}
        try { localStorage.setItem(META_KEY, JSON.stringify({ nickname: acc.nick, avatar: acc.avatar })); } catch (e) {}
        status("已登录 " + acc.user + " · 三端同步开启", "ok");
        paint();
        setTimeout(closeModal, 700);
      })
      .catch(function (e) { status("失败：" + (e.message || "网络不可用"), "warn"); })
      .then(function () { acc.busy = false; });
  }

  function logout() {
    api("logout", { method: "POST" }).catch(function () {});
    acc.user = ""; acc.nick = ""; acc.avatar = "";
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
    var tabs = document.getElementById("saccTabs");
    if (tabs) Array.prototype.forEach.call(tabs.querySelectorAll("[data-sacc-tab]"), function (b) {
      b.addEventListener("click", function () { switchTab(b.getAttribute("data-sacc-tab")); });
    });
    var submitBtn = document.getElementById("saccSubmit"); if (submitBtn) submitBtn.addEventListener("click", submit);
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
      if (e.key === "Enter" && wrap.classList.contains("is-open") && acc.tab !== "scan" && !acc.busy) { e.preventDefault(); submit(); }
    });
  }

  function ensureChip() {
    var actions = document.querySelector(".topbar .top-actions");
    if (actions && !document.getElementById("topAcctChip")) {
      var a = document.createElement("button");
      a.id = "topAcctChip";
      a.type = "button";
      a.className = "ver-pill";
      a.style.cssText = "cursor:pointer";
      a.innerHTML = "<i></i><span>登录</span>";
      var pill = document.getElementById("verPill");
      if (pill && pill.parentNode) pill.parentNode.insertBefore(a, pill);
      else actions.insertBefore(a, actions.firstChild);
      a.addEventListener("click", openModal);
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
        acc.user = r.user; acc.nick = r.nick || r.user; acc.avatar = r.avatar || "";
        try { localStorage.setItem(USER_CACHE, acc.user); } catch (e) {}
      } else if (acc.user) { acc.user = ""; }
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
