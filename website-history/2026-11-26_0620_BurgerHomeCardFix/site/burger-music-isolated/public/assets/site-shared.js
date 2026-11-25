/* 站点共用：顶栏外观、GitHub 版本号、三端账号（主页 / 开发者 / 音乐网站） */
(function () {
  "use strict";

  var LOOK_KEY = "bc:nav-look";
  var $ = function (sel, root) { return (root || document).querySelector(sel); };

  /* ---------- 顶栏外观 ---------- */
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

  function bindLook() {
    var blur = $("#lookBlur"), alpha = $("#lookAlpha"), color = $("#lookIconBg"), reset = $("#lookReset");
    if (!blur && !alpha && !color) { applyLook(readLook()); return; }
    var look = readLook();
    if (look.blur != null && blur) blur.value = look.blur;
    if (look.alpha != null && alpha) alpha.value = Math.round(Number(look.alpha) * 100);
    if (look.iconBg && color) color.value = rgbToHex(look.iconBg) || color.value;
    applyLook(look);
    syncLabels();

    function syncLabels() {
      var bv = $("#lookBlurVal"), av = $("#lookAlphaVal"), cv = $("#lookIconBgc");
      if (bv && blur) bv.textContent = blur.value;
      if (av && alpha) av.textContent = alpha.value;
      if (cv && color) cv.textContent = String(color.value).toLowerCase();
    }
    function persist() {
      var next = {
        blur: blur ? Number(blur.value) : 20,
        alpha: alpha ? Number(alpha.value) / 100 : 0.76,
        iconBg: color ? hexToRgba(color.value) : "rgba(255,255,255,.07)"
      };
      saveLook(next); applyLook(next); syncLabels();
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

  function hexToRgba(hex) {
    var value = String(hex || "").replace("#", "");
    if (value.length !== 6) return "rgba(255,255,255,.07)";
    var r = parseInt(value.slice(0, 2), 16), g = parseInt(value.slice(2, 4), 16), b = parseInt(value.slice(4, 6), 16);
    return "rgba(" + r + "," + g + "," + b + ",.42)";
  }
  function rgbToHex(input) {
    var m = String(input).match(/rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
    if (!m) return "";
    return "#" + [m[1], m[2], m[3]].map(function (n) { return ("0" + Number(n).toString(16)).slice(-2); }).join("");
  }

  /* ---------- 版本号：GitHub 优先 ---------- */
  function setVersion(ver) {
    if (!ver) return;
    var nodes = document.querySelectorAll("[data-version]");
    Array.prototype.forEach.call(nodes, function (node) { node.textContent = ver; });
    var bm = document.getElementById("bmVersion");
    if (bm) bm.textContent = "v" + ver;
    var dev = document.getElementById("devVer");
    if (dev) dev.textContent = "v" + ver;
    try { document.body.setAttribute("data-current-version", ver); } catch (e) {}
  }
  function githubVersion() {
    var CACHE = "bc:gh-version";
    try {
      var cached = JSON.parse(localStorage.getItem(CACHE) || "{}");
      if (cached && cached.ver && Date.now() - cached.at < 5 * 60 * 1000) setVersion(cached.ver);
    } catch (e) {}
    var bases = [
      "https://gh-proxy.com/https://api.github.com",
      "https://api.github.com"
    ];
    var attempt = 0;
    function run() {
      if (attempt >= bases.length) return;
      var base = bases[attempt++];
      fetch(base + "/repos/Hamburgerwow/Burger-Chat/releases/latest", { cache: "no-store", headers: { Accept: "application/vnd.github+json" } })
        .then(function (res) { if (!res.ok) throw new Error("HTTP " + res.status); return res.json(); })
        .then(function (data) {
          var tag = data && (data.tag_name || data.name);
          if (!tag) throw new Error("no tag");
          var ver = String(tag).replace(/^v/i, "").trim();
          if (!/^\d+(\.\d+)+/.test(ver)) throw new Error("bad tag");
          setVersion(ver);
          try { localStorage.setItem(CACHE, JSON.stringify({ ver: ver, at: Date.now() })); } catch (e) {}
        })
        .catch(function () { run(); });
    }
    run();
  }

  /* ---------- 三端账号 ---------- */
  function paintAccount(info) {
    var name = info && info.nick || info && info.user || "";
    var logged = !!(info && info.logged);
    var tmName = document.getElementById("tmAcctName");
    var tmHint = document.getElementById("tmAcctHint");
    var tmBtn = document.getElementById("tmAcctBtn");
    if (tmName) tmName.textContent = logged ? name : "未登录";
    if (tmHint) tmHint.textContent = logged ? ("音乐数据已云端同步 · " + info.user) : "主页 / 开发者 / 音乐共用同一账号";
    if (tmBtn) { tmBtn.textContent = logged ? "打开音乐" : "登录"; tmBtn.href = "/burger-music"; }

    var topActions = $(".topbar .top-actions");
    if (topActions && !document.getElementById("topAcctChip")) {
      var chip = document.createElement("a");
      chip.id = "topAcctChip";
      chip.className = "ver-pill";
      chip.href = "/burger-music";
      chip.style.textDecoration = "none";
      chip.innerHTML = "<i></i><span></span>";
      chip.querySelector("span").textContent = logged ? name : "登录";
      var pill = document.getElementById("verPill");
      if (pill && pill.parentNode) pill.parentNode.insertBefore(chip, pill);
      else topActions.insertBefore(chip, topActions.firstChild);
    } else if (document.getElementById("topAcctChip")) {
      var chipSpan = document.getElementById("topAcctChip").querySelector("span");
      if (chipSpan) chipSpan.textContent = logged ? name : "登录";
    }

    var devBar = $(".topbar");
    if (devBar && document.getElementById("pageTitle") && !document.getElementById("devVer")) {
      var ver = document.createElement("span");
      ver.id = "devVer";
      ver.style.cssText = "font-size:11px;color:#8b8b96;margin-left:8px;letter-spacing:.04em";
      var title = document.getElementById("pageTitle");
      if (title && title.parentNode) title.parentNode.appendChild(ver);
    }
    var devAcct = document.getElementById("devAcctChip");
    if (devBar && document.getElementById("pageTitle") && !devAcct) {
      var btn = document.createElement("a");
      btn.id = "devAcctChip";
      btn.className = "btn sm";
      btn.href = "/burger-music";
      btn.style.textDecoration = "none";
      btn.textContent = logged ? ("账号 · " + name) : "登录 / 注册";
      var loginBtn = document.getElementById("devLoginBtn");
      if (loginBtn && loginBtn.parentNode) loginBtn.parentNode.insertBefore(btn, loginBtn);
      else devBar.appendChild(btn);
    } else if (devAcct) {
      devAcct.textContent = logged ? ("账号 · " + name) : "登录 / 注册";
    }
  }

  function loadAccount() {
    fetch("/burger-music/api/account/me", { credentials: "include", cache: "no-store" })
      .then(function (res) { return res.json(); })
      .then(function (data) { paintAccount(data || {}); })
      .catch(function () {
        var cached = "";
        try { cached = localStorage.getItem("bm:account-user") || ""; } catch (e) {}
        var metaNick = "";
        try { metaNick = (JSON.parse(localStorage.getItem("bm:account-meta") || "{}") || {}).nickname || ""; } catch (e) {}
        paintAccount({ logged: !!cached, user: cached, nick: metaNick || cached });
      });
  }

  function boot() {
    bindLook();
    githubVersion();
    loadAccount();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
