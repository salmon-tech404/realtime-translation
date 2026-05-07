// version 2.0 - translation using OpenAIWhisper
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

let meetTabId = null;

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "START") {
    chrome.tabs.query({ url: "https://meet.google.com/*" }, (tabs) => {
      if (!tabs.length) {
        sendResponse({ ok: false, message: "Không tìm thấy tab Google Meet" });
        return;
      }
      meetTabId = tabs[0].id;
      sendResponse({ ok: true });
    });
    return true;
  }

  if (msg.type === "SHOW_SUBTITLE") {
    if (!meetTabId) return;
    chrome.tabs.sendMessage(meetTabId, {
      type: "SHOW_SUBTITLE",
      original: msg.original,
      translated: msg.translated,
      showOriginal: msg.showOriginal,
      subtitlePos: msg.subtitlePos,
    }, () => void chrome.runtime.lastError);
  }

  if (msg.type === "STOP") {
    if (meetTabId) {
      chrome.tabs.sendMessage(meetTabId, { type: "HIDE_SUBTITLE" },
        () => void chrome.runtime.lastError);
    }
    meetTabId = null;
    sendResponse({ ok: true });
    return true;
  }
});
