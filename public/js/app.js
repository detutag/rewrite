/* Rewrite — interfaz (API externa opcional y acceso con usuario/contraseña) */
(function () {
  'use strict';
  var T = window.rwT || function (k) { return k; };
  function $(id) { return document.getElementById(id); }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var toastTimer;
  function toast(msg) { var t = $('toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.hidden = true; }, 2600); }

  /* Tema: sistema por defecto; el botón lo fija */
  $('theme-btn').addEventListener('click', function () {
    var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next); store('ta_theme', next);
  });
  try {
    matchMedia('(prefers-color-scheme: light)').addEventListener('change', function (e) {
      if (!store('ta_theme')) document.documentElement.setAttribute('data-theme', e.matches ? 'light' : 'dark');
    });
  } catch (e) {}

  /* API externa (compatible con OpenAI) */
  var apiModal = $('apiModal');
  function apiConfig() {
    if (store('rw_api_enabled') !== '1') return null;
    var baseUrl = (store('rw_api_base') || '').trim();
    var apiKey = (store('rw_api_key') || '').trim();
    var model = (store('rw_api_model') || '').trim();
    if (!baseUrl || !apiKey || !model) return null;
    return { provider: 'custom', baseUrl: baseUrl, apiKey: apiKey, model: model };
  }
  function paintApiDot() {
    var dot = $('api-dot'), b = $('api-btn');
    var on = !!apiConfig();
    if (dot) dot.hidden = !on;
    if (b) { b.title = T(on ? 'api_on' : 'api_btn'); b.setAttribute('aria-label', T(on ? 'api_on' : 'api_btn')); }
  }
  function fillApiForm() {
    if (!apiModal) return;
    $('apiEnabled').checked = store('rw_api_enabled') === '1';
    $('apiBase').value = store('rw_api_base') || '';
    $('apiKey').value = store('rw_api_key') || '';
    $('apiModel').value = store('rw_api_model') || '';
  }
  function openApi() { if (!apiModal) return; fillApiForm(); apiModal.hidden = false; setTimeout(function () { $('apiBase').focus(); }, 30); }
  function closeApi() { if (apiModal) apiModal.hidden = true; }
  function saveApi() {
    var enabled = $('apiEnabled').checked;
    var base = $('apiBase').value.trim();
    var key = $('apiKey').value.trim();
    var model = $('apiModel').value.trim();
    if (enabled && (!base || !key || !model)) { toast(T('api_missing')); return; }
    store('rw_api_enabled', enabled ? '1' : null);
    store('rw_api_base', base || null);
    store('rw_api_key', key || null);
    store('rw_api_model', model || null);
    paintApiDot();
    closeApi();
    toast(T('api_saved'));
  }
  function clearApi() {
    ['rw_api_enabled', 'rw_api_base', 'rw_api_key', 'rw_api_model'].forEach(function (k) { store(k, null); });
    fillApiForm();
    paintApiDot();
    closeApi();
    toast(T('api_cleared'));
  }
  if (apiModal) {
    apiModal.addEventListener('click', function (e) { if (e.target === apiModal) closeApi(); });
    $('apiSave').addEventListener('click', saveApi);
    $('apiClear').addEventListener('click', clearApi);
  }
  paintApiDot();

  /* Autenticación simple (usuario/contraseña definidos en el servidor por variables de entorno) */
  var authModal = $('authModal');
  var authRequired = false;
  function authToken() { return store('rw_token') || ''; }
  function authHeaders() { var t = authToken(); return t ? { 'Authorization': 'Bearer ' + t } : {}; }
  function paintAuth() {
    var login = $('login-btn'), out = $('logout-btn');
    var on = !!authToken();
    if (out) out.hidden = !on;
    if (login) login.hidden = on || !authRequired;
  }
  function openAuth() { if (!authModal) return; authModal.hidden = false; setTimeout(function () { var u = $('authUser'); if (u) u.focus(); }, 30); }
  function closeAuth() { if (authModal) authModal.hidden = true; }
  function doLogin() {
    var user = $('authUser').value.trim();
    var pass = $('authPass').value;
    var btn = $('authSubmit');
    if (!user || !pass) { toast(T('auth_missing')); return; }
    btn.disabled = true;
    fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user, password: pass })
    }).then(function (r) { return r.ok ? r.json() : r.json().then(function (e) { throw new Error(e.error || ('HTTP ' + r.status)); }); })
      .then(function (d) { store('rw_token', d.token); $('authPass').value = ''; closeAuth(); paintAuth(); toast(T('auth_success')); })
      .catch(function (e) { toast(e.message || T('auth_invalid')); })
      .finally(function () { btn.disabled = false; });
  }
  function logout() { store('rw_token', null); paintAuth(); toast(T('t_logout')); }
  if (authModal) {
    authModal.addEventListener('click', function (e) { if (e.target === authModal) closeAuth(); });
    $('authSubmit').addEventListener('click', doLogin);
    $('authForm').addEventListener('submit', function (e) { e.preventDefault(); doLogin(); });
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeAuth(); closeApi(); } });
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-open-auth]')) openAuth();
    if (e.target.closest('[data-close-auth]')) closeAuth();
    if (e.target.closest('[data-open-api]')) openApi();
    if (e.target.closest('[data-close-api]')) closeApi();
    if (e.target.closest('[data-logout]')) logout();
  });
  fetch('/api/auth/login', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) {
      authRequired = !!(d && d.required);
      if (authRequired && d.username) $('authUser').value = d.username;
      paintAuth();
    }).catch(function () { paintAuth(); });
  paintAuth();

  document.addEventListener('rw:lang', function () {
    paintAuth(); counts(); $('btnRunText').textContent = running ? T('processing') : LABEL[mode];
    paintApiDot();
    if (!$('stats').hidden && lastStats) renderStats(lastStats[0], lastStats[1]);
    if (lastTool && $('toolResult') && !$('toolResult').hidden) renderToolData(lastTool.m, lastTool.data, $('toolResult'));
  });

  /* Espacio de trabajo */
  var mode = 'stealth', running = false;
  var LABEL = { get stealth() { return T('run_rewrite'); }, get corrector() { return T('run_correct'); }, get translate() { return T('run_translate'); }, get audit() { return T('run_audit'); }, get sentiment() { return T('run_tono'); }, get hooks() { return T('run_hooks'); }, get proofread() { return T('run_coherence'); } };
  var tl = store('rw_target'); if (tl) $('targetLang').value = tl;
  $('targetLang').addEventListener('change', function () { store('rw_target', this.value); });
  setTimeout(function () { var m = store('rw_mode'); var b = m && document.querySelector('.seg-btn[data-mode="' + m + '"]'); if (b) b.click(); }, 0);
  var input = $('inputText'), out = $('outputText');
  function words(t) { t = t.trim(); return t ? t.split(/\s+/).length : 0; }
  function counts() {
    var n = words(input.value); $('inWordCount').textContent = n + ' ' + (n === 1 ? T('w1') : T('wN'));
    var o = words(out.textContent); $('outWordCount').textContent = out.hidden ? '' : o + ' ' + (o === 1 ? T('w1') : T('wN'));
  }
  input.value = store('rw_draft') || '';
  input.addEventListener('input', function () { counts(); store('rw_draft', input.value); });
  counts();
  $('btnRunText').textContent = LABEL[mode];
  document.querySelectorAll('.seg-btn').forEach(function (b) {
    b.addEventListener('click', function () {
      mode = b.dataset.mode;
      document.querySelectorAll('.seg-btn').forEach(function (x) { var on = x === b; x.classList.toggle('is-active', on); x.setAttribute('aria-selected', String(on)); });
      $('btnRunText').textContent = LABEL[mode];
      $('stylePreset').hidden = mode !== 'stealth';
      $('langPair').hidden = mode !== 'translate';
      store('rw_mode', mode); resetOut();
    });
  });
  function stripMd(t) {
    return String(t || '').replace(/<\/?(texto|text)>/gi, '')
      .replace(/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/gm, '').replace(/^\s{0,3}#{1,6}\s+/gm, '').replace(/^\s*>\s?/gm, '')
      .replace(/^\s*[*\-+•]\s+/gm, '').replace(/\*\*/g, '').replace(/__/g, '')
      .replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n').replace(/^\s+/, '');
  }
  function showOut(text, streaming) {
    $('outputEmpty').hidden = true; out.hidden = false; $('btnCopy').hidden = streaming;
    out.textContent = stripMd(text); out.classList.toggle('cursor', !!streaming); counts();
  }
  function resetOut() { $('stats').hidden = true; out.textContent = ''; out.hidden = true; var tr = $('toolResult'); if (tr) { tr.innerHTML = ''; tr.hidden = true; } $('outputEmpty').hidden = false; $('btnCopy').hidden = true; counts(); }
  $('btnClear').addEventListener('click', function () { input.value = ''; store('rw_draft', null); resetOut(); input.focus(); });
  $('btnPaste').addEventListener('click', function () {
    if (!navigator.clipboard || !navigator.clipboard.readText) { toast(T('t_paste')); return; }
    navigator.clipboard.readText().then(function (t) { if (t) { input.value = t; store('rw_draft', t); counts(); } }).catch(function () { toast(T('t_paste')); });
  });
  $('btnCopy').addEventListener('click', function () {
    var t = out.textContent;
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { toast(T('t_copied')); }, function () { toast(T('t_copyfail')); });
  });
  document.addEventListener('keydown', function (e) { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') run(); });
  $('btnRun').addEventListener('click', run);

  /* Cambios en el estilo: métricas locales y verificables */
  var CLICHES = ['en resumen', 'en conclusión', 'cabe destacar', 'es importante señalar', 'es importante destacar', 'paradoja', 'crucial', 'fundamental', 'en un mundo', 'en el panorama actual', 'a día de hoy', 'no solo', 'sin lugar a dudas', 'un tapiz', 'en definitiva', 'juega un papel', 'in conclusion', 'it is worth noting', 'crucial', 'delve', 'tapestry', 'landscape', 'moreover', 'furthermore', 'in today\'s world', 'paradox'];
  function sentenceStats(t) {
    var plain = stripMd(t).replace(/\n+/g, ' ');
    var sents = plain.split(/(?<=[.!?…])\s+/).map(function (x) { return x.trim(); }).filter(function (x) { return x.split(/\s+/).length > 1; });
    var lens = sents.map(function (x) { return x.split(/\s+/).length; });
    var n = lens.length || 1, mean = lens.reduce(function (a, b) { return a + b; }, 0) / n;
    var sd = Math.sqrt(lens.reduce(function (a, b) { return a + Math.pow(b - mean, 2); }, 0) / n);
    return { sd: sd, mean: mean, n: lens.length };
  }
  function countCliches(t) {
    var low = ' ' + t.toLowerCase() + ' ', c = 0;
    CLICHES.forEach(function (k) { var i = 0; while ((i = low.indexOf(k, i)) !== -1) { c++; i += k.length; } });
    return c;
  }
  var lastStats = null;
  function renderStats(before, after) {
    lastStats = [before, after];
    var a = sentenceStats(before), b = sentenceStats(after);
    var ca = countCliches(before), cb = countCliches(after);
    var wa = words(stripMd(before)), wb = words(after);
    function f(x) { return x.toFixed(1).replace('.', ','); }
    $('statsGrid').innerHTML =
      '<div class="stat"><div class="stat-label">' + T('st_var') + '</div><div class="stat-value">' + f(a.sd) + ' → ' + f(b.sd) + '</div></div>' +
      '<div class="stat"><div class="stat-label">' + T('st_cli') + '</div><div class="stat-value">' + ca + ' → ' + cb + ' <small>(' + Math.max(0, ca - cb) + ' ' + T('st_removed') + ')</small></div></div>' +
      '<div class="stat"><div class="stat-label">' + T('st_words') + '</div><div class="stat-value">' + wa + ' → ' + wb + ' <small>(' + b.n + ' ' + T('st_sent') + ')</small></div></div>';
    $('stats').hidden = false;
  }

  async function run() {
    if (running) return;
    var text = input.value.trim();
    if (text.length < 5) { toast(T('t_empty')); input.focus(); return; }
    running = true; var btn = $('btnRun'); btn.disabled = true; $('btnRunText').textContent = T('processing');
    $('stats').hidden = true;

    var isToolMode = ['audit', 'sentiment', 'hooks', 'proofread'].indexOf(mode) !== -1;
    if (isToolMode) {
      $('outputEmpty').hidden = true;
      out.hidden = true;
      var tr = $('toolResult');
      if (tr) {
        tr.hidden = false;
        tr.innerHTML = '<div class="empty"><p>' + T('processing') + '</p></div>';
      }
      try {
        var tRes = await fetch('/api/tools', {
          method: 'POST',
          headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()),
          body: JSON.stringify(Object.assign({ action: mode, text: text, targetLanguage: $('targetLang').value }, apiConfig() || {}))
        }).catch(function () { return null; });

        if (!tRes) throw new Error(T('t_server'));

        if (!tRes.ok) {
          var errObj = await tRes.json().catch(function () { return {}; });
          throw new Error(errObj.error || ('HTTP ' + tRes.status));
        }

        var tJson = await tRes.json();
        renderToolData(mode, tJson.data, tr);
      } catch (e) {
        resetOut();
        toast(e.message || T('t_fail'));
      } finally {
        running = false;
        btn.disabled = false;
        $('btnRunText').textContent = LABEL[mode] || T('run_rewrite');
      }
      return;
    }

    showOut('', true);
    var acc = '', t0 = performance.now(), tFirst = 0;
    window.__rwTiming = null;
    try {
      var res = await fetch('/api/rewrite', {
        method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json', 'Accept': 'text/event-stream, application/json' }, authHeaders()),
        body: JSON.stringify(Object.assign({ text: text, mode: mode, stylePreset: $('stylePreset').value, targetLang: $('targetLang').value, language: 'auto', stream: true }, apiConfig() || {}))
      });
      if (!res.ok) { var err = await res.json().catch(function () { return {}; }); throw new Error(err.error || (T('t_server') + ' (' + res.status + ')')); }
      var ct = res.headers.get('content-type') || '';
      if (ct.indexOf('text/event-stream') !== -1 && res.body && res.body.getReader) {
        var reader = res.body.getReader(), dec = new TextDecoder(), buf = '';
        for (;;) {
          var c = await reader.read(); if (c.done) break;
          buf += dec.decode(c.value, { stream: true });
          var lines = buf.split('\n'); buf = lines.pop();
          for (var i = 0; i < lines.length; i++) {
            var l = lines[i].trim(); if (l.indexOf('data:') !== 0) continue;
            var d = l.slice(5).trim(); if (d === '[DONE]') continue;
            try { var p = JSON.parse(d); if (p.chunk) { if (!tFirst) tFirst = performance.now(); acc += p.chunk; showOut(acc, true); } if (p.reset) { acc = ''; showOut('', true); toast(T('t_adjust')); } if (p.done && p.text) acc = p.text; } catch (pe) {}
          }
        }
      } else {
        var data = await res.json(); acc = data.humanized || data.text || '';
      }
      if (!acc.trim()) throw new Error(T('t_noout'));
      if (!tFirst) tFirst = performance.now();
      showOut(acc.trim(), false);
      window.__rwTiming = { ttft: Math.round(tFirst - t0), total: Math.round(performance.now() - t0) };
      if (mode === 'stealth') renderStats(text, out.textContent);
    } catch (e) {
      resetOut(); toast(e.message || T('t_fail'));
    } finally {
      running = false; btn.disabled = false; $('btnRunText').textContent = LABEL[mode];
    }
  }

  var lastTool = null;
  function renderToolData(m, data, tr) {
    if (!tr || !data) return;
    lastTool = { m: m, data: data };
    if (m === 'audit') {
      var s = data.scores || {};
      var diag = data.diagnostico_detectores || {};
      var vers = data.versiones || {};
      var aiProb = s.ai_probability != null ? s.ai_probability : 50;
      var aiClass = aiProb < 25 ? 'tool-badge-green' : (aiProb < 60 ? 'tool-badge-yellow' : 'tool-badge-red');

      tr.innerHTML = '<div class="tool-card">' +
        '<div class="tool-grid" style="margin-bottom:12px;">' +
          '<div class="stat"><div class="stat-label">' + T('t_quality') + '</div><div class="stat-value">' + (s.global_quality ?? 0) + '%</div></div>' +
          '<div class="stat"><div class="stat-label">' + T('t_ai_prob') + '</div><div class="stat-value"><span class="tool-badge ' + aiClass + '">' + aiProb + '%</span></div></div>' +
          '<div class="stat"><div class="stat-label">' + T('t_perplexity') + '</div><div class="stat-value">' + (s.perplexity ?? 0) + '</div></div>' +
          '<div class="stat"><div class="stat-label">' + T('t_burstiness') + '</div><div class="stat-value">' + (s.burstiness ?? 0) + '</div></div>' +
          '<div class="stat"><div class="stat-label">' + T('t_grammar') + '</div><div class="stat-value">' + (s.grammar ?? 0) + '%</div></div>' +
        '</div>' +
        '<div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:12px;">' +
          '<div class="stat"><strong style="font-size:.82rem; display:block; margin-bottom:4px;">' + T('t_gptzero') + '</strong><span style="font-size:.85rem; color:var(--text-2);">' + esc(diag.gptzero_simulacion || T('t_no_data')) + '</span></div>' +
          '<div class="stat"><strong style="font-size:.82rem; display:block; margin-bottom:4px;">' + T('t_copyleaks') + '</strong><span style="font-size:.85rem; color:var(--text-2);">' + esc(diag.copyleaks_simulacion || T('t_no_data')) + '</span></div>' +
        '</div>' +
        (data.analisis_critico ? '<div class="stat" style="margin-bottom:12px;"><strong style="font-size:.82rem; display:block; margin-bottom:4px;">' + T('t_critical') + '</strong><span style="font-size:.85rem; color:var(--text-2);">' + esc(data.analisis_critico) + '</span></div>' : '') +
        '<div style="border-top:1px solid var(--border); padding-top:12px;">' +
          '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">' +
            '<strong style="font-size:.85rem;">' + T('t_versions') + '</strong>' +
            '<div style="display:flex; gap:4px;" id="vTabs">' +
              '<button type="button" class="version-tab is-active" data-v="human">' + T('t_humanized') + '</button>' +
              '<button type="button" class="version-tab" data-v="seo">SEO</button>' +
              '<button type="button" class="version-tab" data-v="exec">' + T('t_exec') + '</button>' +
            '</div>' +
          '</div>' +
          '<div id="vBox" style="background:var(--subtle); padding:12px; border-radius:10px; font-size:.9rem; line-height:1.6; white-space:pre-wrap; max-height:200px; overflow-y:auto; border:1px solid var(--border); margin-bottom:10px;"></div>' +
          '<div style="display:flex; justify-content:flex-end; gap:8px;">' +
            '<button type="button" class="btn btn-outline btn-sm" id="btnCopyV">' + T('t_copy_version') + '</button>' +
            '<button type="button" class="btn btn-primary btn-sm" id="btnApplyV">' + T('t_apply_editor') + '</button>' +
          '</div>' +
        '</div>' +
      '</div>';

      var versions = { human: vers.humanizada_antidetector || '', seo: vers.seo_optimizada || '', exec: vers.resumen_ejecutivo || '' };
      var curV = 'human';
      function setV(k) {
        curV = k;
        var box = $('vBox'); if (box) box.textContent = versions[k] || '';
        document.querySelectorAll('#vTabs .version-tab').forEach(function(b) { b.classList.toggle('is-active', b.dataset.v === k); });
      }
      setV('human');
      document.querySelectorAll('#vTabs .version-tab').forEach(function(b) {
        b.addEventListener('click', function() { setV(b.dataset.v); });
      });
      $('btnCopyV').addEventListener('click', function() {
        navigator.clipboard.writeText(versions[curV] || '').then(function() { toast(T('t_copied')); });
      });
      $('btnApplyV').addEventListener('click', function() {
        input.value = versions[curV] || '';
        counts();
        toast(T('t_loaded'));
      });

    } else if (m === 'sentiment') {
      var f = data.nivel_formalidad != null ? data.nivel_formalidad : 50;
      tr.innerHTML = '<div class="tool-card">' +
        '<h3 style="margin:0 0 12px; font-size:.95rem; font-weight:600;">' + T('t_tone_title') + '</h3>' +
        '<div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:8px; margin-bottom:14px;">' +
          '<div class="stat"><div class="stat-label">' + T('t_main_tone') + '</div><div class="stat-value" style="font-size:.95rem;">' + esc(data.tono_principal || T('t_neutral')) + '</div></div>' +
          '<div class="stat"><div class="stat-label">' + T('t_intent') + '</div><div class="stat-value" style="font-size:.95rem;">' + esc(data.intencion || T('t_inform')) + '</div></div>' +
          '<div class="stat"><div class="stat-label">' + T('t_emotion') + '</div><div class="stat-value" style="font-size:.95rem;">' + esc(data.emocion_detectada || T('t_neutral')) + '</div></div>' +
        '</div>' +
        '<div style="margin-bottom:12px;">' +
          '<div style="display:flex; justify-content:space-between; font-size:.82rem; margin-bottom:4px;"><span>' + T('t_formality') + '</span><strong>' + f + '%</strong></div>' +
          '<div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:' + f + '%;"></div></div>' +
          '<div style="display:flex; justify-content:space-between; font-size:.72rem; color:var(--muted);"><span>' + T('t_casual') + '</span><span>' + T('t_standard') + '</span><span>' + T('t_ultraformal') + '</span></div>' +
        '</div>' +
        (data.sugerencia_ajuste ? '<div class="stat"><div class="stat-label">' + T('t_adjust_sugg') + '</div><div style="font-size:.88rem; color:var(--text-2); margin-top:2px;">' + esc(data.sugerencia_ajuste) + '</div></div>' : '') +
      '</div>';

    } else if (m === 'hooks') {
      var hooks = Array.isArray(data.titulares_gancho) ? data.titulares_gancho : [];
      var angles = [T('t_hook_curiosity'), T('t_hook_benefit'), T('t_hook_data')];
      var hHtml = hooks.map(function(h, idx) {
        return '<div class="stat" style="display:flex; justify-content:space-between; align-items:center; gap:10px; margin-bottom:8px;">' +
          '<div><div class="stat-label">' + (angles[idx] || (T('t_hook_n') + ' ' + (idx + 1))) + '</div><div style="font-size:.92rem; font-weight:600; margin-top:3px;">' + esc(h) + '</div></div>' +
          '<button type="button" class="btn btn-outline btn-sm" data-hook="' + idx + '">' + T('t_copy_short') + '</button>' +
        '</div>';
      }).join('');
      tr.innerHTML = '<div class="tool-card"><h3 style="margin:0 0 12px; font-size:.95rem; font-weight:600;">' + T('t_hooks_title') + '</h3>' + (hHtml || '<p class="empty">' + T('t_noheads') + '</p>') + '</div>';
      tr.querySelectorAll('[data-hook]').forEach(function (b) {
        b.addEventListener('click', function () {
          var h = hooks[Number(b.getAttribute('data-hook'))];
          if (h && navigator.clipboard) navigator.clipboard.writeText(h).then(function () { toast(T('t_copied')); }, function () { toast(T('t_copyfail')); });
        });
      });

    } else if (m === 'proofread') {
      var errs = Array.isArray(data.errores_detectados) ? data.errores_detectados : [];
      var textCor = data.texto_corregido_estilo || '';
      var eHtml = errs.map(function(e) {
        return '<div style="background:var(--subtle); border-left:3px solid #EF4444; padding:8px 10px; border-radius:6px; margin-bottom:6px; font-size:.82rem;"><strong>' + esc(e.tipo || T('t_no_data')) + ':</strong> ' + esc(e.descripcion || '') + '</div>';
      }).join('');

      tr.innerHTML = '<div class="tool-card">' +
        '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">' +
          '<h3 style="margin:0; font-size:.95rem; font-weight:600;">' + T('t_coherence_title') + '</h3>' +
          '<span class="tool-badge">' + errs.length + ' ' + T('t_points') + '</span>' +
        '</div>' +
        (eHtml ? '<div style="margin-bottom:12px; max-height:160px; overflow-y:auto;">' + eHtml + '</div>' : '<p style="color:#10B981; font-size:.85rem; margin-bottom:12px;">' + T('t_coherence_ok') + '</p>') +
        '<div style="border-top:1px solid var(--border); padding-top:10px;">' +
          '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">' +
            '<span class="stat-label">' + T('t_corrected_text') + '</span>' +
            '<div style="display:flex; gap:6px;">' +
              '<button type="button" class="btn btn-outline btn-sm" id="btnCopyPf">' + T('t_copy_short') + '</button>' +
              '<button type="button" class="btn btn-primary btn-sm" id="btnApplyPf">' + T('t_apply') + '</button>' +
            '</div>' +
          '</div>' +
          '<div style="background:var(--subtle); padding:10px 12px; border-radius:10px; font-size:.88rem; line-height:1.6; white-space:pre-wrap; max-height:180px; overflow-y:auto; border:1px solid var(--border);">' + esc(textCor) + '</div>' +
        '</div>' +
      '</div>';

      var bC = $('btnCopyPf'), bA = $('btnApplyPf');
      if (bC) bC.onclick = function() { navigator.clipboard.writeText(textCor).then(function() { toast(T('t_copied')); }); };
      if (bA) bA.onclick = function() { input.value = textCor; counts(); toast(T('t_applied')); };
    }
  }

})();
