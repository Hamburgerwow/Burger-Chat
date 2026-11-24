/* Burger Chat official site runtime */
(function () {
  'use strict';

  var doc = document;
  var body = doc.body;
  var lang = body.getAttribute('data-lang') || 'zh-CN';
  try { localStorage.setItem('bcLang', lang); } catch (e) {}
  var langPages = { 'zh-CN': 'index.html', 'zh-TW': 'index-tw.html', en: 'index-en.html', ja: 'index-ja.html', ko: 'index-ko.html' };
  try {
    window.addEventListener('storage', function (e) {
      if (e.key !== 'bcLang') return;
      var next = String(e.newValue || '');
      if (!langPages[next] || next === lang) return;
      var file = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
      if (!/^index(-tw|-en|-ja|-ko)?\.html$/.test(file)) return;
      if (file === langPages[next]) return;
      location.replace(langPages[next] + location.search + location.hash);
    });
  } catch (e) {}
  var locale = body.getAttribute('data-locale') || 'zh-CN';
  var fallbackVersion = body.getAttribute('data-fallback-version') || '0.40.47';
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var t = {
    'zh-CN': { mb: 'MB', items: '个', added: '本次新增', achUnit: '个成就', release: '查看完整更新', github: 'GitHub Release' },
    'zh-TW': { mb: 'MB', items: '個', added: '本次新增', achUnit: '個成就', release: '查看完整更新', github: 'GitHub Release' },
    'en':    { mb: 'MB', items: 'items', added: 'Added in this build', achUnit: 'achievements', release: 'Full release notes', github: 'GitHub Release' },
    'ja':    { mb: 'MB', items: '個', added: '今回の追加', achUnit: '個の実績', release: '更新内容をすべて見る', github: 'GitHub Release' },
    'ko':    { mb: 'MB', items: '개', added: '이번 업데이트 추가', achUnit: '개 업적', release: '전체 업데이트 보기', github: 'GitHub Release' }
  }[lang] || { mb: 'MB', items: '个', added: '本次新增', achUnit: '个成就', release: '查看完整更新', github: 'GitHub Release' };

  var groupNames = {
    'zh-CN': { '发送': '发送', '接收': '接收', '文件': '文件', '天数': '天数', '设备': '设备' },
    'zh-TW': { '发送': '傳送', '接收': '接收', '文件': '檔案', '天数': '天數', '設備': '裝置' },
    'en': { '发送': 'Send', '接收': 'Receive', '文件': 'Files', '天数': 'Days', '设备': 'Devices' },
    'ja': { '发送': '送信', '接收': '受信', '文件': 'ファイル', '天数': '日数', '设备': '端末' },
    'ko': { '发送': '보내기', '接收': '받기', '文件': '파일', '天数': '일수', '设备': '기기' }
  }[lang] || {};
  var groupUnits = {
    'zh-CN': { sent: '条', recv: '条', files: '个', days: '天', peers: '台' },
    'zh-TW': { sent: '則', recv: '則', files: '個', days: '天', peers: '台' },
    'en': { sent: 'messages', recv: 'messages', files: 'files', days: 'days', peers: 'devices' },
    'ja': { sent: '通', recv: '通', files: '個', days: '日', peers: '台' },
    'ko': { sent: '개', recv: '개', files: '개', days: '일', peers: '대' }
  }[lang] || {};
  var pluginMeta = {
    'zh-CN': {
      'bcp.hamburgerwow.hello': { n: '快捷打招呼', d: '一键发送预设问候' },
      'bcp.hamburgerwow.focus-note': { n: '专注便签', d: '可保存的专注便签' },
      'bcp.hamburgerwow.media-tip': { n: '图片发送助手', d: '图片快捷发送入口' }
    },
    'zh-TW': {
      'bcp.hamburgerwow.hello': { n: '快速打招呼', d: '一鍵傳送預設問候' },
      'bcp.hamburgerwow.focus-note': { n: '專注便籤', d: '可保存的專注便籤' },
      'bcp.hamburgerwow.media-tip': { n: '圖片傳送助手', d: '圖片快速傳送入口' }
    },
    'en': {
      'bcp.hamburgerwow.hello': { n: 'Quick Hello', d: 'One-tap preset greeting' },
      'bcp.hamburgerwow.focus-note': { n: 'Focus Note', d: 'A note that stays put' },
      'bcp.hamburgerwow.media-tip': { n: 'Image Send Helper', d: 'A shortcut for sending photos' }
    },
    'ja': {
      'bcp.hamburgerwow.hello': { n: 'クイックあいさつ', d: '定型文をワンタップ送信' },
      'bcp.hamburgerwow.focus-note': { n: '集中メモ', d: '保存できる集中用メモ' },
      'bcp.hamburgerwow.media-tip': { n: '画像送信ヘルパー', d: '画像送信のショートカット' }
    },
    'ko': {
      'bcp.hamburgerwow.hello': { n: '빠른 인사', d: '원탭 인사말 전송' },
      'bcp.hamburgerwow.focus-note': { n: '집중 메모', d: '저장되는 집중 메모' },
      'bcp.hamburgerwow.media-tip': { n: '이미지 전송 도우미', d: '사진 전송 바로가기' }
    }
  }[lang] || {};

  function $(sel, root) { return (root || doc).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || doc).querySelectorAll(sel)); }
  function setText(sel, value) { $$(sel).forEach(function (el) { el.textContent = value; }); }

  /* scroll progress + sticky wallpaper card */
  var hero = $('#top');
  var dock = $('#dock');
  var topbar = $('.topbar');
  var progress = $('#progress');
  var heroWall = $('#heroWall');
  var heroCopy = $('.hero-copy');
  var heroArt = $('.hero-art');
  var heroCue = $('.scroll-cue');
  var slideItems = $$('.slide-item');
  var mobileMQ = window.matchMedia ? window.matchMedia('(max-width: 820px)') : { matches: false };

  function clamp01(n) { return Math.max(0, Math.min(1, n)); }
  function smooth(a, b, x) {
    var t = clamp01((x - a) / (b - a));
    return t * t * (3 - 2 * t);
  }

  function applyHeroMotion(y, vh) {
    var heroH = hero ? Math.max(520, hero.offsetHeight) : 760;
    var p = smooth(vh * 0.04, vh * 0.44, y);
    var fade = 1 - smooth(heroH * 0.92, heroH * 1.05, y);
    body.classList.toggle('is-card', p > 0.18 && y < heroH);
    body.classList.toggle('is-page2', y >= heroH * 0.985);
    if (heroWall) {
      heroWall.style.setProperty('--hero-sx', (1 - 0.17 * p).toFixed(4));
      heroWall.style.setProperty('--hero-sy', (1 - 0.18 * p).toFixed(4));
      heroWall.style.setProperty('--hero-r', (32 * p).toFixed(2) + 'px');
      heroWall.style.setProperty('--hero-ring', (0.16 * p).toFixed(3));
      heroWall.style.setProperty('--hero-o', fade.toFixed(3));
    }
    if (heroCopy) {
      heroCopy.style.setProperty('--hero-copy-x', (mobileMQ.matches ? 0 : -Math.min(vh * 0.26, 300) * p).toFixed(2) + 'px');
      heroCopy.style.setProperty('--hero-copy-o', (mobileMQ.matches ? 1 : 1 - smooth(0.08, 0.9, p)).toFixed(3));
    }
    if (heroArt) {
      heroArt.style.setProperty('--hero-art-x', (Math.min(vh * 0.3, 340) * p).toFixed(2) + 'px');
      heroArt.style.setProperty('--hero-art-o', (1 - smooth(0.08, 0.9, p)).toFixed(3));
    }
    if (heroCue) {
      heroCue.style.setProperty('--hero-cue-y', (18 * p).toFixed(2) + 'px');
      heroCue.style.setProperty('--hero-cue-o', (1 - p).toFixed(3));
    }
  }

  function applySectionMotion(vh) {
    slideItems.forEach(function (el) {
      var r = el.getBoundingClientRect();
      var enter = 1 - smooth(vh * 0.70, vh * 1.04, r.top);
      var exit = 1 - smooth(vh * 0.10, vh * 0.80, r.bottom);
      var dir = el.getAttribute('data-dir') === 'right' ? 1 : -1;
      var isTitle = el.classList.contains('slide-title');
      var x = mobileMQ.matches ? 0 : dir * ((1 - enter) * 56 + exit * 76);
      el.style.setProperty('--sx', x.toFixed(2) + 'px');
      el.style.setProperty('--so', mobileMQ.matches || isTitle ? '1' : (enter * (1 - exit)).toFixed(3));
    });
  }

  function applyMotion() {
    if (reduceMotion) return;
    var y = window.scrollY || window.pageYOffset;
    var vh = window.innerHeight || 760;
    applyHeroMotion(y, vh);
    applySectionMotion(vh);
  }

  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    var heroH = hero ? Math.max(520, hero.offsetHeight) : 760;
    var p = Math.min(1, y / Math.max(1, doc.documentElement.scrollHeight - window.innerHeight));
    if (progress) progress.style.width = (p * 100).toFixed(2) + '%';
    if (dock) dock.classList.toggle('on', y > heroH * 0.48);
    if (topbar) topbar.classList.toggle('hide', y > 74 && !mobileMQ.matches);
    applyMotion();
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  onScroll();

  /* after 60s without mouse movement, leave only the live wallpaper */
  var idleTimer = 0;
  var IDLE_MS = 60000;
  var wallOnly = false;
  var bcModalOpen = false;
  function wake() {
    if (idleTimer) clearTimeout(idleTimer);
    if (wallOnly) {
      body.classList.remove('is-wall-only');
      wallOnly = false;
    }
    idleTimer = setTimeout(sleep, IDLE_MS);
  }
  function sleep() {
    if (bcModalOpen) { idleTimer = setTimeout(sleep, 5000); return; }
    body.classList.add('is-wall-only');
    wallOnly = true;
    window.scrollTo(0, 0);
  }
  ['pointermove', 'pointerdown', 'wheel', 'keydown', 'touchstart'].forEach(function (name) {
    doc.addEventListener(name, wake, { passive: true });
  });
  doc.addEventListener('visibilitychange', function () { if (!doc.hidden) wake(); });
  wake();

  /* reveal on enter */
  var reveals = $$('.reveal');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    reveals.forEach(function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  }

  /* dynamic wallpaper: portrait/landscape defaults, optional ?wall=video/image */
  try {
    var wall = new URLSearchParams(window.location.search).get('wall');
    if (wall) {
      var wallBox = $('#heroWall');
      if (wallBox) {
        wallBox.querySelectorAll('.wall-portrait,.wall-landscape').forEach(function (el) { el.style.display = 'none'; });
        var wallEl;
        if (/\.(mp4|webm)(\?|$)/i.test(wall)) {
          wallEl = doc.createElement('video');
          wallEl.src = wall;
          wallEl.autoplay = true; wallEl.loop = true; wallEl.muted = true; wallEl.playsInline = true;
          wallEl.setAttribute('muted', ''); wallEl.setAttribute('playsinline', '');
        } else {
          wallEl = doc.createElement('img');
          wallEl.src = wall;
        }
        wallEl.className = 'wall-custom';
        wallEl.setAttribute('aria-hidden', 'true');
        wallBox.insertBefore(wallEl, wallBox.firstChild);
        if (wallEl.play) { var p = wallEl.play(); if (p && p.catch) p.catch(function () {}); }
      }
    }
  } catch (e) {}

  /* make only the active muted wallpaper start, and load it on demand */
  try {
    var playWalls = function () {
      $$('.hero-wall video').forEach(function (v) {
        var visible = v.offsetWidth > 0 && getComputedStyle(v).display !== 'none';
        if (!visible) { v.pause(); return; }
        if (v.preload === 'none') v.preload = 'auto';
        if (v.paused) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
      });
    };
    playWalls();
    var orient = window.matchMedia('(orientation:portrait)');
    if (orient.addEventListener) orient.addEventListener('change', playWalls);
    else if (orient.addListener) orient.addListener(playWalls);
    window.addEventListener('resize', playWalls);
    document.addEventListener('pointerdown', playWalls, { once: true });

    var cards = $$('.wall-art video');
    if ('IntersectionObserver' in window) {
      var videoIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          var v = entry.target;
          if (entry.isIntersecting) {
            if (v.preload === 'none') v.preload = 'auto';
            var p = v.play(); if (p && p.catch) p.catch(function () {});
          } else {
            v.pause();
          }
        });
      }, { threshold: 0.22 });
      cards.forEach(function (v) { videoIO.observe(v); });
    }
  } catch (e) {}

  /* sample the dominant colour of the live wallpaper and tint the area around the card */
  (function () {
    if (!heroWall) return;
    var tintCanvas = null, tintCtx = null, posterCache = {};
    function hslToRgb(h, s, l) {
      var c = (1 - Math.abs(2 * l - 1)) * s;
      var x = c * (1 - Math.abs((h / 60) % 2 - 1));
      var m = l - c / 2;
      var r = 0, g = 0, b = 0;
      if (h < 60) { r = c; g = x; }
      else if (h < 120) { r = x; g = c; }
      else if (h < 180) { g = c; b = x; }
      else if (h < 240) { g = x; b = c; }
      else if (h < 300) { r = x; b = c; }
      else { r = c; b = x; }
      return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
    }
    function applyTint(r, g, b) {
      r /= 255; g /= 255; b /= 255;
      var max = Math.max(r, g, b), min = Math.min(r, g, b);
      var l = (max + min) / 2, s = 0, h = 0;
      if (max !== min) {
        s = l > .5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);
        if (max === r) h = (g - b) / (max - min) + (g < b ? 6 : 0);
        else if (max === g) h = (b - r) / (max - min) + 2;
        else h = (r - g) / (max - min) + 4;
        h *= 60;
      }
      s = Math.max(.44, Math.min(.72, s * .95));
      var out = hslToRgb(h || 18, s, .27);
      doc.documentElement.style.setProperty('--wall-tint', out[0] + ',' + out[1] + ',' + out[2]);
    }
    function drawTint(src) {
      try {
        if (!tintCanvas) {
          tintCanvas = doc.createElement('canvas');
          tintCanvas.width = 48; tintCanvas.height = 48;
          try { tintCtx = tintCanvas.getContext('2d', { willReadFrequently: true }); }
          catch (e) { tintCtx = tintCanvas.getContext('2d'); }
        }
        if (!tintCtx) return false;
        tintCtx.clearRect(0, 0, 48, 48);
        tintCtx.drawImage(src, 0, 0, 48, 48);
        var data = tintCtx.getImageData(0, 0, 48, 48).data;
        var ar = 0, ag = 0, ab = 0, aw = 0;
        for (var i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 170) continue;
          var r = data[i], g = data[i + 1], b = data[i + 2];
          var lum = .2126 * r + .7152 * g + .0722 * b;
          if (lum < 16 || lum > 242) continue;
          var mx = Math.max(r, g, b), mn = Math.min(r, g, b);
          var sat = (mx - mn) / 255;
          var w = .18 + sat * 1.45;
          ar += r * w; ag += g * w; ab += b * w; aw += w;
        }
        if (aw < 1) return false;
        applyTint(Math.round(ar / aw), Math.round(ag / aw), Math.round(ab / aw));
        return true;
      } catch (e) { return false; }
    }
    function loadPoster(url) {
      if (!url || posterCache[url]) return;
      var im = new Image();
      posterCache[url] = im;
      im.onload = function () { drawTint(im); };
      try { im.src = url; } catch (e) {}
    }
    function sampleWallTint() {
      if (!heroWall || doc.hidden) return;
      var sources = $$('.hero-wall video,.hero-wall img');
      for (var i = 0; i < sources.length; i++) {
        var src = sources[i];
        if (!src.offsetWidth || getComputedStyle(src).display === 'none') continue;
        if (src.tagName === 'VIDEO') {
          if (src.readyState >= 2 && drawTint(src)) return;
          loadPoster(src.getAttribute('poster'));
        } else {
          if (src.complete && src.naturalWidth && drawTint(src)) return;
          loadPoster(src.currentSrc || src.src);
        }
      }
    }
    $$('.hero-wall video,.hero-wall img').forEach(function (src) {
      src.addEventListener('loadeddata', sampleWallTint);
      src.addEventListener('load', sampleWallTint);
    });
    var orient2 = window.matchMedia('(orientation:portrait)');
    if (orient2.addEventListener) orient2.addEventListener('change', function () { setTimeout(sampleWallTint, 500); });
    window.addEventListener('resize', function () { setTimeout(sampleWallTint, 450); });
    setTimeout(sampleWallTint, 900);
    setTimeout(sampleWallTint, 2600);
    setInterval(sampleWallTint, 3200);
  })();

  /* keep wallpaper choice across language pages */
  try {
    var qs = window.location.search;
    if (qs) $$('.lang-link').forEach(function (a) { if (a.tagName === 'A') a.href += qs; });
  } catch (e) {}

  /* language selector in the top navigation */
  $$('[data-lang-select]').forEach(function (sel) {
    sel.addEventListener('change', function () {
      var fallback = 'index.html';
      var href = this.value || fallback;
      try {
        var wall = new URLSearchParams(window.location.search).get('wall');
        if (wall) href += '?wall=' + encodeURIComponent(wall);
      } catch (e) {}
      if (window.location.hash) href += window.location.hash;
      window.location.href = href;
    });
  });

  /* Burger Chat card carousel + page transition */
  var bcSwitcher = $('#bcSwitcher');
  var bcMobile = $('#bcMobile');
  var bcTrack = $('#bcTrack');
  var bcViewport = $('#bcViewport');
  var bcCards = bcSwitcher ? $$('.bc-card', bcSwitcher) : [];
  var bcDots = bcSwitcher ? $$('.bc-dot', bcSwitcher) : [];
  var bcNow = $('#bcNow');
  var bcToast = $('#bcToast');
  var bcToastTitle = $('#bcToastTitle');
  var bcToastSub = $('#bcToastSub');
  var bcTransition = $('#bcTransition');
  var bcTransitionSub = $('#bcTransitionSub');
  var bcTransitionKicker = $('#bcTransitionKicker');
  var bcTransitionTitle = $('#bcTransitionTitle');
  var bcIndex = 0;
  var bcOpen = false;
  var bcOpener = null;
  var bcSwitchTimer = 0;
  var bcWheelAt = 0;

  function isMobileBC() {
    return !!mobileMQ.matches;
  }
  function lockModal(on) {
    bcModalOpen = on;
    body.classList.toggle('bc-modal-open', on);
    if (on) {
      if (idleTimer) clearTimeout(idleTimer);
    } else {
      wake();
    }
  }
  function layoutBC() {
    if (!bcSwitcher || !bcTrack || !bcViewport || !bcCards.length) return;
    var cardW = bcCards[0].offsetWidth;
    var gap = parseFloat(getComputedStyle(bcTrack).columnGap || getComputedStyle(bcTrack).gap) || 22;
    var pairW = cardW * 2 + gap;
    var offset = (bcIndex === 0 && pairW <= bcViewport.clientWidth)
      ? (bcViewport.clientWidth - pairW) / 2
      : (bcViewport.clientWidth - cardW) / 2 - bcIndex * (cardW + gap);
    bcTrack.style.transform = 'translate3d(' + offset.toFixed(2) + 'px,0,0)';
    bcCards.forEach(function (card, i) {
      card.classList.toggle('is-active', i === bcIndex);
      card.setAttribute('aria-current', i === bcIndex ? 'true' : 'false');
    });
    bcDots.forEach(function (dot, i) { dot.classList.toggle('is-active', i === bcIndex); });
    if (bcNow) bcNow.textContent = String(bcIndex + 1).padStart(2, '0');
  }
  function nearestBC() {
    var anchor = (window.scrollY || window.pageYOffset) + window.innerHeight * .38;
    var best = 0, bestDist = Infinity;
    bcCards.forEach(function (card, i) {
      if (card.getAttribute('data-bc-external') === 'true') return;
      var target = null;
      try { target = doc.querySelector(card.getAttribute('data-bc-target')); } catch (e) { return; }
      if (!target) return;
      var top = target === hero ? 0 : target.getBoundingClientRect().top + (window.scrollY || window.pageYOffset);
      var dist = Math.abs(top - anchor);
      if (dist < bestDist) { bestDist = dist; best = i; }
    });
    return best;
  }
  function setBC(i) {
    if (!bcCards.length) return;
    bcIndex = (i + bcCards.length) % bcCards.length;
    layoutBC();
  }
  function openBC(trigger) {
    if (!bcSwitcher) return;
    if (isMobileBC()) { showMobileFail(); return; }
    bcOpener = trigger || doc.activeElement;
    bcOpen = true;
    bcIndex = nearestBC();
    bcSwitcher.classList.add('is-open');
    bcSwitcher.removeAttribute('aria-hidden');
    bcSwitcher.removeAttribute('inert');
    lockModal(true);
    setTimeout(layoutBC, 30);
    var close = $('.bc-close', bcSwitcher);
    if (close) setTimeout(function () { close.focus(); }, 80);
  }
  function closeBC() {
    if (!bcSwitcher) return;
    bcOpen = false;
    bcSwitcher.classList.remove('is-open');
    bcSwitcher.setAttribute('aria-hidden', 'true');
    bcSwitcher.setAttribute('inert', '');
    lockModal(false);
    if (bcOpener && bcOpener.focus) bcOpener.focus();
  }
  function showMobileFail() {
    if (!bcMobile) return;
    if (bcOpen) closeBC();
    bcMobile.classList.add('is-open');
    bcMobile.removeAttribute('aria-hidden');
    bcMobile.removeAttribute('inert');
    lockModal(true);
    var btn = $('[data-bc-mobile-close]', bcMobile);
    if (btn) setTimeout(function () { btn.focus(); }, 60);
  }
  function closeMobileFail() {
    if (!bcMobile) return;
    bcMobile.classList.remove('is-open');
    bcMobile.setAttribute('aria-hidden', 'true');
    bcMobile.setAttribute('inert', '');
    lockModal(false);
  }
  function setTransitionCopy(kicker, title, sub) {
    if (bcTransitionKicker) bcTransitionKicker.textContent = kicker || 'BURGER CHAT';
    if (bcTransitionTitle) bcTransitionTitle.textContent = title || '';
    if (bcTransitionSub) bcTransitionSub.textContent = sub || '';
  }
  function playWelcome(kind, after) {
    if (!bcTransition) {
      if (after) after();
      return;
    }
    var home = kind === 'home';
    var title = bcTransition.getAttribute(home ? 'data-welcome-home' : 'data-welcome-enter') || '';
    var sub = bcTransition.getAttribute(home ? 'data-welcome-home-sub' : 'data-welcome-enter-sub') || '';
    if (bcSwitchTimer) clearTimeout(bcSwitchTimer);
    if (bcToast) bcToast.classList.remove('is-on');
    body.classList.remove('bc-switching');
    bcTransition.style.removeProperty('opacity');
    bcTransition.style.removeProperty('visibility');
    bcTransition.style.removeProperty('transition');
    var wipe = $('.bc-wipe', bcTransition);
    var copy = $('.bc-transition-copy', bcTransition);
    var head = $('.bc-transition-copy b', bcTransition);
    var note = $('.bc-transition-copy small', bcTransition);
    if (wipe) { wipe.style.removeProperty('clip-path'); wipe.style.removeProperty('transition'); }
    if (copy) copy.style.removeProperty('opacity');
    if (head) { head.style.removeProperty('animation'); head.style.removeProperty('opacity'); head.style.removeProperty('transform'); }
    if (note) { note.style.removeProperty('animation'); note.style.removeProperty('opacity'); note.style.removeProperty('transform'); }
    bcTransition.classList.remove('is-on','is-welcome','is-home','is-enter');
    void bcTransition.offsetWidth;
    setTransitionCopy('BURGER CHAT', title, sub);
    bcTransition.classList.add('is-on','is-welcome', home ? 'is-home' : 'is-enter');
    bcTransition.removeAttribute('aria-hidden');
    /* some background/embedded browsers keep CSS transitions frozen at 0%; force a readable fallback */
    setTimeout(function () {
      if (!bcTransition.classList.contains('is-on')) return;
      var cs = window.getComputedStyle ? window.getComputedStyle(bcTransition) : null;
      if (cs && (cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.05)) {
        bcTransition.style.transition = 'none';
        bcTransition.style.opacity = '1';
        bcTransition.style.visibility = 'visible';
        if (wipe) { wipe.style.transition = 'none'; wipe.style.clipPath = 'inset(0)'; }
        if (copy) copy.style.opacity = '1';
        var head = $('.bc-transition-copy b', bcTransition);
        var note = $('.bc-transition-copy small', bcTransition);
        if (head) { head.style.animation = 'none'; head.style.opacity = '1'; head.style.transform = 'none'; }
        if (note) { note.style.animation = 'none'; note.style.opacity = '1'; note.style.transform = 'none'; }
      }
    }, 320);
    if (after) setTimeout(after, reduceMotion ? 120 : 440);
    bcSwitchTimer = setTimeout(function () {
      bcTransition.classList.remove('is-on','is-welcome','is-home','is-enter');
      bcTransition.style.removeProperty('opacity');
      bcTransition.style.removeProperty('visibility');
      bcTransition.style.removeProperty('transition');
      if (wipe) { wipe.style.removeProperty('clip-path'); wipe.style.removeProperty('transition'); }
      if (copy) copy.style.removeProperty('opacity');
      if (head) { head.style.removeProperty('animation'); head.style.removeProperty('opacity'); head.style.removeProperty('transform'); }
      if (note) { note.style.removeProperty('animation'); note.style.removeProperty('opacity'); note.style.removeProperty('transform'); }
      bcTransition.setAttribute('aria-hidden', 'true');
      bcSwitchTimer = 0;
    }, reduceMotion ? 1050 : 2680);
  }
  function switchPage(target, title, force, copyOverride) {
    if (!force && isMobileBC()) { showMobileFail(); return; }
    if (bcOpen) closeBC();
    if (bcSwitchTimer) clearTimeout(bcSwitchTimer);
    var external = /^(?:https?:)?\/\//i.test(target) || /^\/[^/]/.test(target) || /\.html?(?:[?#]|$)/i.test(target);
    var switchCopy = (bcTransition && bcTransition.getAttribute('data-switching')) || title;
    var enterCopy = (bcTransition && bcTransition.getAttribute('data-entering')) || title;
    var actionCopy = copyOverride || (external ? enterCopy : switchCopy);
    if (bcTransition) bcTransition.classList.remove('is-welcome','is-home','is-enter');
    /* Only the full-screen transition shows the copy. The toast used to sit above
       it with the same words, which made the entering animation look doubled. */
    setTransitionCopy('BURGER CHAT', actionCopy, '');
    if (bcToastTitle) bcToastTitle.textContent = actionCopy;
    if (bcToast) bcToast.classList.remove('is-on');
    if (bcTransition) {
      bcTransition.classList.add('is-on');
      bcTransition.removeAttribute('aria-hidden');
    }
    body.classList.add('bc-switching');

    if (external) {
      var nextKind = 'enter';
      try {
        var dest = new URL(target, window.location.href);
        if (dest.origin === window.location.origin && /^\/(?:index(?:-(?:tw|en|ja|ko))?\.html)?$/.test(dest.pathname)) nextKind = 'home';
      } catch (e) {}
      try {
        sessionStorage.setItem('bcWelcomeNext', JSON.stringify({ kind: nextKind, at: Date.now() }));
      } catch (e) {}
      /* Wait for the wipe and title animation to finish; 620 ms cut them in half. */
      setTimeout(function () { window.location.href = target; }, reduceMotion ? 220 : 1500);
      bcSwitchTimer = setTimeout(function () {
        if (bcTransition) {
          bcTransition.classList.remove('is-on','is-welcome','is-home','is-enter');
          bcTransition.setAttribute('aria-hidden', 'true');
        }
        body.classList.remove('bc-switching');
        bcSwitchTimer = 0;
      }, reduceMotion ? 1400 : 4200);
      return;
    }

    var targetEl = doc.querySelector(target);
    if (!targetEl) return;

    setTimeout(function () {
      var top = targetEl === hero ? 0 : Math.max(0, targetEl.getBoundingClientRect().top + (window.scrollY || window.pageYOffset) - 22);
      window.scrollTo(0, top);
    }, 280);

    bcSwitchTimer = setTimeout(function () {
      if (bcToast) bcToast.classList.remove('is-on');
      if (bcTransition) {
        bcTransition.classList.remove('is-on','is-welcome','is-home','is-enter');
        bcTransition.setAttribute('aria-hidden', 'true');
      }
      body.classList.remove('bc-switching');
      bcSwitchTimer = 0;
    }, 1650);
  }

  $$('[data-bc-open]').forEach(function (btn) {
    btn.addEventListener('click', function (e) { e.preventDefault(); openBC(btn); });
  });
  // The top Fort Selector plays the entering animation, then navigates to its real link.
  var topBC = $('.top-bc');
  if (topBC) {
    topBC.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var href = topBC.getAttribute('href') || topBC.href;
      if (!href) return;
      e.preventDefault();
      switchPage(href, topBC.getAttribute('aria-label') || 'Fort Selector', true, topBC.getAttribute('data-enter-copy'));
    });
  }
  // Hero Director Bao gets the same transition before opening its selector page.
  var heroBC = $('.hero-cta .cta-fort');
  if (heroBC) {
    heroBC.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var href = heroBC.getAttribute('href') || heroBC.href;
      if (!href) return;
      e.preventDefault();
      switchPage(href, 'Director Bao', true);
    });
  }
  if (bcSwitcher) {
    $$('[data-bc-close]', bcSwitcher).forEach(function (el) { el.addEventListener('click', closeBC); });
    $$('[data-bc-prev]', bcSwitcher).forEach(function (el) { el.addEventListener('click', function () { setBC(bcIndex - 1); }); });
    $$('[data-bc-next]', bcSwitcher).forEach(function (el) { el.addEventListener('click', function () { setBC(bcIndex + 1); }); });
    bcDots.forEach(function (dot, i) { dot.addEventListener('click', function () { setBC(i); }); });
    bcCards.forEach(function (card) {
      card.addEventListener('click', function () {
        var target = card.getAttribute('data-bc-target');
        if (target === '#top') {
          closeBC();
          playWelcome('home', function () {
            window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
          });
          return;
        }
        switchPage(target, card.getAttribute('data-bc-title'));
      });
    });
    if (bcViewport) {
      bcViewport.addEventListener('wheel', function (e) {
        if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
        e.preventDefault();
        var now = Date.now();
        if (now - bcWheelAt < 450) return;
        bcWheelAt = now;
        setBC(bcIndex + (e.deltaY > 0 ? 1 : -1));
      }, { passive: false });
    }
    window.addEventListener('resize', function () { if (bcOpen) layoutBC(); });
  }
  if (bcMobile) {
    $$('[data-bc-mobile-close]', bcMobile).forEach(function (el) { el.addEventListener('click', closeMobileFail); });
  }
  doc.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (bcMobile && bcMobile.classList.contains('is-open')) { closeMobileFail(); return; }
      if (bcOpen) closeBC();
      return;
    }
    if (!bcOpen) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); setBC(bcIndex - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); setBC(bcIndex + 1); }
  });

  /* format bytes */
  function mb(n) {
    var v = Number(n);
    if (!isFinite(v) || v <= 0) return '';
    return (v / 1048576).toFixed(2) + ' ' + t.mb;
  }

  /* latest release */
  fetch('/api/latest?t=' + Date.now(), { cache: 'no-store' })
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function (o) {
      var l = o && o.latest; if (!l) return;
      var ver = l.ver || fallbackVersion;
      setText('[data-version]', ver);
      setText('[data-version-inline]', 'v' + ver);
      if (l.ts) {
        try {
          var d = new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(Number(l.ts)));
          setText('[data-date]', d);
        } catch (e) {}
      }
      var exe = (l.pc && l.pc.exe) || l.exe;
      var apk = (l.mobile && l.mobile.apk) || l.apk;
      if (exe && exe.size) { setText('[data-size="exe"]', mb(exe.size)); }
      if (apk && apk.size) { setText('[data-size="apk"]', mb(apk.size)); }
      if (exe && exe.sha256) $$('[data-sha="exe"]').forEach(function (a) { a.href = 'data:text/plain,' + encodeURIComponent(exe.sha256); });
      if (apk && apk.sha256) $$('[data-sha="apk"]').forEach(function (a) { a.href = 'data:text/plain,' + encodeURIComponent(apk.sha256); });
    })
    .catch(function () {});

  /* achievements */
  fetch('/api/achievements?t=' + Date.now(), { cache: 'no-store' })
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function (o) {
      var total = Number(o.total) || 0;
      var added = Number(o.added) || 0;
      if (total) {
        setText('[data-ach-total]', String(total));
        var bar = $('#achBar');
        if (bar) bar.style.width = Math.min(100, Math.round((added / total) * 100)) + '%';
      }
      if (added) setText('[data-ach-added]', t.added + ' ' + added + ' ' + t.achUnit);
      var groups = o.groups || [];
      var box = $('#achGroups');
      if (box && groups.length) {
        box.innerHTML = '';
        groups.forEach(function (g) {
          var name = groupNames[g.name] || g.name || '';
          var count = Number(g.count) || 0;
          var unit = groupUnits[g.key] || t.items;
          var cell = doc.createElement('div');
          cell.className = 'ach-cat';
          var b = doc.createElement('b'); b.textContent = name;
          var s = doc.createElement('span'); s.textContent = count + ' ' + unit;
          cell.appendChild(b); cell.appendChild(s); box.appendChild(cell);
        });
      }
    })
    .catch(function () {});

  /* plugins */
  function pluginIcon(p) {
    var span = doc.createElement('span');
    span.className = 'plug-ico';
    var icon = p && (p.icon || p.logo);
    if (icon && /^https?:\/\//i.test(icon)) {
      var im = doc.createElement('img'); im.src = icon; im.alt = ''; im.loading = 'lazy'; span.appendChild(im);
    } else {
      span.textContent = icon || '✦';
    }
    return span;
  }
  function pluginRow(p, rank) {
    var row = doc.createElement('div'); row.className = 'plug-row';
    row.appendChild(pluginIcon(p));
    var meta = pluginMeta[p.id];
    var info = doc.createElement('div'); info.className = 'plug-info';
    var b = doc.createElement('b'); b.textContent = (meta && meta.n) || p.name || ('Plugin ' + rank);
    var s = doc.createElement('span'); s.textContent = (meta && meta.d) || p.tag || p.category || 'Burger Chat Plugin';
    info.appendChild(b); info.appendChild(s); row.appendChild(info);
    var rate = doc.createElement('span'); rate.className = 'plug-rate';
    var r = Number(p.rating || p.score || 0);
    rate.textContent = r ? '★ ' + (Math.round(r * 10) / 10) : 'TOP ' + rank;
    row.appendChild(rate);
    return row;
  }
  fetch('/plugins/registry.json?t=' + Date.now(), { cache: 'no-store' })
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function (o) {
      var ps = (o && o.plugins) || [];
      var weekly = (o && o.weekly && o.weekly.top) || [];
      var top = weekly.map(function (id) { return ps.filter(function (p) { return p.id === id; })[0]; }).filter(Boolean);
      if (!top.length) top = ps.slice().sort(function (a, b) { return (Number(b.rating) || 0) - (Number(a.rating) || 0); }).slice(0, 3);
      if (ps.length) setText('[data-plugin-count]', String(ps.length));
      var list = $('#plugList');
      if (list && top.length) {
        list.innerHTML = '';
        top.slice(0, 3).forEach(function (p, i) { list.appendChild(pluginRow(p, i + 1)); });
      }
    })
    .catch(function () {});

  /* mobile: place the player directly under the hero download buttons */
  function syncMusicPlacement() {
    var music = $('#musicStack') || $('#musicDock');
    if (!music) return;
    if (mobileMQ.matches) {
      var heroCopy = $('.hero-copy');
      if (!heroCopy) return;
      var slot = $('#mobileMusicSlot');
      if (!slot) {
        slot = doc.createElement('div');
        slot.id = 'mobileMusicSlot';
        slot.className = 'mobile-music-slot';
        var cta = $('.hero-cta', heroCopy);
        if (cta && cta.parentNode === heroCopy) heroCopy.insertBefore(slot, cta.nextSibling);
        else heroCopy.appendChild(slot);
      }
      if (music.parentNode !== slot) slot.appendChild(music);
    } else if (music.parentNode !== body) {
      body.appendChild(music);
    }
  }
  syncMusicPlacement();
  window.addEventListener('resize', syncMusicPlacement, { passive: true });

  /* background music: default track + optional GitHub-hosted user uploads */
  if (false) (function () {
    var dock = $('#musicDock');
    var audio = $('#musicAudio');
    if (!dock || !audio) return;
    var titleEl = $('#musicTitle');
    var byEl = $('#musicBy');
    var cover = $('#musicCover');
    var playBtn = $('#musicPlay');
    var PAUSE_KEY = 'bcMusicPaused';
    var userPaused = false;
    try { userPaused = localStorage.getItem(PAUSE_KEY) === '1'; } catch (e) {}
    function rememberPause(paused) {
      try { localStorage.setItem(PAUSE_KEY, paused ? '1' : '0'); } catch (e) {}
    }
    var ready = false;
    var manifestUrl = 'https://raw.githubusercontent.com/Hamburgerwow/Burger-Chat/main/music/index.json?t=';
    var fallbackUrl = '/api/music?t=';
    var fallbackTrack = { title: '萤火之森', uploader: 'CMJ', url: '/assets/music/firefly-cmj.mp3?v=0.40.52r3' };
    var words = {
      'zh-CN': { by: '上传者', play: '播放背景音乐', pause: '暂停背景音乐', fail: '音乐加载失败' },
      'zh-TW': { by: '上傳者', play: '播放背景音樂', pause: '暫停背景音樂', fail: '音樂載入失敗' },
      'en':    { by: 'Uploaded by', play: 'Play background music', pause: 'Pause background music', fail: 'Music failed to load' },
      'ja':    { by: 'アップロード', play: 'BGMを再生', pause: 'BGMを一時停止', fail: '音楽を読み込めません' },
      'ko':    { by: '업로더', play: '배경 음악 재생', pause: '배경 음악 일시정지', fail: '음악을 불러오지 못했습니다' }
    }[lang] || { by: '上传者', play: '播放背景音乐', pause: '暂停背景音乐', fail: '音乐加载失败' };

    function setPlaying(on) {
      dock.classList.toggle('is-playing', !!on);
      dock.classList.toggle('is-paused', !on);
      playBtn.setAttribute('aria-label', on ? words.pause : words.play);
      cover.setAttribute('aria-label', on ? words.pause : words.play);
    }
    function showTrack(track) {
      if (!track || !track.url) return;
      var u = String(track.url);
      if (!/^https?:|^\//.test(u)) u = '/' + u.replace(/^\.?\//, '');
      if (audio.getAttribute('src') !== u) {
        audio.src = u;
        try { audio.load(); } catch (e) {}
      }
      if (titleEl) titleEl.textContent = String(track.title || '萤火之森');
      if (byEl) byEl.textContent = words.by + ' · ' + String(track.uploader || 'CMJ');
      ready = true;
    }
    function tryPlay() {
      if (userPaused || !ready) return;
      var p = audio.play();
      if (p && p.catch) p.catch(function () { setPlaying(false); });
    }
    function toggle() {
      if (audio.paused) {
        userPaused = false;
        rememberPause(false);
        var p = audio.play();
        if (p && p.catch) p.catch(function () {});
      } else {
        userPaused = true;
        rememberPause(true);
        audio.pause();
      }
    }
    function useManifest(o) {
      var track = (o && (o.latest || (o.tracks && o.tracks[o.tracks.length - 1]))) || (o && o.default) || fallbackTrack;
      if (track && track.url) showTrack(track);
    }
    function loadManifest(url) {
      return fetch(url + Date.now(), { cache: 'no-store' })
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(function (o) { useManifest(o); return true; })
        .catch(function () { return false; });
    }
    cover.addEventListener('click', toggle);
    playBtn.addEventListener('click', toggle);
    audio.addEventListener('play', function () { setPlaying(true); startLyricClock(); });
    audio.addEventListener('pause', function () { setPlaying(false); });
    audio.addEventListener('error', function () {
      if (byEl) byEl.textContent = words.fail;
      setPlaying(false);
    });
    /* first try immediately; if autoplay is blocked, resume on the first real gesture */
    showTrack(fallbackTrack);
    setPlaying(false);
    tryPlay();
    loadManifest(manifestUrl).then(function (ok) {
      if (!ok) return loadManifest(fallbackUrl);
      return true;
    }).then(function () {
      if (!audio.paused) return;
      tryPlay();
    }).catch(function () {});
    ['pointerdown', 'keydown', 'touchstart'].forEach(function (name) {
      doc.addEventListener(name, function (e) {
        if (userPaused || !audio.paused) return;
        if (e.target && e.target.closest && e.target.closest('#musicDock')) return;
        tryPlay();
      }, { passive: true });
    });
    doc.addEventListener('visibilitychange', function () {
      if (!doc.hidden && !userPaused && audio.paused) tryPlay();
    });
  })();

  /* entry welcome: switcher returns home, other pages enter Burger Chat */
  (function () {
    var kind = '';
    var q = '';
    try { q = new URLSearchParams(window.location.search).get('welcome') || ''; } catch (e) {}
    if (q === 'home' || q === 'enter') kind = q;
    try {
      var next = JSON.parse(sessionStorage.getItem('bcWelcomeNext') || 'null');
      if (!kind && next && (next.kind === 'enter' || next.kind === 'home') && Date.now() - Number(next.at) < 300000) kind = next.kind;
      sessionStorage.removeItem('bcWelcomeNext');
    } catch (e) {}
    if (!kind) {
      var nav = window.performance && performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
      if (!nav || nav.type !== 'reload') {
        var ref = document.referrer;
        if (ref) {
          try {
            var r = new URL(ref);
            var sameSite = r.origin === window.location.origin;
            var sameIndex = sameSite && /^\/(?:index(?:-(?:tw|en|ja|ko))?\.html)?$/.test(r.pathname);
            if (!sameIndex) kind = sameSite ? 'home' : 'enter';
          } catch (e) {}
        }
      }
    }
    if (q) {
      try { history.replaceState(null, '', window.location.pathname + window.location.hash); } catch (e) {}
    }
    if (kind) setTimeout(function () { playWelcome(kind); }, 320);
  })();


  /* language chooser: card carousel */
  (function () {
    var sel = $('[data-lang-select]');
    var label = sel && sel.closest ? sel.closest('.lang-select') : null;
    if (!label) return;
    var langs = [
      { href: 'index.html', short: '简中', name: '简体中文', sub: 'Simplified Chinese', code: 'ZH', tone: 'rgba(255,138,84,.30)' },
      { href: 'index-tw.html', short: '繁中', name: '繁體中文', sub: 'Traditional Chinese', code: 'TW', tone: 'rgba(255,184,92,.27)' },
      { href: 'index-en.html', short: 'EN', name: 'English', sub: 'English', code: 'EN', tone: 'rgba(112,190,255,.25)' },
      { href: 'index-ja.html', short: '日本語', name: '日本語', sub: 'Japanese', code: 'JA', tone: 'rgba(255,140,174,.26)' },
      { href: 'index-ko.html', short: '한국어', name: '한국어', sub: 'Korean', code: 'KO', tone: 'rgba(162,148,255,.25)' }
    ];
    var words = {
      'zh-CN': { title: '选择语言', sub: '左右滑动或点击卡片切换界面语言', hint: '点击卡片立即切换 · Esc 关闭', now: '选中' },
      'zh-TW': { title: '選擇語言', sub: '左右滑動或點擊卡片切換介面語言', hint: '點擊卡片立即切換 · Esc 關閉', now: '選取' },
      'en': { title: 'Choose language', sub: 'Swipe or tap a card to switch the interface', hint: 'Tap a card to switch · Esc to close', now: 'SELECT' },
      'ja': { title: '言語を選択', sub: 'カードをスワイプまたはタップして切り替え', hint: 'カードをタップして切り替え · Esc で閉じる', now: '選択' },
      'ko': { title: '언어 선택', sub: '카드를 밀거나 탭해서 언어를 전환', hint: '카드를 탭하면 전환 · Esc 닫기', now: '선택' }
    }[lang] || { title: '选择语言', sub: '左右滑动或点击卡片切换界面语言', hint: '点击卡片立即切换 · Esc 关闭', now: '选中' };
    var cur = 0;
    for (var i = 0; i < langs.length; i++) {
      var lc = String(lang).toLowerCase();
      if ((i === 0 && lc.indexOf('zh') === 0 && lc.indexOf('tw') < 0 && lc.indexOf('hant') < 0) ||
          (i === 1 && (lc.indexOf('tw') >= 0 || lc.indexOf('hant') >= 0)) ||
          (i === 2 && lc.indexOf('en') === 0) ||
          (i === 3 && lc.indexOf('ja') === 0) ||
          (i === 4 && lc.indexOf('ko') === 0)) cur = i;
    }

    var trigger = doc.createElement('button');
    trigger.type = 'button';
    trigger.className = 'lang-trigger';
    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.setAttribute('aria-label', words.title);
    trigger.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M3.8 12h16.4M12 3.5c2.2 2.3 3.3 5.2 3.3 8.5S14.2 18.7 12 20.5M12 3.5c-2.2 2.3-3.3 5.2-3.3 8.5S9.8 18.7 12 20.5"/></svg><b>' + langs[cur].short + '</b><span class="lt-chev" aria-hidden="true"></span>';
    label.parentNode.replaceChild(trigger, label);

    var modal = doc.createElement('div');
    modal.className = 'lang-carousel';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-hidden', 'true');
    var cardsHtml = langs.map(function (l, n) {
      return '<button class="lang-card" type="button" data-lang-i="' + n + '" style="--tone:' + l.tone + '" aria-label="' + l.name + '">' +
        '<span class="lc-badge">' + words.now + '</span><span class="lc-mark">' + l.code + '</span>' +
        '<span class="lc-name">' + l.name + '</span><span class="lc-sub">' + l.sub + '</span></button>';
    }).join('');
    var dotsHtml = langs.map(function (l, n) {
      return '<button type="button" class="' + (n === cur ? 'is-active' : '') + '" data-lang-dot="' + n + '" aria-label="' + l.name + '"></button>';
    }).join('');
    modal.innerHTML = '<div class="lang-panel">' +
      '<div class="lang-head"><span class="lh-ico"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M3.8 12h16.4M12 3.5c2.2 2.3 3.3 5.2 3.3 8.5S14.2 18.7 12 20.5M12 3.5c-2.2 2.3-3.3 5.2-3.3 8.5S9.8 18.7 12 20.5"/></svg></span>' +
      '<div><b>' + words.title + '</b><small>' + words.sub + '</small></div><button type="button" class="lang-close" aria-label="Close">×</button></div>' +
      '<div class="lang-stage"><div class="lang-track">' + cardsHtml + '</div></div>' +
      '<div class="lang-controls"><button type="button" class="lang-arrow" data-lang-prev aria-label="Previous"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button>' +
      '<div class="lang-dots">' + dotsHtml + '</div>' +
      '<button type="button" class="lang-arrow" data-lang-next aria-label="Next"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></button></div>' +
      '<div class="lang-hint">' + words.hint + '</div></div>';
    body.appendChild(modal);

    var stage = $('.lang-stage', modal);
    var track = $('.lang-track', modal);
    var cards = $$('.lang-card', modal);
    var dots = $$('[data-lang-dot]', modal);
    var closeBtn = $('.lang-close', modal);
    var openAt = 0;
    var swiped = false;
    var downX = null;

    function setIndex(n) {
      cur = (n + langs.length) % langs.length;
      cards.forEach(function (c, i) { c.classList.toggle('is-active', i === cur); });
      dots.forEach(function (d, i) { d.classList.toggle('is-active', i === cur); });
      var vp = stage.clientWidth;
      var cw = cards[0].offsetWidth;
      var gap = 14;
      var off = (vp - cw) / 2 - cur * (cw + gap);
      var total = cards.length * cw + (cards.length - 1) * gap;
      off = Math.max(vp - total - 4, Math.min(4, off));
      track.style.transform = 'translateX(' + off + 'px)';
    }
    function open() {
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      body.classList.add('lang-open');
      openAt = Date.now();
      setIndex(cur);
      setTimeout(function () { closeBtn.focus({ preventScroll: true }); }, 250);
    }
    function close() {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      body.classList.remove('lang-open');
      setTimeout(function () { trigger.focus({ preventScroll: true }); }, 120);
    }
    function go(n) {
      var l = langs[(n + langs.length) % langs.length];
      var href = l.href;
      try {
        var wall = new URLSearchParams(window.location.search).get('wall');
        if (wall) href += '?wall=' + encodeURIComponent(wall);
      } catch (e) {}
      if (window.location.hash) href += window.location.hash;
      window.location.href = href;
    }
    trigger.addEventListener('click', open);
    closeBtn.addEventListener('click', close);
    modal.addEventListener('click', function (e) { if (e.target === modal) close(); });
    $$('[data-lang-prev]', modal).forEach(function (b) { b.addEventListener('click', function () { setIndex(cur - 1); }); });
    $$('[data-lang-next]', modal).forEach(function (b) { b.addEventListener('click', function () { setIndex(cur + 1); }); });
    dots.forEach(function (d, i) { d.addEventListener('click', function () { setIndex(i); }); });
    cards.forEach(function (c, i) {
      c.addEventListener('click', function () {
        if (swiped) return;
        if (i === cur) { close(); return; }
        setIndex(i);
        setTimeout(function () { go(i); }, 240);
      });
    });
    if (stage) {
      stage.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse') downX = e.clientX; });
      stage.addEventListener('pointerup', function (e) {
        if (downX == null) return;
        var dx = e.clientX - downX;
        downX = null;
        if (Math.abs(dx) > 38) {
          swiped = true;
          setIndex(cur + (dx < 0 ? 1 : -1));
          setTimeout(function () { swiped = false; }, 420);
        }
      });
      stage.addEventListener('pointercancel', function () { downX = null; });
    }
    doc.addEventListener('keydown', function (e) {
      if (!modal.classList.contains('is-open')) return;
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); setIndex(cur - 1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); setIndex(cur + 1); }
      else if (e.key === 'Enter' && Date.now() - openAt > 120) { e.preventDefault(); go(cur); }
    });
    window.addEventListener('resize', function () { if (modal.classList.contains('is-open')) setIndex(cur); }, { passive: true });
  })();

  /* background music: playlist, now-playing card, embedded ID3 metadata, lyrics and resume */
  (function () {
    var stack = $('#musicStack');
    var dock = $('#musicDock');
    var audio = $('#musicAudio');
    if (!dock || !audio) return;
    var titleEl = $('#musicTitle');
    var byEl = $('#musicBy');
    var cover = $('#musicCover');
    var coverImg = $('#musicCoverImg');
    var playMini = $('#musicPlay');
    var playBig = $('#musicPlayBig');
    var prevBtn = $('#musicPrev');
    var nextBtn = $('#musicNext');
    var modeBtn = $('#musicMode');
    var range = $('#musicProgress');
    var curEl = $('#musicTime');
    var totalEl = $('#musicTotal');
    var lyricsBtn = $('#musicLyricsBtn');
    var lyricsPanel = $('#musicLyricsPanel');
    var lyricsHome = lyricsPanel && lyricsPanel.parentNode;
    var lyricsInner = $('#musicLyricsInner');
    var lyricsBg = $('#musicLyricsBg');
    var lyricsArt = $('#musicLyricsArt');
    var lyricsCover = $('#musicLyricsCover');
    var lyricsTitle = $('#musicLyricsTitle');
    var lyricsBy = $('#musicLyricsBy');
    var lyricsClose = $('#musicLyricsClose');
    var lyricsExpand = $('#musicLyricsExpand');
    var lyricsSource = $('#musicLyricsSource');
    var lyricsTime = $('#musicLyricsTime');
    var lyricsBar = $('#musicLyricsBar');
    var qualityBar = $('#musicQualityBar');
    var qualityNow = $('#musicQualityNow');
    var qualityBtns = document.querySelectorAll('.mdq-btn');    var nowCard = $('#musicNowCard');
    var nowCover = $('#musicNowCover');
    var nowKicker = $('#musicNowKicker');
    var nowBadge = $('#musicNowBadge');
    var nowTitle = $('#musicNowTitle');
    var nowBy = $('#musicNowBy');
    var nowLyric = $('#musicNowLyric');
    var nowBar = $('#musicNowBar');

    var words = {
      'zh-CN': { by:'上传者', play:'播放背景音乐', pause:'暂停背景音乐', fail:'音乐加载失败', lyrics:'歌词', loading:'正在读取歌词…', none:'暂无内嵌歌词', next:'下一首', prev:'上一首', now:'正在播放', empty:'♪' },
      'zh-TW': { by:'上傳者', play:'播放背景音樂', pause:'暫停背景音樂', fail:'音樂載入失敗', lyrics:'歌詞', loading:'正在讀取歌詞…', none:'暫無內嵌歌詞', next:'下一首', prev:'上一首', now:'正在播放', empty:'♪' },
      'en': { by:'Uploaded by', play:'Play background music', pause:'Pause background music', fail:'Music failed to load', lyrics:'Lyrics', loading:'Reading lyrics…', none:'No embedded lyrics', next:'Next track', prev:'Previous track', now:'Now playing', empty:'♪' },
      'ja': { by:'アップロード', play:'BGM を再生', pause:'BGM を一時停止', fail:'音楽を読み込めません', lyrics:'歌詞', loading:'歌詞を読み込み中…', none:'内蔵歌詞なし', next:'次の曲', prev:'前の曲', now:'再生中', empty:'♪' },
      'ko': { by:'업로더', play:'배경 음악 재생', pause:'배경 음악 일시정지', fail:'음악을 불러오지 못했습니다', lyrics:'가사', loading:'가사를 불러오는 중…', none:'내장 가사 없음', next:'다음 곡', prev:'이전 곡', now:'재생 중', empty:'♪' }
    }[lang] || { by:'上传者', play:'播放背景音乐', pause:'暂停背景音乐', fail:'音乐加载失败', lyrics:'歌词', loading:'正在读取歌词…', none:'暂无内嵌歌词', next:'下一首', prev:'上一首', now:'正在播放', empty:'♪' };
    var modeWords = {
      'zh-CN': { loop:'循环', single:'单曲', shuffle:'随机' },
      'zh-TW': { loop:'循環', single:'單曲', shuffle:'隨機' },
      'en': { loop:'Loop', single:'One', shuffle:'Shuffle' },
      'ja': { loop:'リスト', single:'1曲', shuffle:'ランダム' },
      'ko': { loop:'목록', single:'한 곡', shuffle:'셔플' }
    }[lang] || { loop:'循环', single:'单曲', shuffle:'随机' };
    var uiWords = {
      'zh-CN': { quality:'音质', lossless:'无损', standard:'标准', low:'最低', expand:'放大', collapse:'收起', full:'全屏', sourceLocal:'LOCAL · LRC', sourceId3:'LOCAL · ID3', sourceEmpty:'LOCAL · EMPTY' },
      'zh-TW': { quality:'音質', lossless:'無損', standard:'標準', low:'最低', expand:'放大', collapse:'收起', full:'全螢幕', sourceLocal:'LOCAL · LRC', sourceId3:'LOCAL · ID3', sourceEmpty:'LOCAL · EMPTY' },
      'en': { quality:'Quality', lossless:'Lossless', standard:'Standard', low:'Low', expand:'Expand', collapse:'Collapse', full:'Full screen', sourceLocal:'LOCAL · LRC', sourceId3:'LOCAL · ID3', sourceEmpty:'LOCAL · EMPTY' },
      'ja': { quality:'音質', lossless:'ロスレス', standard:'標準', low:'最低', expand:'拡大', collapse:'閉じる', full:'全画面', sourceLocal:'LOCAL · LRC', sourceId3:'LOCAL · ID3', sourceEmpty:'LOCAL · EMPTY' },
      'ko': { quality:'음질', lossless:'무손실', standard:'표준', low:'최저', expand:'확대', collapse:'접기', full:'전체 화면', sourceLocal:'LOCAL · LRC', sourceId3:'LOCAL · ID3', sourceEmpty:'LOCAL · EMPTY' }
    }[lang] || { quality:'音质', lossless:'无损', standard:'标准', low:'最低', expand:'放大', collapse:'收起', full:'全屏', sourceLocal:'LOCAL · LRC', sourceId3:'LOCAL · ID3', sourceEmpty:'LOCAL · EMPTY' };    var ICONS = {
      loop: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 2l4 4-4 4M3 11V9a3 3 0 013-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 01-3 3H3"/></svg>',
      single: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 2l4 4-4 4M3 11V9a3 3 0 013-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 01-3 3H3"/><path d="M12 10v5M10.5 10h1.5"/></svg>',
      shuffle: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 3h5v5M4 20L21 3M4 3l5 5M21 16v5h-5M15 15l6 6"/></svg>'
    };
    var MODES = ['loop', 'single', 'shuffle'];
    var PAUSE_KEY = 'bcMusicPaused';
    var MODE_KEY = 'bcMusicMode';
    var PROGRESS_KEY = 'bcMusicProgress';
    var CURRENT_KEY = 'bcMusicCurrent';
    var manifestBase = 'https://raw.githubusercontent.com/Hamburgerwow/Burger-Chat/main/music/index.json';
    var fallbackBase = '/api/music';
    var fallbackTrack = { id:'firefly-cmj', title:'萤火之森', uploader:'CMJ', url:'/assets/music/firefly-cmj.mp3?v=0.40.52r3', cover:'/assets/icon-192.png?v=050' };
    var list = [fallbackTrack];
    var index = 0;
    var ready = false;
    var initialized = false;
    var refreshing = false;
    var dragging = false;
    var userPaused = false;
    var mode = 'loop';
    var pendingSeek = 0;
    var lastSaveAt = 0;
    var nowTimer = 0;
    var lyricsOpen = false;
    var lastLyricIndex = -2;
    var currentMeta = null;
    var metaCache = {};
    var QUALITY_KEY = 'bcMusicQuality';
    var quality = 'standard';
    var lyricRaf = 0;
    var lyricsAbort = null;
    var lastLyricsPaint = 0;
    try { quality = localStorage.getItem(QUALITY_KEY) || 'standard'; } catch (e) {}
    if (['lossless', 'standard', 'low'].indexOf(quality) < 0) quality = 'standard';    try { userPaused = localStorage.getItem(PAUSE_KEY) === '1'; } catch (e) {}
    try { mode = localStorage.getItem(MODE_KEY) || 'loop'; } catch (e) {}
    if (MODES.indexOf(mode) < 0) mode = 'loop';
    if (lyricsBtn) lyricsBtn.querySelector && (lyricsBtn.querySelector('span').textContent = words.lyrics);

    function savePause(v) { try { localStorage.setItem(PAUSE_KEY, v ? '1' : '0'); } catch (e) {} }
    function absAsset(u) {
      u = String(u || '').trim();
      if (!u) return '';
      if (/^(?:data:|blob:|https?:|\/\/|\/)/i.test(u)) return u;
      return '/' + u.replace(/^\.?\//, '');
    }
    function fmt(v) {
      v = Math.max(0, Math.floor(Number(v) || 0));
      return Math.floor(v / 60) + ':' + ('0' + (v % 60)).slice(-2);
    }
    function norm(track) {
      if (!track || !track.url) return null;
      var q = track.qualities && typeof track.qualities === 'object' ? track.qualities : {};
      return {
        id: String(track.id || ''),
        title: String(track.title || '萤火之森'),
        uploader: String(track.uploader || 'CMJ'),
        artist: String(track.artist || track.singer || track.performer || ''),
        album: String(track.album || track.albumTitle || ''),
        url: absAsset(track.url),
        cover: absAsset(track.cover || track.coverUrl || track.artwork || track.image || ''),
        lyrics: String(track.lyrics || track.lyric || ''),
        qualities: {
          lossless: absAsset(track.lossless || track.losslessUrl || q.lossless || q.losslessUrl || ''),
          low: absAsset(track.low || track.lowUrl || q.low || q.lowUrl || '')
        }
      };
    }
    function setPlaying(on) {
      dock.classList.toggle('is-playing', !!on);
      dock.classList.toggle('is-paused', !on);
      if (playMini) playMini.setAttribute('aria-label', on ? words.pause : words.play);
      if (playBig) playBig.setAttribute('aria-label', on ? words.pause : words.play);
      if (cover) cover.setAttribute('aria-label', on ? words.pause : words.play);
    }
    function setMode(m) {
      mode = MODES.indexOf(m) >= 0 ? m : 'loop';
      try { localStorage.setItem(MODE_KEY, mode); } catch (e) {}
      audio.loop = mode === 'single';
      if (modeBtn) {
        modeBtn.className = 'md-mode' + (mode === 'single' ? ' is-single' : mode === 'shuffle' ? ' is-shuffle' : '');
        modeBtn.innerHTML = ICONS[mode] + '<span>' + (modeWords[mode] || modeWords.loop) + '</span>';
        modeBtn.setAttribute('aria-label', '播放模式：' + (modeWords[mode] || modeWords.loop));
      }
    }

    function qualityName(q) {
      return q === 'lossless' ? uiWords.lossless : q === 'low' ? uiWords.low : uiWords.standard;
    }
    function qualityUrl(track, q) {
      if (!track) return '';
      if (q === 'lossless' && track.qualities && track.qualities.lossless) return track.qualities.lossless;
      if (q === 'low' && track.qualities && track.qualities.low) return track.qualities.low;
      return track.url;
    }
    function switchQualitySource(q) {
      var track = list[index];
      if (!track) return;
      var next = qualityUrl(track, q);
      if (!next) return;
      var absolute = function (u) { try { return new URL(u, location.href).href; } catch (e) { return u; } };
      if (absolute(next) === absolute(audio.getAttribute('src') || track.url)) return;
      var at = Number(audio.currentTime) || 0;
      var wasPlaying = !audio.paused;
      audio.src = next;
      try { audio.load(); } catch (e) {}
      var restore = function () {
        audio.removeEventListener('loadedmetadata', restore);
        try { audio.currentTime = Math.max(0, Math.min(at, (Number(audio.duration) || at) - 0.05)); } catch (e) {}
        if (wasPlaying) audio.play().catch(function () {});
      };
      audio.addEventListener('loadedmetadata', restore);
    }
    function setQuality(q, silent) {
      quality = ['lossless', 'standard', 'low'].indexOf(q) >= 0 ? q : 'standard';
      try { localStorage.setItem(QUALITY_KEY, quality); } catch (e) {}
      if (dock) dock.setAttribute('data-quality', quality);
      if (qualityNow) qualityNow.textContent = qualityName(quality);
      var qSmall = qualityBar && qualityBar.querySelector('small');
      if (qSmall) qSmall.textContent = uiWords.quality;
      qualityBtns.forEach(function (btn) {
        var bq = btn.getAttribute('data-quality') || 'standard';
        var on = bq === quality;
        btn.classList.toggle('is-on', on);
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
        btn.setAttribute('data-qname', qualityName(bq));
        var span = btn.querySelector('span');
        if (span) span.textContent = qualityName(bq);
      });
      if (!silent) switchQualitySource(quality);
    }    /* progress persistence, keyed by the stable track URL */
    function progressStore() {
      try {
        var o = JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}');
        return o && typeof o === 'object' && !Array.isArray(o) ? o : {};
      } catch (e) { return {}; }
    }
    function savedProgress(url) {
      var o = progressStore(), p = o[url];
      if (!p || !isFinite(Number(p.time))) return 0;
      if (Date.now() - Number(p.at || 0) > 30 * 86400000) return 0;
      var t = Math.max(0, Number(p.time) || 0);
      return t > 1 ? t : 0;
    }
    function saveProgress(force) {
      if (!ready || !list[index]) return;
      var now = Date.now();
      if (!force && now - lastSaveAt < 1800) return;
      var t = Number(audio.currentTime) || 0;
      if (t < 0.4 && !audio.paused) return;
      var o = progressStore();
      o[list[index].url] = { time:t, duration:Number(audio.duration) || 0, at:now };
      var keys = Object.keys(o);
      if (keys.length > 20) {
        keys.sort(function (a, b) { return Number(o[a].at || 0) - Number(o[b].at || 0); });
        keys.slice(0, keys.length - 20).forEach(function (k) { delete o[k]; });
      }
      try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(o)); lastSaveAt = now; } catch (e) {}
    }
    function restorePending(track) {
      pendingSeek = savedProgress(track ? track.url : '');
      return pendingSeek;
    }

    /* ID3v2 reader: embedded cover (APIC) and unsynchronised lyrics (USLT) */
    function u32(b, o) { return (((b[o] || 0) << 24) | ((b[o + 1] || 0) << 16) | ((b[o + 2] || 0) << 8) | (b[o + 3] || 0)) >>> 0; }
    function ss32(b, o) { return (((b[o] || 0) & 127) << 21) | (((b[o + 1] || 0) & 127) << 14) | (((b[o + 2] || 0) & 127) << 7) | ((b[o + 3] || 0) & 127); }
    function decodeText(bytes, enc) {
      var b = bytes || new Uint8Array(0);
      try {
        if (enc === 1) {
          if (b[0] === 0xFE && b[1] === 0xFF) return new TextDecoder('utf-16be').decode(b.subarray(2));
          if (b[0] === 0xFF && b[1] === 0xFE) b = b.subarray(2);
          return new TextDecoder('utf-16le').decode(b);
        }
        if (enc === 2) return new TextDecoder('utf-16be').decode(b);
        if (enc === 3) return new TextDecoder('utf-8').decode(b);
        return new TextDecoder('iso-8859-1').decode(b);
      } catch (e) { return ''; }
    }
    function skipDesc(data, start, enc) {
      var p = start;
      if (enc === 1 || enc === 2) {
        if ((data[p] === 0xFF && data[p + 1] === 0xFE) || (data[p] === 0xFE && data[p + 1] === 0xFF)) p += 2;
        while (p + 1 < data.length) {
          if (data[p] === 0 && data[p + 1] === 0) return p + 2;
          p += 2;
        }
        return p;
      }
      while (p < data.length && data[p] !== 0) p++;
      return p + 1;
    }
    function cleanText(s) { return String(s || '').replace(/\u0000+$/g, '').replace(/^\uFEFF/, '').trim(); }
    function parseId3(buf) {
      var b = new Uint8Array(buf || []);
      if (b.length < 11 || b[0] !== 0x49 || b[1] !== 0x44 || b[2] !== 0x33) return null;
      var ver = b[3], flags = b[5];
      var size = ss32(b, 6), pos = 10;
      var end = Math.min(b.length, 10 + size);
      if (flags & 0x40) {
        var ext = u32(b, 10);
        pos += ver === 4 ? ext : 4 + ext;
      }
      var result = { cover:'', lyrics:'', title:'', artist:'', album:'' };
      while (pos + 10 <= end) {
        var id = String.fromCharCode(b[pos], b[pos + 1], b[pos + 2], b[pos + 3]);
        if (!/^[A-Z0-9]{4}$/.test(id)) break;
        var fsize = ver === 4 ? ss32(b, pos + 4) : u32(b, pos + 4);
        if (!fsize) break;
        var start = pos + 10, stop = Math.min(end, start + fsize);
        var data = b.subarray(start, stop);
        if (id === 'APIC' && data.length > 20) {
          var enc = data[0], p = 1;
          while (p < data.length && data[p] !== 0) p++;
          var mime = cleanText(decodeText(data.subarray(1, p), 0)) || 'image/jpeg';
          p++;
          var picType = data[p] || 3; p++;
          p = skipDesc(data, p, enc);
          var img = data.subarray(p);
          if (img.length > 20) {
            try { result.cover = URL.createObjectURL(new Blob([img], { type:mime })); } catch (e) {}
          }
        } else if (id === 'USLT' && data.length > 4) {
          var lenc = data[0];
          var lp = skipDesc(data, 4, lenc);
          result.lyrics = cleanText(decodeText(data.subarray(lp), lenc));
        } else if (id === 'TIT2' || id === 'TPE1' || id === 'TALB') {
          var text = cleanText(decodeText(data.subarray(Math.min(1, data.length)), data[0]));
          if (id === 'TIT2') result.title = text;
          else if (id === 'TPE1') result.artist = text;
          else result.album = text;
        }
        pos = start + fsize;
      }
      return result;
    }
    function lrcOffset(raw) {
      var m = /\[offset:([+-]?\d+)\]/i.exec(String(raw || ''));
      return m ? Number(m[1]) / 1000 : 0;
    }
    function parseLrcRows(raw) {
      raw = String(raw || '').replace(/\r/g, '').replace(/^\uFEFF/, '');
      var offset = lrcOffset(raw), rows = [], plain = [];
      raw.split('\n').forEach(function (line) {
        var text = line.replace(/\[[^\]]*\]/g, '').trim();
        if (!text || /^(ti|ar|al|by|offset|re|ve|au|length|kana)\s*:/i.test(text)) return;
        if (/^(作词|作曲|编曲|制作人|监制|录音|混音|母带|Lyrics by|Composed by|Written by|Produced by|Arranged by|Mixed by|Mastered by)\s*[：:]/i.test(text)) return;
        var stamps = line.match(/\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g) || [];
        if (stamps.length) {
          stamps.forEach(function (tag) {
            var m = /\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/.exec(tag);
            if (!m) return;
            var frac = m[3] ? Number('0.' + m[3]) : 0;
            rows.push({ t:Math.max(0, Number(m[1]) * 60 + Number(m[2]) + frac + offset), text:text, trans:'' });
          });
        } else {
          plain.push(text);
        }
      });
      return { rows:rows, plain:plain };
    }
    function parseLyrics(raw, transRaw) {
      var parsed = parseLrcRows(raw);
      var timed = parsed.rows;
      if (timed.length) {
        var transRows = parseLrcRows(transRaw).rows;
        if (transRows.length) {
          var transMap = {};
          transRows.forEach(function (row) {
            var key = String(Math.round(Number(row.t) * 100));
            if (!transMap[key] && row.text) transMap[key] = row.text;
          });
          timed.forEach(function (row) {
            row.trans = transMap[String(Math.round(Number(row.t) * 100))] || '';
          });
        }
        timed.sort(function (a, b) { return a.t - b.t; });
        return { lines:timed, plain:timed.map(function (x) { return x.text; }).join('\n') };
      }
      return { lines:[], plain:parsed.plain.join('\n') };
    }
    function lyricTextHtml(text) {
      return String(text || '').split(/([A-Za-z][A-Za-z0-9'’ .,!?;:()&\/\-]*)/g).map(function (part, i) {
        return i % 2 ? '<span class="ml-en">' + escapeHtml(part) + '</span>' : escapeHtml(part);
      }).join('');
    }
    function lyricsLineHtml(line) {
      var text = typeof line === 'string' ? line : (line && line.text) || '';
      var trans = typeof line === 'string' ? '' : (line && line.trans) || '';
      return '<span class="ml-text">' + lyricTextHtml(text || words.empty) + '</span>' +
        (trans ? '<span class="ml-trans">' + lyricTextHtml(trans) + '</span>' : '');
    }
    function trackQuery(track) {
      var title = String((track && track.title) || '').replace(/\s+/g, ' ').trim();
      var artist = String((track && track.artist) || '').trim();
      var parts = title.split(/\s+[—–-]\s+/);
      if (parts.length > 1) {
        title = parts.shift().trim();
        if (!artist) artist = parts.join(' ').trim();
      }
      return { title:title, artist:artist };
    }
    function fetchOnlineLyrics(track) {
      var q = trackQuery(track);
      if (!q.title) return Promise.resolve(null);
      if (lyricsAbort) { try { lyricsAbort.abort(); } catch (e) {} }
      lyricsAbort = typeof AbortController === 'function' ? new AbortController() : null;
      var url = '/api/lyrics?title=' + encodeURIComponent(q.title) + '&artist=' + encodeURIComponent(q.artist);
      return fetch(url, { cache:'no-store', signal:lyricsAbort ? lyricsAbort.signal : undefined, headers:{ Accept:'application/json' } })
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(function (data) {
          if (!data || !data.ok || !data.lrc) return null;
          var parsed = parseLyrics(data.lrc, data.translation || '');
          if (!parsed.lines.length || Number(data.timed || 0) < 2) return null;
          return { parsed:parsed, source:(data.providerName || 'NETWORK') + ' · LRC', provider:data.provider || '' };
        })
        .catch(function () { return null; });
    }
    function mergeLocalTranslations(target, source) {
      if (!target || !target.length || !source || !source.length) return;
      for (var t = 0; t < target.length; t++) { if (target[t].trans) return; }
      var cn = source.filter(function (line) {
        return line && !line.trans && /[\u4e00-\u9fff]/.test(String(line.text || ''));
      });
      if (!cn.length) return;
      cn.forEach(function (line) {
        var best = -1, gap = 9;
        for (var i = 0; i < target.length; i++) {
          var d = Math.abs(Number(target[i].t || 0) - Number(line.t || 0));
          if (d < gap) { gap = d; best = i; }
        }
        if (best > -1 && gap <= 1.8 && !target[best].trans) target[best].trans = line.text;
      });
    }    function metaFor(track) {
      if (!track || !track.url) return null;
      if (metaCache[track.url]) return metaCache[track.url];
      var parsed = parseLyrics(track.lyrics);
      var rec = {
        cover: track.cover || '',
        lyrics: track.lyrics || '',
        lines: parsed.lines,
        plain: parsed.plain,
        loading: true,
        online: false,
        source: track.lyrics ? uiWords.sourceLocal : uiWords.sourceId3,
        promise: null,
        networkPromise: null
      };
      function tagBuffer(url) {
        return fetch(url, { cache:'force-cache', headers:{ Range:'bytes=0-1048575' } })
          .then(function (r) {
            if (!r.ok && r.status !== 206) throw new Error('HTTP ' + r.status);
            return r.arrayBuffer();
          })
          .catch(function () {
            return fetch(url, { cache:'force-cache' }).then(function (r) {
              if (!r.ok) throw new Error('HTTP ' + r.status);
              return r.arrayBuffer();
            });
          });
      }
      rec.promise = tagBuffer(track.url)
        .then(function (buf) {
          var tag = parseId3(buf);
          rec.loading = false;
          if (!tag) return rec;
          if (tag.cover) rec.cover = tag.cover;
          if (tag.lyrics) {
            var p2 = parseLyrics(tag.lyrics);
            if (rec.online && rec.lines && rec.lines.length) {
              mergeLocalTranslations(rec.lines, p2.lines);
            } else if (!rec.online) {
              rec.lyrics = tag.lyrics;
              rec.lines = p2.lines;
              rec.plain = p2.plain;
              rec.source = uiWords.sourceLocal;
            }
          }
          return rec;
        })
        .catch(function () { rec.loading = false; return rec; });
      rec.networkPromise = fetchOnlineLyrics(track).then(function (result) {
        if (!result || !result.parsed || !result.parsed.lines.length) return rec;
        var previousLocal = rec.lines;
        rec.online = true;
        rec.lyrics = result.parsed.lines.map(function (x) { return x.text; }).join('\n');
        rec.lines = result.parsed.lines;
        if (previousLocal && previousLocal.length && !result.parsed.translation) {
          mergeLocalTranslations(rec.lines, previousLocal);
        }
        rec.plain = result.parsed.plain;
        rec.source = result.source;
        rec.provider = result.provider;
        return rec;
      }).catch(function () { return rec; });
      metaCache[track.url] = rec;
      return rec;
    }
    function setArtwork(wrap, img, src) {
      if (!wrap || !img) return;
      if (src) {
        img.src = src;
        wrap.classList.add('has-cover');
      } else {
        img.removeAttribute('src');
        wrap.classList.remove('has-cover');
      }
    }
    function activeLine(meta, time) {
      if (!meta || !meta.lines || !meta.lines.length) return null;
      var found = null;
      for (var i = 0; i < meta.lines.length; i++) {
        if (Number(meta.lines[i].t) <= time + 0.1) found = meta.lines[i];
        else break;
      }
      return found || meta.lines[0];
    }
    function updateNowLyric(meta, time) {
      if (!nowLyric) return;
      if (meta && meta.loading) { nowLyric.textContent = words.loading; return; }
      var line = activeLine(meta, time);
      if (line && line.text) { nowLyric.textContent = line.text; return; }
      if (meta && meta.plain) {
        var text = String(meta.plain).split('\n').filter(Boolean)[0] || '';
        nowLyric.textContent = text || words.empty;
        return;
      }
      if (meta && meta.lines && meta.lines.length) { nowLyric.textContent = words.empty; return; }
      nowLyric.textContent = currentMeta ? words.none : words.loading;
    }
    function renderLyrics(meta) {
      if (!lyricsInner) return;
      if (!meta) {
        lyricsInner.textContent = words.loading;
        return;
      }
      if (lyricsSource) lyricsSource.textContent = meta.loading ? 'SCANNING…' : (meta.source || uiWords.sourceId3);
      if (meta.loading) { lyricsInner.textContent = words.loading; return; }
      if (meta.lines && meta.lines.length) {
        lyricsInner.innerHTML = meta.lines.map(function (line, i) {
          return '<button type="button" class="ml-line" data-line="' + i + '" data-t="' + (Number(line.t) || 0).toFixed(3) + '">' + lyricsLineHtml(line) + '</button>';
        }).join('');
      } else if (meta.plain) {
        lyricsInner.innerHTML = String(meta.plain).split(/\n+/).filter(Boolean).map(function (line) {
          return '<span class="ml-line ml-static">' + lyricsLineHtml(line) + '</span>';
        }).join('') || escapeHtml(words.none);
      } else {
        lyricsInner.textContent = words.none;
        if (lyricsSource) lyricsSource.textContent = uiWords.sourceEmpty;
      }
      markLyricLine(meta, audio.currentTime || 0);
    }
    function escapeHtml(s) {
      return String(s || '').replace(/[&<>"']/g, function (c) {
        return ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c];
      });
    }
    function markLyricLine(meta, time) {
      if (!lyricsInner) return;
      var spans = lyricsInner.querySelectorAll('.ml-line');
      if (!spans.length) return;
      var line = activeLine(meta, time);
      var active = -1;
      if (line) {
        for (var i = 0; i < meta.lines.length; i++) if (meta.lines[i] === line) { active = i; break; }
      }
      if (active < 0 && !(meta && meta.lines && meta.lines.length)) active = 0;
      var changed = active !== lastLyricIndex;
      spans.forEach(function (s, i) {
        s.classList.toggle('is-on', i === active);
        s.classList.toggle('is-prev', i === active - 1);
        s.classList.toggle('is-next', i === active + 1);
        if (i === active && changed && lastLyricIndex >= 0) {
          s.classList.remove('is-bounce');
          void s.offsetWidth;
          s.classList.add('is-bounce');
        } else if (i !== active) {
          s.classList.remove('is-bounce');
        }
      });
      if (lyricsOpen && active >= 0 && changed && spans[active]) {
        var top = spans[active].offsetTop, h = lyricsInner.clientHeight;
        var target = Math.max(0, top - h / 2 + spans[active].offsetHeight / 2);
        try { lyricsInner.scrollTo({ top: target, behavior: 'smooth' }); }
        catch (e) { lyricsInner.scrollTop = target; }
      }
      lastLyricIndex = active;
    }
    function setLyricsHead(track, rec) {
      if (!track) return;
      if (lyricsTitle) lyricsTitle.textContent = track.title;
      if (lyricsSource) lyricsSource.textContent = (rec && rec.loading) ? "SCANNING…" : ((rec && rec.source) || uiWords.sourceId3);
      if (lyricsBy) lyricsBy.textContent = words.by + ' · ' + track.uploader;
      var src = (rec && rec.cover) || track.cover || '';
      setArtwork(lyricsArt, lyricsCover, src);
      if (lyricsBg) {
        if (src) lyricsBg.src = src;
        else lyricsBg.removeAttribute('src');
      }
      if (lyricsPanel) lyricsPanel.classList.toggle('has-art', !!src);
    }
    function applyMeta(track, rec) {
      if (!rec) return;
      currentMeta = rec;
      setArtwork(cover, coverImg, rec.cover || track.cover);
      setLyricsHead(track, rec);
      if (nowCard && nowCard.classList.contains('is-show')) {
        setArtwork(nowCover.parentNode, nowCover, rec.cover || track.cover);
        updateNowLyric(rec, Number(audio.currentTime) || 0);
      }
      renderLyrics(rec);
      markLyricLine(rec, Number(audio.currentTime) || 0);
    }
    function loadMeta(track) {
      if (!track) return;
      var rec = metaFor(track);
      if (!rec) return;
      currentMeta = rec;
      setArtwork(cover, coverImg, rec.cover || track.cover);
      setLyricsHead(track, rec);
      if (lyricsSource) lyricsSource.textContent = rec.loading ? 'SCANNING…' : (rec.source || uiWords.sourceId3);
      if (lyricsInner) lyricsInner.textContent = words.loading;
      if (nowCard && nowCard.classList.contains('is-show')) setArtwork(nowCover.parentNode, nowCover, rec.cover || track.cover);
      renderLyrics(rec);
      function repaint() {
        if (!list[index] || list[index].url !== track.url) return;
        currentMeta = rec;
        setArtwork(cover, coverImg, rec.cover || track.cover);
        setLyricsHead(track, rec);
        if (nowCard && nowCard.classList.contains('is-show')) setArtwork(nowCover.parentNode, nowCover, rec.cover || track.cover);
        renderLyrics(rec);
        updateNowLyric(rec, Number(audio.currentTime) || 0);
      }
      rec.promise.then(repaint).catch(function () {});
      if (rec.networkPromise) rec.networkPromise.then(repaint).catch(function () {});
    }
    function hideNowCard() {
      if (!nowCard) return;
      clearTimeout(nowTimer);
      if (!nowCard.classList.contains('is-show')) return;
      nowCard.classList.remove('is-show');
      nowCard.classList.add('is-hiding');
      nowTimer = setTimeout(function () {
        nowCard.classList.remove('is-hiding');
      }, 300);
    }
    function showNowCard(track, kind) {
      if (!nowCard || !track) return;
      clearTimeout(nowTimer);
      nowCard.classList.remove('is-hiding');
      if (nowKicker) nowKicker.textContent = 'NOW PLAYING';
      if (nowBadge) nowBadge.textContent = kind === 'prev' ? words.prev : kind === 'next' ? words.next : words.now;
      if (nowTitle) nowTitle.textContent = track.title;
      if (nowBy) nowBy.textContent = words.by + ' · ' + track.uploader;
      setArtwork(nowCover ? nowCover.parentNode : null, nowCover, (currentMeta && currentMeta.cover) || track.cover);
      updateNowLyric(currentMeta, Number(audio.currentTime) || 0);
      if (nowBar) nowBar.style.width = '0%';
      nowCard.classList.add('is-show');
      nowTimer = setTimeout(hideNowCard, 8000);
    }
    if (nowCard) {
      nowCard.addEventListener('mouseenter', function () { clearTimeout(nowTimer); });
      nowCard.addEventListener('mouseleave', function () {
        clearTimeout(nowTimer);
        nowTimer = setTimeout(hideNowCard, 2600);
      });
    }

    function stopLyricClock() {
      if (lyricRaf) { try { cancelAnimationFrame(lyricRaf); } catch (e) {} lyricRaf = 0; }
    }
    function lyricClock(ts) {
      if (!lyricsOpen || audio.paused) { lyricRaf = 0; return; }
      lyricRaf = requestAnimationFrame(lyricClock);
      if (ts - lastLyricsPaint < 90) return;
      lastLyricsPaint = ts;
      markLyricLine(currentMeta, Number(audio.currentTime) || 0);
    }
    function startLyricClock() {
      if (!lyricsOpen || audio.paused || lyricRaf) return;
      lastLyricsPaint = 0;
      lyricRaf = requestAnimationFrame(lyricClock);
    }
    function lyricsLargeOn() {
      return !!(lyricsPanel && (lyricsPanel.classList.contains('is-full') || lyricsPanel.classList.contains('is-cinema')));
    }
    function syncLyricsLargeButton() {
      if (!lyricsExpand) return;
      var on = lyricsLargeOn();
      var mobile = window.matchMedia('(max-width:820px)').matches;
      lyricsExpand.classList.toggle('is-on', on);
      lyricsExpand.setAttribute('aria-pressed', on ? 'true' : 'false');
      lyricsExpand.setAttribute('aria-label', on ? uiWords.collapse : (mobile ? uiWords.full : uiWords.expand));
      var label = lyricsExpand.querySelector('span');
      if (label) label.textContent = on ? uiWords.collapse : uiWords.expand;
    }
    function toggleLyricsLarge(force) {
      if (!lyricsPanel) return;
      if (!lyricsOpen) setLyricsOpen(true);
      var mobile = window.matchMedia('(max-width:820px)').matches;
      var on;
      if (mobile) {
        on = typeof force === 'boolean' ? force : !lyricsPanel.classList.contains('is-full');
        lyricsPanel.classList.toggle('is-full', on);
        lyricsPanel.classList.remove('is-cinema');
        document.body.classList.toggle('lyrics-full', on);
        document.body.classList.remove('lyrics-cinema');
      } else {
        on = typeof force === 'boolean' ? force : !lyricsPanel.classList.contains('is-cinema');
        lyricsPanel.classList.toggle('is-cinema', on);
        lyricsPanel.classList.remove('is-full');
        document.body.classList.toggle('lyrics-cinema', on);
        document.body.classList.remove('lyrics-full');
      }
      if (on && document.body) document.body.appendChild(lyricsPanel);
      else if (stack) stack.appendChild(lyricsPanel);
      syncLyricsLargeButton();
      lastLyricIndex = -2;
      if (currentMeta) markLyricLine(currentMeta, audio.currentTime || 0);
      if (on) startLyricClock();
    }
    function setLyricsOpen(open) {
      lyricsOpen = !!open;
      dock.classList.toggle('is-lyrics', lyricsOpen);
      if (lyricsBtn) {
        lyricsBtn.classList.toggle('is-on', lyricsOpen);
        lyricsBtn.setAttribute('aria-expanded', lyricsOpen ? 'true' : 'false');
      }
      if (lyricsPanel) {
        if (stack && lyricsPanel.parentNode !== stack) stack.appendChild(lyricsPanel);
        lyricsPanel.classList.toggle('is-open', lyricsOpen);
        lyricsPanel.setAttribute('aria-hidden', lyricsOpen ? 'false' : 'true');
        if (!lyricsOpen) {
          lyricsPanel.classList.remove('is-full', 'is-cinema');
          document.body.classList.remove('lyrics-full', 'lyrics-cinema');
          if (stack) stack.appendChild(lyricsPanel);
          syncLyricsLargeButton();
        }
      }
      if (lyricsOpen) {
        lastLyricIndex = -2;
        if (touchMode()) dock.classList.add('is-expanded');
        loadMeta(list[index]);
        if (currentMeta) markLyricLine(currentMeta, audio.currentTime || 0);
        startLyricClock();
        if (touchMode() && lyricsPanel && !lyricsPanel.classList.contains('is-full')) {
          setTimeout(function () { try { lyricsPanel.scrollIntoView({ behavior:'smooth', block:'nearest' }); } catch (e) {} }, 120);
        }
      } else {
        stopLyricClock();
      }
    }
    function applyTrack(i, shouldPlay, kind) {
      if (!list.length) return;
      if (ready && list[index]) saveProgress(true);
      index = (i + list.length) % list.length;
      var t = list[index];
      try { if (initialized) localStorage.setItem(CURRENT_KEY, t.url); } catch (e) {}
      if (titleEl) titleEl.textContent = t.title;
      if (byEl) byEl.textContent = words.by + ' · ' + t.uploader;
      var current = audio.getAttribute('src') || '';
      var targetUrl = qualityUrl(t, quality);
      if (current !== targetUrl) {
        audio.src = targetUrl;
        try { audio.load(); } catch (e) {}
      }
      restorePending(t);
      ready = true;
      if (range) { range.value = 0; range.style.setProperty('--p', '0%'); }
      if (curEl) curEl.textContent = '0:00';
      if (totalEl) totalEl.textContent = '0:00';
      loadMeta(t);
      lastLyricIndex = -2;
      if (kind) showNowCard(t, kind);
      if (shouldPlay) attemptPlay();
    }
    function attemptPlay() {
      if (userPaused || !ready) return;
      var p = audio.play();
      if (p && p.catch) p.catch(function () { setPlaying(false); });
    }
    function toggle() {
      if (audio.paused) {
        userPaused = false;
        savePause(false);
        audio.play().catch(function () {});
      } else {
        userPaused = true;
        savePause(true);
        saveProgress(true);
        audio.pause();
      }
    }
    function step(delta) {
      userPaused = false;
      savePause(false);
      applyTrack(index + delta, true, delta < 0 ? 'prev' : 'next');
    }
    function updateProgress() {
      var d = Number(audio.duration) || 0;
      var c = Number(audio.currentTime) || 0;
      var p = d ? Math.min(1000, Math.max(0, c / d * 1000)) : 0;
      if (range && !dragging) range.value = p;
      if (range) range.style.setProperty('--p', (p / 10).toFixed(2) + '%');
      if (curEl) curEl.textContent = fmt(c);
      if (totalEl) totalEl.textContent = fmt(d);
      if (nowBar) nowBar.style.width = (p / 10).toFixed(2) + '%';
      if (lyricsBar) lyricsBar.style.width = (p / 10).toFixed(2) + '%';
      if (lyricsTime) lyricsTime.textContent = fmt(c) + ' / ' + fmt(d);
      updateNowLyric(currentMeta, c);
      markLyricLine(currentMeta, c);
      saveProgress(false);
    }

    function buildList(o) {
      var arr = [];
      if (o && o.default) arr.push(o.default);
      if (o && Array.isArray(o.tracks)) o.tracks.forEach(function (x) { arr.push(x); });
      if (o && o.latest) arr.push(o.latest);
      var seen = {};
      var clean = [];
      arr.forEach(function (x) {
        var n = norm(x);
        if (!n || seen[n.url]) return;
        seen[n.url] = true;
        clean.push(n);
      });
      return clean;
    }
    function startIndex(o, clean) {
      var savedUrl = '';
      try { savedUrl = localStorage.getItem(CURRENT_KEY) || ''; } catch (e) {}
      if (savedUrl) {
        for (var s = 0; s < clean.length; s++) if (clean[s].url === savedUrl) return s;
      }
      if (o && o.latest && o.latest.url) {
        var lu = absAsset(o.latest.url);
        for (var i = 0; i < clean.length; i++) if (clean[i].url === lu) return i;
      }
      if (o && Array.isArray(o.tracks) && o.tracks.length) return clean.length - 1;
      return 0;
    }
    function useManifest(o) {
      var incoming = buildList(o);
      if (!incoming.length) return;
      if (!initialized) {
        list = incoming;
        initialized = true;
        applyTrack(startIndex(o, list), !userPaused, null);
        return;
      }
      var current = list[index];
      var found = -1;
      if (current) {
        for (var i = 0; i < incoming.length; i++) if (incoming[i].url === current.url) { found = i; break; }
        if (found < 0) { incoming = [current].concat(incoming); found = 0; }
      }
      list = incoming;
      index = found >= 0 ? found : 0;
      // Do not reload or reset the playing track; only the playlist changes.
    }
    function loadManifest() {
      if (refreshing) return Promise.resolve(false);
      refreshing = true;
      var primary = manifestBase + '?t=' + Date.now();
      return fetch(primary, { cache:'no-store' })
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(function (o) { useManifest(o); return true; })
        .catch(function () {
          return fetch(fallbackBase + '?t=' + Date.now(), { cache:'no-store' })
            .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
            .then(function (o) { useManifest(o); return true; });
        })
        .catch(function () { return false; })
        .then(function (v) { refreshing = false; return v; });
    }

    if (cover) cover.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (touchMode()) dock.classList.add('is-expanded');
      toggle();
    });
    [playMini, playBig].forEach(function (b) {
      if (!b) return;
      b.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (touchMode()) dock.classList.add('is-expanded');
        toggle();
      });
    });
    if (prevBtn) prevBtn.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); step(-1); });
    if (nextBtn) nextBtn.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); step(1); });
    if (modeBtn) modeBtn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      setMode(MODES[(MODES.indexOf(mode) + 1) % MODES.length]);
    });
    if (lyricsBtn) lyricsBtn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      setLyricsOpen(!lyricsOpen);
    });
    if (lyricsClose) lyricsClose.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      setLyricsOpen(false);
    });

    if (lyricsExpand) lyricsExpand.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      toggleLyricsLarge();
    });
    qualityBtns.forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        setQuality(btn.getAttribute('data-quality') || 'standard');
        if (touchMode()) dock.classList.add('is-expanded');
      });
    });    if (lyricsInner) lyricsInner.addEventListener('click', function (e) {
      var line = e.target && e.target.closest ? e.target.closest('.ml-line[data-t]') : null;
      if (!line) return;
      e.preventDefault();
      var t = Number(line.getAttribute('data-t')) || 0;
      try { audio.currentTime = Math.max(0, Math.min(t, (Number(audio.duration) || t) - 0.05)); } catch (err) {}
      updateProgress();
    });
    if (range) {
      range.addEventListener('pointerdown', function () { dragging = true; });
      range.addEventListener('pointerup', function () { dragging = false; updateProgress(); });
      range.addEventListener('pointercancel', function () { dragging = false; updateProgress(); });
      range.addEventListener('input', function () {
        dragging = true;
        var d = Number(audio.duration) || 0;
        var t = d * (Number(range.value) / 1000);
        if (d) { try { audio.currentTime = Math.min(d - 0.05, Math.max(0, t)); } catch (e) {} }
        if (curEl) curEl.textContent = fmt(t);
        if (nowBar) nowBar.style.width = (Number(range.value) / 10).toFixed(2) + '%';
        updateNowLyric(currentMeta, t);
        markLyricLine(currentMeta, t);
        range.style.setProperty('--p', (Number(range.value) / 10).toFixed(2) + '%');
      });
      range.addEventListener('change', function () { dragging = false; updateProgress(); saveProgress(true); });
    }
    audio.addEventListener('play', function () { setPlaying(true); startLyricClock(); });
    audio.addEventListener('pause', function () { setPlaying(false); stopLyricClock(); saveProgress(true); });
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', function () {
      updateProgress();
      if (pendingSeek > 0) {
        var d = Number(audio.duration) || 0;
        if (d) {
          try { audio.currentTime = Math.max(0, Math.min(d - 0.35, pendingSeek)); } catch (e) {}
          updateProgress();
        }
        pendingSeek = 0;
      }
    });
    audio.addEventListener('durationchange', updateProgress);
    audio.addEventListener('seeked', function () { saveProgress(true); updateProgress(); });
    audio.addEventListener('ended', function () {
      try { audio.currentTime = 0; } catch (e) {}
      if (mode === 'single') {
        try { audio.currentTime = 0; audio.play(); } catch (e) {}
        return;
      }
      if (mode === 'shuffle' && list.length > 1) {
        var n = index;
        while (n === index) n = Math.floor(Math.random() * list.length);
        applyTrack(n, true, 'next');
        return;
      }
      applyTrack(index + 1, true, 'next');
    });
    audio.addEventListener('error', function () {
      if (byEl) byEl.textContent = words.fail;
      setPlaying(false);
    });

    var hoverQuery = window.matchMedia('(hover:hover) and (pointer:fine)');
    function finePointer() { return hoverQuery.matches; }
    function touchMode() { return !finePointer() || window.innerWidth <= 820; }
    if (hoverQuery.addEventListener) {
      hoverQuery.addEventListener('change', function () {
        if (!hoverQuery.matches) dock.classList.remove('is-expanded');
      });
    }
    if (finePointer()) {
      dock.addEventListener('pointerenter', function () { dock.classList.add('is-expanded'); });
      dock.addEventListener('mousemove', function () { dock.classList.add('is-expanded'); });
      dock.addEventListener('pointerleave', function () {
        if (!dragging && !lyricsOpen) dock.classList.remove('is-expanded');
      });
    }
    dock.addEventListener('click', function (e) {
      if (!touchMode()) return;
      if (e.target && e.target.closest && e.target.closest('button,input,audio,a')) return;
      dock.classList.toggle('is-expanded');
    });
    doc.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (lyricsOpen) {
        if (lyricsLargeOn()) toggleLyricsLarge(false);
        else setLyricsOpen(false);
        return;
      }
      if (dock.classList.contains('is-expanded')) dock.classList.remove('is-expanded');
    });

    /* hide while the page is scrolling down, return on scroll up or shortly after stopping */
    var lastScroll = Number(window.pageYOffset) || 0;
    var scrollTimer = 0;
    window.addEventListener('scroll', function () {
      if (!stack) return;
      var y = Number(window.pageYOffset) || 0;
      if (y > lastScroll + 6 && y > 120) stack.classList.add('is-scroll-away');
      else if (y < lastScroll - 6 || y <= 80) stack.classList.remove('is-scroll-away');
      lastScroll = y;
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(function () { stack.classList.remove('is-scroll-away'); }, 1100);
    }, { passive:true });

    /* refresh when the developer page publishes or deletes an uploaded track */
    window.addEventListener('storage', function (e) {
      if (String(e.key || '').indexOf('bcMusicUpdatedAt') !== 0) return;
      loadManifest();
      setTimeout(loadManifest, 1800);
      setTimeout(loadManifest, 7000);
    });
    setInterval(function () {
      if (!doc.hidden) loadManifest();
    }, 35000);

    window.addEventListener('pagehide', function () { saveProgress(true); });
    window.addEventListener('beforeunload', function () { saveProgress(true); });
    doc.addEventListener('visibilitychange', function () {
      if (doc.hidden) saveProgress(true);
      else if (!userPaused && audio.paused) attemptPlay();
    });

    window.addEventListener('resize', function () {
      if (!lyricsOpen || !lyricsPanel) return;
      var mobile = window.matchMedia('(max-width:820px)').matches;
      if (mobile && lyricsPanel.classList.contains('is-cinema')) {
        lyricsPanel.classList.remove('is-cinema');
        document.body.classList.remove('lyrics-cinema');
      }
      if (!mobile && lyricsPanel.classList.contains('is-full')) {
        lyricsPanel.classList.remove('is-full');
        document.body.classList.remove('lyrics-full');
      }
      if (on && document.body) document.body.appendChild(lyricsPanel);
      else if (stack) stack.appendChild(lyricsPanel);
      if (!lyricsPanel.classList.contains('is-full') && !lyricsPanel.classList.contains('is-cinema') && stack) stack.appendChild(lyricsPanel);
      syncLyricsLargeButton();
      lastLyricIndex = -2;
      if (currentMeta) markLyricLine(currentMeta, audio.currentTime || 0);
    }, { passive:true });

    setQuality(quality, true);
    syncLyricsLargeButton();
    setMode(mode);
    applyTrack(0, false, null);
    if (!userPaused) attemptPlay();
    loadManifest().then(function () {
      if (!userPaused && audio.paused) attemptPlay();
    }).catch(function () {});
    ['pointerdown', 'keydown', 'touchstart'].forEach(function (name) {
      doc.addEventListener(name, function (e) {
        if (userPaused || !audio.paused) return;
        if (e.target && e.target.closest && e.target.closest('#musicDock')) return;
        attemptPlay();
      }, { passive:true });
    });
  })();

  /* set year */
  setText('[data-year]', String(new Date().getFullYear()));
})();

