'use strict';
/* APZacct - Apps Script mock test v1.3 (adds WebAPI v1.7: date rules, period lock with reason, time zone)
 * Loads EVERY APZacct_*.gs into ONE shared global scope (like Apps Script does - a duplicate top-level const
 * or a missing menu handler fails here), then drives Jurnal Laras, Pos Agihan APK v1.1 and Tambah Akaun v1.2
 * against a mock SpreadsheetApp. Files in OUT override same-named files in PROJ.
 * Run: node APZacct_test_gs_mock_v1.0.js [OUT] [PROJ]      Illustrative numbers only.            */
const vm = require('vm'), fs = require('fs'), path = require('path');
const OUT = process.argv[2] || '/mnt/user-data/outputs', PROJ = process.argv[3] || '/mnt/project';
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  PASS - ' : '  FAIL - ') + m); };

class Sheet {
  constructor(name) { this.name = name; this.d = {}; this.maxRows = 1000; }
  g(r, c) { const v = this.d[r + ',' + c]; return v === undefined ? '' : v; }
  s(r, c, v) { this.d[r + ',' + c] = v; }
  getRange(r, c, nr, nc) { const sh = this; nr = nr || 1; nc = nc || 1; return {
    getValue: () => sh.g(r, c),
    getValues: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => sh.g(r + i, c + j))),
    setValue: v => sh.s(r, c, v), setFormula: f => sh.s(r, c, f),
    setValues: a => a.forEach((row, i) => row.forEach((v, j) => sh.s(r + i, c + j, v))), setFontWeight: function () { return this; } }; }
  getLastRow() { return Math.max(0, ...Object.keys(this.d).filter(k => this.d[k] !== '').map(k => +k.split(',')[0])); }
  getMaxRows() { return this.maxRows; }
  getSheetId() { return 1; }
  insertRowsAfter(n, k) { this.maxRows += k; }
  appendRow(a) { const r = this.getLastRow() + 1; a.forEach((v, j) => this.s(r, j + 1, v)); }
}
function world(opts) {
  const sheets = {}; ['Akaun', 'Transaksi', 'Baris_Transaksi', 'Tetapan', 'APK', 'UR'].forEach(n => sheets[n] = new Sheet(n));
  [[1010, 'Wang Di Tangan', 'Aset', 'Tidak Berkaitan'], [1020, 'Bank', 'Aset', 'Tidak Berkaitan'], [1100, 'Perbelanjaan Prabayar', 'Aset', 'Operasi'],
   [1110, 'Pendapatan Terakru', 'Aset', 'Operasi'], [2050, 'Perbelanjaan Terakru', 'Liabiliti', 'Operasi'], [2060, 'Pendapatan Belum Diperoleh', 'Liabiliti', 'Operasi'],
   [2020, 'Dividen', 'Liabiliti', 'Berkanun'], [2070, 'Cukai', 'Liabiliti', 'Berkanun'], [2080, 'Zakat', 'Liabiliti', 'Berkanun'], [2090, 'Honorarium', 'Liabiliti', 'Berkanun'],
   [2100, 'KWA Pend', 'Liabiliti', 'Berkanun'], [2110, 'KWA Pemb', 'Liabiliti', 'Berkanun'], [3010, 'Modal Syer', 'Ekuiti', 'Pembiayaan'], [3020, 'Rizab', 'Ekuiti', 'Tidak Berkaitan'],
   [3030, 'Lebihan Terkumpul', 'Ekuiti', 'Tidak Berkaitan'], [4050, 'Pendapatan Perkhidmatan', 'Hasil', 'Operasi'], [5150, 'Internet', 'Perbelanjaan', 'Operasi']]
  .forEach((a, i) => { const r = 5 + i; sheets.Akaun.s(r, 1, a[0]); sheets.Akaun.s(r, 3, a[1]); sheets.Akaun.s(r, 4, a[2]); sheets.Akaun.s(r, 6, a[3]); sheets.Akaun.s(r, 7, 'Aktif'); });
  [[10, 1010], [11, 2010], [12, 3010], [13, 4010], [14, 5010]].forEach(a => sheets.Tetapan.s(a[0], 3, a[1]));
  if (opts && opts.lebihan !== undefined) { sheets.UR.s(36, 1, 'LEBIHAN BERSIH (SURPLUS) - SEBELUM PEMBAHAGIAN'); sheets.UR.s(36, 2, opts.lebihan); }
  sheets.APK.s(7, 2, 175); sheets.APK.s(8, 2, 14); sheets.APK.s(9, 2, 7);
  return sheets;
}
function ctxFor(sheets, answers) {
  const lockState = { busy: false, acquired: 0, released: 0 };
  const log = { alerts: [], prompts: [], lock: lockState };
  const ui = { ButtonSet: { OK_CANCEL: 'OK_CANCEL', YES_NO: 'YES_NO' }, Button: { OK: 'OK', YES: 'YES', NO: 'NO' },
    prompt: (t, m) => { log.prompts.push(t); return { getSelectedButton: () => answers.length ? 'OK' : 'CANCEL', getResponseText: () => String(answers.shift()) }; },
    alert: (a, b, c) => { log.alerts.push(String(a) + ' | ' + String(b || '')); return (c === 'YES_NO' || b === 'YES_NO') ? (log.yesno === undefined ? 'YES' : log.yesno) : 'OK'; } };
  const ss = { getSheetByName: n => sheets[n] || null, getSpreadsheetTimeZone: () => 'Asia/Kuala_Lumpur', insertSheet: n => (sheets[n] = new Sheet(n)) };
  const ZONES = ['Asia/Kuala_Lumpur', 'Asia/Jakarta', 'UTC'];
  const ctx = vm.createContext({ console, Math, Number, String, Object, Array, Date, isNaN, RegExp, JSON,
    SpreadsheetApp: { getUi: () => ui, getActiveSpreadsheet: () => ss },
    Session: { getScriptTimeZone: () => 'Asia/Kuala_Lumpur', getActiveUser: () => ({ getEmail: () => 'test@example.com' }) },
    Utilities: { formatDate: (d, tz, f) => { if (ZONES.indexOf(tz) === -1) throw new Error('Unknown time zone ' + tz); return d.toISOString().slice(0, 10); } },
    LockService: { getScriptLock: () => ({ tryLock: () => { if (lockState.busy) return false; lockState.acquired++; return true; }, releaseLock: () => { lockState.released++; } }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => null }) },
    ContentService: { createTextOutput: s => ({ s, setMimeType() { return this; } }), MimeType: { JSON: 'JSON' } } });
  return { ctx, log };
}
const files = {};
fs.readdirSync(PROJ).filter(f => /^APZacct_.*\.gs$/.test(f)).forEach(f => files[f] = path.join(PROJ, f));
fs.readdirSync(OUT).filter(f => /^APZacct_.*\.gs$/.test(f)).forEach(f => files[f] = path.join(OUT, f));
function load(ctx) { Object.keys(files).sort().forEach(f => vm.runInContext(fs.readFileSync(files[f], 'utf8'), ctx, { filename: f })); }

