import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database("images.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS images (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    mimeType TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // API: Save image
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

  // API: Get image
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

  // Serve shared image page
  app.get("/share/:id", async (req, res, next) => {
    // This will be handled by the SPA, but we can also serve a meta-tag rich page here if needed.
    // For now, let the SPA handle it via client-side routing or just serve index.html
    next();
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
