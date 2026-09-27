/* ------------------------------------------------------------------
   Empfänger für die Hochzeitsseite – läuft als Google Apps Script
   im Google-Konto, dem der Drive-Ordner gehört.
   Die Seite schickt jede Datei hierher, das Skript legt sie im
   Ordner ab, für jeden Gast in einem eigenen Unterordner.
   Einrichtung: siehe README.md, Abschnitt 1.
   ------------------------------------------------------------------ */

// ID des Drive-Ordners: der letzte Teil der Adresse, wenn der Ordner
// in Google Drive offen ist (…/folders/HIER_STEHT_DIE_ID)
var ORDNER_ID = '';

// Optional: Code, den Gäste brauchen. Leer = jeder mit dem Link darf hochladen.
// Bleibt hier im Skript und ist auf der Webseite nicht zu sehen.
var GAST_CODE = '';

// Größte erlaubte Datei in MB
var MAX_MB = 500;

// Bis zu welchem Datum hochgeladen werden darf (leer = unbegrenzt), z. B. '2026-11-30'
var LETZTER_TAG = '';


function doGet(e) {
  if (e && e.parameter && e.parameter.test) return antwort(selbsttest());
  return antwort({ ok: true, info: 'Hochzeit-Upload läuft.', ordner: ordnerId() ? 'eingetragen' : 'FEHLT',
    tipp: 'Für einen vollständigen Test ?test=1 an die Adresse anhängen.' });
}

/* Prüft Schritt für Schritt, ob alles klappt: Adresse/exec?test=1 im Browser öffnen.
   Legt dabei zwei winzige Testdateien an und wirft sie gleich wieder in den Papierkorb. */
function selbsttest() {
  var schritte = [];
  var schritt = function (name, fn) {
    try {
      var r = fn();
      schritte.push({ schritt: name, ok: true, info: r === undefined ? '' : r });
      return true;
    } catch (err) {
      schritte.push({ schritt: name, ok: false, fehler: String((err && err.message) || err) });
      return false;
    }
  };
  var ordner, sitzung;
  var alles = schritt('1 Ordner-ID eingetragen', function () {
      if (!ordnerId()) throw new Error('ORDNER_ID ist leer');
      return ordnerId();
    })
    && schritt('2 Ordner in Drive gefunden', function () {
      ordner = DriveApp.getFolderById(ordnerId());
      return ordner.getName();
    })
    && schritt('3 Kleine Datei anlegen', function () {
      var f = gastOrdner('Selbsttest').createFile(Utilities.newBlob('Test', 'text/plain', 'test-klein.txt'));
      f.setTrashed(true);
      return 'ok';
    })
    && schritt('4 Upload-Sitzung für große Dateien öffnen', function () {
      sitzung = start({ name: 'test-gross.txt', mime: 'image/jpeg', groesse: 4, gast: 'Selbsttest' }).sitzung;
      if (!sitzung) throw new Error('Google hat keine Sitzungs-Adresse geliefert');
      return 'ok';
    })
    && schritt('5 Teilstück senden', function () {
      var r = teil({ sitzung: sitzung, von: 0, groesse: 4, daten: Utilities.base64Encode('Test') });
      if (!r.fertig) throw new Error('Datei nicht abgeschlossen');
      DriveApp.getFileById(r.id).setTrashed(true);
      return 'ok';
    });
  return { ok: !!alles, schritte: schritte };
}

function doPost(e) {
  try {
    var d = JSON.parse(e.postData.contents);
    if (LETZTER_TAG && new Date() > new Date(LETZTER_TAG + 'T23:59:59')) return stopp('Das Hochladen ist beendet.');
    if (GAST_CODE && norm(d.code) !== norm(GAST_CODE)) return stopp('code');
    if (!ordnerId()) return stopp('Im Skript ist noch kein Drive-Ordner eingetragen.');

    if (d.aktion === 'pruefen') return antwort({ ok: true });
    if (d.aktion === 'ganz') return antwort(ganz(d));
    if (d.aktion === 'start') return antwort(start(d));
    if (d.aktion === 'teil') return antwort(teil(d));
    return stopp('Unbekannte Aktion');
  } catch (err) {
    return antwort({ ok: false, fehler: String((err && err.message) || err), endgueltig: !!(err && err.endgueltig) });
  }
}

/* Kleine Datei: in einem Rutsch anlegen */
function ganz(d) {
  pruefe(d);
  var bytes = Utilities.base64Decode(d.daten);
  var blob = Utilities.newBlob(bytes, d.mime || 'application/octet-stream', dateiname(d.name));
  var datei = gastOrdner(d.gast).createFile(blob);
  datei.setDescription('Von: ' + (d.gast || 'ohne Namen'));
  return { ok: true, fertig: true, id: datei.getId() };
}

