import { Router } from "express";
import {
  getAllVivamaxItems,
  getVivamaxBySlug,
  getVivamaxCount,
} from "../services/vivamaxService.js";

export const vivamaxRouter = Router();

const ITEMS_PER_PAGE = 30;
const MAX_LIMIT = 2000;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

vivamaxRouter.get("/list", (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query.limit as string) || ITEMS_PER_PAGE));
    const search = (req.query.search as string || "").toLowerCase().trim();

    let items = getAllVivamaxItems();

    if (search) {
      items = items.filter((i) => i.title.toLowerCase().includes(search));
    }

    items.sort((a, b) => {
      if (a.embedUrl && !b.embedUrl) return -1;
      if (!a.embedUrl && b.embedUrl) return 1;
      return (b.rating || 0) - (a.rating || 0);
    });

    const total = items.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const pageItems = items.slice(start, start + limit);

    res.json({
      page,
      totalPages,
      total,
      items: pageItems,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to list Vivamax content", message: String(err) });
  }
});

// Real-time embed proxy: fetches the embed URL from bibamax.cc
vivamaxRouter.get("/proxy-embed/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const movieUrl = `https://bibamax.cc/movies/${slug}/`;

    // 1. Fetch movie page
    const pageRes = await fetch(movieUrl, {
      headers: { "User-Agent": UA, Referer: "https://bibamax.cc/" },
      signal: AbortSignal.timeout(15000),
    });
    if (!pageRes.ok) {
      res.status(502).json({ error: "Failed to fetch movie page" });
      return;
    }
    const html = await pageRes.text();

    const postIdMatch = html.match(/post-(\d+)/);
    const postId = postIdMatch ? postIdMatch[1] : null;
    if (!postId) {
      res.status(404).json({ error: "Could not find post ID" });
      return;
    }

    // 2. Call Dooplay player AJAX
    const ajaxRes = await fetch("https://bibamax.cc/wp-admin/admin-ajax.php", {
      method: "POST",
      headers: {
        "User-Agent": UA,
        Referer: movieUrl,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `action=doo_player_ajax&post=${postId}&nume=1&type=movie`,
      signal: AbortSignal.timeout(15000),
    });
    const text = await ajaxRes.text();

    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      res.status(502).json({ error: "Non-JSON response from player API" });
      return;
    }

    if (!data?.embed_url) {
      res.status(404).json({ error: "No embed URL found" });
      return;
    }

    let embedUrl: string | null = null;
    if (typeof data.embed_url === "string") {
      const m = data.embed_url.match(/src=["']([^"']+)["']/);
      embedUrl = m ? m[1] : data.embed_url.startsWith("http") ? data.embed_url : null;
    }

    if (!embedUrl) {
      res.status(404).json({ error: "Could not extract embed URL" });
      return;
    }

    res.json({ slug, postId, embedUrl });
  } catch (err) {
    res.status(500).json({ error: "Proxy embed failed", message: String(err) });
  }
});

// Proxy player: fetches xtremestream embed page, strips frame-busting JS, serves on our domain
vivamaxRouter.get("/proxy-player/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const item = getVivamaxBySlug(slug);
    if (!item || !item.embedUrl) {
      res.status(404).json({ error: "No embed URL found for this slug" });
      return;
    }

    const resp = await fetch(item.embedUrl, {
      headers: {
        "User-Agent": UA,
        Referer: "https://bibamax.cc/",
      },
      signal: AbortSignal.timeout(15000),
    });

    let html = await resp.text();

    // Remove frame-busting JavaScript
    html = html.replace(/top\.location\s*=/gi, "void(0)/*top.location=*/");
    html = html.replace(/self\.location\s*=/gi, "void(0)/*self.location=*/");
    html = html.replace(/window\.location\s*=([^;]+);/gi, "void(0);");
    html = html.replace(/top\.location\.href/gi, "''/*top.location.href*/");
    html = html.replace(/window\.open\s*\(/gi, "void/*window.open*/(");

    // Remove X-Frame-Options if present in meta tags
    html = html.replace(/<meta[^>]*http-equiv=["']X-Frame-Options["'][^>]*>/gi, "<!-- removed XFO -->");

    // Inject base tag to ensure relative URLs work
    const baseUrl = item.embedUrl.replace(/\/[^/]*$/, "/");
    html = html.replace("<head>", `<head>\n<base href="${baseUrl}">`);

    res.set("Content-Type", "text/html; charset=utf-8");
    res.set("X-Frame-Options", "");
    res.set("Content-Security-Policy", "frame-ancestors *");
    res.send(html);
  } catch (err) {
    res.status(502).json({ error: "Proxy player failed", message: String(err) });
  }
});

vivamaxRouter.get("/lookup/:slug", (req, res) => {
  try {
    const item = getVivamaxBySlug(req.params.slug);
    if (!item) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: "Lookup failed", message: String(err) });
  }
});

vivamaxRouter.get("/count", (_req, res) => {
  try {
    const counts = getVivamaxCount();
    res.json(counts);
  } catch (err) {
    res.status(500).json({ error: "Count failed", message: String(err) });
  }
});
