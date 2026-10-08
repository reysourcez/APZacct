// APZacct v1.3 - APZacct-config_v1.3.js
// ---------------------------------------------------------------
// APZacct — shared frontend config
// ---------------------------------------------------------------
// Both APZacct-index_v1.3.html (APZacct-wizard_v1.3.js) and APZacct-penyata-bank_v1.3.html (APZacct-penyata-bank_v1.3.js)
// load this file BEFORE their own script, so the API URL and secret
// only exist in one place. Change them here once — not in two files
// that can quietly drift apart, which is exactly the class of bug
// the Tetapan next-code fix and the dead-model fixes elsewhere in
// this build were about.
//
// NOTE: this secret sits in plain view in the browser once deployed —
// anyone who views page source can read it. That's only enough to
// keep the endpoint from being stumbled on by accident, not real
// access control. See APZacct_WebAPI.gs's own header comment for what
// real protection would need (Google Workspace + an email allow-list,
// or a Cloudflare Worker proxy holding this secret server-side).
// ---------------------------------------------------------------
const API_URL = 'https://script.google.com/macros/s/AKfycbz6RKdgYszLj5UaZb-Gvr5chg4jooTM0nh1_fMZPYzIm52gInqI1amisNibt4PwISY/exec';
const API_SECRET = '123456789';
const MAX_FILE_MB = 5;

// v1.2 - default time zone for dates the wizard stamps. The live value is Tetapan!C23 ("Zon Masa"), sent by the API; this is only the fallback.
const ZON_MASA_LALAI = 'Asia/Kuala_Lumpur';
