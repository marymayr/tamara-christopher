/* Hochzeitsseite – Titel, Begrüßung und das Hochladen von Fotos und Videos
   in Google Drive (über ein Google Apps Script). Einstellungen: config.js */
(function () {
  'use strict';

  var C = window.HOCHZEIT || {};
  var URL_SKRIPT = C.skriptUrl || '';
  var DEMO = !URL_SKRIPT;
  var MB = 1024 * 1024;
  var MAX = (C.maxMB || 500) * MB;
  var CHUNK = 4 * MB;          // Google verlangt Teilstücke in Vielfachen von 256 KB
  var GLEICHZEITIG = 2;        // mehr bringt im Hochzeits-WLAN meist nichts

  var $ = function (id) { return document.getElementById(id); };
  var code = '';

  function speicher(key, wert) {
    try {
      if (wert === undefined) return localStorage.getItem(key);
      localStorage.setItem(key, wert);
    } catch (e) { return null; }
  }

  /* ---------------- Titel & Texte ---------------- */

  var MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli',
    'August', 'September', 'Oktober', 'November', 'Dezember'];
  var TAGE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  var zwei = function (n) { return (n < 10 ? '0' : '') + n; };

  function titel() {
    var n1 = C.name1 || 'Tamara', n2 = C.name2 || 'Christopher';
    $('n1').textContent = n1;
    $('n2').textContent = n2;
    $('f-names').textContent = n1 + ' & ' + n2;

    var p = String(C.datum || '2026-10-24').split('-').map(Number);
    var tag = new Date(p[0], p[1] - 1, p[2]);
    $('datum').textContent = zwei(p[2]) + ' · ' + zwei(p[1]) + ' · ' + p[0];
    $('datum-lang').textContent = TAGE[tag.getDay()] + ', ' + p[2] + '. ' + MONATE[p[1] - 1] + ' ' + p[0];
    $('f-date').textContent = zwei(p[2]) + '.' + zwei(p[1]) + '.' + p[0];
    document.title = n1 + ' & ' + n2 + ' · ' + zwei(p[2]) + '.' + zwei(p[1]) + '.' + p[0];

    var heute = new Date(); heute.setHours(0, 0, 0, 0);
    var rest = Math.round((tag - heute) / 864e5);
    var cd = $('countdown');
    cd.textContent = rest > 1 ? 'Noch ' + rest + ' Tage'
      : rest === 1 ? 'Morgen ist es so weit'
      : rest === 0 ? 'Heute ist der große Tag'
      : 'Danke, dass ihr dabei wart';
    cd.hidden = false;

    if (C.ort) { $('ort').textContent = C.ort; $('ort').hidden = false; }
    if (C.begruessung) $('begruessung').textContent = C.begruessung;
    else $('begruessung').hidden = true;

    if (C.titelbild) {
      var hero = $('hero');
      hero.style.setProperty('--titelbild', 'url("' + encodeURI(C.titelbild) + '")');
      hero.classList.add('mit-bild');
    }

    if (C.fotos && C.fotos.length) {
      var reihe = $('fotoreihe');
      C.fotos.forEach(function (src) {
        var img = document.createElement('img');
        img.src = src; img.alt = ''; img.loading = 'lazy';
        reihe.appendChild(img);
      });
      reihe.hidden = false;
    }

    $('max-mb').textContent = C.maxMB || 500;
  }

  /* ---------------- Gäste-Code ---------------- */

  function zugang() {
    $('demo-banner').hidden = !DEMO;
    if (!C.gastCode) return frei();

    var ausLink = new URLSearchParams(location.search).get('code');
    var kandidat = ausLink || speicher('hz-code');
    var form = $('code-form');

    var versuche = function (c) {
      return (DEMO ? Promise.resolve() : rufe({ aktion: 'pruefen', code: c })).then(function () {
        code = c;
        speicher('hz-code', c);
        form.hidden = true;
        frei();
      });
    };

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      $('code-error').hidden = true;
      versuche($('code').value.trim()).catch(function (err) {
        $('code-error').textContent = err.istCode ? 'Dieser Code stimmt leider nicht.' : err.message;
        $('code-error').hidden = false;
      });
    });

    if (kandidat) {
      versuche(kandidat).catch(function () { form.hidden = false; });
    } else {
      form.hidden = false;
    }
  }

  function frei() {
    $('upload-card').hidden = false;
    var name = speicher('hz-name');
    if (name) $('gastname').value = name;
  }

  /* ---------------- Auswahl ---------------- */

  var liste = [];      // alle Dateien dieser Sitzung
  var laufend = 0;

  function initAuswahl() {
    var input = $('files'), drop = $('drop');
    $('pick').addEventListener('click', function () { input.click(); });
    input.addEventListener('change', function () {
      hinzufuegen(input.files);
      input.value = '';
    });
    $('gastname').addEventListener('change', function () {
      speicher('hz-name', $('gastname').value.trim());
    });

    ['dragenter', 'dragover'].forEach(function (t) {
      drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.add('over'); });
    });
    ['dragleave', 'drop'].forEach(function (t) {
      drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.remove('over'); });
    });
    drop.addEventListener('drop', function (e) {
      if (e.dataTransfer && e.dataTransfer.files) hinzufuegen(e.dataTransfer.files);
    });

    $('retry').addEventListener('click', function () {
      liste.forEach(function (it) {
        if (it.status === 'fehler' && it.nochmal) { it.status = 'wartet'; zeige(it, 0, 'Wartet …'); }
      });
      weiter();
    });

    window.addEventListener('beforeunload', function (e) {
      if (laufend > 0 || liste.some(function (it) { return it.status === 'wartet'; })) {
        e.preventDefault(); e.returnValue = '';
      }
    });
  }

  function hinzufuegen(files) {
    speicher('hz-name', $('gastname').value.trim());
    Array.prototype.forEach.call(files, function (file) {
      var istVideo = /^video\//.test(file.type) || /\.(mov|mp4|m4v)$/i.test(file.name);
      var istBild = /^image\//.test(file.type) || /\.(heic|heif)$/i.test(file.name);
      var it = { file: file, video: istVideo, bild: istBild, status: 'wartet', name: $('gastname').value.trim() };
      it.li = zeile(it);
      liste.push(it);

      if (!istVideo && !istBild) return fehler(it, 'Nur Fotos und Videos möglich');
      if (file.size > MAX) {
        return fehler(it, 'Zu groß (' + mb(file.size) + ' MB, höchstens ' + (C.maxMB || 500) + ' MB)');
      }
      zeige(it, 0, 'Wartet …');
    });
    weiter();
  }

  function mb(n) { return (n / MB).toFixed(n < 10 * MB ? 1 : 0).replace('.', ','); }

  function zeile(it) {
    var li = document.createElement('li');
    var th;
    if (it.bild && !/\.(heic|heif)$/i.test(it.file.name)) {
      th = document.createElement('img');
      th.src = URL.createObjectURL(it.file);
      th.onload = function () { URL.revokeObjectURL(th.src); };
      th.alt = '';
    } else {
      th = document.createElement('span');
      th.textContent = it.video ? 'VIDEO' : 'FOTO';
    }
    th.className = 'thumb';
    li.appendChild(th);
    var info = document.createElement('div');
    info.className = 'qinfo';
    info.innerHTML = '<div class="qname"></div><div class="qstatus"></div><div class="bar"><i></i></div>';
    info.querySelector('.qname').textContent = it.file.name;
    li.appendChild(info);
    $('queue').insertBefore(li, $('queue').firstChild);
    return li;
  }

  function zeige(it, anteil, text, klasse) {
    it.li.querySelector('.bar > i').style.width = Math.round(anteil * 100) + '%';
    var st = it.li.querySelector('.qstatus');
    st.textContent = text;
    st.className = 'qstatus' + (klasse ? ' ' + klasse : '');
    it.li.classList.toggle('done', klasse === 'ok');
    zusammenfassung();
  }

  function fehler(it, text) {
    it.status = 'fehler';
    zeige(it, 0, text, 'err');
  }

  function zusammenfassung() {
    var fertig = 0, fehl = 0, gesamt = liste.length;
    liste.forEach(function (it) {
      if (it.status === 'fertig') fertig++;
      if (it.status === 'fehler') fehl++;
    });
    var s = $('summary');
    s.hidden = gesamt === 0;
    var alleDurch = fertig + fehl === gesamt;
    if (alleDurch && fehl === 0) {
      s.textContent = fertig === 1 ? 'Danke! Euer Beitrag ist angekommen.' : 'Danke! Alle ' + fertig + ' Dateien sind angekommen.';
      s.className = 'summary fertig';
    } else {
      s.textContent = fertig + ' von ' + gesamt + ' hochgeladen' + (fehl ? ' · ' + fehl + ' fehlgeschlagen' : '');
      s.className = 'summary';
    }
    var nochmal = liste.some(function (it) { return it.status === 'fehler' && it.nochmal; });
    $('retry').hidden = !(alleDurch && nochmal);
  }

  /* ---------------- Warteschlange ---------------- */

  function weiter() {
    while (laufend < GLEICHZEITIG) {
      var it = liste.find(function (x) { return x.status === 'wartet'; });
      if (!it) break;
      starte(it);
    }
  }

  function starte(it) {
    it.status = 'laeuft';
    it.nochmal = false;
    laufend++;
    zeige(it, 0, 'Wird hochgeladen …');
    it.li.classList.add('unbestimmt');
    (DEMO ? vorspielen(it) : hochladen(it))
      .then(function () {
        it.status = 'fertig';
        zeige(it, 1, DEMO ? 'Fertig (Vorschau – nicht gespeichert)' : 'Angekommen ✓', 'ok');
      })
      .catch(function (err) {
        it.nochmal = !(err && err.endgueltig);
        fehler(it, (err && err.message) || 'Hochladen fehlgeschlagen');
      })
      .then(function () {
        it.li.classList.remove('unbestimmt');
        laufend--;
        weiter();
      });
  }

  /* ---------------- Google Drive (über Apps Script) ---------------- */

  function hochladen(it) {
    var f = it.file;
    var basis = { code: code, gast: it.name, name: f.name, mime: f.type || '', groesse: f.size };
    var stand = function (bytes) {
      var anteil = bytes / f.size;
      zeige(it, anteil, 'Wird hochgeladen … ' + Math.round(anteil * 100) + ' %');
    };

    // Kleine Dateien (die meisten Fotos) in einem Rutsch
    if (f.size <= CHUNK) {
      return base64(f).then(function (daten) {
        return wiederholen(function () {
          return rufe(mit(basis, { aktion: 'ganz', daten: daten }));
        }, 3);
      });
    }

    // Große Dateien in Teilstücken – bricht das WLAN kurz ab, geht nur ein Stück verloren
    return wiederholen(function () { return rufe(mit(basis, { aktion: 'start' })); }, 3).then(function (r) {
      var von = 0;
      it.li.classList.remove('unbestimmt');
      stand(0);
      var naechstes = function () {
        var bis = Math.min(von + CHUNK, f.size);
        return base64(f.slice(von, bis)).then(function (daten) {
          return wiederholen(function () {
            return rufe({ aktion: 'teil', code: code, sitzung: r.sitzung, von: von, groesse: f.size, daten: daten });
          }, 3);
        }).then(function (antwort) {
          von = bis;
          stand(von);
          return von < f.size ? naechstes() : antwort;
        });
      };
      return naechstes();
    });
  }

  function mit(a, b) {
    var o = {};
    Object.keys(a).forEach(function (k) { o[k] = a[k]; });
    Object.keys(b).forEach(function (k) { o[k] = b[k]; });
    return o;
  }

  function base64(blob) {
    return new Promise(function (ok, nein) {
      var r = new FileReader();
      r.onload = function () { ok(String(r.result).slice(String(r.result).indexOf(',') + 1)); };
      r.onerror = function () { nein(new Error('Datei konnte nicht gelesen werden')); };
      r.readAsDataURL(blob);
    });
  }

  function wiederholen(fn, mal, pause) {
    pause = pause || 2000;
    return fn().catch(function (err) {
      if (mal <= 1 || err.endgueltig) throw err;
      return new Promise(function (ok) { setTimeout(ok, pause); })
        .then(function () { return wiederholen(fn, mal - 1, pause * 2); });
    });
  }

  /* Ein Aufruf an das Apps Script. Als text/plain gesendet und ohne
     Upload-Fortschritt, damit kein Browser eine Vorab-Anfrage (OPTIONS) stellt –
     die beantwortet Apps Script nicht, und Safari schickt sie, sobald man
     xhr.upload beobachtet. Den Fortschritt gibt es deshalb je Teilstück. */
  function rufe(daten) {
    return new Promise(function (ok, nein) {
      var xhr = new XMLHttpRequest();
      xhr.open('POST', URL_SKRIPT);
      xhr.setRequestHeader('Content-Type', 'text/plain;charset=utf-8');
      xhr.onload = function () {
        var a = null;
        try { a = JSON.parse(xhr.responseText); } catch (e) { /* leer */ }
        if (a && a.ok) return ok(a);
        var err;
        if (a && a.fehler === 'code') {
          err = new Error('Der Gäste-Code stimmt nicht');
          err.istCode = true;
        } else {
          err = new Error(a && a.fehler ? a.fehler : 'Fehler ' + xhr.status + ' beim Hochladen');
        }
        err.endgueltig = !!(a && a.endgueltig);
        nein(err);
      };
      xhr.onerror = function () { nein(new Error('Keine Verbindung – bitte später nochmal versuchen')); };
      xhr.send(JSON.stringify(daten));
    });
  }

  /* Vorschau-Modus: tut so, als würde hochgeladen. */
  function vorspielen(it) {
    it.li.classList.remove('unbestimmt');
    return new Promise(function (ok) {
      var p = 0;
      var t = setInterval(function () {
        p = Math.min(1, p + 0.08 + Math.random() * 0.1);
        zeige(it, p, 'Wird hochgeladen … ' + Math.round(p * 100) + ' %');
        if (p >= 1) { clearInterval(t); ok(); }
      }, 180);
    });
  }

  titel();
  zugang();
  initAuswahl();
})();
