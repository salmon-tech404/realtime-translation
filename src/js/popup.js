// =============================================================
// File xử lý UI chung (theme, eye toggle, provider selection)
// =============================================================
import { PROVIDERS } from "../provider/providers.js";
import { loadState, saveState } from "../state/state.js";
import { startTranslation } from "./translator.js";
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

document.getElementById("sourcelang").value = state.sourcelang;
document.getElementById("targetlang").value = state.targetlang;
document.getElementById("showOriginal").checked = state.showOriginal;
//
//
// =================== START TRANSLATION ===================
//
//
let isRunning = false;
document.getElementById("toggleBtn").addEventListener("click", async () => {
  const errorMsg = document.getElementById("errorMsg");
  const btn = document.getElementById("toggleBtn");

  if (isRunning) {
    isRunning = false;
    btn.textContent = "🎙 Bắt đầu dịch";
    btn.classList.remove("btn-stop");
    document.getElementById("statusBadge").className = "status-badge inactive";
    document.getElementById("statusText").textContent = "Chưa kích hoạt";
    return;
  }

  errorMsg.textContent = "";
  const result = await startTranslation(state);
  if (!result.ok) {
    errorMsg.textContent = result.message;
    return;
  }

  isRunning = true;
  btn.textContent = "⏹ Dừng dịch";
  btn.classList.add("btn-stop");
  document.getElementById("statusBadge").className = "status-badge active";
  document.getElementById("statusText").textContent = "Đang kích hoạt";
});
