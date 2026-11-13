/* 브라우저에 실제로 띄워 본다 — node test/smoke.browser.js (playwright 가 없으면 건너뜀) */
'use strict';
var http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
var chromium;
try { chromium = require('playwright').chromium; }
catch (e) { try { chromium = require('playwright-core').chromium; } catch (e2) { console.log('playwright 가 없어 화면 연기 테스트를 건너뜁니다.'); process.exit(0); } }
var XLSX = require('../lib/xlsx.full.min.js'), L = require('../js/lift.js');
var ROOT = path.join(__dirname, '..');
var MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };
var srv = http.createServer(function (q, s) { var p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]).replace(/\/$/, '/index.html')); fs.readFile(p, function (e, b) { if (e) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); s.end(b); }); });
var passed = 0, failed = 0;
function ok(c, label, d) { if (process.env.SMOKE_V) console.log((c ? '  o ' : '  x ') + label); if (c) passed++; else { failed++; console.log('  X ' + label + (d != null ? '  ' + d : '')); } }
var count = function (pg, sel) { return pg.$$eval(sel, function (t) { return t.length; }); };
srv.listen(0, async function () {
  var base = 'http://127.0.0.1:' + srv.address().port + '/';
  var br = await chromium.launch(); var ctx = await br.newContext({ viewport: { width: 1360, height: 900 }, acceptDownloads: true });
  var pg = await ctx.newPage(), errs = []; pg.on('pageerror', function (e) { errs.push(e.message); });
  var tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'b18-smoke-'));
  var save = async function (sel) { var d = pg.waitForEvent('download', { timeout: 6000 }); await pg.click(sel); var f = await d, p = path.join(tmp, f.suggestedFilename()); await f.saveAs(p); return p; };
  try {
    await pg.goto(base);
    ok(await pg.isHidden('#s-cond') && await pg.isHidden('#s-2d') && await pg.isVisible('#s-ai'), '처음엔 결과가 숨어 있고 AI 자동정리 칸은 보인다');
    await pg.click('#btn-sample'); await pg.waitForSelector('#c-front svg');
    ok(/행을 읽었습니다/.test(await pg.textContent('#file-status')) && await count(pg, '#file-status .ok') === 1, '예제 읽기');
    ok(await count(pg, '#curves tr') === 5 && await count(pg, '#c-front polyline.curve') === 4 && await count(pg, '#c-side polyline.curve') === 4, '예제 — 블레이드 올림 · 캐빈으로 걸러 곡선 4개');
    ok(await count(pg, '#c-front path.star') === 7 && await count(pg, '#c-front circle.pt') === 21, '기준 모델은 별 표식(7점), 나머지는 점');
    ok((await pg.inputValue('#height')) === '0', '기본 높이는 0m(지면)');
    var cols = await pg.$$eval('#c-front polyline.curve', function (a) { return a.map(function (x) { return x.getAttribute('stroke'); }); });
    ok(new Set(cols).size === 4, '곡선 색이 서로 다르다', cols.join(' '));
    // 비교표
    ok(await count(pg, '#t-front tr') === 5 && await count(pg, '#t-front .est') >= 1 && /\+5\.9%/.test(await pg.textContent('#t-front')), '기준 대비 차이표 — 추정(보간) 표시와 차이(%)');
    await pg.fill('#radii', '2, 3.2, 9'); await pg.dispatchEvent('#radii', 'change');
    var hd = await pg.$$eval('#t-front tr:first-child th', function (a) { return a.map(function (x) { return x.textContent; }).join('|'); });
    ok(/\|2\|3\.2\|9$/.test(hd) && await count(pg, '#t-front tr:nth-child(2) .est') === 1 && await count(pg, '#t-front tr:nth-child(2) td:last-child .muted') === 1, '반경을 직접 적으면 사이 값은 추정, 범위 밖은 빈 칸', hd);
    await pg.fill('#radii', ''); await pg.dispatchEvent('#radii', 'change');
    // 조건
    await pg.selectOption('#height', '2'); ok(/Height \+2 m/.test(await pg.textContent('#c-front')), '높이를 바꾸면 그래프가 바뀐다');
    await pg.selectOption('#height', '0');
    await pg.selectOption('#label', 'on'); ok(await count(pg, '#c-front text.lbl') === 28, '값 표시 켜기');
    await pg.selectOption('#label', 'off');
    await pg.click('#filters .chip[data-f="blade"][data-v="BLADE UP"]');
    ok(await count(pg, '#curves tr') === 9 && await count(pg, '#c-front polyline.curve') === 8, '블레이드 조건을 풀면 곡선 8개(이름에 블레이드가 붙는다)');
    ok(/BLADE DOWN/.test(await pg.textContent('#curves')), '곡선 이름에 달라지는 옵션 표시');
    await pg.click('#filters .chip[data-f="blade"][data-v="BLADE UP"]');
    await pg.click('#filters .chip[data-f="model"][data-v="GM36"]'); await pg.click('#filters .chip[data-f="model"][data-v="AX35"]');
    ok(await count(pg, '#c-front polyline.curve') === 2, '모델 두 개만 고르기');
    await pg.click('#filters .chip[data-f="model"][data-v="__all"]');
    ok(await count(pg, '#c-front polyline.curve') === 4, '「전체」로 되돌리기');
    await pg.uncheck('#curves tr:nth-child(3) input[data-show]');
    ok(await count(pg, '#c-front polyline.curve') === 3 && await count(pg, '#t-front tr') === 4, '곡선 표시 끄기');
    await pg.check('#curves tr:nth-child(3) input[data-show]');
    await pg.check('#curves tr:nth-child(4) input[data-base]');
    ok(/★ GM36/.test(await pg.textContent('#curves')) && /-5\.6%/.test(await pg.textContent('#t-front')), '기준 모델 바꾸기 → 차이 다시 계산');
    await pg.check('#curves tr:nth-child(2) input[data-base]');
    // 3D
    ok(await count(pg, '#c-3d polyline.c3') === 20 && await count(pg, '#c-3d circle.p3') > 100, '3D — 모델 4개 × 높이 5개 곡선');
    var d0 = await pg.$eval('#c-3d polyline.c3', function (x) { return x.getAttribute('points'); });
    await pg.fill('#yaw', '40'); ok(await pg.$eval('#c-3d polyline.c3', function (x) { return x.getAttribute('points'); }) !== d0, '3D 돌리기');
    await pg.selectOption('#m3', 'scatter'); ok(await count(pg, '#c-3d polyline.c3') === 0 && await count(pg, '#c-3d circle.p3') > 100, '3D 점 모양');
    await pg.selectOption('#m3', 'surface'); await pg.selectOption('#k3', 'side'); ok(/Side \(ton\)/.test(await pg.textContent('#c-3d')), '3D 측방');
    // 내려받기
    var x1 = await save('#btn-xlsx'), wb = XLSX.read(fs.readFileSync(x1));
    ok(wb.SheetNames.join() === 'Front Data,Front 비교,Side Data,Side 비교,Rows' && XLSX.utils.sheet_to_json(wb.Sheets['Front Data'], { header: 1 }).length === 6, '엑셀 — 시트 5개, Front Data 는 곡선 4줄');
    var c1 = await save('#btn-csv'), back = L.readRows(L.parseCsv(fs.readFileSync(c1, 'utf8')));
    ok(back.rows.length === 136 && back.issues.length === 0 && fs.readFileSync(c1)[0] === 0xEF, '거른 데이터 CSV — 다시 읽어도 136행, BOM 있음');
    var t1 = await save('#btn-template'); ok(L.parseCsv(fs.readFileSync(t1, 'utf8'))[0].join() === L.HEADERS.join(), '표준 양식 CSV — 머리글 19개');
    // 예제 CSV 를 내려받아 다시 올리기
    var s1 = await save('#btn-sample-csv');
    await pg.click('#btn-clear'); ok(await pg.isHidden('#s-2d') && await count(pg, '#file-status .fstat') === 0, '올린 데이터 비우기');
    await pg.setInputFiles('#file', s1); await pg.waitForSelector('#c-front svg');
    ok(await count(pg, '#curves tr') === 15 && await count(pg, '#many') === 1, '예제 CSV 를 올리면 곡선 14개 — 많으면 조건을 고르라고 알림');
    // 엑셀 파일 · 잘못된 파일
    var bad = path.join(tmp, 'bad.csv'); fs.writeFileSync(bad, 'a,b\n1,2\n');
    await pg.setInputFiles('#file', bad); await pg.waitForSelector('#file-status .warn');
    ok(/표준 머리글을 찾지 못했습니다/.test(await pg.textContent('#file-status .warn')) && await count(pg, '#curves tr') === 15, '표준 머리글이 없는 파일은 알리고 기존 데이터는 그대로');
    var xw = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(xw, XLSX.utils.aoa_to_sheet([L.HEADERS, ['OMEGA', 'OM40', 'CRAWLER', '', '', '', '', 'CABIN', 'RUBBER', '', '', 'STD', 'BLADE UP', 2, 0, 1.9, 1.2, '', '']]), 'S');
    var xf = path.join(tmp, 'om.xlsx'); fs.writeFileSync(xf, XLSX.write(xw, { type: 'buffer', bookType: 'xlsx' }));
    await pg.setInputFiles('#file', xf); await pg.waitForFunction(function () { return /OM40/.test(document.querySelector('#filters').textContent); });
    ok(await count(pg, '#curves tr') === 16, '엑셀 파일도 읽고 기존 데이터에 더한다');
    // AI 자동정리
    ok((await pg.textContent('#prompt')).length > 3000, '이미지 분석 지침 전문');
    await pg.fill('#json', '{oops'); await pg.click('#btn-convert');
    ok(await count(pg, '#conv-err') === 1 && await pg.isHidden('#btn-conv-use'), 'JSON 이 아니면 알림');
    await pg.click('#btn-json-sample'); await pg.click('#btn-convert');
    ok(/표준 행 8개/.test(await pg.textContent('#conv-ok')) && await count(pg, '#conv-table tr') === 9 && await count(pg, '#conv-table b.star') === 1, 'JSON 예시 → 표준 8행, 별표 값은 굵게');
    var cv = await save('#btn-conv-csv'), cb = L.parseCsv(fs.readFileSync(cv, 'utf8'));
    ok(cb.length === 9 && cb[1][15] === '1.85' && cb[1][13] === '2' && cb[1][7] === 'CABIN', '변환 CSV — kg → ton, mm → m, CAB → CABIN', JSON.stringify(cb[1]));
    await pg.fill('#json', '```json\n' + JSON.stringify({ 'case': '1', cells: [{ radius: 2, height: 0, front: 1 }] }) + '\n```'); await pg.click('#btn-convert');
    ok(/capacity_unit/.test(await pg.textContent('#conv-issues')) && await pg.isHidden('#conv-table'), '단위가 없으면 행을 만들지 않고 이유를 알림(코드 울타리는 벗김)');
    await pg.click('#btn-json-sample'); await pg.click('#btn-convert'); await pg.click('#btn-conv-use');
    ok(/EP35/.test(await pg.textContent('#filters')) && await count(pg, '#file-status .fstat') === 4, '변환된 데이터로 비교하기 — 모델이 목록에 들어온다');
    // 좁은 화면
    await pg.setViewportSize({ width: 360, height: 800 });
    var ov = await pg.evaluate(function () { var w = document.documentElement.clientWidth; return [].slice.call(document.querySelectorAll('main *')).filter(function (e) { var r = e.getBoundingClientRect(); if (!r.width || e.closest('svg')) return false; var p = e.parentElement; while (p) { var o = getComputedStyle(p).overflowX; if (o === 'auto' || o === 'scroll') return false; p = p.parentElement; } return r.right > w + 1; }).length; });
    ok(ov === 0, '360px 에서 가로 넘침 없음', ov);
    for (var pgn of ['guide.html', 'plan.html']) { var r = await pg.goto(base + pgn); ok(r.status() === 200 && (await pg.textContent('body')).length > 800, pgn + ' 열림'); }
    ok(errs.length === 0, '페이지 오류 없음', errs.join(' | '));
  } catch (e) { failed++; console.log('  X 중단: ' + e.message.split('\n')[0]); if (errs.length) console.log('    ' + errs.join(' | ')); }
  await br.close(); srv.close();
  console.log('화면 연기 테스트: 통과 ' + passed + ' · 실패 ' + failed);
  process.exit(failed ? 1 : 0);
});
