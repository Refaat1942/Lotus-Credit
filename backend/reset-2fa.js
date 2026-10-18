/**
 * Turns off the owner's Google Authenticator (e.g. the phone was lost).
 * On the server: docker exec lotus-credit node reset-2fa.js
 */
const db = require('./db');

db.setSecret('totpSecret', null);
db.setSecret('totpLastStep', null);
db.setSecret('totpPending', null);
console.log('Google Authenticator is now off for the admin account. Sign in with the password, then set it up again.');