console.log('=== 1. all .gs load into one shared scope; every menu handler exists ===');
{ const { ctx } = ctxFor(world(), []); let err = null; try { load(ctx); } catch (e) { err = e; }
  ok(!err, Object.keys(files).length + ' .gs files load together without a redeclaration error' + (err ? ' (' + err.message + ')' : ''));
  const menu = fs.readFileSync(files['APZacct_Menu.gs'], 'utf8'); const handlers = [...menu.matchAll(/addItem\('[^']+', '(\w+)'\)/g)].map(m => m[1]);
  handlers.forEach(h => ok(typeof ctx[h] === 'function', 'menu handler defined: ' + h)); }

console.log('\n=== 2. Jurnal Laras ===');
function run(fn, answers, opts, yesno) { const w = world(opts); const { ctx, log } = ctxFor(w, answers.slice()); if (yesno) log.yesno = yesno; load(ctx); ctx[fn](); return { w, log }; }
let r = run('posJurnalLaras', ['3', '5150', '2050', '300', '2026-12-31', 'Bil internet Dis']);
ok(r.w.Transaksi.g(5, 1) === 'T-0000' && r.w.Transaksi.g(5, 2) === '2026-12-31' && r.w.Transaksi.g(5, 5) === 'Jurnal', 'type 3 writes a Jurnal header (T-0000)');
ok(r.w.Baris_Transaksi.g(5, 3) === 5150 && r.w.Baris_Transaksi.g(5, 4) === 300 && r.w.Baris_Transaksi.g(6, 3) === 2050 && r.w.Baris_Transaksi.g(6, 5) === 300, 'Debit 5150 300 / Kredit 2050 300');
ok(r.w.Baris_Transaksi.g(5, 2) === 'T-0000' && r.w.Baris_Transaksi.g(6, 2) === 'T-0000' && r.w.Baris_Transaksi.g(5, 1) === 'L-001' && r.w.Baris_Transaksi.g(6, 1) === 'L-002', 'both lines carry the header ID; line IDs L-001/L-002');
ok(/Berjaya/.test(r.log.alerts[r.log.alerts.length - 1]), 'success alert shown');
r = run('posJurnalLaras', ['3', '5150', '1020']); ok(r.w.Transaksi.g(5, 1) === '' && /akaun WANG/.test(r.log.alerts.join()), 'money account (Bank) refused, nothing written');
r = run('posJurnalLaras', ['3', '5150', '4050']); ok(r.w.Transaksi.g(5, 1) === '' && /berjenis Liabiliti/.test(r.log.alerts.join()), 'wrong Jenis refused (type 3 credit must be Liabiliti)');
r = run('posJurnalLaras', ['3', '5150', '2050', '300', '2026-02-30']); ok(r.w.Transaksi.g(5, 1) === '' && /tarikh mesti sebenar/.test(r.log.alerts.join()), 'impossible date 2026-02-30 refused');
r = run('posJurnalLaras', ['4', '5150', '1100', '200', '2026-01-31', '']); ok(r.w.Baris_Transaksi.g(6, 3) === 1100 && r.w.Transaksi.g(5, 3) === 'Pelepasan perbelanjaan prabayar', 'type 4 (prepaid release) posts with default perkara');
r = run('posJurnalLaras', ['3', '5150', '2050', '0']); ok(r.w.Transaksi.g(5, 1) === '', 'zero amount refused');
r = run('posJurnalLaras', ['3', '5150', '2050', '300', '2026-01-10', ''], { }, 'NO'); ok(r.w.Transaksi.g(5, 1) === '', 'answering NO at the confirmation writes nothing');
{ const w = world(); w.Tetapan.s(21, 3, new Date('2026-12-31T00:00:00Z')); const { ctx, log } = ctxFor(w, ['3', '5150', '2050', '300', '2026-06-30', '']); log.yesno = 'NO'; load(ctx); ctx.posJurnalLaras();
  ok(w.Transaksi.g(5, 1) === '' && /TEMPOH DIKUNCI/.test(log.alerts.join()), 'period lock (a real Date object in Tetapan!C21) warns and honours NO'); }
{ const w = world(); const { ctx } = ctxFor(w, ['3', '5150', '2050', '300', '2026-12-31', '', '3', '5150', '2050', '50', '2026-12-31', '']); load(ctx); ctx.posJurnalLaras(); ctx.posJurnalLaras();
  ok(w.Transaksi.g(6, 1) === 'T-0001' && w.Baris_Transaksi.g(7, 1) === 'L-003' && w.Baris_Transaksi.g(8, 5) === 50, 'a second journal continues the sequence (T-0001, L-003/L-004)'); }

console.log('\n=== 3. Pos Agihan APK v1.1 loss-year guard ===');
r = run('posAgihanAPK', ['2026-12-31'], { lebihan: -50 }); ok(r.w.Transaksi.g(5, 1) === '' && /TIADA AGIHAN DIBENARKAN/.test(r.log.alerts.join()), 'net loss (-50): blocked, nothing written');
r = run('posAgihanAPK', ['2026-12-31'], { lebihan: 0 }); ok(r.w.Transaksi.g(5, 1) === '' && /TIADA AGIHAN DIBENARKAN/.test(r.log.alerts.join()), 'zero surplus: blocked');
ok(!/teruskan juga\?/i.test(fs.readFileSync(files['APZacct_PosAgihanAPK.gs'], 'utf8').replace(/menu ini sengaja tiada butang "teruskan juga"/, '')), 'no "teruskan juga" override offered');
r = run('posAgihanAPK', ['2026-12-31'], { lebihan: 700 });
const bl = []; for (let i = 5; i < 12; i++) if (r.w.Baris_Transaksi.g(i, 3) !== '') bl.push([r.w.Baris_Transaksi.g(i, 3), r.w.Baris_Transaksi.g(i, 4), r.w.Baris_Transaksi.g(i, 5)]);
const dr = bl.reduce((s, x) => s + x[1], 0), kr = bl.reduce((s, x) => s + x[2], 0);
ok(r.w.Transaksi.g(5, 1) === 'T-0000' && bl.length === 4 && dr === 196 && kr === 196 && bl[0][0] === 3030, 'surplus 700: posts one balanced entry - Debit 3030 = 196 = sum of 3 credits');
{ const w = world(); const { ctx, log } = ctxFor(w, ['2026-12-31']); load(ctx); ctx.posAgihanAPK(); ok(w.Transaksi.g(5, 1) === '' && /tidak dapat semak/.test(log.alerts.join()), 'UR row missing: fails closed (no post)'); }

console.log('\n=== 4. Tambah Akaun v1.2 ===');
function tambah(answers) { const w = world(); const { ctx, log } = ctxFor(w, answers.slice()); load(ctx); ctx.tambahAkaun(); return { w, log }; }
const lastAk = w => { let r = 5; while (w.Akaun.g(r + 1, 1) !== '') r++; return r; };
let t = tambah(['Aset', '4', 'Am', 'Bank Kedua', 'Bank 2']); let row = lastAk(t.w);
ok(t.w.Akaun.g(row, 3) === 'Bank Kedua' && t.w.Akaun.g(row, 6) === 'Tidak Berkaitan' && t.w.Akaun.g(row, 4) === 'Aset', 'new Aset bank account -> Kumpulan "Tidak Berkaitan" (visible in the wizard money list)');
t = tambah(['Aset', '2', 'Am', 'Kenderaan', 'Vehicles']); row = lastAk(t.w); ok(t.w.Akaun.g(row, 6) === 'Pelaburan', 'fixed asset -> Pelaburan');
t = tambah(['Hasil', 'Am', 'Sewa', 'Rent']); row = lastAk(t.w); ok(t.w.Akaun.g(row, 3) === 'Sewa' && t.w.Akaun.g(row, 6) === 'Operasi', 'Hasil: no group question, Operasi');
t = tambah(['Aset', '9', 'Am', 'X', 'X']); ok(lastAk(t.w) === 21 && /1 hingga 5/.test(t.log.alerts.join()), 'invalid group number: nothing added');

console.log('\n=== 5. WebAPI v1.7: date rules, period lock with reason, time zone ===');
const SECRET = 'GANTI-DENGAN-RAHSIA-ANDA-SENDIRI';
function api(setup, body, method) {
  const w = world(); if (setup) setup(w);
  const { ctx } = ctxFor(w, []); load(ctx);
  const out = method === 'get' ? ctx.doGet({ parameter: { secret: SECRET } }) : ctx.doPost({ postData: { contents: JSON.stringify(Object.assign({ secret: SECRET }, body)) } });
  return { w, res: JSON.parse(out.s) };
}
const linesOK = [{ kodAkaun: 1020, debit: 100, kredit: 0 }, { kodAkaun: 4050, debit: 0, kredit: 100 }];
const post = (tarikh, extra) => Object.assign({ tarikh, perkara: 'Ujian', noPV: 'PV-1', kaedah: 'Bank', lines: linesOK }, extra || {});
const withOpening = w => { w.Tetapan.s(18, 3, 'T-0000'); w.Transaksi.s(5, 1, 'T-0000'); w.Transaksi.s(5, 2, new Date('2026-01-01T00:00:00Z')); };
const withLock = v => w => { withOpening(w); w.Tetapan.s(21, 3, v); };
let a = api(null, post('2026-03-10'));
ok(a.res.status === 'BERJAYA' && a.w.Transaksi.g(5, 2) === '2026-03-10' && a.w.Transaksi.g(5, 6) === 'Disahkan', 'no opening and no lock yet: any real date is accepted (backfilling is not blocked)');
a = api(null, post('2027-06-01')); ok(a.res.status === 'BERJAYA', 'a future date is accepted (post-dated items are legitimate)');
a = api(null, post('2026-02-30')); ok(a.res.kod === 'TARIKH_TIDAK_SAH' && a.w.Transaksi.g(5, 1) === '', 'impossible date 2026-02-30 refused, nothing written');
a = api(null, post('30/03/2026')); ok(a.res.kod === 'TARIKH_TIDAK_SAH', 'wrong format refused');
a = api(withOpening, post('2025-12-31')); ok(a.res.kod === 'SEBELUM_PEMBUKAAN' && a.w.Transaksi.g(6, 1) === '', 'date before the opening balances (previous fiscal year) refused');
a = api(withOpening, post('2026-01-01')); ok(a.res.status === 'BERJAYA', 'the opening date itself is allowed');
a = api(withLock('2026-03-31'), post('2026-03-15')); ok(a.res.kod === 'TEMPOH_DIKUNCI' && a.w.Transaksi.g(6, 1) === '', 'date inside the locked period without a reason: refused, nothing written');
a = api(withLock('2026-03-31'), post('2026-03-15', { sebabLewat: 'Resit lewat diterima' }));
ok(a.res.status === 'BERJAYA' && a.w.Transaksi.g(6, 6) === 'Entri Lewat', 'locked period + reason: posted and tagged Entri Lewat');
ok(a.w.Log_Perubahan && /Entri lewat: Resit lewat diterima/.test(String(a.w.Log_Perubahan.g(2, 7))), 'the reason is written to Log_Perubahan');
a = api(withLock('2026-03-31'), post('2026-04-01')); ok(a.res.status === 'BERJAYA' && a.w.Transaksi.g(6, 6) === 'Disahkan', 'first day after the lock needs no reason');
a = api(withLock(new Date('2026-03-31T00:00:00Z')), post('2026-03-31')); ok(a.res.kod === 'TEMPOH_DIKUNCI', 'lock typed as a REAL date in Tetapan!C21 is still honoured (the v1.6 bug)');
a = api(withLock(new Date('2026-03-31T00:00:00Z')), {}, 'get'); ok(a.res.tarikhKunciTempoh === '2026-03-31', 'doGet turns a real Date in C21 into YYYY-MM-DD');
ok(a.res.tarikhPembukaan === '2026-01-01', 'doGet reports the opening-balance date');
a = api(null, {}, 'get'); ok(a.res.zonMasa === 'Asia/Kuala_Lumpur', 'time zone defaults to Asia/Kuala_Lumpur (UTC+8) when Tetapan!C23 is blank');
a = api(w => w.Tetapan.s(23, 3, 'Asia/Jakarta'), {}, 'get'); ok(a.res.zonMasa === 'Asia/Jakarta', 'a time zone set in Tetapan!C23 is used');
a = api(w => w.Tetapan.s(23, 3, 'Mars/Phobos'), {}, 'get'); ok(a.res.zonMasa === 'Asia/Kuala_Lumpur', 'an invalid time zone name falls back to the default instead of failing');
a = api(null, { action: 'rekonsiliasi_bank', akaunWang: 1020 }); ok(typeof a.res.error === 'string' && !a.res.kod, 'other API actions are untouched by the date rules');


console.log('\n=== 6. WebAPI v1.8: lock, batch posting, capacity ===');
function api2(setup, body, busy) {
  const w = world(); if (setup) setup(w);
  const { ctx, log } = ctxFor(w, []); if (busy) log.lock.busy = true; load(ctx);
  const out = ctx.doPost({ postData: { contents: JSON.stringify(Object.assign({ secret: SECRET }, body)) } });
  return { w, res: JSON.parse(out.s), log };
}
const item = (tarikh, extra) => Object.assign({ tarikh, perkara: 'Bank', noPV: 'Import', kaedah: 'Bank', lines: [{ kodAkaun: 1020, debit: 100, kredit: 0 }, { kodAkaun: 4050, debit: 0, kredit: 100 }] }, extra || {});
let b = api2(null, post('2026-03-10'));
ok(b.res.status === 'BERJAYA' && b.log.lock.acquired === 1 && b.log.lock.released === 1, 'a single post takes the script lock once and releases it');
b = api2(null, post('2026-03-10'), true); ok(b.res.kod === 'SISTEM_SIBUK' && b.w.Transaksi.g(5, 1) === '', 'busy lock: SISTEM_SIBUK and nothing is written');
b = api2(withOpening, { action: 'pos_kelompok', transaksi: [item('2026-02-01'), item('2026-02-02'), item('2026-02-03')] });
ok(b.res.status === 'BERJAYA' && b.res.bilangan === 3 && b.res.idPertama === 'T-0001' && b.res.idTerakhir === 'T-0003' && b.res.bilanganBaris === 6, 'batch of 3 posts in one request (T-0001..T-0003, 6 lines)');
ok(b.w.Transaksi.g(6, 1) === 'T-0001' && b.w.Transaksi.g(8, 1) === 'T-0003' && b.w.Baris_Transaksi.g(5, 1) === 'L-001' && b.w.Baris_Transaksi.g(10, 1) === 'L-006' && b.w.Baris_Transaksi.g(10, 5) === 100, 'batch rows are contiguous and numbered correctly');
ok(b.log.lock.acquired === 1 && b.log.lock.released === 1, 'the whole batch runs under ONE lock');
b = api2(withOpening, { action: 'pos_kelompok', transaksi: [item('2026-02-01'), item('2026-02-02', { lines: [{ kodAkaun: 1020, debit: 100, kredit: 0 }, { kodAkaun: 4050, debit: 0, kredit: 90 }] }), item('2026-02-03')] });
ok(b.res.kod === 'KELOMPOK_TIDAK_SAH' && b.res.ralat[0].indeks === 1 && b.res.ralat[0].kod === 'TAK_SEIMBANG' && b.w.Transaksi.g(6, 1) === '', 'one unbalanced item rejects the whole batch (all-or-nothing) and names it');
b = api2(withOpening, { action: 'pos_kelompok', transaksi: [item('2026-02-01', { lines: [{ kodAkaun: 9999, debit: 5, kredit: 0 }, { kodAkaun: 4050, debit: 0, kredit: 5 }] })] }); ok(b.res.ralat[0].kod === 'KOD_TIDAK_SAH', 'unknown account code is caught per item');
b = api2(withOpening, { action: 'pos_kelompok', transaksi: [item('2025-06-01')] }); ok(b.res.ralat[0].kod === 'SEBELUM_PEMBUKAAN', 'batch applies the before-opening rule');
b = api2(withLock('2026-03-31'), { action: 'pos_kelompok', transaksi: [item('2026-03-10')] }); ok(b.res.ralat[0].kod === 'TEMPOH_DIKUNCI' && b.w.Transaksi.g(6, 1) === '', 'batch into a locked period without a reason is refused');
b = api2(withLock('2026-03-31'), { action: 'pos_kelompok', sebabLewat: 'Penyata lewat diterima', transaksi: [item('2026-03-10'), item('2026-04-02')] });
ok(b.res.status === 'BERJAYA' && b.res.bilanganLewat === 1 && b.w.Transaksi.g(6, 6) === 'Entri Lewat' && b.w.Transaksi.g(7, 6) === 'Disahkan', 'batch with a reason: only the locked-period item is tagged Entri Lewat');
ok(b.w.Log_Perubahan && /kelompok/.test(String(b.w.Log_Perubahan.g(2, 7))) && /Penyata lewat diterima/.test(String(b.w.Log_Perubahan.g(2, 7))), 'the batch reason is logged once in Log_Perubahan');
b = api2(w => { withOpening(w); w.Transaksi.s(7, 1, 'T-0005'); }, { action: 'pos_kelompok', transaksi: [item('2026-02-01')] });
ok(b.w.Transaksi.g(6, 1) === '' && b.w.Transaksi.g(8, 1) === 'T-0006', 'a gap in the middle is never filled by a block write (rows below stay safe)');
b = api2(null, { action: 'pos_kelompok', transaksi: [] }); ok(b.res.kod === 'KELOMPOK_KOSONG', 'empty batch refused');
b = api2(null, { action: 'pos_kelompok', transaksi: Array.from({ length: 501 }, () => item('2026-02-01')) }); ok(b.res.kod === 'KELOMPOK_BESAR', 'more than 500 per request refused');
const fillBt = n => w => { w.Baris_Transaksi.maxRows = 5000; for (let r = 5; r <= n; r++) w.Baris_Transaksi.s(r, 2, 'X'); };  // the v1.3 template's ledger sheet has 5,000 rows
b = api2(fillBt(4998), { action: 'pos_kelompok', transaksi: [item('2026-02-01'), item('2026-02-02')] }); ok(b.res.kod === 'KAPASITI_PENUH' && /tinggal 2 baris/.test(b.res.error) && b.w.Transaksi.g(5, 1) === '', 'batch that does not fit in the ledger window is refused with the remaining space');
b = api2(fillBt(4999), post('2026-02-01')); ok(b.res.kod === 'KAPASITI_PENUH' && b.w.Transaksi.g(5, 1) === '', 'a single post past the capacity is refused instead of silently falling outside the statements');
b = api2(fillBt(4996), post('2026-02-01')); ok(b.res.status === 'BERJAYA', 'a post that exactly fits (rows 4997-4998 free) still works');
b = api2(w => { for (let r = 5; r <= 1000; r++) w.Transaksi.s(r, 1, 'T-' + String(r).padStart(4, '0')); }, { action: 'pos_kelompok', transaksi: [item('2026-02-01'), item('2026-02-02')] });
ok(b.res.status === 'BERJAYA' && b.w.Transaksi.maxRows > 1000 && b.w.Transaksi.g(1001, 1) !== '', 'a full Transaksi grid is extended automatically');

console.log('\nRESULT: ' + pass + ' passed, ' + fail + ' failed.'); process.exit(fail ? 1 : 0);
