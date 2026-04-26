// Xử lý những tác vụ xử lý logic dịch, gọi API, xử lý kết quả dịch, v.v.
import { PROVIDERS } from "../provider/providers.js";

export async function startTranslation(state) {
  // 1. Check provider có hợp lệ không
  if (!PROVIDERS[state.provider]) {
    return { ok: false, message: "Provider này chưa được hỗ trợ" };
  }

  // 2. Check API key có không
  const apiKey = state[`${state.provider}ApiKey`];
  if (!apiKey) {
    return { ok: false, message: "Vui lòng nhập API key" };
    // ok: là để báo lại với popup biết là có lỗi và hiển thị message lỗi, tránh trường hợp popup nghĩ là đã lưu thành công rồi nhưng thực tế chưa vì thiếu API key, dẫn đến user confusion khi mở popup lên lại mà thấy API key vẫn trống trơn. Cách này sẽ giúp UX tốt hơn, còn nếu không có message thì popup sẽ không biết là lỗi gì nên sẽ không hiện thông báo gì cả, khiến người dùng không hiểu tại sao nó không hoạt động.
  }

  // 2. Check internet
  if (!navigator.onLine) {
    return { ok: false, message: "Không có kết nối internet" };
  }

  // 3. Check đang ở Google Meet không
  const isOnMeeting = await checkGoogleMeetTab();
  if (!isOnMeeting) {
    return { ok: false, message: "Vui lòng mở Google Meet trước" };
  }

  // 4. Validate API key với provider
  const isValidKey = await validateApiKey(state.provider, apiKey);
  if (!isValidKey) {
    return { ok: false, message: "API key không hợp lệ" };
  }

  return { ok: true };
}

async function checkGoogleMeetTab() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const url = tabs[0]?.url ?? "";
      resolve(url.startsWith("https://meet.google.com"));
    });
  });
}

async function validateApiKey(provider, apiKey) {
  const endpoints = {
    deepseek: "https://api.deepseek.com/models",
    claude: "https://api.anthropic.com/v1/models",
  };

  const headers = {
    deepseek: { Authorization: `Bearer ${apiKey}` },
    claude: { "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
  };

  try {
    const res = await fetch(endpoints[provider], {
      headers: headers[provider],
    });
    return res.ok;
  } catch {
    return false;
  }
}
