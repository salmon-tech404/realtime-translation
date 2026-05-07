// version 2.0 - Translation logic using OpenAI Whisper

document.getElementById("toggleBtn").addEventListener("click", async () => {
  const errorMsg = document.getElementById("errorMsg");
  const btn = document.getElementById("toggleBtn");

  // ── STOP ──────────────────────────────────────────────
  if (isRunning) {
    isRunning = false;
    isCapturing = false;

    clearTimeout(silenceTimer);
    if (recorder?.state !== "inactive") recorder.stop();
    audioStream?.getTracks().forEach((t) => t.stop());
    audioCtx?.close();

    chrome.runtime.sendMessage({ type: "STOP" });

    btn.textContent = "🎙Bắt đầu dịch";
    btn.classList.remove("btn-stop");
    document.getElementById("statusBadge").className = "status-badge inactive";
    document.getElementById("statusText").textContent = "Chưa kích hoạt";
    return;
  }

  // ── START ─────────────────────────────────────────────
  errorMsg.textContent = "";
  const validation = await startTranslation(state);
  if (!validation.ok) {
    errorMsg.textContent = validation.message;
    return;
  }

  // Lấy streamId từ background
  const { ok, streamId, message } = await chrome.runtime.sendMessage({
    type: "START",
  });
  if (!ok) {
    errorMsg.textContent = message;
    return;
  }

  // Capture tab audio bằng streamId
  try {
    audioStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: "tab",
          chromeMediaSourceId: streamId,
        },
      },
    });
  } catch (e) {
    errorMsg.textContent = "Không thể capture audio: " + e.message;
    return;
  }

  // AudioContext để đo volume (VAD)
  audioCtx = new AudioContext();
  const source = audioCtx.createMediaStreamSource(audioStream);
  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 1024;
  source.connect(analyser);
  const dataArray = new Uint8Array(analyser.frequencyBinCount);

  // MediaRecorder để gom audio
  recorder = new MediaRecorder(audioStream, { mimeType: "audio/webm" });
  audioChunks = [];

  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) audioChunks.push(e.data);
  };

  recorder.onstop = async () => {
    if (audioChunks.length === 0) return;
    const blob = new Blob(audioChunks, { type: "audio/webm" });
    audioChunks = [];
    if (!isRunning) return;

    // Gửi lên Whisper
    const text = await transcribeWithWhisper(
      blob,
      state.openaiApiKey,
      state.sourcelang,
    );
    console.log("Whisper text:", text);
    if (!text) return;

    // Dịch
    const translated = await translateText(text, state);
    console.log("Translated:", translated);
    if (!translated) return;

    // Gửi sang background → content.js
    chrome.runtime.sendMessage({
      type: "SHOW_SUBTITLE",
      original: text,
      translated,
      showOriginal: state.showOriginal,
      subtitlePos: state.subtitlePos,
    });
  };

  // VAD loop — kiểm tra volume liên tục
  function checkVolume() {
    if (!isRunning) return;
    analyser.getByteFrequencyData(dataArray);
    const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;

    if (avg > 8) {
      // có giọng nói
      if (!isCapturing) {
        isCapturing = true;
        audioChunks = [];
        recorder.start();
      }
      clearTimeout(silenceTimer);
      silenceTimer = setTimeout(() => {
        if (isCapturing && recorder.state !== "inactive") {
          isCapturing = false;
          recorder.stop();
        }
      }, 800); // im lặng 1 giây → gửi đi
    }

    requestAnimationFrame(checkVolume);
  }

  isRunning = true;
  btn.textContent = "⏹ Dừng dịch";
  btn.classList.add("btn-stop");
  document.getElementById("statusBadge").className = "status-badge active";
  document.getElementById("statusText").textContent = "Đang kích hoạt";

  checkVolume();
});
