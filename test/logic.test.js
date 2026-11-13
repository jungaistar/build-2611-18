/* 계산 규칙 고정 — node test/logic.test.js. 손으로 셀 수 있는 작은 표와 대조한다. */
'use strict';
var L = require('../js/lift.js');
var passed = 0, failed = 0;
function ok(c, label, d) { if (c) passed++; else { failed++; console.log('  X ' + label + (d != null ? '\n      ' + d : '')); } }
function eq(g, w, label) { ok(JSON.stringify(g) === JSON.stringify(w), label, '기대: ' + JSON.stringify(w) + '  실제: ' + JSON.stringify(g)); }
function near(g, w, label) { ok(typeof g === 'number' && Math.abs(g - w) <= 1e-9 * Math.max(1, Math.abs(w)), label, '기대: ' + w + '  실제: ' + g); }

// ---------- 숫자 · CSV ----------
eq([L.num('1,234.5'), L.num('*2.75'), L.num('2.75*'), L.num('1.30M'), L.num(''), L.num('-'), L.num('MAX'), L.num(3)], [{ v: 1234.5, star: false }, { v: 2.75, star: true }, { v: 2.75, star: true }, { v: 1.3, star: false }, null, null, null, { v: 3, star: false }], '숫자 읽기 — 쉼표 · 별표 · 단위 글자, 빈 칸 · MAX 는 값 없음');
eq(L.parseCsv('﻿a,b\r\n"x,1","y ""q"""\n\n"줄\n바꿈",z'), [['a', 'b'], ['x,1', 'y "q"'], ['줄\n바꿈', 'z']], 'CSV — BOM · 따옴표 · 빈 줄 · 따옴표 안 줄바꿈');
eq(L.parseCsv(L.toCsv([['a', 'b'], ['x,1', 'q"r']])), [['a', 'b'], ['x,1', 'q"r']], 'CSV 쓰고 다시 읽기');

// ---------- 표준 행 읽기 ----------
var H = L.HEADERS;
function row(o) { return H.map(function (h) { return o[h] == null ? '' : o[h]; }); }
function R(model, blade, r, h, f, s, extra) { var o = { Manufacturer: 'm', Model: model, 'Cabin Type': 'cabin', 'Blade up/down': blade, 'Radius (m)': r, 'Height (m)': h, 'Front Lifting Capacity (ton)': f, 'Side Lifting Capacity (ton)': s }; Object.keys(extra || {}).forEach(function (k) { o[k] = extra[k]; }); return row(o); }
var aoa = [H, R('a1', 'blade up', 1, 0, 2.0, 1.5), R('a1', 'blade up', 2, 0, 1.0, 0.8), R('a1', 'blade up', 4, 0, 0.5, ''), R('a1', 'blade up', 2, 1, 0.9, 0.7),
  R('b2', 'blade up', 1, 0, '*2.2', 1.4), R('b2', 'blade up', 3, 0, 0.9, 0.6, { notes: 'x; STAR_SIDE=1' }), R('b2', 'blade down', 1, 0, 2.6, 1.4),
  R('', 'blade up', 1, 0, 1, 1), R('c3', 'blade up', 'MAX', 0, 1, 1), R('c3', 'blade up', 1, 0, '', '')];
var rd = L.readRows(aoa, 't.csv');
eq([rd.total, rd.rows.length, rd.skipped, rd.issues.length, rd.missing], [10, 7, 3, 3, []], '읽기 — 10행 중 7행, Model 없음 · 반경이 숫자 아님 · 값 없음은 건너뛰고 알림');
ok(/9행/.test(rd.issues[0]) && /Model/.test(rd.issues[0]) && /MAX/.test(rd.issues[1]), '건너뛴 행의 위치와 이유', rd.issues.join(' / '));
eq([rd.rows[0].mfr, rd.rows[0].model, rd.rows[0].blade, rd.rows[0].cabin], ['M', 'A1', 'BLADE UP', 'CABIN'], '글자는 대문자로 맞춘다');
eq([rd.rows[2].front, rd.rows[2].side], [0.5, null], '빈 칸은 0 이 아니라 값 없음');
eq([rd.rows[4].front, rd.rows[4].starF, rd.rows[5].starS, rd.rows[0].starF], [2.2, true, true, false], '별표 — 값에 붙은 * 와 notes 의 STAR_ 표시');
var sh = [['메모'], [], ['radius (m)', 'MODEL', 'height (m)', 'Side Lifting Capacity (ton)'], [2, 'z', 0, 1.1]], rs = L.readRows(sh);
eq([rs.rows.length, rs.rows[0].side, rs.rows[0].front, rs.missing.length], [1, 1.1, null, 15], '머리글은 이름으로 찾는다(순서 · 대소문자 · 위쪽 빈 줄 무관), 없는 열은 알림');
ok(L.readRows([['a', 'b'], [1, 2]]).issues[0].indexOf('표준 머리글') >= 0 && L.readRows([]).issues.length === 1, '표준 머리글이 없으면 읽지 않는다');
ok(/둘 다 없습니다/.test(L.readRows([['Model', 'Radius (m)', 'Height (m)'], ['a', 1, 0]]).issues[0]), 'Front · Side 열이 둘 다 없으면 읽지 않는다');

