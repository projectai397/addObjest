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
  try {
    const { table, name, data } = req.body;
    const collectionName = table || name;
    if (!collectionName || !data) {
      return res.status(400).json({ error: 'Provide table/name and data' });
    }
    if (typeof data !== 'object' || Array.isArray(data)) {
      return res.status(400).json({ error: 'data must be a single object' });
    }

    const collection = db.collection(collectionName);

    if (data._id !== undefined && data._id !== null) {
      const id = typeof data._id === 'string' && /^[a-f0-9]{24}$/i.test(data._id)
        ? new ObjectId(data._id)
        : data._id;
      const result = await collection.replaceOne({ _id: id }, data, { upsert: true });
      return res.json({
        success: true,
        operation: result.upsertedCount ? 'inserted' : 'updated',
        _id: result.upsertedId?.toString() || id.toString()
      });
    }

    const result = await collection.insertOne(data);
    res.json({
      success: true,
      operation: 'inserted',
      _id: result.insertedId.toString()
    });
  } catch (err) {
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
