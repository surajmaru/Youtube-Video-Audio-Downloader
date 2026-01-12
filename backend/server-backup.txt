const express = require("express");
const cors = require("cors");
const { spawn } = require("child_process");

const app = express();
app.use(cors());
app.use(express.json());

// Root
app.get("/", (req, res) => res.send("Backend running 🚀"));

/* ===============================
   GET VIDEO INFO
================================ */
app.post("/api/info", (req, res) => {
  const { url } = req.body;
  if (!url || !url.startsWith("http")) {
    return res.status(400).json({ error: "Invalid URL" });
  }

  const yt = spawn("yt-dlp", [
    "--js-runtimes", "node",
    "-j",
    url
  ]);

  let json = "";

  yt.stdout.on("data", d => json += d.toString());
  yt.stderr.on("data", d => console.log(d.toString()));

  yt.on("close", () => {
    try {
      const data = JSON.parse(json);

      const wantedHeights = [2160, 1440, 1080, 720, 480, 360];
      const seen = new Set();

      /* ---------- VIDEO FORMATS ---------- */
      const videoFormats = data.formats
        .filter(f =>
          f.vcodec !== "none" &&
          f.acodec === "none" &&
          f.ext === "mp4" &&
          f.height &&
          wantedHeights.includes(f.height)
        )
        .sort((a, b) => b.height - a.height)
        .filter(f => {
          if (seen.has(f.height)) return false;
          seen.add(f.height);
          return true;
        })
        .map(f => ({
          id: f.format_id,
          height: f.height,
          filesize: f.filesize || f.filesize_approx || null
        }));

      /* ---------- AUDIO FORMATS ---------- */
      const audioFormats = data.formats
        .filter(f =>
          f.vcodec === "none" &&
          f.acodec !== "none" &&
          f.abr
        )
        .sort((a, b) => b.abr - a.abr)
        .slice(0, 5)
        .map(f => ({
          id: f.format_id,
          bitrate: `${Math.round(f.abr)} kbps`,
          ext: f.ext,
          filesize: f.filesize || f.filesize_approx || null
        }));

      res.json({
        title: data.title,
        thumbnail: data.thumbnail,
        videoFormats,
        audioFormats
      });

    } catch (err) {
      res.status(500).json({ error: "Failed to parse yt-dlp output" });
    }
  });
});

/* ===============================
   VIDEO DOWNLOAD (STREAMED)
================================ */
app.get("/download/video", (req, res) => {
  const { url, formatId } = req.query;
  if (!url || !formatId) {
    return res.status(400).json({ error: "Missing parameters" });
  }

  res.setHeader("Content-Disposition", `attachment; filename="video.mp4"`);
  res.setHeader("Content-Type", "video/mp4");

  const yt = spawn("yt-dlp", [
    "-f", `${formatId}+bestaudio`,
    "--merge-output-format", "mp4",
    "--no-progress",
    "--quiet",
    "-o", "-",
    url
  ], {
    stdio: ["ignore", "pipe", "ignore"] // 🔇 fully silent
  });

  yt.stdout.pipe(res);

  yt.on("close", () => res.end());
});


/* ===============================
   AUDIO DOWNLOAD
================================ */
app.post("/api/download/audio", (req, res) => {
  const { url, formatId } = req.body;
  if (!url || !formatId) {
    return res.status(400).json({ error: "Missing parameters" });
  }

  res.setHeader("Content-Disposition", `attachment; filename="audio.mp3"`);
  res.setHeader("Content-Type", "audio/mpeg");

  const yt = spawn("yt-dlp", [
    "-f", formatId,
    "-x",
    "--audio-format", "mp3",
    "-o", "-",
    url
  ]);

  yt.stdout.pipe(res);
  yt.stderr.on("data", d => console.log(d.toString()));
  yt.on("close", () => res.end());
});

app.listen(5000, () =>
  console.log("Server running at http://localhost:5000")
);
