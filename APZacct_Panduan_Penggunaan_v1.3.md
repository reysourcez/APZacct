# APZacct — Full User Guide (Panduan Penggunaan) v1.3
*Written 2026-10-05 for APZacct release 1.3 (template v1.3). English text, with the exact Bahasa Malaysia labels you will see on screen. Every RM figure below is an illustrative test number — not any organisation's real position. Everything marked "tested" was run through the real workbook (LibreOffice recalculation, 16 scenarios) or through a mock of Apps Script; nothing here has been run inside live Google Sheets yet.*

---
## 0. Apply first (about 20 minutes)
Release 1.3 changes the Web App code and every frontend file name again, so there are four places to update:
1. **Google Sheet.** New customer → start from `APZacct_Template_Kosong_v1.3.xlsx` (a koperasi that needs GP23 notes → `APZacct_Template_Kosong_Nota_v1.3.xlsx`). Your existing test sheet needs: the *AT patch* (Appendix A — skip if done), **Tetapan row 23** (A23 "Zon Masa", C23 `Asia/Kuala_Lumpur`; blank also works), Tetapan!C21 as Plain text, and the **ledger-window widening** (Appendix D, three steps).
2. **Apps Script.** Paste over / add: `APZacct_WebAPI.gs` (v1.8), `APZacct_JurnalLaras.gs` (v1.2), `APZacct_Laporan.gs` (v1.2), `APZacct_RekonsiliasiBank.gs` (v1.1), `APZacct_Tambah_Akaun.gs` (v1.3), `APZacct_PosAgihanAPK.gs` (v1.1), `APZacct_Menu.gs` (v1.5) → Save. **Redeploy the Web App** (Deploy → Manage deployments → pencil → Version: *New version* → Deploy); if Google asks you to authorize again, approve. Set Apps Script *Project Settings → Time zone* to Asia/Kuala_Lumpur.
3. **Website (Cloudflare).** Upload the eight `APZacct-…_v1.3` files and `_redirects`; delete the v1.2 files and the old generic names (`index.html`, `app.js`, …). Open the root URL: the wizard should appear. `APZacct-config_v1.3.js` carries the API URL and secret from your project copy — check they are current.
4. Once per new sheet, from the APZacct menu: *Lindungi Helaian Formula*, *Aktifkan Log Perubahan*, *Sediakan Senarai Kadar Statutori*. New customer only: Tetapan C5 (name), C6 (SKM no.), then §9 "Day 1".

---
## 1. The whole system in one picture
```
 WIZARD (web)  ──┐
 MENU (Sheets)  ─┼─►  Transaksi (1 header per transaction)  +  Baris_Transaksi (2+ lines = the LEDGER)
 typed rows     ─┘                          ▲ looks up each Kod Akaun in
                                        Akaun (chart: Jenis + Kumpulan Aliran Tunai)
                                            ▼
                                     Imbangan_Duga  (totals per account, SEIMBANG check)
                          ┌──────────────┬──┴───────────┬─────────────┐
                          ▼              ▼              ▼             ▼
                         UR            KKK             AT           APK ──(menu Pos Agihan APK posts back into the ledger)
                          └──────────────┴──────┬───────┴─────────────┘
                                                ▼
                                        Cetak ──► PDF (menu)
```
**Golden rules:** (1) you only ever *record transactions*; statements are formulas — never type into UR, KKK, AT, APK, Imbangan_Duga or Cetak. (2) Every transaction balances (Debit = Kredit). (3) After each batch of entries check that Imbangan_Duga, KKK and AT say **SEIMBANG**.

