# Hochzeitsseite · Tamara & Christopher · 24.10.2026

Eine kleine, eigenständige Webseite ohne eigenen Server – nur HTML, CSS und
JavaScript.

- **Titelseite** mit den Namen in Schreibschrift, dem Datum und einem Countdown
- **Begrüßung** und auf Wunsch eine kleine Reihe eigener Fotos
- **Hochladen** von Fotos und kurzen Videos durch die Gäste – direkt vom Handy
  in einen **Google-Drive-Ordner**, für jeden Gast in einem eigenen Unterordner.
  Gäste sehen nur, was sie selbst hochgeladen haben. Den Ordner sieht nur, wer
  ihn in Google Drive öffnen darf – also später das Brautpaar.

Aufruf über GitHub Pages: `https://marymayr.github.io/tamara-christopher/`

GitHub Pages einmalig einschalten: Repository → **Settings** → **Pages** →
*Source*: „Deploy from a branch“, *Branch*: `main`, Ordner `/ (root)` → **Save**.
Nach ein bis zwei Minuten ist die Seite unter der Adresse oben erreichbar.

---

## So funktioniert es

```
Handy des Gastes  ──►  Google Apps Script (Web-App)  ──►  Google-Drive-Ordner
   (diese Seite)        läuft in eurem Google-Konto        …/Anna & Lukas/IMG_1234.jpg
```

Die Webseite selbst kennt kein Passwort und keinen Zugang zu Google Drive. Sie
schickt die Dateien an ein kleines Skript (`apps-script/Code.gs`), das in eurem
Google-Konto läuft und die Dateien in den Ordner legt. Große Videos gehen in
Teilstücken von 4 MB, damit ein kurzer WLAN-Aussetzer nicht alles abbricht.

**Speicherplatz:** Ein kostenloses Google-Konto hat 15 GB (geteilt mit Gmail und
Google Fotos). Das reicht für einige tausend Handyfotos und ein paar kurze
Videos. Wird es knapp, kostet Google One mit 100 GB rund 2 € im Monat.

**Tipp:** Legt für die Hochzeit ein **eigenes Google-Konto** an, z. B.
`tamara.christopher.hochzeit@gmail.com`. Dann sind die vollen 15 GB frei, und
nach der Feier gebt ihr dem Brautpaar einfach die Zugangsdaten.

---

## 1. Google Drive einrichten (einmalig, ca. 10 Minuten)

1. **Ordner anlegen:** In Google Drive einen Ordner erstellen, z. B.
   „Hochzeit Tamara & Christopher – Gästefotos“. Den Ordner öffnen und aus der
   Adresszeile die **ID** kopieren – das ist der Teil nach `/folders/`:
   `https://drive.google.com/drive/folders/`**`1AbCdEfGhIjKlMnOpQrStUvWxYz`**
2. **Skript anlegen:** **script.google.com** öffnen (mit demselben Google-Konto)
   → **Neues Projekt**. Oben links den Namen ändern, z. B. „Hochzeit Upload“.
3. Den gesamten Inhalt von `apps-script/Code.gs` aus diesem Repository in den
   Editor kopieren (den vorhandenen Beispielcode vorher löschen).
4. Oben im Skript eintragen:
   ```js
   var ORDNER_ID = '1AbCdEfGhIjKlMnOpQrStUvWxYz';
   var GAST_CODE = '';          // optional, z. B. 'ROSE'
   var MAX_MB = 500;
   var LETZTER_TAG = '';        // optional, z. B. '2026-11-30'
   ```
   Speichern (Disketten-Symbol).
5. **Bereitstellen** → **Neue Bereitstellung** → beim Zahnrad **Web-App** wählen:
   - *Beschreibung*: beliebig
   - *Ausführen als*: **Ich**
   - *Zugriff*: **Jeder**
   → **Bereitstellen**.
6. Google fragt nach Berechtigungen → **Zugriff autorisieren** → Konto wählen.
   Es erscheint „Google hat diese App nicht überprüft“ – das ist normal bei
   eigenen Skripten: **Erweitert** → **Zu Hochzeit Upload wechseln (unsicher)** →
   **Zulassen**. Das Skript bekommt damit Zugriff auf euer Drive – es legt aber
   nur Dateien im eingetragenen Ordner an.
7. Die **Web-App-URL** kopieren (endet auf `/exec`).
8. **Selbsttest:** die URL im Browser öffnen und `?test=1` anhängen
   (`…/exec?test=1`). Das Skript prüft alle Schritte einzeln – bei jedem sollte
   `"ok":true` stehen. Wenn nicht, steht beim fehlerhaften Schritt der Grund.

