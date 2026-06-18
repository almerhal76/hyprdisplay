# 🚀 Release Notes - v0.1.12

This release adds a Cursor Preview module to view active cursor themes (either via theme images or direct parsing of Xcursor binaries) and improves the Application Settings layout with vertical scrolling.

---

## 🇮🇩 Ringkasan Rilis (Bahasa Indonesia)

Rilis versi `v0.1.12` ini menghadirkan fitur **Cursor Theme Preview** (Pratonton Tema Kursor) secara visual, serta membenahi layout **Application Settings** agar dapat di-scroll vertikal dan ramah layar kecil.

### 🌟 Fitur Baru & Peningkatan
*   **Visual Cursor Theme Preview**: Memperoleh pratonton kursor secara real-time. Program mencari file preview statis (`preview.gif`, dll.) di direktori tema atau mem-parsing binary file Xcursor (seperti `cursors/left_ptr`) secara manual untuk merender data pixel raw BGRA ke format PNG Data URL.
*   **Scrollable Settings Layout**: Modal pengaturan aplikasi sekarang memiliki batasan tinggi (`maxHeight: 85vh`) dan scrollbar kustom (`overflowY: auto`), mencegah pemotongan UI pada layar berukuran kecil.
*   **Pengaturan Tema & Ukuran Kursor**: Konfigurasi tema kursor yang instan, serta tersimpan persisten ke dalam preferensi internal aplikasi dan file konfigurasi lingkungan Hyprland (`custom/env.conf` / `custom/env.lua`).

---

## 🇬🇧 Release Summary (English)

Version `v0.1.12` introduces a visual **Cursor Theme Preview** and optimizes the **Application Settings** modal layout with native vertical scrolling for small screens.

### 🌟 New Features & Enhancements
*   **Visual Cursor Theme Preview**: Fetches and renders cursor previews in real-time. It locates static preview files (like `preview.gif`) or parses Xcursor binary files (like `cursors/left_ptr`) on the fly, extracting BGRA pixels to generate standard base64 PNG data URLs.
*   **Scrollable Settings Layout**: The Settings modal now implements responsive height limits (`maxHeight: 85vh`) and custom scroll bars (`overflowY: auto`), preventing layout truncation on smaller monitors.
*   **Cursor Configuration**: Seamlessly configures cursor theme and size. Changes apply instantly using `hyprctl setcursor` and persist securely in internal preferences and Hyprland environment files (`custom/env.conf` / `custom/env.lua`).

---

## 📦 What's Changed
*   Implemented real-time Xcursor binary files parsing and PNG base64 generation in `src/main/index.ts`.
*   Integrated a visual **Theme Preview** card under the Cursor Theme selection in `src/renderer/src/App.tsx`.
*   Fixed Settings modal markup by adding `maxHeight`, `overflowY`, and `className="custom-scrollbar"` to the container.
*   Bumped project version to `0.1.12` in `package.json`, `package-lock.json`, and `README.md`.