## 2. Tab by tab
| Tab | What it is | You type here? | Fed by → feeds |
|---|---|---|---|
| **Panduan** | short in-workbook help | no | — |
| **Tetapan** | settings (col C). C5 name, C6 SKM no., C15-17 statutory rates, C18 opening-transaction ID (auto), C19 petty-cash alert limit, C20 web-app URL, C21 period-lock date (text YYYY-MM-DD), C22 last depreciation year (auto) | yes (col C) | read by menus, APK, AT, Nota |
| **Kamus_Istilah** | glossary | optional | — |
| **Akaun** | chart of accounts: Kod, names, **Jenis** (Aset/Liabiliti/Ekuiti/Hasil/Perbelanjaan), **F = Kumpulan Aliran Tunai**, G = Aktif/Tidak Aktif, I = Semasa/Bukan Semasa | via menu *Tambah Akaun* | every other tab looks accounts up by Kod |
| **Baki_Pembukaan** | staging list for opening balances (Kod + Debit *or* Kredit; balance-sheet accounts only) | yes, then menu *Pos Baki Pembukaan* | → ledger, Sejarah_Baki, Tetapan!C18 |
| **Daftar_Aset_Tetap** | fixed-asset register; column K = this year's depreciation (depends on today's date) | yes | → menu *Pos Susut Nilai Aset* |
| **Transaksi** | one header row per transaction (ID, Tarikh, Perkara, No. PV/RT, Kaedah, Status, URL resit) | via wizard/menu | with Baris_Transaksi |
| **Baris_Transaksi** | the ledger lines. G = Kumpulan (auto), H = Jenis (auto) | via wizard/menu; **never G/H** | → Imbangan_Duga, AT |
| **Log_Perubahan** | audit trail: editing an already-filled ledger cell asks for a reason and logs it | no (auto) | — |
| **Imbangan_Duga** | trial balance: totals per account + the SEIMBANG check | no | → UR, KKK, AT, APK |
| **UR** | profit & loss: Hasil − Perbelanjaan = Lebihan Bersih | no | → APK, KKK, AT, Cetak |
| **APK** | distribution of surplus (koperasi): rates from Tetapan, yellow cells = board decisions | yellow cells only | → menu *Pos Agihan APK* |
| **KKK** | balance sheet; own SEIMBANG check (Aset = Liabiliti + Ekuiti) | no | → Cetak |
| **AT** | cash-flow statement (indirect method, 4 sections); own SEIMBANG check | no (B6 stays 0) | → Cetak |
| **Wang_Runcit** | petty-cash count log; see §6 | via menu *Semak Wang Runcit* | reads the ledger balance of Wang Runcit |
| **Cetak** | print mirror of KKK/UR/APK/AT + AI summary box | no | → menu *Cetak Penyata Kewangan* (PDF) |

## 3. "Kumpulan Aliran Tunai (auto)" — what it means
**One sentence:** each account carries a label saying *which part of the cash-flow statement its money belongs to*; every ledger line copies its account's label automatically (Baris_Transaksi column G), and AT adds the lines up by label.

| Kumpulan (Akaun col F) | Put here | Examples in the chart |
|---|---|---|
| **Tidak Berkaitan** | accounts that **hold money** (they *are* the cash being measured) + reserves | 1010 Wang Di Tangan, 1020 Bank, 1080 Wang Runcit; 3020 Rizab, 3030 Lebihan Terkumpul |
| **Operasi** | day-to-day business | all Hasil and Perbelanjaan; penghutang, prabayar, terakru, inventori, pemiutang, belum diperoleh, susut nilai terkumpul, peruntukan |
| **Pelaburan** | long-term assets | 1030 Deposit Tetap, 1040 Aset Tetap, 1050 ADK |
| **Pembiayaan** | how the organisation is funded | 3010 Modal Syer, loans, member savings |
| **Berkanun** | statutory payments and distributions | 2020 Dividen, 2070 Cukai, 2080 Zakat, 2090 Honorarium, 2100/2110 KWA |

**Example.** Pay RM400 office expense from the bank → two lines: 5010 Perbelanjaan Pejabat, Debit 400 (*Operasi*) and 1020 Bank, Kredit 400 (*Tidak Berkaitan*). AT sees a non-cash side labelled Operasi → operating cash −400. Buy a RM3,000 computer → 1040 (*Pelaburan*) Debit 3,000 → investing −3,000.

