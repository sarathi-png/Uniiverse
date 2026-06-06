import T from "torrent-search-api";
import "dotenv/config";

console.log("Testing torrent-search-api...");

// Enable providers
T.enableProvider("LimeTorrents");
T.enableProvider("ThePirateBay");
T.enableProvider("1337x");
T.enableProvider("Yts");
T.enableProvider("EZTV");

console.log("Providers enabled, searching...");

try {
  const results = await T.search("Vettaiyan 2024", "LimeTorrents", 10);
  console.log(`LimeTorrents returned ${results.length} results`);
  if (results.length > 0) {
    console.log(JSON.stringify(results[0], null, 2));
  }
} catch (e: any) {
  console.log("LimeTorrents error:", e.message);
}

try {
  const results2 = await T.search("Fight Club 1999", "ThePirateBay", 10);
  console.log(`TPB returned ${results2.length} results`);
  if (results2.length > 0) {
    console.log(JSON.stringify(results2[0], null, 2));
  }
} catch (e: any) {
  console.log("TPB error:", e.message);
}