// ---------- 거르기 · 곡선 ----------
var rows = rd.rows;
eq(L.applyFilters(rows, { model: ['B2'], blade: ['BLADE UP'] }).length, 2, '거르기 — 모델 · 블레이드');
eq(L.applyFilters(rows, { model: [] }).length, 7, '고른 것이 없으면 전부');
var op = L.options(rows, { model: ['A1'] }), ob = {}; op.forEach(function (o) { ob[o.key] = o.values; });
eq([ob.model, ob.blade], [['A1', 'B2'], ['BLADE UP']], '선택지 — 자기 항목은 전부, 다른 항목은 남는 값만');
var cs = L.curves(rows);
eq(cs.map(function (c) { return c.label; }), ['A1', 'B2 (BLADE UP)', 'B2 (BLADE DOWN)'], '곡선 이름 — 같은 모델 안에서 달라지는 항목만 붙인다');
eq(cs.map(function (c) { return c.rows.length; }), [4, 2, 1], '곡선마다 행 수');
eq([L.heights(rows), L.defaultHeight([-1, 0, 1]), L.defaultHeight([-2, 1, 3]), L.defaultHeight([-1, 1]), L.defaultHeight([])], [[0, 1], 0, 1, -1, null], '높이 목록 · 기본 높이(0, 없으면 0 에 가까운 값)');
eq(L.series(cs[0], 0, 'front'), [{ r: 1, v: 2, star: false }, { r: 2, v: 1, star: false }, { r: 4, v: 0.5, star: false }], '한 높이의 반경 → 전방 인양력');
eq(L.series(cs[0], 0, 'side').map(function (p) { return p.r; }), [1, 2], '값이 없는 반경은 곡선에서 뺀다');

// ---------- 보간 · 비교 ----------
var sf = L.series(cs[0], 0, 'front');
eq(L.lookup(sf, 2), { v: 1, est: false, star: false }, '딱 맞는 반경은 그 값');
var mid = L.lookup(sf, 3); near(mid.v, 0.75, '사이 반경은 직선 보간(2m 1.0 · 4m 0.5 → 3m 0.75)'); ok(mid.est === true, '보간값은 추정으로 표시');
eq([L.lookup(sf, 0.5), L.lookup(sf, 4.5), L.lookup([], 1)], [null, null, null], '범위 밖 반경은 값을 만들지 않는다');
eq(L.radii(cs, 0, 'front'), [1, 2, 3, 4], '반경 합집합');
var cmp = L.compare(cs, cs[0].id, 0, [1, 3, 4], 'front');
eq(cmp.map(function (c) { return c.base; }), [true, false, false], '기준 곡선 표시');
near(cmp[1].cells[0].diff, 10, '차이(%) = (2.2 − 2.0) / 2.0 × 100 = +10');
near(cmp[1].cells[1].diff, 20, '기준이 보간값이어도 계산(0.9 vs 0.75 → +20)'); ok(cmp[1].cells[1].baseEst && !cmp[1].cells[1].est, '기준 쪽이 추정임을 남긴다');
eq([cmp[1].cells[2].v, cmp[1].cells[2].diff, cmp[2].cells[1].v], [null, null, null], '값이 없으면 차이도 없다');
near(cmp[2].cells[0].diff, 30, 'BLADE DOWN 2.6 vs 2.0 → +30');
eq(L.compare(cs, 'none', 0, [1], 'front')[0].cells[0].diff, null, '기준 곡선이 없으면 차이를 내지 않는다');
eq(L.surface(cs[0], 'front').length, 4, '3D 점 — 높이 전부');
eq([L.f3(1.23456), L.f3(2), L.f3(null), L.pct(10), L.pct(-3.26), L.pct(0), L.hLabel(0), L.hLabel(-1), L.hLabel(1.5)], ['1.235', '2', '', '+10.0%', '-3.3%', '0.0%', '0 (지면) m', '-1 m', '+1.5 m'], '숫자 표시');

