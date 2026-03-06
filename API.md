# addObjest API

Lightweight API to insert or upsert documents into MongoDB collections.

**Base URL:** `https://fbevents.protrader5.pro` (or `http://localhost:3301`)

---

## Authentication

All requests require a secret key in one of these forms:

| Header | Example |
|--------|---------|
| `x-api-key` | `x-api-key: MySecretKeyABC123!!!` |
| `Authorization` | `Authorization: Bearer MySecretKeyABC123!!!` |

---

## POST /insert

Insert or upsert a document into a collection.

### Request

```http
POST /insert
Content-Type: application/json
x-api-key: YOUR_SECRET_KEY

{
  "table": "events",
  "data": {
    "name": "click",
    "timestamp": "2026-02-23T10:00:00Z",
    "userId": "user123"
  }
}
```

### Body Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `table` or `name` | string | Yes | MongoDB collection name |
| `data` | object | Yes | Document to insert/upsert (single object, not array) |

### Upsert by `_id`

If `data` includes `_id`, the API upserts (replace if exists, insert if not):

```json
{
  "table": "events",
  "data": {
    "_id": "65a1b2c3d4e5f6789012345",
    "name": "click",
    "updated": true
  }
}
```

`_id` must be a valid 24-character hex string.

### Response

**Success (insert):**
```json
{
  "success": true,
  "operation": "inserted",
  "_id": "65a1b2c3d4e5f6789012345a"
}
```

**Success (upsert):**
```json
{
  "success": true,
  "operation": "updated",
  "_id": "65a1b2c3d4e5f6789012345"
}
```

### cURL Examples

**Insert new document:**
```bash
curl -X POST https://fbevents.protrader5.pro/insert \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_SECRET_KEY" \
  -d '{"table":"events","data":{"name":"click","userId":"123"}}'
```

**Upsert with existing _id:**
```bash
curl -X POST https://fbevents.protrader5.pro/insert \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_SECRET_KEY" \
  -d '{"table":"events","data":{"_id":"65a1b2c3d4e5f6789012345","name":"click","count":10}}'
```

### Error Responses

| Status | Body | Cause |
|--------|------|-------|
| 400 | `{"error":"Provide table/name and data"}` | Missing `table`/`name` or `data` |
| 400 | `{"error":"data must be a single object"}` | `data` is array or not an object |
| 401 | `{"error":"Invalid or missing secret key"}` | Wrong or missing API key |
| 500 | `{"error":"..."}` | Server or database error |



