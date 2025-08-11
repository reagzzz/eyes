const fs = require('fs');
const path = '.env.local';
let MONGODB_URI = process.env.MONGODB_URI;
let MONGODB_DB = process.env.MONGODB_DB || 'nftgen';
if (!MONGODB_URI && fs.existsSync(path)) {
  const lines = fs.readFileSync(path, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const idx = line.indexOf('=');
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (key === 'MONGODB_URI') MONGODB_URI = val;
    if (key === 'MONGODB_DB') MONGODB_DB = val;
  }
}
if (!MONGODB_URI) { console.error('DB_ERROR: missing MONGODB_URI'); process.exit(1); }
const mongoose = require('mongoose');
mongoose.createConnection(MONGODB_URI, { dbName: MONGODB_DB }).asPromise()
  .then(async (conn) => {
    const docs = await conn.collection('collections').find({}).project({_id:1}).limit(5).toArray();
    console.log(JSON.stringify(docs));
    process.exit(0);
  })
  .catch((e) => { console.error('DB_ERROR:' + e.message); process.exit(1); });
