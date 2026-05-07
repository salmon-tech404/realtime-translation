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

  // 3. Check internet
  if (!navigator.onLine) {
    return { ok: false, message: "Không có kết nối internet" };
  }

  // 4. Check đang ở Google Meet không
  const isOnMeeting = await checkGoogleMeetTab();
  if (!isOnMeeting) {
    return { ok: false, message: "Vui lòng mở Google Meet trước" };
  }

  // 5. Validate API key với provider
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
    gemini: `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
    deepseek: "https://api.deepseek.com/models",
    claude: "https://api.anthropic.com/v1/models",
  };

  const headers = {
    gemini: {},
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

// ─── Gemini Audio Processing ──────────────────────────────────────────────────
export async function processAudioWithGemini(
  blob,
  apiKey,
  sourcelang,
  targetlang,
) {
  const base64 = await blobToBase64(blob);

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inline_data: {
                    mime_type: "audio/webm",
                    data: base64,
                  },
                },
                {
                  text: `Listen to this audio and detect the language being spoken.\nIf the language is NOT ${sourcelang}, respond with exactly: SKIP\nIf the language IS ${sourcelang}, transcribe and translate to ${targetlang} in this exact format:\nORIGINAL: [transcription]\nTRANSLATED: [translation]`,
                },
              ],
            },
          ],
          generationConfig: { temperature: 0.1 },
        }),
      },
    );

    if (!res.ok) {
      console.log("[Gemini] HTTP error:", res.status);
      return null;
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    console.log("[Gemini] Raw response:", text);

    if (text.trim() === "SKIP") return null;

    const originalMatch = text.match(/ORIGINAL:\s*(.+)/);
    const translatedMatch = text.match(/TRANSLATED:\s*(.+)/);
    if (!originalMatch || !translatedMatch) return null;

    return {
      original: originalMatch[1].trim(),
      translated: translatedMatch[1].trim(),
    };
  } catch {
    return null;
  }
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