**How AT uses it (v1.1):** Operasi = Lebihan Bersih (UR) + B7 *(auto: movement of Aset/Liabiliti accounts labelled Operasi since the opening balances — prepaid, accruals, receivables, payables, inventory, accumulated depreciation)*. Pelaburan / Pembiayaan = credits − debits on lines with that label. Berkanun = payments (debits) only. Opening cash = the opening transaction's lines on all money accounts; closing cash (independent check) = current balance of every Aset account labelled Tidak Berkaitan. Semakan compares them.

**Rules when you add an account** (menu *Tambah Akaun* v1.2 now asks): bank / cash / petty cash → **4 Tidak Berkaitan**; receivable, prepaid, accrued, inventory, payable → **1 Operasi**; fixed asset, fixed deposit → **2 Pelaburan**; share capital, loan → **3 Pembiayaan**; statutory payable → **5 Berkanun**. **A bank account labelled anything but Tidak Berkaitan does not appear in the wizard's "Akaun wang" list — and if it were forced in, AT would silently mis-classify it (tested).** To check or fix: Akaun column F.

## 4. Everyday entries (wizard)
Menu *APZacct → Buka APZacct (Web App)* → **Mula** → **Jenis**: *Terimaan (DT)* money in / *Bayaran (KT)* money out / *Kontra* → **Kaedah** (Tunai / Bank / Online) → **Akaun wang** → **Kategori / akaun** (the other side) → **No. PV/RT** + optional attachment → **Tarikh** (default today in the Tetapan!C23 time zone, editable) → **Jumlah** → **Semak** → **Simpan**. Terimaan = Debit money account, Kredit category; Bayaran = the reverse. The wizard warns on words like *sewa, insurans, tahunan, setahun, deposit* (see §7: "Tukar kategori" or "Teruskan juga"). **Dates:** see §4b — the wizard no longer uses raw UTC; it uses the Tetapan!C23 time zone (default Asia/Kuala_Lumpur, UTC+8) and lets you pick the real date of an old item.

## 4b. Dates, back-dated entries and bringing a customer in mid-year
**How dates work (release 1.2).** The wizard has a **Tarikh** step: default = today in the Tetapan!C23 time zone, editable — pick the real date for old items. Bank import and Jurnal Laras ask for dates too. The server (WebAPI v1.7) checks every posted date:

| Case | Result |
|---|---|
| Not a real YYYY-MM-DD date | refused |
| Earlier than the opening-balance transaction's date (a previous fiscal year) | refused — use that year's workbook |
| On/before Tetapan!C21 (period lock) | accepted only with a reason; tagged *Entri Lewat*; reason logged in Log_Perubahan |
| Future date | accepted (the wizard shows a warning) |
| Anything else | accepted |

The statements never look at dates — every line in the workbook counts. So: **one workbook per fiscal year**, and a back-dated entry inside the year is correct immediately.

**Mid-year customer (recommended order).** (1) Load the audited closing balances as at the first day of the fiscal year (*Pos Baki Pembukaan*) and check KKK matches the audited balance sheet. (2) Leave Tetapan!C21 empty. (3) Back-fill January onward with real dates: bank statements via Import Penyata Bank (AI suggests categories, you confirm), cash items via the wizard / Jurnal Laras. (4) Prove it: each bank account's ledger balance must equal the statement balance (Rekonsiliasi Bank), and the trial balance should match the customer's own figures. (5) Set Tetapan!C21 to the last day of the verified period. (6) Carry on live. The ledger window is now 5,000 lines (about 2,490 two-line transactions) and the import pages post in one batch request (§12 item 1), so half a year of history fits. Imbangan_Duga row 154 shows how full the ledger is.

## 5. Kontra — moving money between your own accounts
Use **Kontra**, never Bayaran/Terimaan, when money only moves between accounts you own. Nothing is earned or spent; total money is unchanged (tested: UR unchanged, AT sections all 0, SEIMBANG).
Wizard: **Mula → Kontra / Pindahan → "Pindah DARI akaun mana?" → "Pindah KE akaun mana?" → No. rujukan → Jumlah → Semak → Simpan.** Both lists show money accounts only; source and destination cannot be the same.

