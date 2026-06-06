async function test(url, label) {
  const res = await fetch(url, {
    headers: {
      "Range": "bytes=0-0",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      Referer: "https://dubmv.xyz/",
    },
  });
  console.log(label);
  console.log("  status:", res.status, res.statusText);
  console.log("  content-range:", res.headers.get("content-range"));
  console.log("  content-length:", res.headers.get("content-length"));
  console.log("  accept-ranges:", res.headers.get("accept-ranges"));
  console.log("  content-type:", res.headers.get("content-type"));
  console.log();
}

(async () => {
  // 1. Test the player page itself
  await test("https://dub.onestream.today/stream/video/83882", "dub.onestream.today/stream/video/83882");

  // 2. Fetch the page, extract source, test that URL
  const page = await fetch("https://dub.onestream.today/stream/video/83882", {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
  });
  const html = await page.text();
  const m = html.match(/<source\s+src\s*=\s*["']([^"']+)["']/i);
  if (m) {
    console.log("Extracted video URL:", m[1].substring(0, 120) + "...");
    await test(m[1], "dub.uptodub.ch (extracted source)");
  } else {
    console.log("No <source src> found in page");
  }
})();
