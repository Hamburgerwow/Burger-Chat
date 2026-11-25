/* Burger Chat official site runtime */
(function () {
  'use strict';

  var doc = document;
  var body = doc.body;
  var lang = body.getAttribute('data-lang') || 'zh-CN';
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
    /* The full-screen transition already carries the title; keep the toast off
       so "正在进入 Director Bao" is not drawn twice, one on top of the other. */
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
      /* Let the wipe, the title and the subtitle finish before leaving.
         The old 620 ms cut the animation off halfway. */
      setTimeout(function () { window.location.href = target; }, reduceMotion ? 220 : 1500);
      /* If the browser refuses to leave, clear the mask instead of trapping the page. */
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
  /* The hero Director Bao button uses the same transition before opening its page. */
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
    var music = $('#musicDock');
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
  (function () {
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
    audio.addEventListener('play', function () { setPlaying(true); });
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

  /* set year */
  setText('[data-year]', String(new Date().getFullYear()));
})();