| Situation | DARI → KE | Ledger result (RM300 example) |
|---|---|---|
| Withdraw cash from bank | Bank → Wang Di Tangan | Debit 1010 300 / Kredit 1020 300 |
| Bank in your cash collections | Wang Di Tangan → Bank | Debit 1020 300 / Kredit 1010 300 |
| Set up or top up petty cash | Bank → Wang Runcit | Debit 1080 300 / Kredit 1020 300 |
| Return unused petty cash | Wang Runcit → Bank | Debit 1020 / Kredit 1080 |

**Common mistakes:** recording a withdrawal as *Bayaran* (creates a fake expense and a fake category); recording a deposit as *Terimaan* (fake income); forgetting one side (bank statement and ledger then disagree — Rekonsiliasi Bank shows it). Reference: put the slip / cheque number in **No. rujukan**.

## 6. Wang_Runcit tab — and the "500"
* **B4 "Float ditetapkan / diisytiharkan" is reference only.** I searched every formula in all 16 sheets: **nothing reads B4**. Keeping 500 changes no statement and no check; it only misleads a reader. v1.1 ships it blank — type your real imprest float (e.g. the RM you top petty cash back up to) or leave it blank.
* **B5 = book balance**, taken from the ledger (account 1080). It starts at 0. **B6/B7** = date and physical count (filled by the menu). **B9** = Baki Buku − Baki Fizikal; **B10** = SEPADAN / PERLU SIASAT; count history from row 17.
* Workflow: (1) Kontra Bank → Wang Runcit for the float; (2) each petty purchase: **Bayaran** with *Akaun wang = Wang Runcit*; (3) top-up = Kontra again; (4) count the tin, then menu **Semak Wang Runcit** → type the counted amount → it logs and warns if the difference exceeds Tetapan!C19 (default RM10).

## 7. Accruals and prepayments (terakru / terdahulu)
*Terakru* = it has **happened** but money has not moved. *Terdahulu* = money **has** moved but it has not happened yet (paid / received early). The four accounts already exist in the chart:

| Your term | Meaning | Account (Jenis) |
|---|---|---|
| Perbelanjaan **terakru** | cost used, not yet paid | **2050** Perbelanjaan Terakru (Liabiliti) |
| Perbelanjaan **terdahulu** | paid early, not yet used | **1100** Perbelanjaan Prabayar (Aset) |
| Pendapatan **terakru** | earned, not yet received | **1110** Pendapatan Terakru (Aset) |
| Pendapatan **terdahulu** | received early, not yet earned | **2060** Pendapatan Belum Diperoleh (Liabiliti) |

**Why two tools:** the wizard needs a money account on one side, so it records only the leg where money moves. The leg where **no money moves** goes through **menu → Jurnal Laras (terakru / prabayar)** (new). Jurnal Laras asks: type 1-5 → Debit account code → Kredit account code → amount → date → description → confirm. It refuses money accounts and wrong account types, warns if the date is inside the locked period (Tetapan!C21), and posts one balanced "Jurnal".

**Decision test:** ① Has the money moved? ② Has the cost/income happened? Money yes + happened no → *terdahulu*. Money no + happened yes → *terakru*.

**7.1 Perbelanjaan terakru** — December internet bill RM300, unpaid on 31 Dec.
* 31 Dec: **Jurnal Laras type 3** → Debit 5150 Internet dan Telefon 300 / Kredit 2050 300, date 2026-12-31.
* Later, when paid: wizard **Bayaran**, Akaun wang = Bank, **Kategori = Perbelanjaan Terakru**, RM300 (Debit 2050 / Kredit 1020). *Do not* pick the expense again — that would count it twice.
* Effect (tested): December UR expense +300; December AT operating 0 (cash has not moved); the paying month shows operating −300.

**7.2 Perbelanjaan terdahulu (prepaid)** — 12 months' rent RM2,400 paid on 10 Jan.
* On payment: wizard **Bayaran**, **Kategori = Perbelanjaan Prabayar** (if you type "sewa" the wizard offers this — choose *Tukar kategori*). Debit 1100 2,400 / Kredit 1020 2,400.
* Each month-end: **Jurnal Laras type 4** → Debit 5010 Perbelanjaan Pejabat 200 / Kredit 1100 200.
* After January (tested): UR expense 200; prepaid asset left 2,200; AT operating −2,400 = the cash actually paid.

