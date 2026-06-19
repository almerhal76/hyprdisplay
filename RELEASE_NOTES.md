# 🚀 Release Notes - v0.1.14

This release introduces persistent cursor configurations, ensuring that your customized cursor theme and size preferences are automatically restored and applied every time the system starts up or display synchronization occurs.

---

## 🌟 Fixes & Enhancements
*   **Persistent Cursor Configuration**: Restores and applies your saved cursor theme and size automatically when the app starts or when displays are synchronized.
*   **Compositor Integration**: Dynamically executes `hyprctl setcursor` using settings stored in `settings.json` during the synchronization phase, preventing the cursor from resetting to compositor defaults.

---

## 📦 What's Changed
*   Added cursor theme and size restoration logic directly into `syncAndApplyHyprlandConfig` inside `src/main/index.ts`.
*   Bumped project version to `0.1.14` in `package.json`, `package-lock.json`, and `README.md`.
