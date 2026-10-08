// APZacct v1.3 - APZacct-wizard_v1.3.js (was app.js). v1.3: no logic change (renumbered with the release). v1.2: date step, time zone from Tetapan, late-entry reason, server messages shown as-is.
// ---------------------------------------------------------------
// APZacct — wizard config
// API_URL / API_SECRET / MAX_FILE_MB now live in APZacct-config_v1.3.js, loaded
// before this file in APZacct-index_v1.3.html — see that file for why. Nothing
// else on this page changes: everything below is the same wizard
// logic as before, just no longer declaring those three constants
// itself.
// ---------------------------------------------------------------

(function () {
  var state = freshState();
  var step = 0;
  var accounts = [];
  var accountsLoaded = false;
  var accountsError = '';
  var sessionEntries = [];
  var summaryOpen = false;
  var zonMasa = ZON_MASA_LALAI, tarikhKunci = '', tarikhPembukaan = '';

  function freshState() {
    return {
      jenis: null, kaedah: null, akaunWang: '', kategori: '',
      dariAkaun: '', keAkaun: '',
      noPV: '', tarikh: '', sebabLewat: '', jumlah: '', savedId: '', urlResitHasil: '',
      fileData: null, fileName: '', fileMime: ''
    };
  }

  function isKontra() { return state.jenis === 'kontra'; }

  // v1.2 - dates use the time zone from Tetapan (default Asia/Kuala_Lumpur), never raw UTC
  function tarikhHariIni() {
    try {
      var p = new Intl.DateTimeFormat('en-US', { timeZone: zonMasa || ZON_MASA_LALAI, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
      var m = {}; p.forEach(function (x) { m[x.type] = x.value; });
      return m.year + '-' + m.month + '-' + m.day;
    } catch (e) {
      var d = new Date(), z = function (n) { return (n < 10 ? '0' : '') + n; };
      return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate());
    }
  }
  function tarikhSah(t) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return false;
    var d = new Date(t + 'T00:00:00Z');
    return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === t;
  }
  function isLewat() { return !!(tarikhKunci && state.tarikh && state.tarikh <= tarikhKunci); }
  function tarikhPaparan() { return (state.tarikh || '-') + (isLewat() ? ' (entri lewat)' : ''); }
  function escAttr(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }

  function clearError() { document.getElementById('error-msg').textContent = ''; }

  function optionCard(key, val, glyph, label, sub) {
    var active = state[key] === val;
    return (
      '<button type="button" class="option-card' + (active ? ' active' : '') + '" data-key="' + key + '" data-val="' + val + '">' +
      '<span class="glyph" aria-hidden="true">' + glyph + '</span>' +
      '<span><span class="label">' + label + '</span>' +
      (sub ? '<span class="sub">' + sub + '</span>' : '') +
      '</span></button>'
    );
  }

  function accountOptions(filterFn, selectedVal) {
    var pool = accounts.filter(filterFn);
    var opts = '<option value="">Pilih akaun...</option>';
    pool.forEach(function (a) {
      opts += '<option value="' + a.kod + '" ' + (String(selectedVal) === String(a.kod) ? 'selected' : '') + '>' + a.namaBm + '</option>';
    });
    return opts;
  }

  function moneyAccounts() {
    return function (a) { return a.jenis === 'Aset' && a.kumpulanAliranTunai === 'Tidak Berkaitan'; };
  }

  var ACCRUAL_KEYWORDS = ['tahunan', 'setahun', 'insurans', 'sewa', 'pendahuluan', 'advance', 'annual', 'yearly', 'deposit'];
  var accrualAcknowledged = false;

  function checkAccrualHint() {
    var haystack = ((state.noPV || '') + ' ' + ((findAccount(state.kategori) || {}).namaBm || '')).toLowerCase();
    var hit = ACCRUAL_KEYWORDS.filter(function (k) { return haystack.indexOf(k) !== -1; })[0];
    if (!hit) return null;
    var suggestAsset = state.jenis === 'kt'; // paying out something spanning periods -> likely Prabayar; receiving -> likely Belum Diperoleh
    return {
      keyword: hit,
      suggestion: suggestAsset ? 'Perbelanjaan Prabayar' : 'Pendapatan Belum Diperoleh'
    };
  }

  function reviewRow(label, val) {
    return '<div class="review-row"><span>' + label + '</span><span>' + val + '</span></div>';
  }

  function findAccount(kod) {
    return accounts.filter(function (a) { return String(a.kod) === String(kod); })[0];
  }

  function loadingOrError() {
    if (accountsError) return '<p class="hint">Tidak dapat muatkan senarai akaun: ' + accountsError + '. Semak API_URL dan API_SECRET di APZacct-config_v1.3.js.</p>';
    return '<p class="hint">Memuatkan senarai akaun...</p>';
  }

  // ---- step definitions; visibility of some steps depends on Jenis (Kontra skips Kaedah + Kategori) ----
  var allSteps = {
    intro: {
      label: 'Langkah 1', next: 'Mula', validate: function () { return ''; },
      render: function () {
        return (
          '<div class="intro-block"><div class="intro-glyph" aria-hidden="true">&#9776;</div>' +
          '<h2>Ada kemasukan baharu?</h2>' +
          '<p class="hint">Rekod transaksi anda, langkah demi langkah.</p></div>'
        );
      }
    },
    jenis: {
      label: '',
      validate: function () { return state.jenis ? '' : 'Pilih terimaan, bayaran, atau kontra dahulu.'; },
      render: function () {
        return (
          '<h2>Jenis kemasukan?</h2>' +
          optionCard('jenis', 'dt', '&darr;', 'Terimaan (DT)', 'Wang masuk') +
          optionCard('jenis', 'kt', '&uarr;', 'Bayaran (KT)', 'Wang keluar') +
          optionCard('jenis', 'kontra', '&harr;', 'Kontra / Pindahan', 'Antara akaun wang sendiri, cth. petty ke bank')
        );
      }
    },
    kaedah: {
      label: '',
      validate: function () { return state.kaedah ? '' : 'Pilih kaedah dahulu.'; },
      render: function () {
        return (
          '<h2>Kaedah?</h2>' +
          optionCard('kaedah', 'Tunai', '&#9679;', 'Tunai', '') +
          optionCard('kaedah', 'Bank', '&#9642;', 'Bank / cek', '') +
          optionCard('kaedah', 'Online', '&#9673;', 'Online transfer', '')
        );
      }
    },
    akaunWang: {
      label: '',
      validate: function () { return state.akaunWang ? '' : 'Pilih akaun wang dahulu.'; },
      render: function () {
        if (!accountsLoaded) return loadingOrError();
        return '<h2>Akaun wang?</h2><p class="hint">Akaun yang menerima atau membayar.</p>' +
          '<select id="sel-akaunWang">' + accountOptions(moneyAccounts(), state.akaunWang) + '</select>';
      }
    },
    kategori: {
      label: '',
      validate: function () { return state.kategori ? '' : 'Pilih kategori dahulu.'; },
      render: function () {
        if (!accountsLoaded) return loadingOrError();
        return '<h2>Kategori / akaun?</h2><p class="hint">Akaun sebenar yang berkaitan transaksi ini.</p>' +
          '<select id="sel-kategori">' + accountOptions(function (a) { return String(a.kod) !== String(state.akaunWang); }, state.kategori) + '</select>';
      }
    },
    dariAkaun: {
      label: '',
      validate: function () { return state.dariAkaun ? '' : 'Pilih akaun asal dahulu.'; },
      render: function () {
        if (!accountsLoaded) return loadingOrError();
        return '<h2>Pindah DARI akaun mana?</h2>' +
          '<select id="sel-dariAkaun">' + accountOptions(moneyAccounts(), state.dariAkaun) + '</select>';
      }
    },
    keAkaun: {
      label: '',
      validate: function () {
        if (!state.keAkaun) return 'Pilih akaun destinasi dahulu.';
        if (String(state.keAkaun) === String(state.dariAkaun)) return 'Akaun destinasi tidak boleh sama dengan akaun asal.';
        return '';
      },
      render: function () {
        if (!accountsLoaded) return loadingOrError();
        return '<h2>Pindah KE akaun mana?</h2>' +
          '<select id="sel-keAkaun">' + accountOptions(function (a) { return moneyAccounts()(a) && String(a.kod) !== String(state.dariAkaun); }, state.keAkaun) + '</select>';
      }
    },
    pvrt: {
      label: '',
      validate: function () { return ''; },
      render: function () {
        return (
          '<h2>No. PV / RT (rujukan)</h2>' +
          '<p class="hint">Pilihan sahaja. Boleh isi nombor dahulu dan muat naik dokumen kemudian secara manual, atau lampirkan terus di sini jika sudah sedia.</p>' +
          '<input id="inp-pv" type="text" placeholder="PV-0231 atau RT-0045" value="' + state.noPV + '">' +
          '<label class="field-label" style="margin-top:10px;">Lampiran (pilihan)</label>' +
          '<input id="inp-file" type="file" accept="image/*,.pdf">' +
          (state.fileName ? '<p class="hint">Dipilih: ' + state.fileName + '</p>' : '')
        );
      }
    },
    tarikh: {
      label: '',
      validate: function () {
        var t = state.tarikh || tarikhHariIni();
        if (!tarikhSah(t)) return 'Tarikh tidak sah (format YYYY-MM-DD).';
        if (tarikhPembukaan && t < tarikhPembukaan) return 'Tarikh ini (' + t + ') sebelum baki pembukaan (' + tarikhPembukaan + '). Entri tempoh lepas tidak boleh dipos dalam buku kerja ini.';
        state.tarikh = t;
        if (isLewat() && !String(state.sebabLewat || '').trim()) return 'Tarikh ini dalam tempoh yang sudah dikunci (' + tarikhKunci + '). Nyatakan sebab entri lewat dahulu.';
        return '';
      },
      render: function () {
        var t = state.tarikh || tarikhHariIni(), hari = tarikhHariIni();
        var sah = tarikhSah(t), lewat = !!(tarikhKunci && sah && t <= tarikhKunci);
        var nota = '<p class="hint">Hari ini: ' + hari + ' (zon masa ' + escAttr(zonMasa) + '). Tukar jika transaksi berlaku pada tarikh lain.</p>';
        if (sah && t > hari) nota += '<p class="hint" style="color:var(--danger);">Tarikh ini pada masa hadapan \u2014 pastikan ia memang betul.</p>';
        else if (sah && t < hari && !lewat) nota += '<p class="hint">Entri bertarikh lepas (backdated) \u2014 pastikan tarikh betul.</p>';
        var sebab = lewat
          ? '<div style="border:1.5px solid var(--accent); background:var(--accent-soft); border-radius:8px; padding:12px 14px;">' +
            '<p style="margin:0 0 8px; font-size:13px; color:var(--ink);">Tarikh ini dalam tempoh yang sudah dikunci (hingga ' + escAttr(tarikhKunci) + ') \u2014 penyata tempoh itu mungkin sudah dibentangkan. Nyatakan sebab; ia direkod dalam Log_Perubahan.</p>' +
            '<input id="inp-sebab" type="text" placeholder="Sebab entri lewat" value="' + escAttr(state.sebabLewat) + '"></div>'
          : '';
        return '<h2>Tarikh transaksi</h2>' + nota + '<input id="inp-tarikh" type="date" value="' + (sah ? t : hari) + '">' + sebab;
      }
    },
    jumlah: {
      label: '',
      next: 'Semak',
      validate: function () { return (state.jumlah && Number(state.jumlah) > 0) ? '' : 'Masukkan jumlah yang sah.'; },
      render: function () {
        return '<h2>Jumlah (RM)</h2><input id="inp-jumlah" type="number" min="0" step="0.01" placeholder="0.00" value="' + state.jumlah + '">';
      }
    },
    review: {
      label: 'Semak', next: 'Simpan',
      validate: function () {
        if (!isKontra() && !accrualAcknowledged && checkAccrualHint()) {
          return 'Pilih "Tukar kategori" atau "Teruskan juga" di atas dahulu.';
        }
        return '';
      },
      render: function () {
        var hint = (!isKontra() && !accrualAcknowledged) ? checkAccrualHint() : null;
        var hintBlock = '';
        if (hint) {
          hintBlock =
            '<div style="border:1.5px solid var(--accent); background:var(--accent-soft); border-radius:8px; padding:12px 14px; margin-bottom:10px;">' +
            '<p style="margin:0 0 8px; font-size:13px; color:var(--ink);">Perkataan "' + hint.keyword + '" dikesan \u2014 ini kelihatan seperti ia meliputi lebih daripada satu tempoh. Pertimbangkan akaun <strong>' + hint.suggestion + '</strong> supaya ia diagih ikut tempoh sebenar, bukan terus dalam bulan ini.</p>' +
            '<div style="display:flex; gap:8px;">' +
            '<button type="button" id="accrual-change-btn" class="btn btn-ghost" style="flex:1; padding:8px 10px; font-size:13px;">Tukar kategori</button>' +
            '<button type="button" id="accrual-proceed-btn" class="btn btn-ghost" style="flex:1; padding:8px 10px; font-size:13px;">Teruskan juga</button>' +
            '</div></div>';
        }
        if (isKontra()) {
          var dari = findAccount(state.dariAkaun), ke = findAccount(state.keAkaun);
          return '<h2>Semak dan simpan</h2>' + hintBlock + '<div>' +
            reviewRow('Jenis', 'Kontra / Pindahan') +
            reviewRow('Tarikh', tarikhPaparan()) +
            reviewRow('Dari akaun', dari ? dari.namaBm : state.dariAkaun) +
            reviewRow('Ke akaun', ke ? ke.namaBm : state.keAkaun) +
            reviewRow('No. rujukan', state.noPV || '-') +
            reviewRow('Lampiran', state.fileName || 'Tiada') +
            reviewRow('Jumlah', 'RM ' + Number(state.jumlah).toFixed(2)) + '</div>';
        }
        var akaunWangAcc = findAccount(state.akaunWang), kategoriAcc = findAccount(state.kategori);
        return '<h2>Semak dan simpan</h2>' + hintBlock + '<div>' +
          reviewRow('Jenis', state.jenis === 'dt' ? 'Terimaan (DT)' : 'Bayaran (KT)') +
          reviewRow('Tarikh', tarikhPaparan()) +
          reviewRow('Kaedah', state.kaedah) +
          reviewRow('Akaun wang', akaunWangAcc ? akaunWangAcc.namaBm : state.akaunWang) +
          reviewRow('Kategori', kategoriAcc ? kategoriAcc.namaBm : state.kategori) +
          reviewRow('No. PV/RT', state.noPV || '-') +
          reviewRow('Lampiran', state.fileName || 'Tiada') +
          reviewRow('Jumlah', 'RM ' + Number(state.jumlah).toFixed(2)) + '</div>';
      }
    },
    selesai: {
      label: 'Selesai', next: 'Tambah lagi', last: true, validate: function () { return ''; },
      render: function () {
        var uploadNote = '';
        if (state.fileName && state.urlResitHasil && String(state.urlResitHasil).indexOf('RALAT') === 0) {
          uploadNote = '<p class="hint" style="color:var(--danger);">Muat naik lampiran gagal (' + state.urlResitHasil + ') — kemasukan tetap disimpan, muat naik semula secara manual bila sempat.</p>';
        } else if (state.fileName && state.urlResitHasil) {
          uploadNote = '<p class="hint">Lampiran berjaya dimuat naik ke Drive.</p>';
        }
        return (
          '<div class="intro-block"><div class="intro-glyph" aria-hidden="true">&#10003;</div>' +
          '<h2>Berjaya disimpan</h2>' +
          '<p class="hint">ID transaksi: ' + state.savedId + '</p>' + uploadNote + '</div>' +
          '<button type="button" id="view-summary-btn" class="btn btn-ghost" style="width:100%; margin-top:8px;">Lihat semua kemasukan sesi ini (' + sessionEntries.length + ')</button>'
        );
      }
    }
  };

  function currentFlow() {
    if (isKontra()) return ['intro', 'jenis', 'dariAkaun', 'keAkaun', 'pvrt', 'tarikh', 'jumlah', 'review', 'selesai'];
    return ['intro', 'jenis', 'kaedah', 'akaunWang', 'kategori', 'pvrt', 'tarikh', 'jumlah', 'review', 'selesai'];
  }

  function currentStepKey() { return currentFlow()[step]; }

  function stepLabelFor(key) {
    if (key === 'intro') return allSteps.intro.label;
    if (key === 'review' || key === 'selesai') return allSteps[key].label;
    var flow = currentFlow();
    var middleSteps = flow.slice(1, flow.length - 2); // everything between intro and review/selesai
    var idx = middleSteps.indexOf(key);
    return 'Langkah ' + (idx + 2) + ' / ' + (middleSteps.length + 1);
  }

  function bind() {
    document.querySelectorAll('.option-card').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state[btn.dataset.key] = btn.dataset.val;
        clearError();
        render();
      });
    });
    ['akaunWang', 'kategori', 'dariAkaun', 'keAkaun'].forEach(function (key) {
      var sel = document.getElementById('sel-' + key);
      if (sel) sel.addEventListener('change', function (e) { state[key] = e.target.value; clearError(); });
    });
    var pv = document.getElementById('inp-pv');
    if (pv) pv.addEventListener('input', function (e) { state.noPV = e.target.value; });
    var jumlah = document.getElementById('inp-jumlah');
    if (jumlah) jumlah.addEventListener('input', function (e) { state.jumlah = e.target.value; clearError(); });
    var tgl = document.getElementById('inp-tarikh');
    if (tgl) tgl.addEventListener('change', function (e) { state.tarikh = e.target.value; clearError(); render(); });
    var sbb = document.getElementById('inp-sebab');
    if (sbb) sbb.addEventListener('input', function (e) { state.sebabLewat = e.target.value; clearError(); });
    var file = document.getElementById('inp-file');
    if (file) file.addEventListener('change', handleFileSelect);
    var viewSummaryBtn = document.getElementById('view-summary-btn');
    if (viewSummaryBtn) viewSummaryBtn.addEventListener('click', openSummary);
    var accrualChangeBtn = document.getElementById('accrual-change-btn');
    if (accrualChangeBtn) accrualChangeBtn.addEventListener('click', function () {
      clearError();
      step = currentFlow().indexOf('kategori');
      render();
    });
    var accrualProceedBtn = document.getElementById('accrual-proceed-btn');
    if (accrualProceedBtn) accrualProceedBtn.addEventListener('click', function () {
      accrualAcknowledged = true;
      clearError();
      render();
    });
  }

  function handleFileSelect(e) {
    var f = e.target.files[0];
    if (!f) return;
    if (f.size > MAX_FILE_MB * 1024 * 1024) {
      document.getElementById('error-msg').textContent = 'Fail terlalu besar (had ' + MAX_FILE_MB + 'MB).';
      e.target.value = '';
      return;
    }
    var reader = new FileReader();
    reader.onload = function () {
      state.fileData = reader.result.split(',')[1]; // strip the data: prefix, keep base64 only
      state.fileMime = f.type;
      state.fileName = f.name;
      render();
    };
    reader.readAsDataURL(f);
  }

  function render() {
    var key = currentStepKey();
    var s = allSteps[key];
    document.getElementById('step-label').textContent = stepLabelFor(key);
    var flow = currentFlow();
    document.getElementById('progress-bar').style.width = Math.round(((step + 1) / flow.length) * 100) + '%';
    document.getElementById('step-content').innerHTML = s.render();
    document.getElementById('back-btn').dataset.hidden = step === 0 ? 'true' : 'false';
    var nextBtn = document.getElementById('next-btn');
    nextBtn.textContent = s.next || 'Seterusnya';
    var needsAccounts = ['akaunWang', 'kategori', 'dariAkaun', 'keAkaun'].indexOf(key) !== -1;
    nextBtn.disabled = needsAccounts && !accountsLoaded;
    bind();
  }

  function buildLines() {
    var jumlah = Number(state.jumlah);
    if (isKontra()) {
      return [
        { kodAkaun: state.keAkaun, debit: jumlah, kredit: 0, memo: state.noPV || 'Kontra' },
        { kodAkaun: state.dariAkaun, debit: 0, kredit: jumlah, memo: state.noPV || 'Kontra' }
      ];
    }
    if (state.jenis === 'dt') {
      return [
        { kodAkaun: state.akaunWang, debit: jumlah, kredit: 0, memo: state.noPV || '' },
        { kodAkaun: state.kategori, debit: 0, kredit: jumlah, memo: state.noPV || '' }
      ];
    }
    return [
      { kodAkaun: state.kategori, debit: jumlah, kredit: 0, memo: state.noPV || '' },
      { kodAkaun: state.akaunWang, debit: 0, kredit: jumlah, memo: state.noPV || '' }
    ];
  }

  function saveTransaction() {
    var nextBtn = document.getElementById('next-btn');
    nextBtn.disabled = true;
    nextBtn.textContent = 'Menyimpan...';

    var payload = {
      secret: API_SECRET,
      tarikh: state.tarikh,
      sebabLewat: isLewat() ? String(state.sebabLewat || '').trim() : '',
      perkara: isKontra() ? 'Kontra / Pindahan' : ((findAccount(state.kategori) || {}).namaBm || ''),
      noPV: state.noPV,
      kaedah: isKontra() ? 'Kontra' : state.kaedah,
      lines: buildLines(),
      fileData: state.fileData,
      fileMime: state.fileMime,
      fileName: state.fileName
    };

    fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.error) {
          document.getElementById('error-msg').textContent = data.error;
          nextBtn.disabled = false;
          nextBtn.textContent = 'Simpan';
          return;
        }
        state.savedId = data.idTransaksi;
        state.urlResitHasil = data.urlResit || '';
        sessionEntries.push({
          id: data.idTransaksi,
          tarikh: state.tarikh,
          jenis: isKontra() ? 'Kontra' : (state.jenis === 'dt' ? 'Terimaan' : 'Bayaran'),
          perkara: payload.perkara,
          jumlah: Number(state.jumlah),
          noPV: state.noPV || '-',
          fileName: state.fileName || 'Tiada',
          urlResitHasil: data.urlResit || ''
        });
        step += 1;
        render();
      })
      .catch(function (err) {
        document.getElementById('error-msg').textContent = 'RALAT SAMBUNGAN: ' + err.message + '. Semak API_URL di APZacct-config_v1.3.js dan sambungan internet.';
        nextBtn.disabled = false;
        nextBtn.textContent = 'Simpan';
      });
  }

  function loadAccounts() {
    fetch(API_URL + '?secret=' + encodeURIComponent(API_SECRET))
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.error) { accountsError = data.error; return; }
        accounts = data.accounts || [];
        accountsLoaded = true;
        zonMasa = data.zonMasa || ZON_MASA_LALAI; tarikhKunci = data.tarikhKunciTempoh || ''; tarikhPembukaan = data.tarikhPembukaan || '';
        render();
      })
      .catch(function (err) { accountsError = err.message; render(); });
  }

  // ---- session summary overlay ----
  function openSummary() {
    summaryOpen = true;
    var rows = sessionEntries.map(function (e, i) {
      return (
        '<div style="padding:12px 0; border-bottom:1px solid var(--line);">' +
        '<div style="display:flex; justify-content:space-between; font-size:13px; color:var(--muted);">' +
        '<span>#' + (i + 1) + ' &middot; ' + e.jenis + '</span><span>' + e.id + '</span></div>' +
        '<div style="font-weight:600; margin:2px 0;">' + e.perkara + '</div>' +
        '<div style="font-size:13px; color:var(--muted);">' + e.tarikh + ' &middot; RM ' + e.jumlah.toFixed(2) + ' &middot; Rujukan: ' + e.noPV + ' &middot; Lampiran: ' + e.fileName + '</div>' +
        '</div>'
      );
    }).join('');
    var jumlahBesar = sessionEntries.reduce(function (sum, e) { return sum + e.jumlah; }, 0);
    document.getElementById('step-content').innerHTML =
      '<h2>Kemasukan sesi ini (' + sessionEntries.length + ')</h2>' +
      (sessionEntries.length ? rows : '<p class="hint">Tiada kemasukan lagi.</p>') +
      '<div class="review-row" style="margin-top:8px;"><span>Jumlah keseluruhan</span><span>RM ' + jumlahBesar.toFixed(2) + '</span></div>';
    document.getElementById('step-label').textContent = 'Ringkasan sesi';
    document.getElementById('back-btn').dataset.hidden = 'false';
    document.getElementById('next-btn').textContent = 'Tutup ringkasan';
  }

  function closeSummary() {
    summaryOpen = false;
    render();
  }

  // ---- exit ----
  function attemptExit() {
    var sure = window.confirm('Adakah anda pasti mahu keluar?');
    if (!sure) return;
    window.close();
    // window.close() is silently ignored by most browsers for tabs the user
    // opened directly (only works for tabs opened via script) — show a
    // fallback so the person isn't left staring at a button that "did nothing"
    document.getElementById('step-content').innerHTML =
      '<div class="intro-block"><h2>Selamat tinggal</h2><p class="hint">Anda boleh tutup tab/tetingkap ini dengan selamat sekarang.</p></div>';
    document.getElementById('step-label').textContent = '';
    document.getElementById('progress-bar').style.width = '0%';
    document.querySelector('.wizard-actions').style.display = 'none';
  }

  document.getElementById('next-btn').addEventListener('click', function () {
    if (summaryOpen) { closeSummary(); return; }
    var key = currentStepKey();
    var s = allSteps[key];
    var msg = s.validate();
    if (msg) { document.getElementById('error-msg').textContent = msg; return; }
    clearError();
    var flow = currentFlow();
    if (key === 'review') { saveTransaction(); return; }
    if (s.last) { state = freshState(); step = 0; accrualAcknowledged = false; } else { step = Math.min(step + 1, flow.length - 1); }
    render();
  });

  document.getElementById('back-btn').addEventListener('click', function () {
    if (summaryOpen) { closeSummary(); return; }
    clearError();
    step = Math.max(step - 1, 0);
    render();
  });

  document.getElementById('exit-btn').addEventListener('click', attemptExit);

  render();
  loadAccounts();
})();
