# Phase 01 — UI & State Management

> **Project:** I'm Comtor — Realtime Translation for Google Meet  
> **Version:** 1.0.0  
> **Phase:** 01 / 02  
> **Status:** ✅ Completed

---

## Overview

Phase 01 tập trung vào việc xây dựng toàn bộ nền tảng giao diện người dùng (UI) và hệ thống quản lý trạng thái (State Management) cho Chrome Extension. Mục tiêu là hoàn thiện popup panel trước khi đi vào phần xử lý logic dịch thuật thực sự ở Phase 02.

---

## Completed

### 1. Extension Setup
- [x] Cấu hình `manifest.json` (Manifest V3)
- [x] Khai báo permissions: `activeTab`, `storage`, `scripting`, `sidePanel`, `tabCapture`
- [x] Khai báo `host_permissions` cho Google Meet và các AI API
- [x] Thiết lập Side Panel (`popup.html`) thay vì popup thông thường
- [x] Cấu hình `action` với icon extension
- [x] Service worker (`src/background/index.js`) mở side panel khi click icon

### 2. UI — HTML & CSS
- [x] Layout tổng thể: Header / Body / Footer
- [x] Header: logo, tagline, theme toggle (sáng/tối), status badge
- [x] Status badge: "Chưa kích hoạt" / "Đang kích hoạt" với animation pulse
- [x] AI Provider selector (DeepSeek, Claude, + Thêm)
- [x] API Key input với toggle hiển thị/ẩn (SVG eye icon)
- [x] Language selector: Ngôn ngữ nhận & Ngôn ngữ dịch với swap button
- [x] Subtitle position selector
- [x] Show original toggle switch
- [x] Button "Bắt đầu dịch" / "Dừng dịch" với màu sắc tương ứng
- [x] Error message hiển thị dưới button
- [x] Footer: version, help, architecture overview
- [x] Dark mode & Light mode đầy đủ với CSS variables
- [x] Responsive layout trong side panel

### 3. State Management
- [x] `src/state/state.js` — module quản lý state tập trung
- [x] Sử dụng `chrome.storage.local` (chia sẻ được giữa popup & service worker)
- [x] `loadState()` — đọc toàn bộ state từ storage với default values
- [x] `saveState(partial)` — ghi partial state vào storage
- [x] State items được quản lý:
  - `theme` — dark / light
  - `provider` — deepseek / claude
  - `deepseekApiKey` — API key riêng cho DeepSeek
  - `claudeApiKey` — API key riêng cho Claude
  - `sourcelang` — ngôn ngữ nguồn
  - `targetlang` — ngôn ngữ đích
  - `showOriginal` — hiển thị text gốc
  - `subtitlePos` — vị trí subtitle

### 4. UI Logic — popup.js
- [x] Provider selection: highlight active, load API key tương ứng, cập nhật label & help text
- [x] Theme toggle: đổi class `body.light`, lưu state
- [x] API key: lưu per-provider, cập nhật `state` trong memory ngay lập tức
- [x] Eye toggle: ẩn/hiện API key dựa vào `input.type`
- [x] Language selectors: lưu state khi thay đổi
- [x] Show original & Subtitle position: lưu state khi thay đổi
- [x] Load state khi mở popup: apply toàn bộ vào UI
- [x] Start/Stop flow: `isRunning` flag, đổi text button, đổi status badge

### 5. Provider Data
- [x] `src/provider/providers.js` — data tập trung cho từng provider
- [x] Thông tin: name, label, helpText, helpUrl, helpUrlText, pricing

### 6. Validation — translator.js
- [x] Check provider có hợp lệ không (tránh click "+ Thêm")
- [x] Check API key có được nhập chưa
- [x] Check kết nối internet (`navigator.onLine`)
- [x] Check đang ở tab Google Meet không (`chrome.tabs.query`)
- [x] Validate API key với provider qua API call thực tế

---

## Phase 02 — Core Engine

> Những hạng mục dưới đây sẽ được thực hiện trong Phase 02.

### 1. Caption Capture
- [ ] `src/capture/captions.js` — bắt caption realtime từ Google Meet DOM
- [ ] Theo dõi thay đổi caption bằng `MutationObserver`
- [ ] Gửi caption sang background để xử lý

### 2. Translation Engine
- [ ] `src/js/translator.js` — logic gọi API dịch thuật thực sự
- [ ] Tích hợp DeepSeek API
- [ ] Tích hợp Claude (Anthropic) API
- [ ] Xử lý streaming response
- [ ] Debounce để tránh gọi API quá nhiều

### 3. Subtitle Overlay
- [ ] `src/content.js` — inject subtitle lên màn hình Google Meet
- [ ] Hiển thị bản gốc & bản dịch theo cài đặt `showOriginal`
- [ ] Vị trí subtitle theo `subtitlePos`
- [ ] Animation hiển thị mượt

### 4. Message Passing
- [ ] `background/index.js` — trung gian giữa popup và content script
- [ ] Giao tiếp: popup → background → content (start/stop)
- [ ] Giao tiếp: content → background → popup (caption data)

### 5. Translation History
- [ ] `src/js/history.js` — lưu và hiển thị bản dịch gần đây
- [ ] Lưu vào `chrome.storage.local`
- [ ] Hiển thị trong tab "Bản dịch gần đây" ở popup

---

## File Structure

```
realtime-translation/
├── manifest.json
├── popup.html
├── popup.css
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── src/
    ├── background/
    │   └── index.js          ✅ done
    ├── capture/
    │   └── captions.js       ❌ phase 02
    ├── content.js             ❌ phase 02
    ├── docs/
    │   └── phase_01.md
    ├── js/
    │   ├── popup.js          ✅ done
    │   ├── translator.js     🔶 partial (validation only)
    │   └── history.js        ❌ phase 02
    ├── provider/
    │   └── providers.js      ✅ done
    └── state/
        └── state.js          ✅ done
```

---

*Last updated: 2026-04-26*
