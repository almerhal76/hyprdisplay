# 🚀 Release Notes - v0.1.9

This release introduces the highly requested **Auto-Apply on Hotplug** feature, resolving default resolution drops on display reconnection, alongside backend settings persistence fixes and compiler stability improvements.

---

## 🇮🇩 Ringkasan Rilis (Bahasa Indonesia)

Rilis versi `v0.1.9` ini menghadirkan fitur **Auto-Apply on Hotplug** untuk menerapkan konfigurasi layar secara otomatis ketika monitor dicolokkan/dicabut, perbaikan persistensi pengaturan backend, serta stabilitas kompilasi tipe data TypeScript.

### 🌟 Fitur Baru & Peningkatan
*   **Auto-Apply on Hotplug (Terapkan Otomatis)**: Sekarang aplikasi secara otomatis menerapkan koordinat, resolusi, dan skala monitor yang tersimpan di profil aktif saat ada event layar dicolokkan/dicabut (hotplug). Anda tidak perlu lagi membuka aplikasi dan mengeklik tombol "Apply" secara manual setelah menyambungkan monitor eksternal.
*   **Opsi Pengaturan Baru**: Menambahkan tombol pilihan *"Auto Apply on Hotplug"* di dalam menu aplikasi agar fitur ini dapat diaktifkan atau dinonaktifkan sesuai preferensi Anda.

### 🐛 Perbaikan Bug & Stabilitas
*   **Perbaikan Persistensi Pengaturan Tray**: Memperbaiki bug di mana opsi pengaturan *"Run in Background"* (tray) tidak tersimpan secara permanen karena handler backend `set_background_mode` yang terlewatkan. Kini status tray tersimpan dengan benar di `settings.json`.
*   **Stabilitas Kompilasi TypeScript**: Menyelesaikan kesalahan penulisan tipe data (`TS7030`) terkait pengembalian nilai implisit pada fungsi pembacaan data monitor (`fetchMonitors` dan `loadProfileData`) guna memastikan build produksi berjalan tanpa hambatan.

---

## 🇬🇧 Release Summary (English)

Version `v0.1.9` introduces **Auto-Apply on Hotplug** to automatically restore monitor settings upon reconnection, resolves backend setting persistence bugs, and enhances TypeScript compiler stability.

### 🌟 New Features & Enhancements
*   **Auto-Apply on Hotplug**: The application now automatically applies the coordinates, resolution, and scaling configured in your active profile whenever a display connection change is detected. No more manual "Apply" button clicks when hotplugging external screens.
*   **User Setting Toggle**: Added an *"Auto Apply on Hotplug"* switch in the application settings modal to easily enable or disable automatic display syncing.

### 🐛 Bug Fixes & Stability
*   **Tray Settings Persistence Fix**: Resolved an issue where the *"Run in Background"* (system tray) setting failed to persist by implementing the missing backend IPC handler (`set_background_mode`). Settings are now correctly saved to `settings.json`.
*   **TypeScript Compilation Stability**: Fixed TypeScript compiler warnings (`TS7030` - "Not all code paths return a value") within `fetchMonitors` and `loadProfileData` to ensure seamless production builds.

---

## 📦 What's Changed
*   Implemented `get_auto_apply` and `set_auto_apply` IPC handlers.
*   Implemented missing `set_background_mode` IPC handler in the main process.
*   Refactored config-generation logic in `App.tsx` into a reusable `generateConfigs` helper.
*   Implemented a silent, non-blocking config applier `applyConfigSilently` for hotplug automation.
*   Updated `package.json` to `0.1.9`.
