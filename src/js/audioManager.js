import { processAudioWithGemini } from "./translator.js";

let micStream = null;
let displayStream = null;
let audioCtx = null;
let isRunning = false;
let stopMicVAD = null;
let stopTabVAD = null;

const SILENCE_MS = 1000;
const QUEUE_INTERVAL_MS = 500; // khoảng nghỉ giữa các request liên tiếp

const translationQueue = [];
let queueRunning = false;

async function runQueue() {
  if (queueRunning) return;
  queueRunning = true;
  while (translationQueue.length > 0) {
    const { blob, state, onTranslation } = translationQueue.shift();
    console.log(`[Queue] ▶ Đang xử lý — còn lại ${translationQueue.length} segment`);
    const result = await processAudioWithGemini(
      blob,
      state.geminiApiKey,
      state.sourcelang,
      state.targetlang,
    );
    console.log(`[Queue] ✓ Xong — kết quả: ${result ? "có dịch" : "bỏ qua"}`);
    if (result) onTranslation(result);
    await new Promise((r) => setTimeout(r, QUEUE_INTERVAL_MS));
  }
  queueRunning = false;
}

// Factory: tạo 1 bộ VAD + Recorder độc lập cho 1 stream bất kỳ
function createRecorderVAD(analyser, stream, state, onTranslation) {
  const dataArray = new Uint8Array(analyser.frequencyBinCount);
  let capturing = false;
  let silenceTimer = null;
  let chunks = [];

  const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });

  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  recorder.onstop = () => {
    if (chunks.length === 0 || !isRunning) return;
    const blob = new Blob(chunks, { type: "audio/webm" });
    chunks = [];
    translationQueue.push({ blob, state, onTranslation });
    console.log(`[Queue] ${translationQueue.length} segment đang chờ`);
    runQueue();
  };

  function check() {
    if (!isRunning) return;
    analyser.getByteFrequencyData(dataArray);
    const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;

    if (avg > 1.5) {
      if (!capturing) {
        capturing = true;
        chunks = [];
        recorder.start();
      }
      clearTimeout(silenceTimer);
      silenceTimer = setTimeout(() => {
        if (capturing && recorder.state !== "inactive") {
          capturing = false;
          recorder.stop();
        }
      }, SILENCE_MS);
    }

    requestAnimationFrame(check);
  }

  check();

  return () => {
    clearTimeout(silenceTimer);
    if (recorder.state !== "inactive") recorder.stop();
  };
}

// Gọi khi popup mở — tách biệt hoàn toàn với getDisplayMedia để tránh xung đột
// Chỉ kiểm tra state — không show dialog (dùng khi popup load)
export async function checkMicPermission() {
  try {
    const perm = await navigator.permissions.query({ name: "microphone" });
    console.log("[Mic] Permission state:", perm.state);
    return perm.state; // "granted" | "denied" | "prompt"
  } catch (e) {
    console.warn("[Mic] Không query được permission:", e.message);
    return "prompt";
  }
}

// Thực sự xin permission — phải gọi từ user gesture (click)
export async function requestMicPermission() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
    console.log("[Mic] Permission granted thành công");
    return true;
  } catch (e) {
    console.error("[Mic] requestMicPermission thất bại:", e.name, ":", e.message);
    return false;
  }
}

export async function startAudio(state, onTranslation) {
  // Lấy tab audio
  try {
    displayStream = await navigator.mediaDevices.getDisplayMedia({
      audio: true,
      video: true,
    });
    displayStream.getVideoTracks().forEach((t) => t.stop());
  } catch (e) {
    return { ok: false, message: "Không thể capture audio: " + e.message };
  }

  const tabStream = new MediaStream(displayStream.getAudioTracks());
  audioCtx = new AudioContext();

  // Tab: analyser + VAD + recorder riêng
  const tabAnalyser = audioCtx.createAnalyser();
  tabAnalyser.fftSize = 1024;
  audioCtx.createMediaStreamSource(tabStream).connect(tabAnalyser);
  isRunning = true;

  stopTabVAD = createRecorderVAD(tabAnalyser, tabStream, state, onTranslation);

  // Mic: analyser + VAD + recorder riêng
  if (micStream) {
    const micAnalyser = audioCtx.createAnalyser();
    micAnalyser.fftSize = 1024;
    audioCtx.createMediaStreamSource(micStream).connect(micAnalyser);
    stopMicVAD = createRecorderVAD(micAnalyser, micStream, state, onTranslation);
  }
  return { ok: true };
}

export function stopAudio() {
  isRunning = false;
  stopMicVAD?.();
  stopTabVAD?.();
  micStream?.getTracks().forEach((t) => t.stop());
  displayStream?.getTracks().forEach((t) => t.stop());
  audioCtx?.close();
  micStream = null;
  displayStream = null;
  audioCtx = null;
  stopMicVAD = null;
  stopTabVAD = null;
}