/* Große Datei: Google Drive öffnet eine Upload-Sitzung, die Teile folgen einzeln */
function start(d) {
  pruefe(d);
  var meta = {
    name: dateiname(d.name),
    parents: [gastOrdner(d.gast).getId()],
    description: 'Von: ' + (d.gast || 'ohne Namen')
  };
  var res = UrlFetchApp.fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true', {
    method: 'post',
    contentType: 'application/json; charset=UTF-8',
    payload: JSON.stringify(meta),
    headers: {
      Authorization: 'Bearer ' + ScriptApp.getOAuthToken(),
      'X-Upload-Content-Type': d.mime || 'application/octet-stream',
      'X-Upload-Content-Length': String(d.groesse)
    },
    muteHttpExceptions: true
  });
  if (res.getResponseCode() !== 200) throw new Error('Drive-Sitzung ' + res.getResponseCode() + ': ' + driveFehler(res));
  var h = res.getHeaders();
  return { ok: true, sitzung: h.Location || h.location };
}

function teil(d) {
  // Nur echte Drive-Upload-Sitzungen annehmen, keine beliebigen Adressen
  if (!/^https:\/\/www\.googleapis\.com\/upload\/drive\/v3\/files\?[^\s]*upload_id=/.test(String(d.sitzung))) {
    throw endgueltig('Ungültige Upload-Sitzung');
  }
  var bytes = Utilities.base64Decode(d.daten);
  var von = Number(d.von), gesamt = Number(d.groesse);
  var res = UrlFetchApp.fetch(d.sitzung, {
    method: 'put',
    contentType: 'application/octet-stream',
    payload: bytes,
    headers: { 'Content-Range': 'bytes ' + von + '-' + (von + bytes.length - 1) + '/' + gesamt },
    muteHttpExceptions: true
  });
  var code = res.getResponseCode();
  if (code === 308) return { ok: true, fertig: false };
  if (code === 200 || code === 201) return { ok: true, fertig: true, id: JSON.parse(res.getContentText()).id };
  throw new Error('Drive-Teil ' + code + ': ' + driveFehler(res));
}

/* ---------------- Hilfen ---------------- */

function pruefe(d) {
  var mime = String(d.mime || '');
  if (!/^(image|video)\//.test(mime) && !/\.(heic|heif|mov|mp4|jpe?g|png)$/i.test(String(d.name))) {
    throw endgueltig('Nur Fotos und Videos möglich');
  }
  if (Number(d.groesse) > MAX_MB * 1024 * 1024) throw endgueltig('Datei größer als ' + MAX_MB + ' MB');
}

function gastOrdner(gast) {
  var name = String(gast || '').replace(/[\/\\<>:"|?*\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60) || 'Ohne Namen';
  var haupt = mitWiederholung(function () { return DriveApp.getFolderById(ordnerId()); });
  // Sperre: lädt ein Gast mehrere Dateien gleichzeitig, entsteht trotzdem nur ein Ordner
  var sperre = LockService.getScriptLock();
  sperre.waitLock(20000);
  try {
    var it = haupt.getFoldersByName(name);
    return it.hasNext() ? it.next() : haupt.createFolder(name);
  } finally {
    sperre.releaseLock();
  }
}

/* Nimmt auch eine ganze Drive-Adresse an und holt die ID heraus */
function ordnerId() {
  var m = String(ORDNER_ID || '').match(/[-\w]{20,}/);
  return m ? m[0] : '';
}

/* Google Drive antwortet gelegentlich kurz mit einem Fehler – dann noch einmal versuchen */
function mitWiederholung(fn) {
  for (var i = 0; ; i++) {
    try { return fn(); } catch (err) {
      if (i >= 2) throw err;
      Utilities.sleep(800 * (i + 1));
    }
  }
}

function driveFehler(res) {
  var t = res.getContentText();
  try { return JSON.parse(t).error.message; } catch (e) { return t.slice(0, 200); }
}

function dateiname(n) {
  return String(n || 'datei').replace(/[\/\\\u0000-\u001f]/g, '_').slice(0, 120);
}

function norm(s) { return String(s || '').trim().toUpperCase(); }

function endgueltig(text) { var e = new Error(text); e.endgueltig = true; return e; }

function stopp(text) { return antwort({ ok: false, fehler: text, endgueltig: true }); }

function antwort(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
