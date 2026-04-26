// State for all system
const DEFAULT_STATE = {
  theme: "light",
  provider: "deepseek",
  deepseekApiKey: "",
  claudeApiKey: "",
  sourcelang: "",
  targetlang: "",
  showOriginal: true,
  subtitlePos: "bottom",
};

export async function loadState() {
  return new Promise((resolve) => {
    chrome.storage.local.get(DEFAULT_STATE, resolve);
  });
}

export async function saveState(updatedState) {
  chrome.storage.local.set(updatedState);
}
