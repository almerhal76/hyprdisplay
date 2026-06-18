# 🚀 Release Notes - v0.1.11

This release adds a comprehensive Cursor Configuration module to easily manage, preview, and apply cursor themes and sizes.

---

## 🇮🇩 Ringkasan Rilis (Bahasa Indonesia)

Rilis versi `v0.1.11` ini menghadirkan fitur **Cursor Configuration** (Pengaturan Kursor) untuk memudahkan pengguna mengelola, mempratinjau, dan menerapkan tema serta ukuran kursor secara langsung dan persisten.

### 🌟 Fitur Baru & Peningkatan
*   **Pengaturan Tema & Ukuran Kursor**: Memungkinkan pemilihan tema kursor yang terinstal di sistem Linux (dari `/usr/share/icons`, `~/.icons`, dan `~/.local/share/icons`).
*   **Penerapan Instan & Persisten**:
    - Kursor langsung berubah di sesi aktif menggunakan `hyprctl setcursor`.
    - Sinkronisasi setelan ke aplikasi GTK menggunakan `gsettings`.
    - Menyimpan otomatis di `settings.json` dan menambahkan variabel lingkungan kursor (`XCURSOR_THEME`, `XCURSOR_SIZE`, dll.) secara aman di `custom/env.conf` (yang juga disinkronkan ke `env.lua` format Lua).

---

## 🇬🇧 Release Summary (English)

Version `v0.1.11` introduces a fully integrated **Cursor Configuration** utility to easily manage, preview, and apply cursor themes and sizes.

### 🌟 New Features & Enhancements
*   **Cursor Theme & Size Picker**: Automatically detects installed cursor themes in standard Linux directories (`/usr/share/icons`, `~/.icons`, and `~/.local/share/icons`).
*   **Instant & Persistent Application**:
    - Dynamically updates active session cursors using `hyprctl setcursor`.
    - Automatically syncs GNOME/GTK application compatibility using `gsettings`.
    - Persists settings in `settings.json` and updates `custom/env.conf` (synced to Lua structure `custom/env.lua`).

---

## 📦 What's Changed
*   Implemented cursor theme directory scanner and dynamic application handlers in `src/main/index.ts`.
*   Added cursor themes, size, and selected theme states in React frontend `src/renderer/src/App.tsx`.
*   Integrated **Cursor Configuration** settings group layout inside the Settings modal.
*   Updated `package.json`, `package-lock.json`, and `README.md` version badges to `0.1.11`.
