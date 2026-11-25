(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  };
  var body = document.body;
  var grid = $('#psGrid');
  var empty = $('#psEmpty');
  var filters = $('#psFilters');
  var search = $('#psSearch');
  var sort = $('#psSort');
  var modal = $('#psModal');
  var modalBody = $('#psModalBody');
  var featured = $('#psFeatured');
  var state = { plugins: [], weekly: [], category: '全部', query: '', sort: 'weekly' };
  var lastFocus = null;

  function safeIcon(p) {
    var icon = p && (p.icon || p.logo);
    if (icon && /^https?:\/\//i.test(icon)) return '<img src="' + esc(icon) + '" alt="" loading="lazy">';
    return esc(icon || '✦');
  }
  function downloadHref(p) {
    var d = String((p && p.download) || '');
    if (!d) return '';
    if (/^(?:https?:)?\/\//i.test(d) || d.charAt(0) === '/') return d;
    return '/' + d;
  }
  function targetName(t) {
    return t === 'pc' ? '仅电脑端' : '电脑 + 手机';
  }
  function fmtDate(ms) {
    var d = new Date(Number(ms) || 0);
    if (!d || isNaN(d.getTime())) return '—';
    try { return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(d); }
    catch (e) { return d.toISOString().slice(0, 10); }
  }
  function catOf(p) { return (p && p.category) || '其他'; }
  function tagsOf(p) { return Array.isArray(p && p.tags) ? p.tags : []; }
  function sortValue(p) { return Number(p && p.updated) || 0; }
  function rating(p) { return Number(p && p.rating) || 0; }

  function filterList() {
    var q = state.query.toLowerCase();
    var list = state.plugins.filter(function (p) {
      if (state.category !== '全部' && catOf(p) !== state.category) return false;
      if (!q) return true;
      var hay = [p.name, p.developer, p.description, p.id, (tagsOf(p) || []).join(' ')].join(' ').toLowerCase();
      return hay.indexOf(q) >= 0;
    });
    var weeklyRank = {};
    (state.weekly || []).forEach(function (id, i) { weeklyRank[id] = i + 1; });
    return list.sort(function (a, b) {
      if (state.sort === 'rating') return rating(b) - rating(a) || sortValue(b) - sortValue(a);
      if (state.sort === 'new') return sortValue(b) - sortValue(a);
      if (state.sort === 'name') return String(a.name || '').localeCompare(String(b.name || ''), 'zh-CN');
      var wa = weeklyRank[a.id] || 999, wb = weeklyRank[b.id] || 999;
      return wa - wb || rating(b) - rating(a) || sortValue(b) - sortValue(a);
    });
  }

  function renderFilters() {
    if (!filters) return;
    var cats = ['全部'];
    state.plugins.forEach(function (p) {
      var c = catOf(p);
      if (cats.indexOf(c) < 0) cats.push(c);
    });
    $('#psCategoryCount').textContent = String(Math.max(0, cats.length - 1));
    filters.innerHTML = cats.map(function (c) {
      return '<button type="button" class="ps-chip' + (c === state.category ? ' is-on' : '') + '" data-cat="' + esc(c) + '">' + esc(c) + '</button>';
    }).join('');
  }

  function cardHtml(p) {
    var tags = tagsOf(p).slice(0, 3).map(function (t) { return '<span>' + esc(t) + '</span>'; }).join('');
    var href = downloadHref(p);
    return '<article class="ps-card" data-plugin="' + esc(p.id) + '" tabindex="0" role="button" aria-label="查看 ' + esc(p.name) + '">' +
      '<div class="ps-card-top"><span class="ps-icon">' + safeIcon(p) + '</span><span class="ps-tag">' + esc(targetName(p.target)) + '</span></div>' +
      '<h3>' + esc(p.name || '未命名插件') + ' <em>v' + esc(p.version || '1.0.0') + '</em></h3>' +
      '<p>' + esc(p.description || '暂无描述') + '</p>' +
      '<div class="ps-tags">' + (tags || '<span>插件</span>') + '</div>' +
      '<div class="ps-card-foot"><div class="ps-by"><small>DEVELOPER</small><b>' + esc(p.developer || '未知开发者') + '</b></div>' +
      (href ? '<a class="ps-get" href="' + esc(href) + '" download>获取 .bcp</a>' : '') +
      '</div></article>';
  }

  function renderGrid() {
    if (!grid) return;
    var list = filterList();
    var count = $('#psCount');
    if (count) count.textContent = String(list.length);
    if (!list.length) {
      grid.innerHTML = '';
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;
    grid.innerHTML = list.map(cardHtml).join('');
  }

  function renderFeatured() {
    if (!featured) return;
    var byId = {};
    state.plugins.forEach(function (p) { byId[p.id] = p; });
    var picks = (state.weekly || []).map(function (id) { return byId[id]; }).filter(Boolean);
    if (!picks.length) {
      picks = state.plugins.slice().sort(function (a, b) { return rating(b) - rating(a) || sortValue(b) - sortValue(a); });
    }
    picks = picks.slice(0, 3);
    if (!picks.length) {
      featured.innerHTML = '<span class="ps-loading">插件索引为空。</span>';
      return;
    }
    featured.innerHTML = picks.map(function (p, i) {
      return '<button type="button" class="ps-frow" data-plugin="' + esc(p.id) + '">' +
        '<span class="ps-icon">' + safeIcon(p) + '</span>' +
        '<span><b>' + esc(p.name || '未命名') + '</b><small>' + esc(p.developer || 'Burger Chat') + ' · v' + esc(p.version || '1.0.0') + '</small></span>' +
        '<em>#' + (i + 1) + '</em></button>';
    }).join('');
  }

  function render() {
    renderFilters();
    renderFeatured();
    renderGrid();
  }

  function openModal(id) {
    var p = null;
    state.plugins.forEach(function (x) { if (x.id === id) p = x; });
    if (!p || !modal || !modalBody) return;
    lastFocus = document.activeElement;
    var tags = tagsOf(p).map(function (t) { return '<span>' + esc(t) + '</span>'; }).join('');
    var href = downloadHref(p);
    modalBody.innerHTML = '<div class="ps-m-head"><span class="ps-icon">' + safeIcon(p) + '</span><div><h2>' + esc(p.name || '未命名插件') + ' <em style="font-style:normal;font-size:12px;color:var(--faint)">v' + esc(p.version || '1.0.0') + '</em></h2><span class="ps-m-sub">' + esc(p.id || '') + ' · ' + esc(p.developer || '未知开发者') + '</span></div></div>' +
      '<p>' + esc(p.description || '暂无描述') + '</p>' +
      '<div class="ps-meta">' +
        '<div><small>分类</small><b>' + esc(catOf(p)) + '</b></div>' +
        '<div><small>目标平台</small><b>' + esc(targetName(p.target)) + '</b></div>' +
        '<div><small>最低应用版本</small><b>' + esc(p.minApp || '—') + '</b></div>' +
        '<div><small>最高应用版本</small><b>' + esc(p.maxApp || '—') + '</b></div>' +
        '<div><small>内存占用</small><b>' + esc(p.memoryMB || '—') + ' MB</b></div>' +
        '<div><small>更新日期</small><b>' + fmtDate(p.updated) + '</b></div>' +
      '</div>' +
      (tags ? '<div class="ps-tags" style="margin-top:12px">' + tags + '</div>' : '') +
      (p.sha256 ? '<div class="ps-m-sha"><div class="ps-meta" style="grid-template-columns:1fr;margin-top:9px"><div><small>SHA-256</small><b>' + esc(p.sha256) + '</b><button type="button" data-copy="' + esc(p.sha256) + '">复制校验值</button></div></div></div>' : '') +
      '<div class="ps-m-actions">' + (href ? '<a class="cta cta-primary" href="' + esc(href) + '" download>下载 .bcp.json <span aria-hidden="true">↓</span></a>' : '') + '<a class="cta cta-ghost" href="/developer">在开发者中心查看 <span aria-hidden="true">→</span></a></div>' +
      '<div class="ps-method">安装方式：打开 Burger Chat → 插件中心 → 导入插件，选择下载的 .bcp.json；启用前请确认最低版本与目标平台。</div>';
    modal.classList.add('is-open');
    modal.removeAttribute('inert');
    modal.setAttribute('aria-hidden', 'false');
    body.style.overflow = 'hidden';
    var card = $('.ps-modal-card', modal);
    if (card) setTimeout(function () { card.focus({ preventScroll: true }); }, 40);
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    modal.setAttribute('inert', '');
    body.style.overflow = '';
    if (lastFocus && lastFocus.focus) setTimeout(function () { lastFocus.focus({ preventScroll: true }); }, 120);
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () { return true; }).catch(function () { return false; });
    }
    try {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return Promise.resolve(ok);
    } catch (e) { return Promise.resolve(false); }
  }

  function loadRegistry(force) {
    var url = '/plugins/registry.json' + (force ? '?t=' + Date.now() : '');
    return fetch(url, { cache: 'no-store', headers: { Accept: 'application/json' } })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (data) {
        state.plugins = Array.isArray(data && data.plugins) ? data.plugins : [];
        state.weekly = (data && data.weekly && data.weekly.top) || [];
        $('#psCount').textContent = String(state.plugins.length);
        var pc = $('[data-plugin-count]');
        if (pc) pc.textContent = String(state.plugins.length);
        render();
        return true;
      })
      .catch(function () {
        if (grid) grid.innerHTML = '<div class="ps-empty" style="grid-column:1/-1">插件索引读取失败。<a href="/plugins/registry.json" target="_blank" rel="noopener" style="color:#ffd18d">打开原始 registry.json ↗</a></div>';
        if (featured) featured.innerHTML = '<span class="ps-loading">读取失败，请稍后重试。</span>';
        return false;
      });
  }

  function syncVersion() {
    fetch('/api/latest?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (data) {
        var ver = data && data.latest && data.latest.ver;
        if (!ver) return;
        $$('[data-version]').forEach(function (el) { el.textContent = ver; });
        var sv = $('#psStoreVersion');
        if (sv) sv.textContent = 'v' + ver;
        body.setAttribute('data-current-version', ver);
      })
      .catch(function () {});
  }

  if (filters) filters.addEventListener('click', function (e) {
    var chip = e.target.closest ? e.target.closest('[data-cat]') : null;
    if (!chip) return;
    state.category = chip.getAttribute('data-cat') || '全部';
    render();
  });
  if (search) search.addEventListener('input', function () {
    state.query = String(search.value || '').trim();
    renderGrid();
  });
  if (sort) sort.addEventListener('change', function () {
    state.sort = sort.value || 'weekly';
    renderGrid();
  });
  if (grid) grid.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('.ps-get')) return;
    var card = e.target.closest ? e.target.closest('[data-plugin]') : null;
    if (card) openModal(card.getAttribute('data-plugin'));
  });
  if (grid) grid.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    if (e.target.closest && e.target.closest('.ps-get')) return;
    var card = e.target.closest ? e.target.closest('[data-plugin]') : null;
    if (card) { e.preventDefault(); openModal(card.getAttribute('data-plugin')); }
  });
  if (featured) featured.addEventListener('click', function (e) {
    var row = e.target.closest ? e.target.closest('[data-plugin]') : null;
    if (row) openModal(row.getAttribute('data-plugin'));
  });
  if (modal) modal.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('[data-ps-close]')) { closeModal(); return; }
    var copy = e.target.closest ? e.target.closest('[data-copy]') : null;
    if (copy) {
      var val = copy.getAttribute('data-copy') || '';
      copyText(val).then(function (ok) {
        copy.textContent = ok ? '已复制' : '复制失败';
        setTimeout(function () { copy.textContent = '复制校验值'; }, 1600);
      });
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modal && modal.classList.contains('is-open')) { e.preventDefault(); closeModal(); }
    if ((e.metaKey || e.ctrlKey) && String(e.key).toLowerCase() === 'k' && search) {
      e.preventDefault();
      search.focus();
      search.select();
    }
  });
  document.addEventListener('scroll', function () {
    var bar = $('#progress');
    if (bar) {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = (h > 0 ? (window.scrollY / h * 100) : 0).toFixed(2) + '%';
    }
    var dock = $('.ps-dock');
    if (dock) dock.classList.toggle('on', window.scrollY > 380);
  }, { passive: true });

  var year = $('#psYear');
  if (year) year.textContent = String(new Date().getFullYear());
  var heroVideo = $('.wall-landscape', $('.ps-hero'));
  if (heroVideo) { try { heroVideo.play().catch(function () {}); } catch (e) {} }

  syncVersion();
  setInterval(syncVersion, 20000);
  loadRegistry(false);
  setInterval(function () { if (!document.hidden) loadRegistry(true); }, 60000);
  window.addEventListener('storage', function (e) {
    if (e.key === 'bcPluginsChanged') loadRegistry(true);
  });
})();
