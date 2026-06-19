# 🚀 Release Notes - v0.1.13

This release fixes a critical layout application bug in multi-monitor setups, specifically where placing a secondary monitor to the left (negative X coordinates) would fail to apply instantly and get stuck on the right.

---

## 🌟 Fixes & Enhancements
*   **Instant Layout Application (Fix)**: Dynamically applies monitor configurations using `hyprctl keyword monitor` for each output prior to invoking `hyprctl reload`. This ensures all coordinate updates (including negative values) apply immediately without requiring external tools like `nwg-displays` to force repositioning.
*   **Configuration Sync Optimization**: Streamlines layout persistence, ensuring session layout states match generated configuration parameters accurately.

---

## 📦 What's Changed
*   Updated `syncAndApplyHyprlandConfig` in `src/main/index.ts` to dynamically execute `hyprctl keyword monitor` for each configured screen output.
*   Bumped project version to `0.1.13` in `package.json`, `package-lock.json`, and `README.md`.
