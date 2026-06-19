# 🚀 Release Notes - v0.1.13

This release fixes a critical layout application bug in multi-monitor setups, specifically where placing a secondary monitor to the left (negative X coordinates) would fail to apply instantly and get stuck on the right.

---

## 🇮🇩 Ringkasan Rilis (Bahasa Indonesia)

Rilis versi `v0.1.13` ini memperbaiki bug kritis pada pemosisian layar di sistem multi-monitor, terutama saat meletakkan layar kedua di sebelah kiri (koordinat X negatif) yang sebelumnya gagal diterapkan secara instan dan tetap tertahan di sebelah kanan.

### 🌟 Perbaikan & Peningkatan
*   **Instant Layout Application (Fix)**: Mengubah mekanisme penerapan tata letak monitor dengan mengeksekusi perintah dinamis `hyprctl keyword monitor` untuk setiap monitor sebelum melakukan `reload`. Hal ini memastikan tata letak monitor baru (termasuk koordinat negatif di sebelah kiri) langsung aktif seketika tanpa perlu dipancing menggunakan tool eksternal seperti `nwg-displays`.
*   **Optimalisasi Sync Konfigurasi**: Meningkatkan sinkronisasi penataan layar agar tetap mempertahankan posisi yang diinginkan di memori session Hyprland secara persisten.

---

## 🇬🇧 Release Summary (English)

Version `v0.1.13` resolves a critical multi-monitor layout application bug, specifically when positioning a secondary display to the left of the primary display (involving negative coordinates).

### 🌟 Fixes & Enhancements
*   **Instant Layout Application (Fix)**: Dynamically applies monitor configurations using `hyprctl keyword monitor` for each output prior to invoking `hyprctl reload`. This ensures all coordinate updates (including negative values) apply immediately without requiring external tools like `nwg-displays` to force repositioning.
*   **Configuration Sync Optimization**: Streamlines layout persistence, ensuring session layout states match generated configuration parameters accurately.

---

## 📦 What's Changed
*   Updated `syncAndApplyHyprlandConfig` in `src/main/index.ts` to dynamically execute `hyprctl keyword monitor` for each configured screen output.
*   Bumped project version to `0.1.13` in `package.json`, `package-lock.json`, and `README.md`.
