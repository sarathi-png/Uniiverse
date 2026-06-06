import { spawn, execSync } from "child_process";
import { existsSync, readdirSync } from "fs";
import type { Response } from "express";

const WINGET_DIR = "C:\\Users\\ADMIN\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe";

function findFfmpeg(): string {
  const candidates: string[] = ["ffmpeg", "C:\\ffmpeg\\bin\\ffmpeg.exe"];
  if (existsSync(WINGET_DIR)) {
    const dirs = readdirSync(WINGET_DIR).filter((d) => d.startsWith("ffmpeg-"));
    if (dirs.length > 0) {
      candidates.unshift(`${WINGET_DIR}\\${dirs[0]}\\bin\\ffmpeg.exe`);
    }
  }
  for (const c of candidates) {
    try {
      execSync(`"${c}" -version`, { stdio: "ignore", timeout: 3000 });
      return c;
    } catch {}
  }
  return "ffmpeg";
}

const FFMPEG = findFfmpeg();
const FFPROBE = FFMPEG.replace("ffmpeg.exe", "ffprobe.exe").replace("ffmpeg", "ffprobe");
console.log(`[streamRemux] Using ffmpeg: ${FFMPEG}`);

const trackCache = new Map<string, number>();

const LANG_3_TO_2: Record<string, string> = {
  eng: "en", spa: "es", fra: "fr", deu: "de", jpn: "ja",
  kor: "ko", zho: "zh", chi: "zh", tam: "ta", tel: "te",
  mal: "ml", kan: "kn", hin: "hi", rus: "ru", ara: "ar",
  por: "pt", ita: "it", nld: "nl", pol: "pl", tur: "tr",
  swe: "sv", nor: "no", dan: "da", fin: "fi", tha: "th",
  vie: "vi", ces: "cs", hun: "hu", ukr: "uk", heb: "he",
};

function normalizeLang(code: string): string {
  const c = code.trim().toLowerCase();
  if (c.length === 3) return LANG_3_TO_2[c] || c;
  return c;
}

async function findAudioTrack(
  fileUrl: string,
  targetLang: string
): Promise<number> {
  const cacheKey = `${fileUrl}::${targetLang}`;
  const cached = trackCache.get(cacheKey);
  if (cached !== undefined) return cached;

  return new Promise((resolve) => {
    const proc = spawn(FFPROBE, [
      "-user_agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "-v", "quiet",
      "-select_streams", "a",
      "-show_entries", "stream=index:stream_tags=language",
      "-of", "csv=p=0",
      fileUrl,
    ]);
    let output = "";
    proc.stdout.on("data", (d: Buffer) => { output += d.toString(); });
    proc.on("close", (code) => {
      let track = 1;
      const normTarget = normalizeLang(targetLang);
      if (code === 0 && output) {
        const lines = output.trim().split("\n");
        for (const line of lines) {
          const [idx, lang] = line.split(",");
          if (lang && normalizeLang(lang) === normTarget) {
            track = parseInt(idx);
            trackCache.set(cacheKey, track);
            resolve(track);
            return;
          }
        }
        // Prefer second audio stream (often the dub), fallback to first
        const indices = lines.map((l) => parseInt(l.split(",")[0]));
        track = indices.length >= 2 ? indices[1] : indices[0] || 1;
      }
      trackCache.set(cacheKey, track);
      resolve(track);
    });
    proc.on("error", () => {
      trackCache.set(cacheKey, 1);
      resolve(1);
    });
  });
}

export async function streamRemuxedFile(
  directUrl: string,
  targetLang: string,
  res: Response
): Promise<void> {
  // Use the direct URL for ffmpeg/ffprobe instead of the proxy worker,
  // because the proxy rate-limits non-browser clients (429 errors).
  const audioTrack = await findAudioTrack(directUrl, targetLang);

  function spawnFfmpeg(inputUrl: string) {
    return spawn(FFMPEG, [
      "-user_agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "-i", inputUrl,
      "-map", "0:v:0",
      "-map", `0:${audioTrack}`,
      "-c", "copy",
      "-movflags", "frag_keyframe+empty_moov",
      "-f", "mp4",
      "pipe:1",
    ]);
  }

  let retriesLeft = 3;
  let retryDelay = 3000;
  function tryStream() {
    const input = directUrl;
    const proc = spawnFfmpeg(input);

    proc.stdout.pipe(res);

    let stderrBuf = "";
    proc.stderr.on("data", (d: Buffer) => {
      stderrBuf += d.toString();
    });

    proc.on("error", () => {
      if (!res.headersSent) {
        if (retriesLeft > 0) {
          retriesLeft--;
          const delay = retryDelay;
          retryDelay *= 2;
          setTimeout(tryStream, delay);
        } else {
          res.status(500).end();
        }
      }
    });

    proc.on("close", (code) => {
      if (code !== 0 && !res.destroyed) {
        const is429 = stderrBuf.includes("429") || stderrBuf.includes("403") || stderrBuf.includes("503");
        if (is429 && retriesLeft > 0 && !res.headersSent) {
          retriesLeft--;
          const delay = retryDelay;
          retryDelay *= 2;
          setTimeout(tryStream, delay);
        } else if (!res.headersSent) {
          console.error(`[streamRemux] ffmpeg exited (${code}): ${stderrBuf.slice(-300)}`);
          res.status(502).end();
        }
      }
    });

    res.on("close", () => proc.kill());
  }

  tryStream();
}
