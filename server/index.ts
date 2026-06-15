import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { tmdbRouter } from "./routes/tmdb.js";
import { languageRouter } from "./routes/language.js";
import { torrentRouter } from "./routes/torrent.js";
import { dubmvRouter } from "./routes/dubmv.js";

// Prevent WebTorrent microtask crashes from killing the server (Node v24 compat)
const WT_PATTERNS = ["reading 'reserve'", "reading 'missing'"];
function isKnownWtError(err: unknown): boolean {
  const msg = String(err);
  return WT_PATTERNS.some((p) => msg.includes(p));
}

process.on("unhandledRejection", (reason) => {
  if (!isKnownWtError(reason)) {
    console.error("[unhandledRejection] (non-fatal):", reason);
  }
});
process.on("uncaughtException", (err) => {
  if (!isKnownWtError(err)) {
    console.error("[uncaughtException] (non-fatal):", err.message);
  }
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: ["http://localhost:5173", "http://127.0.0.1:5173"] }));
app.use(express.json());

// API routes
app.use("/api/tmdb", tmdbRouter);
app.use("/api/language", languageRouter);
app.use("/api/torrent", torrentRouter);
app.use("/api/dubmv", dubmvRouter);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", version: "2.0.0", timestamp: Date.now() });
});

// Internal video player page for dubmv proxy (supports seeking)
app.get("/player/dubmv-proxy/:fileId", (req, res) => {
  const fileId = req.params.fileId;
  const proxyUrl = `/api/dubmv/proxy/${fileId}`;
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no">
<title>Streaming...</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#000;display:flex;align-items:center;justify-content:center;min-height:100dvh}
video{width:100%;height:100dvh;outline:none}
::-webkit-media-controls-panel{background:#111}
</style>
</head>
<body>
<video controls autoplay preload="metadata" playsinline>
  <source src="${proxyUrl}" type="video/mp4">
</video>
</body>
</html>`);
});

// Serve built frontend in production
const distPath = path.join(__dirname, "../dist");
app.use(express.static(distPath));
app.get("*", (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(PORT, () => {
  console.log(`NOVASTREAM V2 server running on http://localhost:${PORT}`);
});

// Pre-scan popular movies so language cache is warm on first visit
async function preScanPopular() {
  try {
    const { scanMovie } = await import("./services/languageScanner.js");
    const r = await fetch(
      `https://api.themoviedb.org/3/movie/popular?api_key=${process.env.TMDB_API_KEY}&page=1`
    );
    const data = await r.json() as { results: { id: number }[] };
    const popularIds = data.results.slice(0, 20).map((m) => m.id);
    console.log(`Pre-scanning ${popularIds.length} popular movies for language data...`);
    await Promise.allSettled(popularIds.map((id) => scanMovie(id, "movie")));
    console.log("Pre-scan complete.");
  } catch {
    // non-critical
  }
}
preScanPopular();


