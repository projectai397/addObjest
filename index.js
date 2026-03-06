require('dotenv').config();
const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();
app.use(express.json());

const dbUrl = process.env.MONGODB_URI || process.env.DB_URL;
const secretKey = process.env.SECRET_KEY;

if (!dbUrl) {
  console.error('Set MONGODB_URI or DB_URL in .env');
  process.exit(1);
}
if (!secretKey) {
  console.error('Set SECRET_KEY in .env');
  process.exit(1);
}

function auth(req, res, next) {
  const key = req.headers['x-api-key'] || req.headers['authorization']?.replace(/^Bearer\s+/i, '');
  if (key !== secretKey) {
    return res.status(401).json({ error: 'Invalid or missing secret key' });
  }
  next();
}

let client;
let db;

async function connect() {
  client = new MongoClient(dbUrl);
  await client.connect();
  db = client.db();
}

app.post('/insert', auth, async (req, res) => {
  const ts = new Date().toISOString();
  console.log(`[${ts}] POST /insert from ${req.ip || req.socket.remoteAddress}`);
  console.log(`[${ts}] body: ${JSON.stringify(req.body)}`);
  try {
    const { appName, table, name, data } = req.body;
    // Use appName as collection name (ignore table); fallback to name for backward compat. Always string.
    const collectionName = appName != null ? String(appName) : (name != null ? String(name) : (table != null ? String(table) : ''));
    if (!collectionName || !data) {
      return res.status(400).json({ error: 'Provide appName (or name) and data' });
    }
    if (typeof data !== 'object' || Array.isArray(data)) {
      return res.status(400).json({ error: 'data must be a single object' });
    }

    const collection = db.collection(collectionName);

    if (data._id !== undefined && data._id !== null) {
      const id = typeof data._id === 'string' && /^[a-f0-9]{24}$/i.test(data._id)
        ? new ObjectId(data._id)
        : data._id;
      const doc = { ...data, _id: id };
      const result = await collection.replaceOne({ _id: id }, doc, { upsert: true });
      const op = result.upsertedCount ? 'inserted' : 'updated';
      console.log(`[${ts}] /insert ${op} collection=${collectionName} _id=${result.upsertedId?.toString() || id.toString()}`);
      return res.json({
        success: true,
        operation: op,
        _id: result.upsertedId?.toString() || id.toString()
      });
    }

    const result = await collection.insertOne(data);
    console.log(`[${ts}] /insert inserted collection=${collectionName} _id=${result.insertedId.toString()}`);
    res.json({
      success: true,
      operation: 'inserted',
      _id: result.insertedId.toString()
    });
  } catch (err) {
    console.log(`[${ts}] /insert error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

const port = process.env.PORT || 3000;
connect()
  .then(() => {
    app.listen(port, () => console.log(`Running on http://localhost:${port}`));
  })
  .catch((err) => {
    console.error('DB connection failed:', err);
    process.exit(1);
  });
