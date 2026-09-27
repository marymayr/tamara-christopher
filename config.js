/* ------------------------------------------------------------------
   Einstellungen für die Hochzeitsseite.
   Nur diese Datei muss angepasst werden – alles andere liest von hier.
   ------------------------------------------------------------------ */
window.HOCHZEIT = {

  /* Das Brautpaar und der Tag */
  name1: 'Tamara',
  name2: 'Christopher',
  datum: '2026-10-24',          // Jahr-Monat-Tag
  ort: '',                      // z. B. 'Gut Sonnenhof, Salzburg' – leer = wird nicht angezeigt

  /* Begrüßung unter den Namen (leer = keine) */
  begruessung: 'Schön, dass ihr diesen Tag mit uns feiert.',

  /* Eigene Fotos: Dateien in den Ordner „bilder“ legen und hier eintragen.
     titelbild = großes Bild hinter den Namen (leer = heller Hintergrund)
     fotos     = kleine Bildreihe unter der Begrüßung (leer = keine)      */
  titelbild: '',                // z. B. 'bilder/titel.jpg'
  fotos: [],                    // z. B. ['bilder/1.jpg', 'bilder/2.jpg', 'bilder/3.jpg']

  /* Google Drive: Adresse der Web-App aus Google Apps Script (endet auf /exec).
     Solange sie leer ist, läuft die Seite im Vorschau-Modus:
     Hochladen wird nur vorgespielt, es wird nichts gespeichert.       */
  skriptUrl: '',

  /* Gäste-Code abfragen? Der Code selbst steht nur im Apps Script (GAST_CODE),
     nicht hier – so kann ihn niemand im Quelltext der Seite nachlesen.
     Steht er im Link (…/?code=XYZ, z. B. im QR-Code), müssen Gäste nichts tippen. */
  gastCode: false,

  /* Größte erlaubte Datei in MB (gleich wie MAX_MB im Apps Script) */
  maxMB: 500
};
