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
  begruessung: 'Schön, dass ihr diesen Tag mit Tami und Chrissi feiert.',

  /* Eigene Fotos: Dateien in den Ordner „bilder“ legen und hier eintragen.
     hintergrundbild = Foto hinter der ganzen Seite; oben voll zu sehen,
                       beim Scrollen wird es langsam durchsichtig.
                       Fehlt die Datei, bleibt der helle Hintergrund.
     hintergrundRest = wie viel vom Foto unten noch zu sehen ist (0 bis 1)
     fotos           = kleine Bildreihe unter der Begrüßung (leer = keine)  */
  hintergrundbild: 'bilder/hintergrund.jpg',
  hintergrundRest: 0.12,
  fotos: [],                    // z. B. ['bilder/1.jpg', 'bilder/2.jpg', 'bilder/3.jpg']

  /* Google Drive: Adresse der Web-App aus Google Apps Script (endet auf /exec).
     Solange sie leer ist, läuft die Seite im Vorschau-Modus:
     Hochladen wird nur vorgespielt, es wird nichts gespeichert.       */
  skriptUrl: 'https://script.google.com/macros/s/AKfycbyHXebYiXRhISqb2v2XZo_zdjogZrLJBYzpJuSWFbn2lmeHGZ9pNi3cORaSZLglnzfehA/exec',

  /* Gäste-Code abfragen? Der Code selbst steht nur im Apps Script (GAST_CODE),
     nicht hier – so kann ihn niemand im Quelltext der Seite nachlesen.
     Steht er im Link (…/?code=XYZ, z. B. im QR-Code), müssen Gäste nichts tippen. */
  gastCode: false,

  /* Größte erlaubte Datei in MB (gleich wie MAX_MB im Apps Script) */
  maxMB: 500
};