// ---------- AI 추출 JSON → 표준 행(V6 core.py 와 같은 규칙) ----------
eq([L.unitNum(1525, 'mm', true), L.unitNum('*2750', 'kg'), L.unitNum('12.5', 'kn'), L.unitNum(2204.62262185, 'lbs'), L.unitNum('', 'kg'), L.unitNum('MAX', 'm', true), L.unitNum(3.280839895013123, 'ft', true)], ['1.525', '2.75', '1.274645', '1', '', 'MAX', '1'], '단위 — mm → m, kg · kN · lbs → ton, 별표는 숫자에서 뗀다');
var thr = function (f) { try { f(); return ''; } catch (e) { return e.message; } };
ok(/단위/.test(thr(function () { L.unitNum(1, 'stone'); })) && /숫자가 아닙니다/.test(thr(function () { L.unitNum('abc', 'kg'); })) && /MAX/.test(thr(function () { L.unitNum('MAX', 'kg'); })), '모르는 단위 · 숫자 아님 · 인양력 MAX 는 오류');
eq([L.cleanOpt('Cab', 'cabin'), L.cleanOpt('rubber tracks', 'shoe'), L.cleanOpt('Steel Shoe', 'shoe'), L.cleanOpt('extra counterweight', 'cw'), L.cleanOpt('minimum weight', 'cw'), L.cleanOpt('down', 'blade'), L.cleanOpt('?', 'blade'), L.cleanOpt('ROPS Canopy', 'cabin')], ['CABIN', 'RUBBER', 'STEEL', 'ADD', 'STD', 'BLADE DOWN', '', 'ROPS CANOPY'], '옵션 표기 맞추기');
var n1 = L.normalize({ 'case': '3', defaults: { 'Machine Type': 'CRAWLER', cabin: 'CABIN', shoe: 'RUBBER' }, notes: 'N', cells: [{ radius: 3.5, radius_unit: 'm', height: 2, height_unit: 'm', capacity_unit: 'ton', front_down: 0.57, front_up: 0.57, side: 0.45, side_scope: 'both', arm_length: 1525, arm_length_unit: 'mm' }] });
eq(L.toAoa(n1.rows).slice(1), [['', '', 'CRAWLER', '', '', '1.525', '', 'CABIN', 'RUBBER', '', '', '', 'BLADE DOWN', '3.5', '2', '0.57', '0.45', '', 'Case 3; N'], ['', '', 'CRAWLER', '', '', '1.525', '', 'CABIN', 'RUBBER', '', '', '', 'BLADE UP', '3.5', '2', '0.57', '0.45', '', 'Case 3; N']], 'Case 3 — 블레이드 내림 · 올림 두 행, 측방은 둘 다(V6 examples/sample_case_3_output.csv 와 같은 값)');
var n4 = L.normalize({ 'case': '4', defaults: { Model: 'k1' }, cells: [{ radius: 10, radius_unit: 'ft', height: -1, capacity_unit: 'kg', front_down: '*2000', front_up: 1500, side: '1000*', side_scope: 'up' }] });
eq(n4.rows.map(function (r) { return [r['Blade up/down'], r['Front Lifting Capacity (ton)'], r['Side Lifting Capacity (ton)'], /STAR_FRONT=1/.test(r.notes), /STAR_SIDE=1/.test(r.notes), r['Radius (m)'], r['Height (m)']]; }), [['BLADE DOWN', '2', '', true, false, '3.048', '-1'], ['BLADE UP', '1.5', '1', false, true, '3.048', '-1']], 'Case 4 — 측방은 블레이드 올림에만, 별표 보존, ft → m, 음수 높이');
var n1b = L.normalize({ 'case': 1, cells: [{ radius: 2, height: 0, capacity_unit: 'kg', front: 1200, side: 900, blade: 'BLADE DOWN' }, { radius: 2, height: 0, capacity_unit: 'kg', front: 1200, side: 900, blade: 'BLADE DOWN' }, { radius: 3, height: 0, capacity_unit: 'kg' }] });
eq([n1b.rows.length, n1b.rows[0]['Blade up/down'], n1b.rows[0]['Front Lifting Capacity (ton)'], n1b.issues.length, /Model 이 빈 행/.test(n1b.issues[0])], [1, 'BLADE DOWN', '1.2', 2, true], 'Case 1 — 한 행, 완전히 같은 행은 하나 지우고 알림, 값 없는 칸은 건너뜀, Model 이 비면 알림');
var bad = L.normalize({ 'case': '2', cells: [{ radius: 2, height: 0, front: 1 }, { radius: 2, height: 0, capacity_unit: 'kg', front: 1, front_up: 2 }, { height: 0, capacity_unit: 'kg', front: 1 }, { radius: 2, height: 0, capacity_unit: 'kg', front: 1, side_scope: 'x' }] });
eq([bad.rows.length, bad.issues.length], [0, 5], '단위 없음 · front 와 front_up 함께 · 반경 없음 · side_scope 오류 → 행을 만들지 않고 알림');
ok(/#1/.test(bad.issues[0]) && /capacity_unit/.test(bad.issues[0]), '몇 번째 칸이 왜 안 되는지');
eq([L.normalize(null).rows.length, L.normalize({ cells: [] }).issues.length, /case/.test(L.normalize({ 'case': '9', cells: [] }).issues[0])], [0, 1, true], 'cells 없음 · case 가 1~6 아님');
var mx = L.normalize({ 'case': '6', cells: [{ radius: 4.31, height: 1, capacity_unit: 'ton', front: 0.5, side: 0.4, radius_type: 'max_reach' }] });
ok(/RADIUS_TYPE=MAX_REACH/.test(mx.rows[0].notes), 'Case 6 — 최대 Reach 표시');
// 변환 결과를 다시 읽어 비교에 쓸 수 있다
var back = L.readRows(L.toAoa(n4.rows), 'ai');
eq([back.rows.length, back.rows[0].starF, back.rows[1].starS, back.rows[0].side], [2, true, true, null], '변환한 행을 다시 읽어도 별표 · 빈 칸이 그대로');

// ---------- 내보내기 · 예제 ----------
var ex = L.exportSheets(cs, cs[0].id, 0, rows);
eq(Object.keys(ex), ['Front Data', 'Front 비교', 'Side Data', 'Side 비교', 'Rows'], '엑셀 시트 5개');
eq(ex['Front Data'].slice(1), [['Model \\ Radius (m)', 1, 2, 3, 4], ['A1 ★기준', 2, 1, '', 0.5], ['B2 (BLADE UP)', 2.2, '', 0.9, ''], ['B2 (BLADE DOWN)', 2.6, '', '', '']], 'Front Data — 가로 반경 × 세로 곡선, 보간값은 넣지 않는다');
ok(/2\.2\* \/ \+10\.0%/.test(ex['Front 비교'][3][1]) && /0\.75 \(추정\)/.test(ex['Front 비교'][2][3]), '비교 시트 — 별표 · 차이 · 추정 표시', JSON.stringify(ex['Front 비교'][3]));
eq([ex.Rows.length, ex.Rows[0], ex.Rows[5][15], /STAR_FRONT=1/.test(ex.Rows[5][18]), ex.Rows[6][18]], [8, H, 2.2, true, 'x; STAR_SIDE=1'], 'Rows — 표준 19열, 별표는 notes 로');
eq(L.readRows(ex.Rows).rows.length, 7, '내보낸 Rows 를 다시 읽어도 같은 행 수');
var sa = L.sample(), sr = L.readRows(sa, '예제'), sc = L.curves(sr.rows);
eq([sa[0], sr.issues, sr.rows.length === sa.length - 1, sc.length], [H, [], true, 14], '예제 — 표준 19열, 전부 읽힘, 곡선 14개');
ok(sr.rows.every(function (r) { return ['ALPHA', 'BETA', 'GAMMA', 'DELTA'].indexOf(r.mfr) >= 0; }), '예제는 가상 제조사뿐(실제 장비 값이 아니다)');
var sf2 = L.curves(L.applyFilters(sr.rows, { blade: ['BLADE UP'], cabin: ['CABIN'] }));
eq(sf2.map(function (c) { return c.label; }), ['AX35', 'BZ35-7', 'GM36', 'DT35R'], '예제 — 블레이드 · 캐빈을 고르면 모델 4개');
ok(L.lookup(L.series(sf2[1], 0, 'front'), 2.5).est === true && sr.rows.some(function (r) { return r.starF; }), '예제에 보간 확인용 빈 반경과 별표 값');
ok(L.normalize(L.SAMPLE_JSON).rows.length === 8 && L.normalize(L.SAMPLE_JSON).issues.length === 0, 'JSON 예시 — 8행, 알림 없음');
var before = JSON.stringify(rows); L.compare(cs, cs[0].id, 0, [1, 3], 'side'); L.exportSheets(cs, cs[0].id, 0, rows); ok(JSON.stringify(rows) === before, '계산이 입력을 바꾸지 않는다');

console.log('계산 규칙 테스트: 통과 ' + passed + ' · 실패 ' + failed);
process.exit(failed ? 1 : 0);