**7.3 Pendapatan terakru** — service delivered, RM800 not yet billed/received at year-end.
* 31 Dec: **Jurnal Laras type 1** → Debit 1110 800 / Kredit 4050 Pendapatan Perkhidmatan 800.
* When received: wizard **Terimaan**, **Kategori = Pendapatan Terakru** (Debit 1020 / Kredit 1110).
* Effect (tested): year-end surplus +800, AT operating 0; receipt month operating +800.

**7.4 Pendapatan terdahulu** — course fee RM600 received early.
* On receipt: wizard **Terimaan**, **Kategori = Pendapatan Belum Diperoleh** (Debit 1020 / Kredit 2060).
* Each month as delivered (RM100): **Jurnal Laras type 2** → Debit 2060 100 / Kredit 4060 Pendapatan Latihan & Kursus 100.
* Effect (tested): AT operating +600 (cash received); UR income only 100 so far; 500 still a liability.

**Fixing a wrong journal:** never delete rows. Post the opposite with **Jurnal Laras type 5** (swap Debit and Kredit). **Missing account?** menu *Tambah Akaun* → choose group **1 Operasi**. **Old balances** (accruals/prepaids already open at the audited year-end) go in through *Baki Pembukaan*, not through these journals.

## 8. Reading Imbangan_Duga (trial balance)
Columns: **Kod Akaun · Nama · Jenis · Jumlah Debit · Jumlah Kredit · Baki Debit · Baki Kredit · Baki Bersih (bertanda)**. Each account shows everything ever debited and credited, then the net balance on its natural side. Column H is *signed by the account's normal side* (positive = normal, whatever the type). Row 153 **Semakan** = SEIMBANG when total Baki Debit = total Baki Kredit.

Example after §7.2 (opening RM10,500 + rent paid + one month released):
| Kod | Akaun | Jenis | J. Debit | J. Kredit | Baki Debit | Baki Kredit |
|---|---|---|---|---|---|---|
| 1010 | Wang Di Tangan | Aset | 500 | 0 | 500 | |
| 1020 | Bank | Aset | 10,000 | 2,400 | 7,600 | |
| 1100 | Perbelanjaan Prabayar | Aset | 2,400 | 200 | 2,200 | |
| 3010 | Modal Syer Ahli | Ekuiti | 0 | 10,500 | | 10,500 |
| 5010 | Perbelanjaan Pejabat | Perbelanjaan | 200 | 0 | 200 | |
| | **Jumlah** | | 13,100 | 13,100 | **10,500** | **10,500** |

**How to use it:** (1) glance at Semakan after every batch; (2) to check an account, read its Baki Bersih against your own records / the bank statement; (3) expenses and assets normally sit on the Debit side, income/liabilities/equity on the Kredit side — a "wrong side" balance usually means a mis-picked Debit/Kredit; (4) if TIDAK SEIMBANG: menu **Diagnosis Ketidakseimbangan** lists unbalanced transactions, unknown account codes, headers without lines and lines without headers. Usual causes: a typed value overwritten in a formula sheet, a mistyped Kod Akaun, a half-typed transaction, or the 500-line limit (§12).

