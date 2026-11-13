/* build-2611-18 · 굴착기 인양력 비교 엔진 — 읽기 · 표준화 · 거르기 · 곡선 · 보간 · 비교 · 내보내기. 화면(app.js)은 그리기만 한다.
 * 표준 CSV 19열과 AI 추출 JSON → 표준 행 변환 규칙은 기획자(조민규)의 V6 프로그램 core.py 를 따른다.
 * 값을 지어내지 않는다: 빈 칸은 빈 칸, 범위 밖 반경은 값 없음, 사이 반경은 직선 보간이고 「추정」으로 표시한다. */
(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(); else root.Lift = factory(); })(this, function () {
  'use strict';
  var HEADERS = ['Manufacturer', 'Model', 'Machine Type', 'Boom Length (m)', 'Boom opt', 'Arm Length (m)', 'Arm opt', 'Cabin Type', 'Shoe Type', 'Counterweight (kg)', 'weight class', 'CW opt', 'Blade up/down', 'Radius (m)', 'Height (m)', 'Front Lifting Capacity (ton)', 'Side Lifting Capacity (ton)', 'Operating Weight', 'notes'];
  var KEY = { 'Manufacturer': 'mfr', 'Model': 'model', 'Machine Type': 'type', 'Boom Length (m)': 'boom', 'Boom opt': 'boomOpt', 'Arm Length (m)': 'arm', 'Arm opt': 'armOpt', 'Cabin Type': 'cabin', 'Shoe Type': 'shoe', 'Counterweight (kg)': 'cw', 'weight class': 'cls', 'CW opt': 'cwOpt', 'Blade up/down': 'blade', 'Radius (m)': 'radius', 'Height (m)': 'height', 'Front Lifting Capacity (ton)': 'front', 'Side Lifting Capacity (ton)': 'side', 'Operating Weight': 'weight', 'notes': 'notes' };
  // 화면에서 거르는 항목(순서대로) · 곡선을 가르는 항목
  var FILTERS = [['mfr', '제조사'], ['model', '모델'], ['blade', '블레이드'], ['boomOpt', '붐 옵션'], ['arm', '암 길이'], ['armOpt', '암 옵션'], ['cabin', '캐빈'], ['shoe', '슈'], ['cwOpt', 'CW 옵션'], ['cls', '중량급']];
  var CURVE_KEYS = ['mfr', 'model', 'boom', 'boomOpt', 'arm', 'armOpt', 'cabin', 'shoe', 'cwOpt', 'blade'];
  var OPT_LABEL = { boom: '붐 ', boomOpt: '붐 ', arm: '암 ', armOpt: '암 ', cabin: '', shoe: '', cwOpt: 'CW ', blade: '' };

  function txt(v) { return String(v == null ? '' : v).replace(/\s+/g, ' ').trim(); }
  function nkey(v) { return txt(v).toLowerCase().replace(/[^a-z0-9가-힣]/g, ''); }
  /** 숫자 읽기. '1,234' · '*2.75' · '2.75*' · '1.30M' 허용. 못 읽으면 null. { v, star } */
  function num(v) {
    if (typeof v === 'number') return isFinite(v) ? { v: v, star: false } : null;
    var s = txt(v); if (!s || /^[-—–]$/.test(s)) return null;
    var star = s.indexOf('*') >= 0; s = s.replace(/\*/g, '').replace(/,/g, '').replace(/\s*(m|ton|t|kg)$/i, '').trim();
    if (!/^[-+]?(\d+\.?\d*|\.\d+)$/.test(s)) return null;
    return { v: parseFloat(s), star: star };
  }
  function lenText(v) { var n = num(v); return n ? String(Math.round(n.v * 1000) / 1000) + 'm' : txt(v).toUpperCase(); }

  /** CSV 글자 → 2차원 배열(BOM · 따옴표 · 따옴표 안 줄바꿈 · CRLF) */
  function parseCsv(text) {
    text = String(text || '').replace(/^﻿/, '');
    var out = [], row = [], cur = '', q = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
      else if (c === '"') q = true;
      else if (c === ',') { row.push(cur); cur = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); cur = ''; out.push(row); row = []; }
      else cur += c;
    }
    if (cur !== '' || row.length) { row.push(cur); out.push(row); }
    return out.filter(function (r) { return r.some(function (x) { return txt(x) !== ''; }); });
  }
  /** 2차원 배열 → 표준 행. 머리글은 이름으로 찾는다(순서 · 대소문자 · 공백 무관). { rows, issues, missing, total, skipped } */
  function readRows(aoa, src) {
    var res = { rows: [], issues: [], missing: [], total: 0, skipped: 0, src: src || '' };
    if (!aoa || !aoa.length) { res.issues.push('빈 파일입니다.'); return res; }
    var hi = -1, map = {};
    for (var i = 0; i < Math.min(aoa.length, 15) && hi < 0; i++) {
      var m = {}; aoa[i].forEach(function (c, j) { HEADERS.forEach(function (h) { if (nkey(c) === nkey(h) && m[h] == null) m[h] = j; }); });
      if (m['Model'] != null && m['Radius (m)'] != null && m['Height (m)'] != null) { hi = i; map = m; }
    }
    if (hi < 0) { res.issues.push('표준 머리글을 찾지 못했습니다 — Model · Radius (m) · Height (m) 열이 있어야 합니다.'); return res; }
    res.missing = HEADERS.filter(function (h) { return map[h] == null; });
    if (map['Front Lifting Capacity (ton)'] == null && map['Side Lifting Capacity (ton)'] == null) { res.issues.push('Front · Side Lifting Capacity (ton) 열이 둘 다 없습니다.'); return res; }
    for (var r = hi + 1; r < aoa.length; r++) {
      var a = aoa[r], g = function (h) { return map[h] == null ? '' : a[map[h]]; };
      if (!a.some(function (x) { return txt(x) !== ''; })) continue;
      res.total++;
      var notes = txt(g('notes')), R = num(g('Radius (m)')), H = num(g('Height (m)')), F = num(g('Front Lifting Capacity (ton)')), S = num(g('Side Lifting Capacity (ton)')), where = (src ? src + ' ' : '') + (r + 1) + '행';
      if (!txt(g('Model'))) { res.skipped++; res.issues.push(where + ' — Model 이 비어 건너뜀'); continue; }
      if (!R || !H) { res.skipped++; res.issues.push(where + ' — Radius · Height 가 숫자가 아니라 건너뜀(' + txt(g('Radius (m)')) + ' / ' + txt(g('Height (m)')) + ')'); continue; }
      if (!F && !S) { res.skipped++; res.issues.push(where + ' — Front · Side 가 모두 비어 건너뜀'); continue; }
      var ow = num(g('Operating Weight'));
      res.rows.push({ mfr: txt(g('Manufacturer')).toUpperCase(), model: txt(g('Model')).toUpperCase(), type: txt(g('Machine Type')).toUpperCase(), boom: lenText(g('Boom Length (m)')), boomOpt: txt(g('Boom opt')).toUpperCase(),
        arm: lenText(g('Arm Length (m)')), armOpt: txt(g('Arm opt')).toUpperCase(), cabin: txt(g('Cabin Type')).toUpperCase(), shoe: txt(g('Shoe Type')).toUpperCase(), cw: txt(g('Counterweight (kg)')), cls: txt(g('weight class')).toUpperCase(),
        cwOpt: txt(g('CW opt')).toUpperCase(), blade: txt(g('Blade up/down')).toUpperCase(), radius: R.v, height: H.v, front: F ? F.v : null, side: S ? S.v : null,
        starF: !!(F && (F.star || /STAR_FRONT=1/.test(notes))), starS: !!(S && (S.star || /STAR_SIDE=1/.test(notes))), weight: ow ? ow.v : null, notes: notes, src: where });
    }
    if (res.issues.length > 30) { var n = res.issues.length; res.issues = res.issues.slice(0, 30); res.issues.push('… 외 ' + (n - 30) + '건'); }
    return res;
  }

  /* ---------- 거르기 ---------- */
  function uniq(a) { var s = {}, o = []; a.forEach(function (v) { if (!s[v]) { s[v] = 1; o.push(v); } }); return o; }
  function applyFilters(rows, sel) { sel = sel || {}; return rows.filter(function (r) { return FILTERS.every(function (f) { var s = sel[f[0]]; return !s || !s.length || s.indexOf(r[f[0]]) >= 0; }); }); }
  /** 항목마다 고를 수 있는 값 — 다른 항목의 선택을 적용한 뒤 남는 값(자기 항목은 빼고 본다) */
  function options(rows, sel) {
    return FILTERS.map(function (f) {
      var s2 = {}; Object.keys(sel || {}).forEach(function (k) { if (k !== f[0]) s2[k] = sel[k]; });
      return { key: f[0], label: f[1], values: uniq(applyFilters(rows, s2).map(function (r) { return r[f[0]]; })).sort() };
    });
  }
  /* ---------- 곡선 ---------- */
  /** 같은 사양(제조사 · 모델 · 붐 · 암 · 캐빈 · 슈 · CW · 블레이드)끼리 한 곡선. 이름에는 곡선들 사이에서 서로 다른 항목만 붙인다. */
  function curves(rows) {
    var by = {}, order = [];
    rows.forEach(function (r) { var id = CURVE_KEYS.map(function (k) { return r[k]; }).join('|'); if (!by[id]) { by[id] = { id: id, spec: r, rows: [] }; order.push(id); } by[id].rows.push(r); });
    var list = order.map(function (id) { return by[id]; });
    // 이름에 붙일 항목은 모델마다 따로 정한다 — 그 모델의 곡선들 사이에서 값이 달라지는 항목만
    var groups = {}; list.forEach(function (c) { var m = c.spec.mfr + '|' + c.spec.model; (groups[m] = groups[m] || []).push(c); });
    var models = {}; list.forEach(function (c) { (models[c.spec.model] = models[c.spec.model] || {})[c.spec.mfr] = 1; });
    list.forEach(function (c) {
      var g = groups[c.spec.mfr + '|' + c.spec.model], vary = CURVE_KEYS.slice(2).filter(function (k) { return g.some(function (x) { return x.spec[k] !== g[0].spec[k]; }); });
      var extra = vary.filter(function (k) { return c.spec[k]; }).map(function (k) { return OPT_LABEL[k] + c.spec[k]; });
      c.label = (Object.keys(models[c.spec.model]).length > 1 || !c.spec.mfr ? c.spec.mfr + ' ' : '') + c.spec.model + (extra.length ? ' (' + uniq(extra).join(' · ') + ')' : '');
      c.title = (c.spec.mfr ? c.spec.mfr + ' ' : '') + c.spec.model;
    });
    return list;
  }
  function heights(rows) { return uniq(rows.map(function (r) { return r.height; })).sort(function (a, b) { return a - b; }); }
  /** 기본 높이 — 0m 가 있으면 0, 없으면 0 에 가장 가까운 값 */
  function defaultHeight(hs) { if (!hs.length) return null; return hs.slice().sort(function (a, b) { return Math.abs(a) - Math.abs(b) || a - b; })[0]; }
  /** 한 곡선 · 한 높이의 반경 → 인양력. 같은 반경이 겹치면 먼저 나온 것. kind: 'front' | 'side' */
  function series(curve, height, kind) {
    var seen = {}, out = [];
    curve.rows.forEach(function (r) { if (r.height !== height || r[kind] == null || seen[r.radius]) return; seen[r.radius] = 1; out.push({ r: r.radius, v: r[kind], star: kind === 'front' ? r.starF : r.starS }); });
    return out.sort(function (a, b) { return a.r - b.r; });
  }
  /** 지정 반경의 값. 딱 맞으면 그 값, 사이면 직선 보간(est), 범위 밖이면 null — 바깥으로 늘려 추정하지 않는다. */
  function lookup(ser, radius) {
    for (var i = 0; i < ser.length; i++) if (Math.abs(ser[i].r - radius) < 1e-9) return { v: ser[i].v, est: false, star: ser[i].star };
    for (var j = 1; j < ser.length; j++) if (ser[j - 1].r < radius && radius < ser[j].r) { var a = ser[j - 1], b = ser[j]; return { v: a.v + (b.v - a.v) * (radius - a.r) / (b.r - a.r), est: true, star: false }; }
    return null;
  }
  function radii(cs, height, kind) { var all = []; cs.forEach(function (c) { series(c, height, kind).forEach(function (p) { all.push(p.r); }); }); return uniq(all).sort(function (a, b) { return a - b; }); }
  /** 기준 곡선 대비 비교표. diff = (값 − 기준) / 기준 × 100. 기준이 없거나 0 이면 diff 없음. */
  function compare(cs, baseId, height, rs, kind) {
    var base = null; cs.forEach(function (c) { if (c.id === baseId) base = c; });
    var bs = base ? series(base, height, kind) : [];
    return cs.map(function (c) {
      var s = series(c, height, kind);
      return { id: c.id, label: c.label, base: c.id === baseId, cells: rs.map(function (r) {
        var x = lookup(s, r), b = lookup(bs, r);
        return { r: r, v: x ? x.v : null, est: !!(x && x.est), star: !!(x && x.star), diff: x && b && b.v ? (x.v - b.v) / b.v * 100 : null, baseEst: !!(b && b.est) };
      }) };
    });
  }
  /** 3D 용 — 한 곡선의 (반경, 높이, 값) 점 전부 */
  function surface(curve, kind) { var o = []; heights(curve.rows).forEach(function (h) { series(curve, h, kind).forEach(function (p) { o.push({ r: p.r, h: h, v: p.v }); }); }); return o; }

  /* ---------- 숫자 표시 ---------- */
  function f3(v) { return v == null ? '' : (Math.round(v * 1000) / 1000).toFixed(3).replace(/0+$/, '').replace(/\.$/, ''); }
  function pct(v) { return v == null ? '' : (v > 0 ? '+' : '') + (Math.round(v * 10) / 10).toFixed(1) + '%'; }
  function hLabel(h) { return (h === 0 ? '0 (지면)' : (h > 0 ? '+' : '') + f3(h)) + ' m'; }

  /* ---------- AI 추출 JSON → 표준 행(V6 core.py normalize 와 같은 규칙) ---------- */
  var CASES = { '1': 1, '2': 1, '3': 1, '4': 1, '5': 1, '6': 1 };
  function unitNum(value, unit, pos) {
    if (value == null || /^(|-|—|–)$/.test(txt(value))) return '';
    if (typeof value === 'string' && txt(value).toUpperCase() === 'MAX') { if (pos) return 'MAX'; throw new Error('Capacity cannot be MAX'); }
    var s = txt(value).replace(/,/g, '').replace(/\*/g, '').trim();
    if (!/^[-+]?(\d+\.?\d*|\.\d+)$/.test(s)) throw new Error('숫자가 아닙니다: ' + JSON.stringify(value));
    var u = txt(unit).toLowerCase(), div = pos ? { m: 1, mm: 1000, cm: 100, ft: 3.280839895013123 } : { ton: 1, t: 1, kg: 1000, kn: 9.80665, lb: 2204.62262185, lbs: 2204.62262185 };
    if (!div[u]) throw new Error('단위가 없거나 지원하지 않습니다: ' + JSON.stringify(unit));
    return String(Math.round(parseFloat(s) / div[u] * 1e6) / 1e6);
  }
  function cleanOpt(v, g) {
    var s = txt(v).toUpperCase();
    if (g === 'cw') { if (['NO EXTRA COUNTERWEIGHT', 'STANDARD COUNTERWEIGHT', 'STD', 'STANDARD', 'MINIMUM WEIGHT'].indexOf(s) >= 0) return 'STD'; if (['EXTRA COUNTERWEIGHT', 'ADD', 'ADDITIONAL', 'MAXIMUM WEIGHT'].indexOf(s) >= 0) return 'ADD'; return s; }
    if (g === 'blade') { if (s === 'BLADE DOWN' || s === 'DOWN') return 'BLADE DOWN'; if (s === 'BLADE UP' || s === 'UP') return 'BLADE UP'; return ''; }
    if (g === 'cabin') { if (s === 'CAB' || s === 'CABIN') return 'CABIN'; }
    if (g === 'shoe') { if (/^RUBBER( TRACKS?| SHOE)?$/.test(s)) return 'RUBBER'; if (/^STEEL( TRACKS?| SHOE)?$/.test(s)) return 'STEEL'; }
    return s;
  }
  /** { case, defaults, notes, cells[] } → { rows:[19열 객체], issues } */
  function normalize(ex) {
    var out = [], issues = [];
    if (!ex || typeof ex !== 'object' || !Array.isArray(ex.cells)) return { rows: [], issues: ['cells 배열이 없습니다 — AI 가 준 JSON 전체를 붙여 넣었는지 확인하세요.'] };
    var cs = txt(ex.case); if (!CASES[cs]) return { rows: [], issues: ['case 값이 1~6 이 아닙니다: ' + JSON.stringify(ex.case)] };
    var D = ex.defaults || {};
    ex.cells.forEach(function (cell, idx) {
      try {
        var radius = unitNum(cell.radius, cell.radius_unit || 'm', true), height = unitNum(cell.height, cell.height_unit || 'm', true);
        if (radius === '' || height === '') throw new Error('radius · height 가 없습니다');
        var base = {}; HEADERS.forEach(function (h) { base[h] = ''; });
        ['Manufacturer', 'Model', 'Machine Type', 'Boom Length (m)', 'Boom opt', 'Arm Length (m)', 'Arm opt', 'Counterweight (kg)', 'weight class', 'Operating Weight'].forEach(function (n) { base[n] = txt(cell[n] || D[n] || ''); });
        base['Cabin Type'] = cleanOpt(cell.cabin || D.cabin, 'cabin'); base['Shoe Type'] = cleanOpt(cell.shoe || D.shoe, 'shoe'); base['CW opt'] = cleanOpt(cell.cw || D.cw, 'cw');
        base['Arm opt'] = txt(cell.arm_opt || base['Arm opt']).toUpperCase();
        if (cell.arm_length != null && cell.arm_length !== '') base['Arm Length (m)'] = unitNum(cell.arm_length, cell.arm_length_unit || 'm', true);
        base['Radius (m)'] = radius; base['Height (m)'] = height;
        var note = ['Case ' + cs, txt(cell.notes), txt(ex.notes)].filter(Boolean).join('; ');
        if (txt(cell.radius_type).toLowerCase() === 'max_reach') note += '; RADIUS_TYPE=MAX_REACH';
        if (radius === 'MAX') note += '; MAX actual distance unspecified';
        base.notes = note;
        var star = function (k) { return (typeof cell[k] === 'string' && cell[k].indexOf('*') >= 0) || cell[k + '_starred'] === true; };
        var cu = cell.capacity_unit; if (['ton', 'kg', 'kn', 'lb', 'lbs'].indexOf(cu) < 0) throw new Error('capacity_unit 은 ton · kg · kn · lb · lbs 중 하나로 적혀 있어야 합니다');
        var cap = function (k) { return unitNum(cell[k], cu, false); }, down = cap('front_down'), up = cap('front_up'), front = cap('front'), side = cap('side');
        var scope = cell.side_scope || 'unspecified'; if (['both', 'up', 'down', 'unspecified'].indexOf(scope) < 0) throw new Error('side_scope 값이 잘못됐습니다');
        if (front !== '' && (up !== '' || down !== '')) throw new Error('front 와 front_up/down 이 함께 있습니다');
        var copy = function () { var b = {}; HEADERS.forEach(function (h) { b[h] = base[h]; }); return b; };
        if (front !== '' || (down === '' && up === '')) {
          if (front === '' && side === '') return;
          var b = copy(); b['Blade up/down'] = cleanOpt(cell.blade, 'blade'); b['Front Lifting Capacity (ton)'] = front; b['Side Lifting Capacity (ton)'] = side;
          b.notes += (star('front') && front ? '; STAR_FRONT=1' : '') + (star('side') && side ? '; STAR_SIDE=1' : '');
          if ((scope === 'up' || scope === 'down') && !b['Blade up/down']) b['Blade up/down'] = scope === 'up' ? 'BLADE UP' : 'BLADE DOWN';
          out.push(b);
        } else [['BLADE DOWN', down, 'down', 'front_down'], ['BLADE UP', up, 'up', 'front_up']].forEach(function (x) {
          var sideOk = scope === 'both' || scope === x[2];
          if (x[1] === '' && (side === '' || !sideOk)) return;
          var b2 = copy(); b2['Blade up/down'] = x[0]; b2['Front Lifting Capacity (ton)'] = x[1]; b2['Side Lifting Capacity (ton)'] = sideOk ? side : '';
          b2.notes += (x[1] && star(x[3]) ? '; STAR_FRONT=1' : '') + (b2['Side Lifting Capacity (ton)'] && star('side') ? '; STAR_SIDE=1' : '');
          out.push(b2);
        });
      } catch (e) { issues.push('cells #' + (idx + 1) + ': ' + e.message); }
    });
    if (!out.length) issues.push('변환된 행이 없습니다.');
    else if (out.some(function (r) { return !r.Model; })) issues.push('Model 이 빈 행이 있습니다 — 비교에 넣으려면 JSON 의 defaults 에 "Model"(과 "Manufacturer")을 적어 주세요.');
    var seen = {}, un = [], kc = ['Model', 'Cabin Type', 'Shoe Type', 'CW opt', 'Arm Length (m)', 'Arm opt', 'Blade up/down', 'Radius (m)', 'Height (m)', 'Front Lifting Capacity (ton)', 'Side Lifting Capacity (ton)'];
    out.forEach(function (r) { var k = kc.map(function (c) { return r[c]; }).join('|'); if (seen[k]) issues.push('완전히 같은 행을 하나 지움: ' + k); else { seen[k] = 1; un.push(r); } });
    return { rows: un, issues: issues };
  }
  function toAoa(objs) { return [HEADERS].concat(objs.map(function (o) { return HEADERS.map(function (h) { return o[h] == null ? '' : o[h]; }); })); }
  function toCsv(aoa) { return '﻿' + aoa.map(function (r) { return r.map(function (c) { var s = String(c == null ? '' : c); return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(','); }).join('\r\n') + '\r\n'; }
  /** 읽어 둔 행 → 표준 19열(거른 결과 내려받기) */
  function rowsToAoa(rows) {
    return [HEADERS].concat(rows.map(function (r) { return [r.mfr, r.model, r.type, r.boom, r.boomOpt, r.arm, r.armOpt, r.cabin, r.shoe, r.cw, r.cls, r.cwOpt, r.blade, r.radius, r.height, r.front == null ? '' : r.front, r.side == null ? '' : r.side, r.weight == null ? '' : r.weight,
      [r.notes.replace(/;?\s*STAR_(FRONT|SIDE)=1/g, '').trim(), r.starF ? 'STAR_FRONT=1' : '', r.starS ? 'STAR_SIDE=1' : ''].filter(Boolean).join('; ')]; }));
  }
  /** 엑셀 시트: Front Data · Side Data(가로 반경 × 세로 곡선) · Front 비교 · Side 비교 · 원본 행 */
  function exportSheets(cs, baseId, height, rows) {
    var out = {};
    [['front', 'Front'], ['side', 'Side']].forEach(function (k) {
      var rs = radii(cs, height, k[0]), cmp = compare(cs, baseId, height, rs, k[0]);
      out[k[1] + ' Data'] = [['Height ' + hLabel(height) + ' · ' + k[1] + ' Lifting Capacity (ton)'], ['Model \\ Radius (m)'].concat(rs)].concat(cmp.map(function (c) { return [c.label + (c.base ? ' ★기준' : '')].concat(c.cells.map(function (x) { return x.est ? '' : x.v == null ? '' : x.v; })); }));
      out[k[1] + ' 비교'] = [['기준 대비 차이(%) · Height ' + hLabel(height) + ' · (추정) = 직선 보간'], ['Model \\ Radius (m)'].concat(rs)].concat(cmp.map(function (c) { return [c.label + (c.base ? ' ★기준' : '')].concat(c.cells.map(function (x) { return x.v == null ? '' : f3(x.v) + (x.star ? '*' : '') + (x.est ? ' (추정)' : '') + (c.base || x.diff == null ? '' : ' / ' + pct(x.diff)); })); }));
    });
    out['Rows'] = rowsToAoa(rows || []);
    return out;
  }

  /* ---------- 예제(가상 모델 — 실제 장비 값이 아니다) ---------- */
  function sample() {
    var M = [['ALPHA', 'AX35', 3550, 2.70, 0.74], ['BETA', 'BZ35-7', 3640, 2.52, 0.76], ['GAMMA', 'GM36', 3720, 2.86, 0.72], ['DELTA', 'DT35R', 3480, 2.44, 0.78]], aoa = [HEADERS];
    M.forEach(function (m, mi) {
      [['CABIN', 0], ['CANOPY', -0.06]].forEach(function (cab) {
        if (mi === 3 && cab[0] === 'CANOPY') return;
        [['BLADE DOWN', 0.12], ['BLADE UP', 0]].forEach(function (bl) {
          for (var h = -1; h <= 3; h++) for (var r = 1; r <= 5.01; r += 0.5) {
            if (r > 4.6 - Math.abs(h - 0.5) * 0.35 + (mi === 2 ? 0.5 : 0)) continue;   // 높이마다 닿는 반경이 다르다
            if (mi === 1 && r === 2.5) continue;                                       // 한 모델은 2.5m 값이 없다(보간 확인용)
            var f = (m[3] + cab[1] + bl[1]) * Math.pow(1.6 / (r + 0.6), 1.08) * (1 - 0.05 * Math.abs(h - 0.4)), s = f * m[4];
            aoa.push([m[0], m[1], 'CRAWLER', '2.4m', 'STD', '1.30M', 'STD', cab[0], 'RUBBER', '', '3.5T', 'STD', bl[0], r, h, Math.round(f * 1000) / 1000, Math.round(s * 1000) / 1000, m[2] + (cab[0] === 'CABIN' ? 90 : 0), mi === 2 && r <= 1.5 && h === 0 ? 'STAR_FRONT=1' : '']);
          }
        });
      });
    });
    return aoa;
  }
  var SAMPLE_JSON = { 'case': '3', defaults: { Manufacturer: 'EPSILON', Model: 'EP35', 'Machine Type': 'CRAWLER', cabin: 'CAB', shoe: 'RUBBER TRACK', cw: 'STANDARD' }, notes: '가상 예시 — 실제 카탈로그 값이 아님',
    cells: [{ radius: 2000, radius_unit: 'mm', height: 0, height_unit: 'm', capacity_unit: 'kg', front_down: '*1850', front_up: 1620, side: 1210, side_scope: 'both', arm_length: 1300, arm_length_unit: 'mm' },
      { radius: 3000, radius_unit: 'mm', height: 0, height_unit: 'm', capacity_unit: 'kg', front_down: 1240, front_up: 1090, side: 820, side_scope: 'both', arm_length: 1300, arm_length_unit: 'mm' },
      { radius: 4000, radius_unit: 'mm', height: 0, height_unit: 'm', capacity_unit: 'kg', front_down: 930, front_up: 810, side: 610, side_scope: 'both', arm_length: 1300, arm_length_unit: 'mm' },
      { radius: 3000, radius_unit: 'mm', height: 1, height_unit: 'm', capacity_unit: 'kg', front_down: 1180, front_up: 1040, side: 790, side_scope: 'both', arm_length: 1300, arm_length_unit: 'mm' }] };

  return { HEADERS: HEADERS, FILTERS: FILTERS, num: num, parseCsv: parseCsv, readRows: readRows, applyFilters: applyFilters, options: options, curves: curves, heights: heights, defaultHeight: defaultHeight, series: series, lookup: lookup, radii: radii,
    compare: compare, surface: surface, f3: f3, pct: pct, hLabel: hLabel, unitNum: unitNum, cleanOpt: cleanOpt, normalize: normalize, toAoa: toAoa, toCsv: toCsv, rowsToAoa: rowsToAoa, exportSheets: exportSheets, sample: sample, SAMPLE_JSON: SAMPLE_JSON };
});
