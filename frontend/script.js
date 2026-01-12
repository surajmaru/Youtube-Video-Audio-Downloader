let videoFormats = [];
let audioFormats = [];

/* Tabs */
function tab(t) {
  vTab.classList.toggle("active", t === "v");
  aTab.classList.toggle("active", t === "a");
  videoBox.classList.toggle("hidden", t !== "v");
  audioBox.classList.toggle("hidden", t !== "a");
}

/* Resolution label */
function resolutionLabel(h) {
  if (h >= 2160) return "4K";
  if (h >= 1440) return "2K";
  if (h >= 1080) return "1080p";
  if (h >= 720)  return "720p";
  if (h >= 480)  return "480p";
  if (h >= 360)  return "360p";
  return h ? h + "p" : "Video";
}

/* File size formatter */
function formatSize(bytes) {
  if (!bytes) return "";
  const sizes = ["B", "KB", "MB", "GB"];
  let i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(1) + " " + sizes[i];
}

/* Fetch info */
async function getInfo(t) {
  const url = document.getElementById("url").value.trim();
  if (!url) return alert("Paste a YouTube URL");

  loader.style.display = "inline-block";

  try {
    const res = await fetch("http://localhost:5000/api/info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url })
    });

    const data = await res.json();
    videoFormats = data.videoFormats;
    audioFormats = data.audioFormats;
    hmm.classList.toggle("hidden");
    videoBox.classList.toggle("hidden", t !== "v");
    render();
  } catch {
    alert("Failed to fetch video info");
  } finally {
    loader.style.display = "none";
  }
}

/* Render formats */
function render() {
  const url = document.getElementById("url").value;

  videoBox.innerHTML = videoFormats.map(f => `
    <div class="format">
      <span>
        ${resolutionLabel(f.height)}
        <span class="small">${formatSize(f.filesize || f.contentLength)}</span>
      </span>
      <button onclick="downloadVideo('${url}','${f.id}')">Download</button>
    </div>
  `).join("");

  audioBox.innerHTML = audioFormats.map(f => `
    <div class="format">
      <span>
        ${f.bitrate || "Audio"}
        <span class="small">${formatSize(f.filesize || f.contentLength)}</span>
      </span>
      <button onclick="downloadAudio('${url}','${f.id}')">Download</button>
    </div>
  `).join("");
}

/* Fake progress */
function fakeProgress() {
  progressBox.style.display = "block";
  let p = 0;

  const i = setInterval(() => {
    p += Math.random() * 6;
    if (p > 90) p = 90;
    progressInner.style.width = p + "%";
    progressInner.textContent = Math.floor(p) + "%";
  }, 250);

  return () => {
    clearInterval(i);
    progressInner.style.width = "100%";
    progressInner.textContent = "100%";
    setTimeout(() => progressBox.style.display = "none", 1000);
  };
}

/* Download video */
function downloadVideo(url, id) {
  const stop = fakeProgress();

  const a = document.createElement("a");
  a.href = `http://localhost:5000/download/video?url=${encodeURIComponent(url)}&formatId=${id}`;
  a.download = "";
  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(stop, 2000);
}

/* Download audio */
function downloadAudio(url, id) {
  const stop = fakeProgress();

  fetch("http://localhost:5000/api/download/audio", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, formatId: id })
  })
  .then(r => r.blob())
  .then(b => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(b);
    a.download = "audio.mp3";
    a.click();
    stop();
  });
}
