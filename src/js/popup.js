// =============================================================
// File xử lý UI chung (theme, eye toggle, provider selection,...)
// =============================================================
import { PROVIDERS } from "../provider/providers.js";
import { loadState, saveState } from "../state/state.js";
import { startTranslation } from "./translator.js";
import { startAudio, stopAudio } from "./audioManager.js";
import {
  saveToHistory,
  loadHistory,
  clearHistory,
  renderHistory,
} from "./history.js";

//
//
// =================== START TRANSLATION ===================
//
//
// Handle API provider selection
document.querySelector(".api-selection").addEventListener("click", (e) => {
  const btn = e.target.closest(".provider-selection");
  // highlight selected provider button
  if (!btn) return;
  document.querySelectorAll(".provider-button").forEach((b) => {
    b.classList.remove("active");
  });
  btn.querySelector(".provider-button").classList.add("active");
  // save selected provider to state & update UI
  const clickedProvider =
    btn?.querySelector(".provider-button")?.dataset.provider;
  state.provider = clickedProvider;
  saveState({ provider: clickedProvider });
  // Load API key tương ứng với provider vừa click
  document.getElementById("apiKey").value =
    state[`${clickedProvider}ApiKey`] ?? "";

  const provider = PROVIDERS[clickedProvider];

  if (provider) {
    document.getElementById("apiKeyHelp").innerHTML =
      `${provider.helpText} <a href="${provider.helpUrl}" target="_blank">${provider.helpUrlText}</a> · ${provider.pricing}`;

    document.getElementById("apiKeyLabel").textContent =
      `${provider.name} API Key`;
  } else {
    document.getElementById("apiKeyHelp").textContent = "Chưa có thông tin";
  }
});

// Handle password visibility toggle
document.getElementById("toggleKey").addEventListener("click", () => {
  const input = document.getElementById("apiKey");
  const eyeShow = document.getElementById("eyeShow");
  const eyeHide = document.getElementById("eyeHide");

  if (input.type === "password") {
    input.type = "text";
    eyeShow.style.display = "inline";
    eyeHide.style.display = "none";
  } else {
    input.type = "password";
    eyeShow.style.display = "none";
    eyeHide.style.display = "inline";
  }
});

// Theme light/dark toggle
document.getElementById("themeToggle").addEventListener("change", (e) => {
  document.body.classList.toggle("light", e.target.checked);
  saveState({ theme: e.target.checked ? "light" : "dark" });
});

// Save apiKey in Local Storage
document.getElementById("apiKey").addEventListener("input", (e) => {
  const currentProvider = document.querySelector(".provider-button.active")
    ?.dataset.provider;
  const key = `${currentProvider}ApiKey`;
  state[key] = e.target.value;
  saveState({ [key]: e.target.value });
});

// sourceLang & targetLang input
const sourceLangInput = document.getElementById("sourcelang");
const targetLangInput = document.getElementById("targetlang");
sourceLangInput.addEventListener("change", (e) => {
  saveState({ sourcelang: e.target.value });
});

targetLangInput.addEventListener("change", (e) => {
  saveState({ targetlang: e.target.value });
});

// Subtitle toggle & showOriginal toggle state
document.getElementById("showOriginal").addEventListener("change", (e) => {
  saveState({ showOriginal: e.target.checked });
});

document.getElementById("subtitlePos").addEventListener("change", (e) => {
  saveState({ subtitlePos: e.target.value });
});

//
//
// ===================LOAD STATE & INIT UI===================
//
//
const state = await loadState();

document.body.classList.toggle("light", state.theme === "light");
document.getElementById("themeToggle").checked = state.theme === "light";
document.getElementById("subtitlePos").value = state.subtitlePos;
document.querySelectorAll(".provider-button").forEach((b) => {
  b.classList.remove("active");
});
document
  .querySelector(`[data-provider="${state.provider}"]`)
  ?.classList.add("active");
document.getElementById("apiKey").value =
  state[`${state.provider}ApiKey`] ?? "";

// Sync label & help text theo provider đang active
const activeProvider = PROVIDERS[state.provider];
if (activeProvider) {
  document.getElementById("apiKeyLabel").textContent =
    `${activeProvider.name} API Key`;
  document.getElementById("apiKeyHelp").innerHTML =
    `${activeProvider.helpText} <a href="${activeProvider.helpUrl}" target="_blank">${activeProvider.helpUrlText}</a> · ${activeProvider.pricing}`;
}

document.getElementById("sourcelang").value = state.sourcelang;
document.getElementById("targetlang").value = state.targetlang;
document.getElementById("showOriginal").checked = state.showOriginal;

// ==============================VERSION 2.0=========================================
// Version 2.0: load history khi popup mở
const initialHistory = await loadHistory();
renderHistory(initialHistory);

document.getElementById("clearBtn").addEventListener("click", async () => {
  await clearHistory();
  renderHistory([]);
});

let isRunning = false;

document.getElementById("toggleBtn").addEventListener("click", async () => {
  const errorMsg = document.getElementById("errorMsg");
  const btn = document.getElementById("toggleBtn");

  // ── STOP ──────────────────────────────────────────────
  if (isRunning) {
    isRunning = false;
    stopAudio();
    chrome.runtime.sendMessage({ type: "STOP" });
    btn.textContent = "🎙Bắt đầu dịch";
    btn.classList.remove("btn-stop");
    document.getElementById("statusBadge").className = "status-badge inactive";
    document.getElementById("statusText").textContent = "Chưa kích hoạt";
    return;
  }

  // ── VALIDATE ───────────────────────────────────────────
  errorMsg.textContent = "";
  const validation = await startTranslation(state);
  if (!validation.ok) {
    errorMsg.textContent = validation.message;
    return;
  }

  // ── LẤY MEET TAB ID TỪ BACKGROUND ────────────────────
  const { ok, message } = await chrome.runtime.sendMessage({ type: "START" });
  if (!ok) {
    errorMsg.textContent = message;
    return;
  }

  // ── START AUDIO ────────────────────────────────────────
  const audioResult = await startAudio(state, async (result) => {
    const history = await saveToHistory(result.original, result.translated);
    renderHistory(history);
    chrome.runtime.sendMessage({
      type: "SHOW_SUBTITLE",
      original: result.original,
      translated: result.translated,
      showOriginal: state.showOriginal,
      subtitlePos: state.subtitlePos,
    });
  });

  if (!audioResult.ok) {
    errorMsg.textContent = audioResult.message;
    return;
  }

  isRunning = true;
  btn.textContent = "⏹ Dừng dịch";
  btn.classList.add("btn-stop");
  document.getElementById("statusBadge").className = "status-badge active";
  document.getElementById("statusText").textContent = "Đang kích hoạt";
});
