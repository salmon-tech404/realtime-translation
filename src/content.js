// =============================================================
// content.js — Version 2.0
// Hiển thị subtitle overlay trực tiếp trên trang Google Meet
// Nhận message từ background: SHOW_SUBTITLE / HIDE_SUBTITLE
// =============================================================

let subtitleEl = null;
let hideTimer = null;

function getOrCreateSubtitle() {
  if (subtitleEl) return subtitleEl;
  subtitleEl = document.createElement("div");
  subtitleEl.id = "imcomtor-subtitle";
  document.body.appendChild(subtitleEl);
  return subtitleEl;
}

// ── SHOW SUBTITLE — Version 2.0 ───────────────────────────────
// Render original (nếu bật) + translated, tự ẩn sau 5 giây
function showSubtitle({ original, translated, showOriginal, subtitlePos }) {
  const el = getOrCreateSubtitle();

  el.className = `imcomtor-pos-${subtitlePos || "bottom"}`;

  let html = "";
  if (showOriginal && original) {
    html += `<div class="imcomtor-original">${escapeHtml(original)}</div>`;
  }
  html += `<div class="imcomtor-translated">${escapeHtml(translated)}</div>`;

  el.innerHTML = html;
  el.classList.add("imcomtor-visible");

  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    el.classList.remove("imcomtor-visible");
  }, 5000);
}

function hideSubtitle() {
  if (!subtitleEl) return;
  clearTimeout(hideTimer);
  subtitleEl.classList.remove("imcomtor-visible");
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ── MESSAGE LISTENER ──────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "SHOW_SUBTITLE") showSubtitle(msg);
  if (msg.type === "HIDE_SUBTITLE") hideSubtitle();
});
