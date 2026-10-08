'use strict';
/* APZacct - frontend smoke test v1.3 (jsdom, no browser needed)
 * Loads the real pages + scripts into jsdom with a mocked fetch and drives the wizard (date step, locked-period reason,
 * payload) and the bank-import page (one batch request, reason prompt, error path).
 * Needs:  npm i jsdom   then  NODE_PATH=<folder with node_modules> node APZacct_test_frontend_jsdom_v1.3.js [folder with the frontend files]  */
const { JSDOM } = require('jsdom'); const vm = require('vm'), fs = require('fs');
const D = (process.argv[2] || '/mnt/user-data/outputs') + '/';
let pass = 0, fail = 0; const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  PASS - ' : '  FAIL - ') + m); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
function load(html, scripts, fetchImpl, pre) {
  const dom = new JSDOM(fs.readFileSync(D + html, 'utf8').replace(/<script[^>]*src=[^>]*><\/script>/g, ''), { runScripts: 'outside-only', url: 'http://localhost/', pretendToBeVisual: true });
  const w = dom.window; w.fetch = fetchImpl; if (pre) pre(w);
  const ctx = dom.getInternalVMContext(); scripts.forEach(s => new vm.Script(fs.readFileSync(D + s, 'utf8'), { filename: s }).runInContext(ctx));
  return w;
}
const ACC = [{ kod: 1020, namaBm: 'Bank', jenis: 'Aset', kumpulanAliranTunai: 'Tidak Berkaitan' }, { kod: 4050, namaBm: 'Pendapatan Perkhidmatan', jenis: 'Hasil', kumpulanAliranTunai: 'Operasi' }, { kod: 5010, namaBm: 'Perbelanjaan Pejabat', jenis: 'Perbelanjaan', kumpulanAliranTunai: 'Operasi' }];
const ZONE = 'Asia/Kuala_Lumpur';
const hariIni = () => { const p = {}; new Intl.DateTimeFormat('en-US', { timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()).forEach(x => p[x.type] = x.value); return p.year + '-' + p.month + '-' + p.day; };
const json = o => Promise.resolve({ json: () => Promise.resolve(o) });
(async () => {
  console.log('=== wizard ===');
  const calls = [];
  const fetchW = (url, opt) => opt ? (calls.push(JSON.parse(opt.body)), json({ status: 'BERJAYA', idTransaksi: 'T-0009', urlResit: '' })) : json({ accounts: ACC, tarikhKunciTempoh: '2026-03-31', zonMasa: ZONE, tarikhPembukaan: '2026-01-01' });
  const w = load('APZacct-index_v1.3.html', ['APZacct-config_v1.3.js', 'APZacct-wizard_v1.3.js'], fetchW); await sleep(30);
  const $ = id => w.document.getElementById(id), text = () => $('step-content').textContent, err = () => $('error-msg').textContent;
  const click = el => el.dispatchEvent(new w.Event('click', { bubbles: true })), change = (el, v) => { el.value = v; el.dispatchEvent(new w.Event('change', { bubbles: true })); }, input = (el, v) => { el.value = v; el.dispatchEvent(new w.Event('input', { bubbles: true })); };
  const next = async () => { click($('next-btn')); await sleep(5); }, card = v => click(w.document.querySelector('.option-card[data-val="' + v + '"]'));
  await next(); card('dt'); await next(); card('Bank'); await next(); change($('sel-akaunWang'), '1020'); await next(); change($('sel-kategori'), '4050'); await next(); await next();
  ok(/Tarikh transaksi/.test(text()), 'the Tarikh step appears after No. PV/RT');
  ok($('inp-tarikh').value === hariIni(), 'date defaults to today in the Tetapan time zone (' + hariIni() + ')');
  change($('inp-tarikh'), '2025-12-31'); await next(); ok(/sebelum baki pembukaan/.test(err()), 'a date before the opening balances is blocked in the wizard');
  change($('inp-tarikh'), '2026-03-15'); ok(!!$('inp-sebab'), 'a date inside the locked period shows the reason box');
  await next(); ok(/Nyatakan sebab/.test(err()), 'cannot continue without a reason');
  input($('inp-sebab'), 'Resit lewat'); await next(); ok(/Jumlah/.test(text()), 'with a reason the wizard moves on to the amount');
  input($('inp-jumlah'), '100'); await next(); ok(/2026-03-15/.test(text()) && /entri lewat/.test(text()), 'review shows the date and the late-entry tag');
  await next(); await sleep(20);
  const p = calls[0] || {};
  ok(p.tarikh === '2026-03-15' && p.sebabLewat === 'Resit lewat' && p.lines && p.lines.length === 2 && String(p.lines[0].kodAkaun) === '1020' && p.lines[0].debit === 100, 'payload carries the chosen date, the reason, and Terimaan = debit bank / credit category');
  ok(/Berjaya disimpan/.test(text()) && /T-0009/.test(text()), 'success screen shows the new transaction ID');

  console.log('\n=== bank import page (one batch request) ===');
  const calls2 = []; let mode = 'ok';
  const fetchP = (url, opt) => {
    if (!opt) return json({ accounts: ACC, tarikhKunciTempoh: '2026-03-31', zonMasa: ZONE, tarikhPembukaan: '2026-01-01' });
    const b = JSON.parse(opt.body); calls2.push(b);
    if (b.action === 'ocr_penyata_bank') return json({ transaksi: [
      { tarikh: '2026-04-10', perkara: 'Fi', debit: 0, kredit: 50, bakiBerjalan: 150, kodKategoriDicadang: 4050, konsisten: true },
      { tarikh: '2026-03-05', perkara: 'Bayar', debit: 20, kredit: 0, bakiBerjalan: 130, kodKategoriDicadang: 5010, konsisten: true }], bilangan: 2, bilanganTidakKonsisten: 0 });
    return mode === 'ok' ? json({ status: 'BERJAYA', bilangan: 2 }) : json({ error: 'RALAT: 1 transaksi tidak sah - tiada apa dipos', kod: 'KELOMPOK_TIDAK_SAH', ralat: [{ indeks: 1, kod: 'TEMPOH_DIKUNCI', error: 'tarikh dalam tempoh dikunci' }] });
  };
  const w2 = load('APZacct-penyata-bank_v1.3.html', ['APZacct-config_v1.3.js', 'APZacct-penyata-bank_v1.3.js'], fetchP, ww => { ww.prompt = () => 'Sebab ujian'; }); await sleep(30);
  const $2 = id => w2.document.getElementById(id);
  const f = new w2.File(['x'], 'a.pdf', { type: 'application/pdf' }); Object.defineProperty($2('inp-fail'), 'files', { value: [f] }); $2('inp-fail').dispatchEvent(new w2.Event('change')); await sleep(50);
  $2('sel-akaunWang').value = '1020'; $2('sel-akaunWang').dispatchEvent(new w2.Event('change'));
  $2('proses-btn').dispatchEvent(new w2.Event('click')); await sleep(30);
  const boxes = w2.document.querySelectorAll('#penyata-tbody input[data-field="disertakan"]');
  ok(boxes.length === 2 && boxes[0].checked && !boxes[1].checked, 'two rows loaded; the row dated inside the locked period starts unticked');
  boxes[1].checked = true; boxes[1].dispatchEvent(new w2.Event('change'));
  $2('pos-semua-btn').dispatchEvent(new w2.Event('click')); await sleep(30);
  const post = calls2.filter(c => c.action === 'pos_kelompok');
  ok(post.length === 1 && post[0].transaksi.length === 2 && post[0].sebabLewat === 'Sebab ujian', 'both rows go in ONE pos_kelompok request, with the reason from the prompt');
  const t0 = post[0].transaksi[0], t1 = post[0].transaksi[1];
  ok(String(t0.lines[0].kodAkaun) === '1020' && t0.lines[0].debit === 50 && String(t1.lines[0].kodAkaun) === '5010' && t1.lines[0].debit === 20 && String(t1.lines[1].kodAkaun) === '1020' && t1.lines[1].kredit === 20, 'money in = debit bank; money out = debit category / credit bank');
  ok(/2 daripada 2 transaksi berjaya dipos/.test($2('selesai-block').textContent), 'completion screen reports 2 of 2 posted');
  console.log('\n=== error path ===');
  mode = 'err'; calls2.length = 0;
  const w3 = load('APZacct-penyata-bank_v1.3.html', ['APZacct-config_v1.3.js', 'APZacct-penyata-bank_v1.3.js'], fetchP, ww => { ww.prompt = () => 'x'; }); await sleep(30);
  const $3 = id => w3.document.getElementById(id);
  Object.defineProperty($3('inp-fail'), 'files', { value: [new w3.File(['x'], 'a.pdf', { type: 'application/pdf' })] }); $3('inp-fail').dispatchEvent(new w3.Event('change')); await sleep(50);
  $3('sel-akaunWang').value = '1020'; $3('sel-akaunWang').dispatchEvent(new w3.Event('change')); $3('proses-btn').dispatchEvent(new w3.Event('click')); await sleep(30);
  const bx = w3.document.querySelectorAll('#penyata-tbody input[data-field="disertakan"]'); bx[1].checked = true; bx[1].dispatchEvent(new w3.Event('change'));
  $3('pos-semua-btn').dispatchEvent(new w3.Event('click')); await sleep(30);
  ok(/tidak sah/.test($3('hasil-error').textContent) && /baris 2/.test($3('hasil-error').textContent) && !$3('pos-semua-btn').disabled && $3('hasil-block').style.display !== 'none', 'a rejected batch shows which row failed, keeps the table and re-enables the button');
  console.log('\nRESULT: ' + pass + ' passed, ' + fail + ' failed.'); process.exit(fail ? 1 : 0);
})().catch(e => { console.log('CRASH', e && e.stack || e); process.exit(2); });