**Wichtig bei Änderungen am Skript:** Nach jeder Änderung an `Code.gs` unter
**Bereitstellen → Bereitstellungen verwalten** → Stift → *Version*: **Neue
Version** → **Bereitstellen**. Sonst läuft weiter die alte Fassung. Die URL
bleibt dabei gleich.

## 2. Webseite verbinden

In `config.js` die Web-App-URL eintragen:

```js
skriptUrl: 'https://script.google.com/macros/s/AKfy…/exec',
```

Solange das Feld leer ist, läuft die Seite im **Vorschau-Modus**: Man kann
alles ausprobieren, aber es wird nichts gespeichert (ein gelber Hinweis sagt
das auch).

**Vor der Hochzeit unbedingt einmal selbst testen:** Mit dem Handy ein Foto und
ein kurzes Video hochladen und nachsehen, ob beides im Drive-Ordner ankommt.

## 3. Selbst gestalten

Alles in `config.js`:

| Feld | Wirkung |
|---|---|
| `name1`, `name2`, `datum` | Namen und Datum auf der Titelseite |
| `ort` | Ort unter dem Datum (leer = ausgeblendet) |
| `begruessung` | Satz unter dem Titel |
| `hintergrundbild` | Foto hinter der ganzen Seite, oben voll sichtbar, beim Scrollen durchsichtig (Standard `'bilder/hintergrund.jpg'`) |
| `hintergrundRest` | wie viel vom Foto unten noch zu sehen ist, `0` bis `1` (Standard `0.12`) |
| `fotos` | kleine Bildreihe, z. B. `['bilder/1.jpg', 'bilder/2.jpg']` |
| `gastCode` | `true` = die Seite fragt nach dem Code aus `GAST_CODE` |
| `maxMB` | größte Datei (gleich wie `MAX_MB` im Skript) |

Fotos einfach in den Ordner `bilder/` legen. **Hintergrundfoto:** als
`bilder/hintergrund.jpg` hochladen, dann erscheint es von selbst. Am Handy wird
es hochkant zugeschnitten: Das Paar sollte also eher in der Mitte stehen, mit
etwas Luft nach links und rechts. 1600–2000 Pixel an der langen Seite und unter
1 MB reichen völlig, sonst lädt die Seite unnötig lange. Farben und Schriften stehen oben in
`style.css`.

Nach einer Änderung an `style.css`, `app.js` oder `config.js` in `index.html`
die Zahl hinter `?v=` hochzählen, damit Handys die neue Fassung laden.

## 4. QR-Code für die Tische

Einen QR-Code auf die Adresse der Seite erstellen (jeder kostenlose
QR-Generator geht). Mit Gäste-Code die Adresse so eintragen, dann müssen die
Gäste nichts eintippen:

`https://marymayr.github.io/tamara-christopher/?code=ROSE`

## 5. Nach der Hochzeit: Fotos an das Brautpaar

- Jeder Gast hat im Drive-Ordner einen eigenen Unterordner mit seinem Namen,
  Gäste ohne Namen landen in „Ohne Namen“.
- **Übergabe:** Den Ordner in Google Drive für das Brautpaar freigeben
  (Rechtsklick → *Freigeben* → ihre E-Mail-Adresse, Rolle *Bearbeiter*) – oder,
  bei einem eigenen Hochzeitskonto, einfach die Zugangsdaten weitergeben.
- **Herunterladen:** Rechtsklick auf den Ordner → *Herunterladen*. Google packt
  alles in ZIP-Dateien (bei großen Mengen in mehrere).
- **Hochladen beenden:** `LETZTER_TAG` im Skript setzen, oder unter
  *Bereitstellen → Bereitstellungen verwalten* die Bereitstellung archivieren.

## Hinweise

- **Sicherheit:** Wer die Adresse kennt, kann hochladen, aber nichts ansehen,
  herunterladen oder löschen. Mit `GAST_CODE` braucht man zusätzlich den Code.
  Er steht nur im Skript, nicht im Quelltext der Webseite.
- **Grenzen von Google Apps Script** (kostenloses Konto): rund 20.000
  Übertragungen am Tag und bis zu 30 gleichzeitige Aufrufe. Ein Foto braucht
  meist einen Aufruf, ein 100-MB-Video etwa 26. Das reicht für eine Hochzeit gut.
  Sind gerade sehr viele Gäste gleichzeitig dabei, versucht die Seite es von
  selbst noch einmal. Klappt es trotzdem nicht, erscheint der Knopf
  *„Fehlgeschlagene erneut versuchen“*.
- iPhone-Fotos im HEIC-Format kommen unverändert an. Google Drive zeigt sie an,
  und Windows und macOS können sie öffnen.
- Die Seite sagt Suchmaschinen, dass sie nicht aufgenommen werden soll.
