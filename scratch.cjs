const fs = require('fs');
const code = fs.readFileSync('code bot telegram.gs', 'utf8');
console.log('File lines:', code.split('\n').length);
console.log('syncVisitLogToSupabase:', code.includes('function syncVisitLogToSupabase'));
console.log('upsertToSupabase:', code.includes('function upsertToSupabase'));
console.log('INSERT trigger:', code.includes('syncVisitLogToSupabase("insert"'));
console.log('CLOSE trigger:', code.includes('syncVisitLogToSupabase("close"'));
