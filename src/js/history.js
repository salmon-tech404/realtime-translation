// Xử lý bản dịch gần đây (lưu, đọc, hiển thị)

const HISTORY_KEY = "translationHistory"; // key để lưu lịch sử dịch trong chrome.storage
const MAX_HISTORY = 100; // lưu tối đa 100 bản dịch gần nhất

// ── Version 2.0: Lưu 1 bản dịch mới vào đầu danh sách ────────
export async function saveToHistory(original, translated) {
  const history = await loadHistory();
  history.unshift({ original, translated, time: Date.now() });
  if (history.length > MAX_HISTORY) history.pop();
  chrome.storage.local.set({ [HISTORY_KEY]: history });
  return history;
}

export async function loadHistory() {
  return new Promise((resolve) => {
    chrome.storage.local.get({ [HISTORY_KEY]: [] }, (res) => {
      resolve(res[HISTORY_KEY]);
    });
  });
}

export async function clearHistory() {
  chrome.storage.local.set({ [HISTORY_KEY]: [] });
}

// ── Version 2.0: Render danh sách bản dịch vào #recentList ────
export function renderHistory(history) {
  const list = document.getElementById("recentList");
  if (!list) return;

  if (!history.length) {
    list.innerHTML = `<div class="empty-state">Chưa có bản dịch nào</div>`;
    return;
  }

  list.innerHTML = history
    .map(
      (item) => `
    <div class="history-item">
      <div class="history-original">${escapeHtml(item.original)}</div>
      <div class="history-translated">${escapeHtml(item.translated)}</div>
    </div>
  `,
    )
    .join("");
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
