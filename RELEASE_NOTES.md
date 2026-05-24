# 🚀 Release Notes - v0.1.8

This release introduces major stability enhancements, real-time monitor event synchronization, and critical bug fixes regarding initialization race conditions.

---

## 🇮🇩 Ringkasan Rilis (Bahasa Indonesia)

Rilis versi `v0.1.8` ini difokuskan pada peningkatan stabilitas pemetaan monitor, sinkronisasi layar secara real-time, dan perbaikan *race condition* saat aplikasi pertama kali dibuka.

### 🌟 Fitur Baru & Peningkatan
*   **Pemantau Monitor Real-time (Hotplug Listener)**: Aplikasi kini terhubung langsung ke soket event internal Hyprland (`socket2`). Setiap kali Anda mencolokkan atau mencabut monitor (HDMI/DisplayPort) atau membuat monitor virtual, tampilan layout pada aplikasi akan langsung diperbarui secara otomatis tanpa perlu menekan tombol refresh.
*   **Resolusi Soket Dinamis**: Mendukung deteksi lokasi soket baru pada versi Hyprland terbaru (di bawah `$XDG_RUNTIME_DIR/hypr/`) dengan sistem *fallback* otomatis ke `/tmp/hypr/` pada versi yang lebih lama.

### 🐛 Perbaikan Bug
*   **Perbaikan Balapan State Inisialisasi (*Race Condition* on Mount)**: Memperbaiki masalah di mana layout layar yang sudah tersimpan di profil (seperti `HDMI-A-1` dan `HEADLESS-2`) tidak muncul/kosong saat aplikasi pertama kali dibuka. Kami telah meniadakan proses pembacaan monitor mentah paralel yang sebelumnya menimpa konfigurasi profil Anda pada saat memuat aplikasi.

---

## 🇬🇧 Release Summary (English)

Version `v0.1.8` focuses on state-management stability, real-time display hotplugging, and fixing mount-time race conditions when launching the app.

### 🌟 New Features & Enhancements
*   **Real-time Monitor Event Synchronization (Hotplug Listener)**: HyprDisplay now listens directly to Hyprland's internal event broadcaster (`socket2`). Connecting or disconnecting an external monitor (HDMI/DisplayPort) or spawning a virtual headless screen now immediately updates the canvas in real-time without requiring a manual refresh.
*   **Dynamic Socket Path Resolution**: Added support for modern Hyprland configurations by checking the newer socket directory under `$XDG_RUNTIME_DIR/hypr/` (e.g., `/run/user/1000/hypr/`) while maintaining automatic fallback to `/tmp/hypr/` for older systems.

### 🐛 Bug Fixes
*   **Initialization Race Condition Fix**: Resolved an issue where monitors saved in a profile (like `HDMI-A-1` and `HEADLESS-2`) failed to load inside their layout slots when the application was opened. We consolidated the startup hooks and eliminated concurrent state overwrites, ensuring your layouts load correctly from the very first second.

---

## 📦 What's Changed
*   Consolidated duplicate mounting `useEffect` hooks in `App.tsx` into a single, race-free flow.
*   Added active UNIX domain socket listener inside `index.ts` connecting to Hyprland's event broadcast socket.
*   Bumped version number to `0.1.8` in `package.json` and `README.md`.