## 9. Day 1 for a new customer, then each month
**Day 1:** (1) Tetapan C5/C6; (2) review Akaun — deactivate (G = Tidak Aktif) what you will not use, add the rest with *Tambah Akaun*; (3) *Baki_Pembukaan*: enter the **audited closing balance-sheet accounts** (Hasil/Perbelanjaan are refused) → menu *Pos Baki Pembukaan* → the date is the first day of the new year; (4) KKK must reproduce the audited balance sheet **line for line** — do not go further until it does; (5) deploy the web app (APZacct-config_v1.3.js holds URL + secret); (6) run 2-3 months in parallel with the old books.
**Monthly:** entries via wizard; Jurnal Laras for accruals and prepaid releases; Rekonsiliasi Bank (web) against the statement; Semak Wang Runcit; Imbangan_Duga / KKK / AT all SEIMBANG; then Cetak → PDF.
**Year-end:** Jurnal Laras for open accruals; menu *Pos Susut Nilai Aset* on/near the year-end date (column K depends on today's date); statements; APK and *Pos Agihan APK* only **after** the board/AGM approves — it hard-stops when the current period has no surplus; Nota (§10).

## 10. What to do with the Nota template
* **What it is:** the fifth GP23 statement component, *Nota-Nota Kepada Akaun* — 37 numbered notes. Every note asks *Berkaitan? Ya/Tidak* and for **your own account codes**; the numbers then pull from Imbangan_Duga by those codes. Nothing is pre-filled for any organisation.
* **Do you need it now? No.** It is a year-end job for a koperasi presenting GP23 statements (the Board prepares it; the auditor audits it). It is **not** needed for a non-koperasi/base user.
* **Which file:** use `APZacct_Template_Kosong_Nota_v1.3.xlsx` — the normal template with the Nota tab (and an empty Sejarah_Baki tab) already wired to the live sheets (tested: 0 formula errors; a posted asset purchase and depreciation flowed into Note 6 correctly).
* **Do not import the old standalone `APZacct_Nota_Template.xlsx` into a live sheet.** It carries five helper sheets with the same names as live ones, and I could not verify how Google Sheets resolves that on import (I could only test in LibreOffice). For a customer who has not started, simply begin from the Nota variant; for a live sheet, rebuild from the variant and re-post the opening balances (minutes).
* **How to fill it (at year-end, after every entry is posted and all three checks say SEIMBANG):** (1) Tetapan C5 and C6; (2) each note: set *Berkaitan?* and type the account **code(s)** from your Akaun; leave non-applicable notes at Tidak (they show 0); (3) fill the manual fields (board sign-off date, board expense by person, employee count, contingencies); (4) cross-check note totals against KKK; (5) print from Sheets (File → Print). The menu *Cetak Penyata Kewangan* still exports only the Cetak tab.

## 11. Is there an SKM/GP23 "switch"? Can this be a plain accounting app?
* **There is no switch.** The workbook is a koperasi (GP23-shaped) build. This version only made the *Panduan wording* neutral.
* **Koperasi-specific parts:** the APK tab and menu *Pos Agihan APK*; Tetapan C15-17 (statutory rates) and the rate dropdown; the accounts 3010 Modal Syer, 3020 Rizab, 2020 Dividen, 2070-2110 statutory payables, 1050 ADK; AT's *Aktiviti Berkanun* section; KKK's "EKUITI AHLI" and UR/APK wording ("Lebihan"); Kamus terms; the Nota tab.
* **Run it as plain accounting today (no code):** ignore/hide APK and never run Pos Agihan APK; treat 3010 as owner's capital and 3030 as retained earnings; leave 3020 and the Berkanun accounts unused (AT's Berkanun line stays 0). Note: statement rows are typed labels + code formulas, so renaming an account in Akaun does **not** rename its statement row; and new accounts enter the JUMLAH lines but have no named row.
* **The proper base app:** a core whose statements are built from Akaun (no code-specific rows) plus selectable *framework packs* (koperasi/GP23 = APK, Nota, statutory rates, Berkanun; later MPERS/MFRS). That is one dedicated build iteration, best done after the pilot customer is validated.

