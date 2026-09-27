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


function doGet() {
  return antwort({ ok: true, info: 'Hochzeit-Upload läuft.', ordner: ORDNER_ID ? 'eingetragen' : 'FEHLT' });
}

function doPost(e) {
  try {
    var d = JSON.parse(e.postData.contents);
    if (LETZTER_TAG && new Date() > new Date(LETZTER_TAG + 'T23:59:59')) return stopp('Das Hochladen ist beendet.');
    if (GAST_CODE && norm(d.code) !== norm(GAST_CODE)) return stopp('code');
    if (!ORDNER_ID) return stopp('Im Skript ist noch kein Drive-Ordner eingetragen.');

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
  if (res.getResponseCode() !== 200) throw new Error('Drive ' + res.getResponseCode() + ': ' + res.getContentText().slice(0, 200));
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
  throw new Error('Drive ' + code + ': ' + res.getContentText().slice(0, 200));
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
  var haupt = DriveApp.getFolderById(ORDNER_ID);
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

function dateiname(n) {
  return String(n || 'datei').replace(/[\/\\\u0000-\u001f]/g, '_').slice(0, 120);
}

function norm(s) { return String(s || '').trim().toUpperCase(); }

function endgueltig(text) { var e = new Error(text); e.endgueltig = true; return e; }

function stopp(text) { return antwort({ ok: false, fehler: text, endgueltig: true }); }

function antwort(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
