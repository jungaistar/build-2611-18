/* build-2611-18 · 화면 — 그리기만 한다. 읽기 · 표준화 · 보간 · 비교는 js/lift.js(Lift) 에 있다. */
(function () {
  'use strict';
  var E = window.Lift, $ = function (q) { return document.querySelector(q); };
  var COLORS = ['#154b6e', '#d9822b', '#0a6045', '#8a4fa3', '#b03a5b', '#2f8fb5', '#9a7b00', '#5b6b7b', '#c8341f', '#3d7a2a', '#6a5acd', '#008b8b'];
  var st = { rows: [], files: [], sel: {}, height: null, base: null, hide: {}, color: {}, conv: null };
  function h(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function show(q, on) { $(q).hidden = !on; }
  function nice(v) { var p = Math.pow(10, Math.floor(Math.log10(v || 1))), m = v / p; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p; }
  function download(name, data, type) { var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data], { type: type || 'text/csv;charset=utf-8' })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
  function today() { return new Date().toISOString().slice(0, 10); }

  /* ---------- 데이터 ---------- */
  function addAoa(aoa, name) {
    var R = E.readRows(aoa, name); st.files.push({ name: name, total: R.total, ok: R.rows.length, skipped: R.skipped, issues: R.issues, missing: R.missing });
    st.rows = st.rows.concat(R.rows); st.sel = {}; st.hide = {}; st.base = null; st.height = null; render();
  }
  function readFile(f) {
    return new Promise(function (res, rej) {
      var r = new FileReader(); r.onerror = rej;
      if (/\.csv$/i.test(f.name)) { r.onload = function () { res(E.parseCsv(new TextDecoder('utf-8').decode(r.result))); }; r.readAsArrayBuffer(f); }
      else { r.onload = function () { try { var wb = XLSX.read(r.result, { type: 'array' }); res(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, defval: '' })); } catch (e) { rej(e); } }; r.readAsArrayBuffer(f); }
    });
  }
  function addFiles(list) { [].slice.call(list).reduce(function (p, f) { return p.then(function () { return readFile(f).then(function (a) { addAoa(a, f.name); }).catch(function (e) { st.files.push({ name: f.name, total: 0, ok: 0, skipped: 0, issues: ['읽지 못했습니다 — ' + e.message], missing: [] }); render(); }); }); }, Promise.resolve()); }

  /* ---------- 그리기 ---------- */
  function current() {
    var rows = E.applyFilters(st.rows, st.sel), cs = E.curves(rows), hs = E.heights(rows);
    cs.forEach(function (c, i) { c.color = st.color[c.id] || COLORS[i % COLORS.length]; });   // 고른 색이 없으면 지금 목록의 순서대로
    if (st.height == null || hs.indexOf(st.height) < 0) st.height = E.defaultHeight(hs);
    if (!cs.some(function (c) { return c.id === st.base; })) st.base = cs.length ? cs[0].id : null;
    return { rows: rows, curves: cs, heights: hs, shown: cs.filter(function (c) { return !st.hide[c.id]; }) };
  }
  function render() {
    var has = st.rows.length > 0;
    $('#file-status').innerHTML = st.files.map(function (f) {
      return '<div class="' + (f.ok ? 'ok' : 'warn') + ' fstat"><b>' + h(f.name) + '</b> — ' + f.total + '행 중 ' + f.ok + '행을 읽었습니다' + (f.skipped ? ' · 건너뜀 ' + f.skipped + '행' : '') + (f.missing.length && f.ok ? ' · 없는 열: ' + h(f.missing.join(', ')) : '') +
        (f.issues.length ? '<ul>' + f.issues.slice(0, 8).map(function (i) { return '<li>' + h(i) + '</li>'; }).join('') + (f.issues.length > 8 ? '<li>… 외 ' + (f.issues.length - 8) + '건</li>' : '') + '</ul>' : '') + '</div>';
    }).join('');
    show('#btn-clear', st.files.length > 0);
    ['#s-cond', '#s-2d', '#s-cmp', '#s-3d'].forEach(function (s) { show(s, has); });
    if (!has) return;
    var C = current();
    // 필터
    $('#filters').innerHTML = E.options(st.rows, st.sel).filter(function (o) { return o.values.filter(Boolean).length > 0; }).map(function (o) {
      var one = o.values.length === 1 && !(st.sel[o.key] || []).length;
      return '<div class="frow"><b>' + o.label + '</b>' + o.values.map(function (v) { return '<button type="button" class="chip' + (one ? ' only' : (st.sel[o.key] || []).indexOf(v) >= 0 ? ' on' : '') + '" data-f="' + o.key + '" data-v="' + h(v) + '"' + (one ? ' disabled' : '') + '>' + h(v || '(빈 값)') + '</button>'; }).join('') +
        ((st.sel[o.key] || []).length ? '<button type="button" class="chip" data-f="' + o.key + '" data-v="__all">전체</button>' : '') + '</div>';
    }).join('');
    $('#height').innerHTML = C.heights.map(function (x) { return '<option value="' + x + '"' + (x === st.height ? ' selected' : '') + '>' + E.hLabel(x) + '</option>'; }).join('');
    $('#curves').innerHTML = '<table><tr><th>표시</th><th>기준</th><th>곡선</th><th>색</th><th>운전중량</th><th>높이 수</th><th>값 수</th></tr>' + C.curves.map(function (c) {
      return '<tr class="' + (st.hide[c.id] ? 'off' : '') + (c.id === st.base ? ' base' : '') + '"><td><input type="checkbox" data-show="' + h(c.id) + '"' + (st.hide[c.id] ? '' : ' checked') + ' aria-label="표시"></td><td><input type="radio" name="base" data-base="' + h(c.id) + '"' + (c.id === st.base ? ' checked' : '') + ' aria-label="기준 모델"></td><td>' + (c.id === st.base ? '★ ' : '') + h(c.label) + '</td><td><input type="color" data-color="' + h(c.id) + '" value="' + c.color + '" aria-label="색"></td><td class="num">' + (c.spec.weight == null ? '' : c.spec.weight.toLocaleString('en-US')) + '</td><td class="num">' + E.heights(c.rows).length + '</td><td class="num">' + c.rows.length + '</td></tr>';
    }).join('') + '</table>';
    $('#cond-notes').innerHTML = (C.curves.length > 12 ? '<div class="note" id="many">곡선이 ' + C.curves.length + '개입니다. 위에서 블레이드 · 캐빈 · 암 같은 조건을 골라 줄이면 그래프가 읽기 쉬워집니다.</div>' : '') + (!C.curves.length ? '<div class="warn">조건에 맞는 데이터가 없습니다.</div>' : '');
    // 2D
    var lab = $('#label').value === 'on';
    ['front', 'side'].forEach(function (k) { $('#c-' + k).innerHTML = chart2d(C.shown, st.height, k, lab); });
    // 비교표
    var want = $('#radii').value.split(/[\s,;]+/).map(function (x) { return E.num(x); }).filter(Boolean).map(function (x) { return x.v; });
    ['front', 'side'].forEach(function (k) {
      var rs = want.length ? want.slice().sort(function (a, b) { return a - b; }) : E.radii(C.shown, st.height, k), cmp = E.compare(C.shown, st.base, st.height, rs, k), baseShown = cmp.some(function (c) { return c.base; });
      $('#t-' + k).innerHTML = !rs.length ? '<p class="sub">이 높이에 값이 없습니다.</p>' : '<table><tr><th>곡선 \\ Radius (m)</th>' + rs.map(function (r) { return '<th>' + E.f3(r) + '</th>'; }).join('') + '</tr>' + cmp.map(function (c) {
        return '<tr class="' + (c.base ? 'base' : '') + '"><td>' + (c.base ? '★ ' : '') + h(c.label) + '</td>' + c.cells.map(function (x) {
          return '<td class="num' + (x.diff > 0.05 ? ' up' : x.diff < -0.05 ? ' down' : '') + '">' + (x.v == null ? '<span class="muted">–</span>' : (x.star ? '<b class="star">' + E.f3(x.v) + '*</b>' : E.f3(x.v)) + (x.est ? '<span class="est">추정</span>' : '') + (c.base || x.diff == null ? '' : '<small class="d">' + E.pct(x.diff) + (x.baseEst ? ' <span class="est">기준 추정</span>' : '') + '</small>')) + '</td>';
        }).join('') + '</tr>';
      }).join('') + '</table>' + (baseShown ? '' : '<p class="sub">기준 곡선이 「표시」에서 꺼져 있어 차이(%)를 내지 않았습니다.</p>');
    });
    draw3d();
  }
  /** 2D: 반경 – 인양력 꺾은선(기준은 별 표식) */
  function chart2d(cs, height, kind, lab) {
    var W = 1100, H = 400, L = 64, R = 18, T = 22, B = 50, sers = cs.map(function (c) { return { c: c, s: E.series(c, height, kind) }; }).filter(function (x) { return x.s.length; });
    if (!sers.length) return '<p class="sub nochart">이 높이(' + E.hLabel(height) + ')에 표시할 값이 없습니다.</p>';
    var xs = [], ys = []; sers.forEach(function (x) { x.s.forEach(function (p) { xs.push(p.r); ys.push(p.v); }); });
    var x0 = Math.floor(Math.min.apply(null, xs)), x1 = Math.ceil(Math.max.apply(null, xs)); if (x0 === x1) x1 = x0 + 1;
    var ystep = nice(Math.max.apply(null, ys) / 6), y1 = Math.ceil(Math.max.apply(null, ys) / ystep) * ystep, xstep = (x1 - x0) > 8 ? 1 : 0.5;
    var X = function (v) { return L + (v - x0) / (x1 - x0) * (W - L - R); }, Y = function (v) { return T + (y1 - v) / y1 * (H - T - B); }, o = [];
    for (var y = 0; y <= y1 + ystep / 2; y += ystep) o.push('<line class="grid" x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(y) + '" y2="' + Y(y) + '"/><text class="ax" x="' + (L - 7) + '" y="' + (Y(y) + 4) + '" text-anchor="end">' + E.f3(y) + '</text>');
    for (var x = x0; x <= x1 + 1e-9; x += xstep) o.push('<line class="grid" x1="' + X(x) + '" x2="' + X(x) + '" y1="' + T + '" y2="' + (H - B) + '"/><text class="ax" x="' + X(x) + '" y="' + (H - B + 17) + '" text-anchor="middle">' + E.f3(x) + '</text>');
    o.push('<text class="axt" x="' + ((L + W - R) / 2) + '" y="' + (H - 10) + '" text-anchor="middle">Radius (m)</text><text class="axt" x="14" y="14">' + (kind === 'front' ? 'Front' : 'Side') + ' Lifting Capacity (ton) · Height ' + E.hLabel(height) + '</text>');
    sers.forEach(function (x) {
      var col = x.c.color, base = x.c.id === st.base;
      o.push('<polyline class="curve" fill="none" stroke="' + col + '" stroke-width="' + (base ? 3 : 2) + '" points="' + x.s.map(function (p) { return X(p.r) + ',' + Y(p.v); }).join(' ') + '"/>');
      x.s.forEach(function (p) {
        var tip = '<title>' + h(x.c.label + '\nRadius ' + E.f3(p.r) + ' m · Height ' + E.hLabel(height) + '\n' + (kind === 'front' ? 'Front ' : 'Side ') + E.f3(p.v) + ' ton' + (p.star ? ' *' : '')) + '</title>';
        o.push(base ? '<path class="pt star" d="' + starPath(X(p.r), Y(p.v), 8) + '" fill="' + col + '" stroke="#fff" stroke-width="1">' + tip + '</path>' : '<circle class="pt" cx="' + X(p.r) + '" cy="' + Y(p.v) + '" r="' + (p.star ? 5.5 : 4) + '" fill="' + (p.star ? '#fff' : col) + '" stroke="' + (p.star ? col : '#fff') + '" stroke-width="' + (p.star ? 2.5 : 1) + '">' + tip + '</circle>');
        if (lab) o.push('<text class="lbl" x="' + X(p.r) + '" y="' + (Y(p.v) - 9) + '" text-anchor="middle">' + E.f3(p.v) + (p.star ? '*' : '') + '</text>');
      });
    });
    return '<svg class="big" viewBox="0 0 ' + W + ' ' + H + '" role="img">' + o.join('') + '</svg><div class="legend">' + sers.map(function (x) { return '<span><i class="sw" style="background:' + x.c.color + '"></i>' + (x.c.id === st.base ? '★ ' : '') + h(x.c.label) + '</span>'; }).join('') + '<span>○ 속 빈 점 = 원본에 별표(*)가 붙은 값</span></div>';
  }
  function starPath(cx, cy, r) { var d = ''; for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; d += (i ? 'L' : 'M') + (cx + Math.cos(a) * rr).toFixed(1) + ' ' + (cy + Math.sin(a) * rr).toFixed(1); } return d + 'Z'; }
  /** 3D: Radius(x) × Height(z, 깊이) × Capacity(y, 위) 를 돌려서 평면에 비춘다 */
  function draw3d() {
    var C = current(), kind = $('#k3').value, mode = $('#m3').value, yaw = +$('#yaw').value * Math.PI / 180, pit = +$('#pitch').value * Math.PI / 180;
    var data = C.shown.map(function (c) { return { c: c, p: E.surface(c, kind) }; }).filter(function (x) { return x.p.length; });
    if (!data.length) { $('#c-3d').innerHTML = '<p class="sub nochart">표시할 값이 없습니다.</p>'; return; }
    var all = [].concat.apply([], data.map(function (x) { return x.p; })), mm = function (k) { var a = all.map(function (p) { return p[k]; }); return [Math.min.apply(null, a), Math.max.apply(null, a)]; };
    var rr = mm('r'), hh = mm('h'), vmax = mm('v')[1], vstep = nice(vmax / 5); vmax = Math.ceil(vmax / vstep) * vstep; if (hh[0] === hh[1]) hh[1] = hh[0] + 1; if (rr[0] === rr[1]) rr[1] = rr[0] + 1;
    var W = 1100, H = 600, S = 340, cx = W / 2 + 20, cy = H / 2 + 130;
    var P = function (r, hgt, v) {
      var x = (r - rr[0]) / (rr[1] - rr[0]) - 0.5, z = (hgt - hh[0]) / (hh[1] - hh[0]) - 0.5, y = v / vmax * 0.95;
      var x2 = x * Math.cos(yaw) - z * Math.sin(yaw), z2 = x * Math.sin(yaw) + z * Math.cos(yaw);
      return [cx + x2 * S * 1.5, cy - y * S + z2 * S * Math.sin(pit) * 0.9 - 0, z2];
    };
    var L = function (a, b, cls, extra) { return '<line class="' + cls + '" x1="' + a[0].toFixed(1) + '" y1="' + a[1].toFixed(1) + '" x2="' + b[0].toFixed(1) + '" y2="' + b[1].toFixed(1) + '"' + (extra || '') + '/>'; }, o = [];
    // 바닥 격자 · 축
    var hs = E.heights([].concat.apply([], C.shown.map(function (c) { return c.rows; })));
    hs.forEach(function (x) { o.push(L(P(rr[0], x, 0), P(rr[1], x, 0), 'grid')); var q = P(rr[1], x, 0); o.push('<text class="ax" x="' + (q[0] + 8) + '" y="' + (q[1] + 4) + '">' + E.f3(x) + '</text>'); });
    for (var r = Math.ceil(rr[0]); r <= rr[1] + 1e-9; r += (rr[1] - rr[0] > 8 ? 1 : 0.5)) { o.push(L(P(r, hh[0], 0), P(r, hh[1], 0), 'grid')); var q2 = P(r, hh[0], 0); o.push('<text class="ax" x="' + q2[0] + '" y="' + (q2[1] + 16) + '" text-anchor="middle">' + E.f3(r) + '</text>'); }
    // 세로축은 화면에서 가장 왼쪽에 오는 바닥 모서리에 세운다(돌려도 곡선과 겹치지 않게)
    var corner = [[rr[0], hh[0]], [rr[0], hh[1]], [rr[1], hh[0]], [rr[1], hh[1]]].sort(function (m, n) { return P(m[0], m[1], 0)[0] - P(n[0], n[1], 0)[0]; })[0];
    for (var v = 0; v <= vmax + vstep / 2; v += vstep) { var a0 = P(corner[0], corner[1], v); o.push('<line class="frame" x1="' + (a0[0] - 5) + '" x2="' + a0[0] + '" y1="' + a0[1] + '" y2="' + a0[1] + '"/><text class="ax" x="' + (a0[0] - 9) + '" y="' + (a0[1] + 4) + '" text-anchor="end">' + E.f3(v) + '</text>'); }
    o.push(L(P(corner[0], corner[1], 0), P(corner[0], corner[1], vmax), 'frame'));
    var ar = P((rr[0] + rr[1]) / 2, hh[0], 0), ah = P(rr[1], (hh[0] + hh[1]) / 2, 0), av = P(corner[0], corner[1], vmax);
    o.push('<text class="axt" x="' + ar[0] + '" y="' + (ar[1] + 36) + '" text-anchor="middle">Radius (m)</text><text class="axt" x="' + (ah[0] + 44) + '" y="' + (ah[1] + 4) + '">Height (m)</text><text class="axt" x="' + av[0] + '" y="' + (av[1] - 12) + '" text-anchor="middle">' + (kind === 'front' ? 'Front' : 'Side') + ' (ton)</text>');
    data.forEach(function (x) {
      var col = x.c.color, base = x.c.id === st.base, byH = {}, byR = {};
      x.p.forEach(function (p) { (byH[p.h] = byH[p.h] || []).push(p); (byR[p.r] = byR[p.r] || []).push(p); });
      if (mode === 'surface') {
        Object.keys(byH).forEach(function (k) { var a = byH[k].sort(function (m, n) { return m.r - n.r; }); o.push('<polyline class="c3" fill="none" stroke="' + col + '" stroke-width="' + (base ? 2.6 : 1.7) + '" points="' + a.map(function (p) { var q = P(p.r, p.h, p.v); return q[0].toFixed(1) + ',' + q[1].toFixed(1); }).join(' ') + '"/>'); });
        Object.keys(byR).forEach(function (k) { var a = byR[k].sort(function (m, n) { return m.h - n.h; }); if (a.length > 1) o.push('<polyline fill="none" stroke="' + col + '" stroke-width="1" opacity=".45" points="' + a.map(function (p) { var q = P(p.r, p.h, p.v); return q[0].toFixed(1) + ',' + q[1].toFixed(1); }).join(' ') + '"/>'); });
      }
      x.p.forEach(function (p) { var q = P(p.r, p.h, p.v); o.push('<circle class="p3" cx="' + q[0].toFixed(1) + '" cy="' + q[1].toFixed(1) + '" r="' + (mode === 'scatter' ? 4.5 : 2.6) + '" fill="' + col + '"><title>' + h(x.c.label + '\nRadius ' + E.f3(p.r) + ' m · Height ' + E.hLabel(p.h) + '\n' + E.f3(p.v) + ' ton') + '</title></circle>'); });
    });
    $('#c-3d').innerHTML = '<svg class="big" id="svg3d" viewBox="0 0 ' + W + ' ' + H + '" role="img">' + o.join('') + '</svg><div class="legend">' + data.map(function (x) { return '<span><i class="sw" style="background:' + x.c.color + '"></i>' + (x.c.id === st.base ? '★ ' : '') + h(x.c.label) + '</span>'; }).join('') + '</div>';
  }

  /* ---------- 이벤트 ---------- */
  document.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('[data-f]') : null;
    if (t) { var k = t.dataset.f, v = t.dataset.v, s = st.sel[k] || []; if (v === '__all') s = []; else if (s.indexOf(v) >= 0) s = s.filter(function (x) { return x !== v; }); else s = s.concat([v]); st.sel[k] = s; render(); }
  });
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.id === 'file') { addFiles(t.files); t.value = ''; return; }
    if (t.dataset.show != null) { st.hide[t.dataset.show] = !t.checked; render(); }
    else if (t.dataset.base != null) { st.base = t.dataset.base; st.hide[st.base] = false; render(); }
    else if (t.dataset.color != null) { st.color[t.dataset.color] = t.value; render(); }
    else if (t.id === 'height') { st.height = parseFloat(t.value); render(); }
    else if (t.id === 'label' || t.id === 'radii') render();
    else if (t.id === 'k3' || t.id === 'm3') draw3d();
  });
  document.addEventListener('input', function (e) { if (e.target.id === 'yaw' || e.target.id === 'pitch') draw3d(); });
  var drag = null;
  document.addEventListener('pointerdown', function (e) { if (e.target.closest && e.target.closest('#svg3d')) drag = { x: e.clientX, y: e.clientY, yaw: +$('#yaw').value, pit: +$('#pitch').value }; });
  document.addEventListener('pointermove', function (e) { if (!drag) return; $('#yaw').value = Math.max(-180, Math.min(180, drag.yaw + (e.clientX - drag.x) * 0.4)); $('#pitch').value = Math.max(5, Math.min(85, drag.pit + (e.clientY - drag.y) * 0.3)); draw3d(); });
  document.addEventListener('pointerup', function () { drag = null; });
  var drop = $('#drop');
  ['dragover', 'dragenter'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('over'); }); });
  ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('over'); }); });
  drop.addEventListener('drop', function (e) { if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files); });
  $('#btn-sample').addEventListener('click', function () { st.rows = []; st.files = []; st.color = {}; addAoa(E.sample(), '인양력_예제(가상).csv'); st.sel = { blade: ['BLADE UP'], cabin: ['CABIN'] }; render(); $('#s-cond').scrollIntoView(); });
  $('#btn-template').addEventListener('click', function () { download('lifting_template.csv', E.toCsv([E.HEADERS])); });
  $('#btn-sample-csv').addEventListener('click', function () { download('인양력_예제(가상).csv', E.toCsv(E.sample())); });
  $('#btn-clear').addEventListener('click', function () { st.rows = []; st.files = []; st.sel = {}; st.hide = {}; st.color = {}; st.base = null; render(); });
  $('#btn-print').addEventListener('click', function () { window.print(); });
  $('#btn-csv').addEventListener('click', function () { download('인양력_거른데이터_' + today() + '.csv', E.toCsv(E.rowsToAoa(current().rows))); });
  $('#btn-xlsx').addEventListener('click', function () { var C = current(), sh = E.exportSheets(C.shown, st.base, st.height, C.rows), wb = XLSX.utils.book_new(); Object.keys(sh).forEach(function (n) { XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sh[n]), n); }); XLSX.writeFile(wb, '인양력_비교_' + today() + '.xlsx'); });
  // AI 자동정리
  $('#prompt').textContent = window.LIFT_PROMPT || '';
  $('#btn-prompt').addEventListener('click', function () { var b = this, done = function (ok) { b.textContent = ok ? '복사했습니다' : '복사하지 못했습니다 — 아래 「지침 전문 보기」에서 직접 복사하세요'; setTimeout(function () { b.textContent = '이미지 분석 지침 복사'; }, 2500); }; if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(window.LIFT_PROMPT).then(function () { done(true); }, function () { done(false); }); else done(false); });
  $('#btn-json-sample').addEventListener('click', function () { $('#json').value = JSON.stringify(E.SAMPLE_JSON, null, 1); });
  $('#btn-convert').addEventListener('click', function () {
    var raw = $('#json').value.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, ''), ex; st.conv = null;
    try { ex = JSON.parse(raw); } catch (err) { $('#conv-status').innerHTML = '<div class="warn" id="conv-err">JSON 으로 읽지 못했습니다 — ' + h(err.message) + '</div>'; show('#conv-table', false); show('#btn-conv-csv', false); show('#btn-conv-use', false); return; }
    var N = E.normalize(ex); st.conv = N.rows.length ? N : null;
    $('#conv-status').innerHTML = (N.rows.length ? '<div class="ok" id="conv-ok">표준 행 ' + N.rows.length + '개로 바꿨습니다. 아래 표를 원본 이미지와 대조하세요.</div>' : '') + (N.issues.length ? '<div class="warn" id="conv-issues"><b>확인할 것 ' + N.issues.length + '건</b><ul>' + N.issues.slice(0, 20).map(function (i) { return '<li>' + h(i) + '</li>'; }).join('') + '</ul></div>' : '');
    show('#conv-table', N.rows.length > 0); show('#btn-conv-csv', N.rows.length > 0); show('#btn-conv-use', N.rows.length > 0);
    if (N.rows.length) $('#conv-table').innerHTML = '<table><tr>' + E.HEADERS.map(function (x) { return '<th>' + h(x) + '</th>'; }).join('') + '</tr>' + N.rows.map(function (r) { return '<tr>' + E.HEADERS.map(function (x) { var s = /STAR_FRONT=1/.test(r.notes) && /^Front/.test(x) || /STAR_SIDE=1/.test(r.notes) && /^Side/.test(x); return '<td>' + (s ? '<b class="star">' + h(r[x]) + '*</b>' : h(r[x])) + '</td>'; }).join('') + '</tr>'; }).join('') + '</table>';
  });
  $('#btn-conv-csv').addEventListener('click', function () { if (st.conv) download('인양력_AI정리_' + today() + '.csv', E.toCsv(E.toAoa(st.conv.rows))); });
  $('#btn-conv-use').addEventListener('click', function () { if (st.conv) { addAoa(E.toAoa(st.conv.rows), 'AI 자동정리 결과'); $('#s-cond').scrollIntoView(); } });
  window.__app = { st: st, current: current };
  render();
})();
