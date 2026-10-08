/**
 * APZacct — Master Menu
 * ---------------------------------------------------
 * v1.5 (this file) — adds "Jurnal Laras (terakru / prabayar)", calling posJurnalLaras()
 * (new file, APZacct_JurnalLaras.gs), grouped with the other posting functions.
 * (v1.4: Sediakan Senarai Kadar Statutori. v1.3: Pos Susut Nilai Aset.)
 * Still the ONLY file that should define onOpen() — every other APZacct .gs file defines its
 * functions but not a menu. Apps Script treats every pasted file as one shared project; two
 * functions named onOpen() means only the last one loaded actually runs, and the others
 * silently vanish. If you paste in a new script later with its own onOpen(), delete that block
 * and add its menu item here instead.
 *
 * SETUP: paste this alongside all your other APZacct .gs files.
 */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('APZacct')
    .addItem('Buka APZacct (Web App)', 'bukaWebApp')
    .addSeparator()
    .addItem('Tambah Akaun (Add Account)', 'tambahAkaun')
    .addSeparator()
    .addItem('Pos Baki Pembukaan', 'posBakiPembukaan')
    .addItem('Jurnal Laras (terakru / prabayar)', 'posJurnalLaras')
    .addItem('Pos Agihan APK', 'posAgihanAPK')
    .addItem('Pos Susut Nilai Aset', 'posSusutNilai')
    .addItem('Semak Wang Runcit', 'semakWangRuncit')
    .addSeparator()
    .addItem('Cetak Penyata Kewangan', 'cetakPenyataKewangan')
    .addItem('Diagnosis Ketidakseimbangan', 'diagnosisKetidakseimbangan')
    .addItem('Jana Ringkasan AI', 'janaRingkasanAI')
    .addSeparator()
    .addItem('Lindungi Helaian Formula (jalankan sekali)', 'lindungiHelaianFormula')
    .addItem('Aktifkan Log Perubahan (jalankan sekali)', 'setupRevisionLogTrigger')
    .addItem('Sediakan Senarai Kadar Statutori (jalankan sekali)', 'sediakanSenaraiKadarStatutori')
    .addToUi();
}
