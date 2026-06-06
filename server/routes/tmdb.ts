import { Router, Request, Response } from "express";
import { fetchTMDB } from "../utils/tmdb.js";

export const tmdbRouter = Router();

// Trending
tmdbRouter.get("/trending/:type/:window", async (req: Request, res: Response) => {
  try {
    const { type, window } = req.params;
    const page = (req.query.page as string) || "1";
    const data = await fetchTMDB(`/trending/${type}/${window}`, { page });
    res.json(data);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to fetch trending", message: (err as Error).message });
  }
});

// Popular
tmdbRouter.get("/:type/popular", async (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    const page = (req.query.page as string) || "1";
    const region = (req.query.region as string) || "";
    const params: Record<string, string> = { page };
    if (region) params.region = region;
    const data = await fetchTMDB(`/${type}/popular`, params);
    res.json(data);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to fetch popular", message: (err as Error).message });
  }
});

// Top Rated
tmdbRouter.get("/:type/top_rated", async (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    const page = (req.query.page as string) || "1";
    const data = await fetchTMDB(`/${type}/top_rated`, { page });
    res.json(data);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to fetch top rated", message: (err as Error).message });
  }
});

// Upcoming (movies only)
tmdbRouter.get("/movie/upcoming", async (_req: Request, res: Response) => {
  try {
    const data = await fetchTMDB("/movie/upcoming");
    res.json(data);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to fetch upcoming", message: (err as Error).message });
  }
});

// Airing Today (TV only)
tmdbRouter.get("/tv/airing_today", async (_req: Request, res: Response) => {
  try {
    const data = await fetchTMDB("/tv/airing_today");
    res.json(data);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to fetch airing today", message: (err as Error).message });
  }
});

// Search — must be BEFORE /:type/:id to avoid catch-all
tmdbRouter.get("/search/multi", async (req: Request, res: Response) => {
  try {
    const query = String(req.query.query || req.query.q || "");
    const page = String(req.query.page || "1");
    if (!query || query.length < 2) {
      res.json({ results: [], total_pages: 0 });
      return;
    }
    const data = await fetchTMDB("/search/multi", { query, page, include_adult: "false" });
    res.json(data);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Search failed", message: (err as Error).message });
  }
});

// Season
tmdbRouter.get("/tv/:id/season/:season", async (req: Request, res: Response) => {
  try {
    const { id, season } = req.params;
    const data = await fetchTMDB(`/tv/${id}/season/${season}`);
    res.json(data);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to fetch season", message: (err as Error).message });
  }
});

// Discover
tmdbRouter.get("/discover/:type", async (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    const params: Record<string, string> = {};
    for (const [key, value] of Object.entries(req.query)) {
      if (value && typeof value === "string") params[key] = value;
      else if (value && Array.isArray(value)) params[key] = String(value[0]);
    }
    const data = await fetchTMDB(`/discover/${type}`, params);
    res.json(data);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Discover failed", message: (err as Error).message });
  }
});

// Genres
tmdbRouter.get("/genre/:type/list", async (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    const data = await fetchTMDB(`/genre/${type}/list`);
    res.json(data);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to fetch genres", message: (err as Error).message });
  }
});

// Details — catch-all for /:type/:id, keep at bottom
tmdbRouter.get("/:type/:id", async (req: Request, res: Response) => {
  try {
    const { type, id } = req.params;
    const data = await fetchTMDB(`/${type}/${id}`, {
      append_to_response:
        "videos,credits,similar,recommendations,reviews,images,release_dates,content_ratings",
      include_image_language: "en,null",
    });
    res.json(data);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to fetch details", message: (err as Error).message });
  }
});
