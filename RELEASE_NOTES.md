# 🚀 Release Notes - v0.1.10

This release introduces native support for Hyprland Lua configurations (introduced in Hyprland 0.55+), automatically generating and updating `.lua` configuration files alongside standard `.conf` files.

---

## 🇮🇩 Ringkasan Rilis (Bahasa Indonesia)

Rilis versi `v0.1.10` ini menghadirkan dukungan native untuk konfigurasi Hyprland berbasis Lua (Hyprland 0.55+). Aplikasi kini secara otomatis membuat dan menyinkronkan file konfigurasi `.lua` di samping file `.conf` standar.

### 🌟 Fitur Baru & Peningkatan
*   **Dukungan Native Konfigurasi Lua**: Jika setup Hyprland Anda menggunakan format Lua (`hyprland.lua`), aplikasi kini secara otomatis menulis konfigurasi monitor dan workspace ke `monitors.lua` dan `workspaces.lua` menggunakan syntax `hl.monitor` dan `hl.workspace_rule`.
*   **Sinkronisasi Variabel & Eksekusi Kustom**: Custom environment variables dan auto-start commands sekarang juga disinkronkan ke file `custom/env.lua` dan `custom/execs.lua`.
*   **Sinkronisasi Jalur Eksekusi**: Memastikan jalur AppImage yang sedang berjalan selalu sinkron di file `custom/execs.conf` dan `custom/execs.lua`.

---

## 🇬🇧 Release Summary (English)

Version `v0.1.10` introduces native support for Hyprland Lua configurations. The application now automatically generates and updates `.lua` configuration files alongside standard `.conf` files.

### 🌟 New Features & Enhancements
*   **Native Lua Config Support**: For Hyprland setups utilizing Lua configuration structure (`hyprland.lua`), the application now automatically writes display settings and workspace mappings to `monitors.lua` and `workspaces.lua` using `hl.monitor` and `hl.workspace_rule` syntax.
*   **Custom Lua Variables & Execution Sync**: Custom environment variables and startup commands are now synchronized to `custom/env.lua` and `custom/execs.lua` as well.
*   **Execution Path Synchronization**: Ensures the active AppImage path is kept up to date inside both `custom/execs.conf` and `custom/execs.lua`.

---

## 📦 What's Changed
*   Implemented `.conf` to `.lua` conversion helper functions in `src/main/index.ts`.
*   Updated `apply_hyprland_config` to write `monitors.lua`.
*   Updated `apply_workspace_config` to write `workspaces.lua`.
*   Updated `update_custom_config` to write to `custom/env.lua` and `custom/execs.lua`.
*   Updated `syncAutostartPath` to sync current executable inside `custom/execs.lua`.
*   Updated `package.json` to `0.1.10`.
