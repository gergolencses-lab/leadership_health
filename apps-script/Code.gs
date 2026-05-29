/**
 * Vezetői Jóllét Szűrés — report-fogadó backend (Google Apps Script Web App)
 *
 * Mit csinál: a frontend POST-ol egy kész PDF-et (base64) + a kitöltő adatait.
 * Ez a script a TE Google-fiókodként fut → a PDF a TE Drive-od "Reports" mappájába
 * kerül, "bárki a linkkel néző" jogosultsággal, és egy sor a "email-ek" Sheetbe.
 * NINCS szükség API-kulcsra vagy service accountra.
 *
 * TELEPÍTÉS (gergo.lencses@gmail.com fiókkal bejelentkezve):
 *   1) script.google.com → New project → másold be ezt a Code.gs-be
 *   2) állíts be egy tetszőleges SHARED_SECRET-et alább (ugyanezt kapja a frontend)
 *   3) Deploy → New deployment → Type: Web app
 *        - Execute as: Me (gergo.lencses@gmail.com)
 *        - Who has access: Anyone
 *   4) első deploynál engedélyezd a Drive/Sheets hozzáférést
 *   5) másold ki a Web app URL-t (……/exec) → ezt adod nekem a frontendhez
 *
 * TESZT: futtasd a selfTest() függvényt a szerkesztőből (Run) → létrejön egy
 *        teszt-PDF a mappában + egy sor a Sheetben. Töröld utána, ha akarod.
 */

const FOLDER_ID     = '1iOkxj-NB8wlqCOzmEnWDcZVlfDVP5zp0';            // Reports mappa
const SHEET_ID      = '1LhxflpCOSJ9yokpe1MzncE9oWURlH76DWCPqGeeYN1g'; // "email-ek" Sheet
const SHARED_SECRET = 'nagy titok mitok';  // = a frontend REPORT_SECRET

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    if (d.secret !== SHARED_SECRET) return json_({ ok: false, error: 'unauthorized' });

    const blob = Utilities.newBlob(
      Utilities.base64Decode(d.pdfBase64),
      'application/pdf',
      d.filename || ('vezetoi-jollet-' + Date.now() + '.pdf')
    );
    const file = DriveApp.getFolderById(FOLDER_ID).createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    const url = file.getUrl();

    const s = d.scores || {};
    // Oszlopsorrend = a Sheet fejléce:
    // Név | email | szembenézés | önismeret | purpose | törzs | tudatosság | PDF link
    SpreadsheetApp.openById(SHEET_ID).getSheets()[0].appendRow([
      d.name || '', d.email || '',
      num_(s.facing), num_(s.self), num_(s.purpose), num_(s.tribe), num_(s.consciousness),
      url
    ]);

    return json_({ ok: true, url: url });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

// böngészőből megnyitva (GET) csak életjelet ad — így ellenőrizheted, hogy él a deploy
function doGet() { return json_({ ok: true, service: 'leadership-health report sink' }); }

function num_(v) { return (v === undefined || v === null) ? '' : Math.round(Number(v) * 10) / 10; }

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

// Egyszeri teszt: hozzáférés engedélyezése + Drive/Sheet írás ellenőrzése
function selfTest() {
  const tinyPdf = 'JVBERi0xLjQKJcOkw7zDtsOfCjIgMCBvYmoKPDwvTGVuZ3RoIDM+PnN0cmVhbQpCVApFVAplbmRzdHJlYW0KZW5kb2JqCnRyYWlsZXIKPDwvUm9vdCAxIDAgUj4+CiUlRU9G';
  const out = doPost({ postData: { contents: JSON.stringify({
    secret: SHARED_SECRET, name: 'Teszt Elek', email: 'teszt@example.com',
    scores: { facing: 7.5, self: 6, purpose: 8, tribe: 4, consciousness: 5.5 },
    pdfBase64: tinyPdf, filename: 'selftest.pdf'
  }) } });
  Logger.log(out.getContent());
}