## 12. Known limits — read before a real customer goes live
1. **Ledger window = 5,000 lines** (about 2,490 ordinary transactions; each uses 2 lines). Statements read Baris_Transaksi rows 5-5000; Imbangan_Duga row 154 shows *Kapasiti lejar* and turns to HAMPIR PENUH above 90%. The server refuses a post that would go past the window (error KAPASITI_PENUH) instead of letting it vanish from the statements. To go beyond, widen the ranges again (same method as Appendix D).
2. **Dates:** fixed in release 1.2 (wizard date step + Tetapan!C23 time zone + WebAPI v1.7 rules, §4b). Posting is still one row at a time (about 1-2 s each) — a batch endpoint is planned for back-fills.
3. **Access:** the web app is protected only by a shared secret in public JavaScript (real sign-in is planned; data will then live under each customer's own Google account). **Locking:** the web posts, batch posts and Jurnal Laras now take the script lock; Pos Baki Pembukaan, Pos Susut Nilai, Pos Agihan APK and Tambah Akaun do not yet (rarely run at the same time as others).
4. **Not yet run live:** Baki Pembukaan, bank-statement OCR and Rekonsiliasi, Pos Susut Nilai, Jurnal Laras, Tambah Akaun v1.2, Pos Agihan APK v1.1 (all mock/offline-tested only). Do one throw-away entry of each on the customer's sheet first.
5. **Tetapan!C21 period lock:** WebAPI v1.7 now reads a real date correctly; Plain text is still recommended (the template ships it that way).
6. No prior-year comparative columns yet; Nota is not part of the PDF export; up to 146 accounts (Akaun rows 5-150).

## 13. FAQ — why did the AT check break, and is that normal?
**What happened.** Imbangan_Duga and KKK never broke — double entry always balances. Only the *cash-flow statement's own check* broke, when something was still open at period end: a prepaid expense, an accrued expense, an accrued income, income received in advance (also receivables and payables). Reason: profit is not cash. Pay RM2,400 rent for a year: cash falls RM2,400 but this month's expense is only RM200. An indirect cash-flow statement must reconcile profit to cash with a **working-capital** line. AT v1.0 had that line as a typed 0 ("perlu data 2+ tempoh"), so its check could only pass when nothing was open.
**Is it normal?** The need is universal; the failure was our gap. Other packages derive the line automatically: QuickBooks classifies general-ledger accounts as Operating, Investing or Financing from the account type; AccountEdge requires every balance-sheet account except bank and credit-card accounts to carry one of those classes and works from balance sheets at two dates; Calxa notes that accrual accounts belong in Operating because they adjust the timing of operating cash. APZacct's *Kumpulan Aliran Tunai* is the same idea. v1.1 computes the line from the ledger (AT!B7) and keeps the self-check as a safety net, which most packages do not show you.
Sources: kaufmanrossin.com/blog/quickbooks-tip-use-cash-flow-statement · accountedge.helpjuice.com/statement-of-cash-flows-defined · helpme.calxa.com/en/articles/5272777-cashflow-statement

---
## Appendix A — AT patch for a live sheet built from template v1.0
1. **Baris_Transaksi:** H4 = `Jenis Akaun (auto)`. H5 = `=IF(C5="","",INDEX(Akaun!$D$5:$D$150,MATCH(C5,Akaun!$A$5:$A$150,0)))`, then fill down to H500.
2. **Akaun:** find code **1045** (Susut Nilai Terkumpul) → column F → change *Pelaburan* to **Operasi**.
3. **AT!B7** (was a typed 0) → paste:
`=SUMIFS(Baris_Transaksi!$E$5:$E$500,Baris_Transaksi!$G$5:$G$500,"Operasi",Baris_Transaksi!$H$5:$H$500,"Aset",Baris_Transaksi!$B$5:$B$500,"<>"&Tetapan!$C$18)-SUMIFS(Baris_Transaksi!$D$5:$D$500,Baris_Transaksi!$G$5:$G$500,"Operasi",Baris_Transaksi!$H$5:$H$500,"Aset",Baris_Transaksi!$B$5:$B$500,"<>"&Tetapan!$C$18)+SUMIFS(Baris_Transaksi!$E$5:$E$500,Baris_Transaksi!$G$5:$G$500,"Operasi",Baris_Transaksi!$H$5:$H$500,"Liabiliti",Baris_Transaksi!$B$5:$B$500,"<>"&Tetapan!$C$18)-SUMIFS(Baris_Transaksi!$D$5:$D$500,Baris_Transaksi!$G$5:$G$500,"Operasi",Baris_Transaksi!$H$5:$H$500,"Liabiliti",Baris_Transaksi!$B$5:$B$500,"<>"&Tetapan!$C$18)`
4. **AT!B23** → paste:
`=SUMIFS(Baris_Transaksi!$D$5:$D$500,Baris_Transaksi!$G$5:$G$500,"Tidak Berkaitan",Baris_Transaksi!$H$5:$H$500,"Aset",Baris_Transaksi!$B$5:$B$500,Tetapan!$C$18)-SUMIFS(Baris_Transaksi!$E$5:$E$500,Baris_Transaksi!$G$5:$G$500,"Tidak Berkaitan",Baris_Transaksi!$H$5:$H$500,"Aset",Baris_Transaksi!$B$5:$B$500,Tetapan!$C$18)`
5. **AT!B25** → paste:
`=SUMPRODUCT((Akaun!$D$5:$D$150="Aset")*(Akaun!$F$5:$F$150="Tidak Berkaitan")*Imbangan_Duga!$H$5:$H$150)`
6. Optional: AT!A7 → "Modal kerja & pelarasan bukan tunai (AUTO)"; AT!B6 stays 0 (do **not** type depreciation there). Tetapan!C21 → Format → Number → **Plain text**. Tetapan row 23 → A23 "Zon Masa", C23 `Asia/Kuala_Lumpur`. Wang_Runcit!B4 → your float or blank.
7. **Check:** AT Semakan reads SEIMBANG. Test with a throw-away accrual (Jurnal Laras type 3, RM10) — AT must stay SEIMBANG — then reverse it with type 5.

## Appendix D — widen the ledger window on a live sheet built from an older template
1. **Formulas:** Edit → Find and replace → Find `$500` → Replace with `$5000` → tick *Also search within formulas* → Search *All sheets* → Replace all (about 617 replacements, all in Imbangan_Duga and AT). **Run it once only** — running it again would turn `$5000` into `$50000`.
2. **Helper columns:** on Baris_Transaksi copy G500:H500 and paste into G501:H5000.
3. **Capacity row (optional):** Imbangan_Duga A154 `Kapasiti lejar (baris digunakan):`, B154 `=COUNTA(Baris_Transaksi!$B$5:$B$5000)&" / 4996"`, C154 `=IF(COUNTA(Baris_Transaksi!$B$5:$B$5000)>4996*0.9,"HAMPIR PENUH - lebarkan julat formula","OK")`.
4. **Check:** Imbangan_Duga, KKK and AT still read SEIMBANG. The Nota tab (if present) already reads whole columns and needs nothing.

## Appendix B — accounts used in the examples (from the shipped chart)
1010 Wang Di Tangan · 1020 Bank · 1040 Aset Tetap · 1045 Susut Nilai Terkumpul · 1080 Wang Runcit · 1090 Pelbagai Penghutang · 1100 Perbelanjaan Prabayar · 1110 Pendapatan Terakru · 2010 Pelbagai Pemiutang · 2050 Perbelanjaan Terakru · 2060 Pendapatan Belum Diperoleh · 3010 Modal Syer Ahli · 4050 Pendapatan Perkhidmatan · 4060 Pendapatan Latihan & Kursus · 5010 Perbelanjaan Pejabat · 5150 Internet dan Telefon · 5160 Susut Nilai Aset.

## Appendix C — how this was verified
`APZacct_test_workbook_scenarios_v1.3.py`: 18 scenarios (incl. a 701-line and a 4,983-line ledger) + a second-bank case posted into a copy of the template and recalculated (Kontra ×3, receipts/payments, prepaid, accrued expense/income open and settled, deferred income, asset + depreciation, share capital + fixed deposit, statutory payment, receivable, payable, opening balances with receivables/payables/retained earnings) — Imbangan_Duga, KKK and AT SEIMBANG in all, AT sections as expected. `APZacct_test_gs_mock_v1.3.js`: 70 checks (all 15 .gs load in one shared scope, every menu handler exists, Jurnal Laras, the loss-year guard, Tambah Akaun, WebAPI date rules / period lock / time zone / script lock / batch posting / capacity). `APZacct_test_frontend_jsdom_v1.3.js`: 14 checks that drive the real wizard and bank-import pages in jsdom (needs `npm i jsdom`).
