/**
 * Vezetői Jóllét Szűrés — backend (Google Apps Script Web App)
 *
 * Két flow-t szolgál egy endpoint:
 *   1) Régi: PDF + email score sheet — csak az email-megadó kitöltőktől
 *      payload: { secret, name, email, phone, scores, pdfBase64, filename }
 *      → DriveApp (FOLDER_ID) + Sheet (SHEET_ID)
 *   2) Új: anonim long-format válaszsheet — minden kitöltő, blokk-completion-nél
 *      payload: { secret, type:'block_complete', respondent_id, submitted_at,
 *                 block, schema_version, locale, client, answers:[...] }
 *      → Sheet (ANSWERS_SHEET_ID)
 *
 * A doPost a payload.type alapján ágazik szét. Visszafelé kompatibilis:
 * type nélküli payload → régi PDF flow.
 *
 * SETUP (egyszeri, gergo.lencses@gmail.com fiókkal):
 *   1) Apps Script Editor-ben Run → setupAnswersSheet()
 *   2) View → Logs: kimásolod az új Spreadsheet ID-t
 *   3) Visszamásolod alább az ANSWERS_SHEET_ID konstansba
 *   4) Deploy → Manage deployments → Edit → New version → Deploy
 *   5) Run → selfTestBlockComplete() — sanity check
 */

const FOLDER_ID        = '1iOkxj-NB8wlqCOzmEnWDcZVlfDVP5zp0';            // Reports mappa
const SHEET_ID         = '1LhxflpCOSJ9yokpe1MzncE9oWURlH76DWCPqGeeYN1g'; // "email-ek" Sheet (változatlan)
const ANSWERS_SHEET_ID = '';                                              // ← setupAnswersSheet() után töltsd ki
const SHARED_SECRET    = 'nagy titok mitok';                              // = frontend REPORT_SECRET

const ANSWERS_HEADERS = [
  'respondent_id','submitted_at','block','question_id','question_type',
  'value_num','value_text','value_meta','schema_version','locale','client'
];

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    if (d.secret !== SHARED_SECRET) return json_({ ok: false, error: 'unauthorized' });
    if (d.type === 'block_complete') return handleBlockComplete_(d);
    // visszafelé kompatibilis: type nélkül → a régi PDF + email flow
    return handlePdfReport_(d);
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

// böngészőből megnyitva (GET) csak életjelet ad
function doGet() { return json_({ ok: true, service: 'leadership-health backend (v1 + anon)' }); }

// ========== RÉGI FLOW (változatlan tartalom, csak kiszervezve) ==========
function handlePdfReport_(d) {
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
  // Név | email | szembenézés | önismeret | purpose | törzs | tudatosság | Akar beszélgetni? | PDF link
  const wantsTalkStr = (d.wants_talk === true) ? 'Igen' : ((d.wants_talk === false) ? 'Nem' : '');
  SpreadsheetApp.openById(SHEET_ID).getSheets()[0].appendRow([
    d.name || '', d.email || '',
    num_(s.facing), num_(s.self), num_(s.purpose), num_(s.tribe), num_(s.consciousness),
    wantsTalkStr,
    url
  ]);

  return json_({ ok: true, url: url });
}

// ========== ÚJ FLOW: anonim long-format ==========
function handleBlockComplete_(d) {
  if (!ANSWERS_SHEET_ID) {
    return json_({ ok: false, error: 'ANSWERS_SHEET_ID nem konfigurált — futtasd setupAnswersSheet()-et' });
  }
  const sheet = SpreadsheetApp.openById(ANSWERS_SHEET_ID).getSheets()[0];
  ensureAnswersHeaders_(sheet);

  const submittedAt = String(d.submitted_at || new Date().toISOString());
  const respondent  = String(d.respondent_id || '').slice(0, 64);
  const block       = String(d.block || '').slice(0, 32);
  const version     = String(d.schema_version || 'v1').slice(0, 16);
  const locale      = String(d.locale || '').slice(0, 16);
  const client      = String(d.client || '').slice(0, 200);

  if (!respondent || !block) return json_({ ok: false, error: 'missing respondent_id or block' });

  const answers = Array.isArray(d.answers) ? d.answers : [];
  if (!answers.length) return json_({ ok: true, rows_appended: 0 });

  const rows = answers.map(function(a) {
    return [
      respondent, submittedAt, block,
      String(a.question_id || '').slice(0, 32),
      String(a.question_type || '').slice(0, 32),
      numOrBlank_(a.value_num),
      strOrBlank_(a.value_text),
      strOrBlank_(a.value_meta),
      version, locale, client
    ];
  });

  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, ANSWERS_HEADERS.length).setValues(rows);
  return json_({ ok: true, rows_appended: rows.length });
}

function ensureAnswersHeaders_(sheet) {
  if (sheet.getLastRow() > 0) return;
  sheet.appendRow(ANSWERS_HEADERS);
  sheet.setFrozenRows(1);
}

// ========== SETUP: egyszer manuálisan futtatandó ==========
function setupAnswersSheet() {
  const ss = SpreadsheetApp.create('leadership_health_answers_anon_v1');
  const sheet = ss.getSheets()[0];
  sheet.setName('answers');
  ensureAnswersHeaders_(sheet);
  const id = ss.getId();
  const url = ss.getUrl();
  Logger.log('=== ÚJ ANONIM SHEET LÉTREHOZVA ===');
  Logger.log('ID  : ' + id);
  Logger.log('URL : ' + url);
  Logger.log('Most másold be az ID-t fent az ANSWERS_SHEET_ID konstansba és deployolj újra.');
  return { id: id, url: url };
}

// ========== HELPERS ==========
function num_(v) { return (v === undefined || v === null) ? '' : Math.round(Number(v) * 10) / 10; }

function numOrBlank_(v) {
  if (v === undefined || v === null || v === '') return '';
  const n = Number(v);
  return isNaN(n) ? '' : n;
}

function strOrBlank_(v) {
  if (v === undefined || v === null) return '';
  return String(v);
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

// ========== SMOKE TESTS ==========
function selfTest() {
  const tinyPdf = 'JVBERi0xLjQKJcOkw7zDtsOfCjIgMCBvYmoKPDwvTGVuZ3RoIDM+PnN0cmVhbQpCVApFVAplbmRzdHJlYW0KZW5kb2JqCnRyYWlsZXIKPDwvUm9vdCAxIDAgUj4+CiUlRU9G';
  const out = doPost({ postData: { contents: JSON.stringify({
    secret: SHARED_SECRET, name: 'Teszt Elek', email: 'teszt@example.com',
    scores: { facing: 7.5, self: 6, purpose: 8, tribe: 4, consciousness: 5.5 },
    pdfBase64: tinyPdf, filename: 'selftest.pdf'
  }) } });
  Logger.log(out.getContent());
}

function selfTestBlockComplete() {
  const out = doPost({ postData: { contents: JSON.stringify({
    secret: SHARED_SECRET,
    type: 'block_complete',
    respondent_id: 'selftest-' + Utilities.getUuid(),
    submitted_at: new Date().toISOString(),
    block: 'facing',
    schema_version: 'v1',
    locale: 'hu-HU',
    client: 'apps-script-selftest',
    answers: [
      { question_id: 'q11', question_type: 'scale', value_num: 7 },
      { question_id: 'q12', question_type: 'choice', value_text: 'Az elmúlt hónapban' },
      { question_id: 'q13', question_type: 'yesno_text', value_meta: '{"yn":"Igen","text":"test válasz"}' }
    ]
  }) } });
  Logger.log(out.getContent());
}
