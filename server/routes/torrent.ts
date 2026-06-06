import { Router } from "express";
import {
  searchMovieTorrents,
  searchTVTorrents,
  safeTorrentStream,
  cleanupTorrents,
  getActiveTorrentCount,
} from "../services/torrentManager.js";

export const torrentRouter = Router();

// Search torrents for a movie
torrentRouter.get("/search/movie/:tmdbId", async (req, res) => {
  try {
    const tmdbId = Number(req.params.tmdbId);
    if (!tmdbId) {
      res.status(400).json({ error: "Invalid TMDB ID" });
      return;
    }
    const torrents = await searchMovieTorrents(tmdbId);
    res.json({ tmdbId, type: "movie", torrents });
  } catch (err) {
    res.status(500).json({ error: "Movie torrent search failed", message: String(err) });
  }
});

// Search torrents for a TV episode
torrentRouter.get("/search/tv/:tmdbId", async (req, res) => {
  try {
    const tmdbId = Number(req.params.tmdbId);
    const season = Number(req.query.season) || 1;
    const episode = Number(req.query.episode) || 1;
    if (!tmdbId) {
      res.status(400).json({ error: "Invalid TMDB ID" });
      return;
    }
    const torrents = await searchTVTorrents(tmdbId, season, episode);
    res.json({ tmdbId, type: "tv", season, episode, torrents });
  } catch (err) {
    res.status(500).json({ error: "TV torrent search failed", message: String(err) });
  }
});

// Stream a torrent to the client
torrentRouter.get("/play", (req, res) => {
  safeTorrentStream(req, res);
});

// Health / stats endpoint
torrentRouter.get("/status", (_req, res) => {
  res.json({
    activeDownloads: getActiveTorrentCount(),
    uptime: process.uptime(),
  });
});

// Run cleanup every 30 minutes
setInterval(() => {
  cleanupTorrents();
}, 30 * 60 * 1000);
