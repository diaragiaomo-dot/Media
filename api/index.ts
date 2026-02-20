import express from "express";
import Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import path from "path";

const app = express();
// Note: In Vercel serverless, /tmp is the only writable directory
const dbPath = process.env.NODE_ENV === "production" ? "/tmp/images.db" : "images.db";
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS images (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    mimeType TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

app.use(express.json({ limit: '50mb' }));

app.post("/api/images", (req, res) => {
  const { data, mimeType } = req.body;
  if (!data || !mimeType) {
    return res.status(400).json({ error: "Missing data or mimeType" });
  }
  const id = uuidv4();
  try {
    const stmt = db.prepare("INSERT INTO images (id, data, mimeType) VALUES (?, ?, ?)");
    stmt.run(id, data, mimeType);
    res.json({ id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save image" });
  }
});

app.get("/api/images/:id", (req, res) => {
  const { id } = req.params;
  try {
    const stmt = db.prepare("SELECT * FROM images WHERE id = ?");
    const row = stmt.get(id) as any;
    if (!row) {
      return res.status(404).json({ error: "Image not found" });
    }
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to retrieve image" });
  }
});

export default app;
