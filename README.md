# 🖥️ HyprDisplay Manager

![Version](https://img.shields.io/badge/version-0.1.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Platform](https://img.shields.io/badge/platform-Linux-orange)

**HyprDisplay Manager** is a premium, high-performance GUI tool designed for **Hyprland** users to manage multi-monitor setups effortlessly. Built with **React**, **Electron**, and **Framer Motion**, it offers a seamless and visually stunning experience for configuring display layouts.

---

## ✨ Key Features

### 🎨 Premium User Experience
*   **Dynamic Splash Screen:** A high-tech initialization screen featuring a dual-gear rotation animation.
*   **Shared Layout Transitions:** Seamlessly morphs from the loading splash screen into the main dashboard.
*   **Modern Aesthetics:** Deep dark mode with glassmorphism effects and vibrant accent colors.
*   **Responsive UI:** Adapts gracefully to any window size, from compact to full-screen.

### 📐 Powerful Layout Management
*   **Smart Layout Templates:** Instantly apply complex layouts:
    *   **Standard:** Triple horizontal or vertical stacks.
    *   **Dual Setup:** Side-by-side or stacked top-bottom configurations.
    *   **T-Shape:** Specialized 3-monitor layouts (Up, Down, Left, Right).
*   **Real-time Synchronization:** Directly modifies `~/.config/hypr/monitors.conf` and triggers `hyprctl reload` for instant results.
*   **Profile Persistence:** Save multiple configuration profiles and switch between them instantly.

### ⚙️ Advanced Settings
*   **System Integration:** Optional "Launch on Startup" and "Run in Background" (System Tray) support.
*   **Auto-Update Engine:** Built-in version tracking against GitHub releases to keep your engine up to date.

---

## 📸 Screenshots

*(Add your screenshots here to show off the gear animation and layout presets!)*

---

## 🚀 Installation

### Using AppImage (Recommended)
1.  Go to the [Releases](https://github.com/almerhal76/hyprdisplay/releases) page.
2.  Download the latest `hyprdisplay-x.x.x.AppImage`.
3.  Make the file executable:
    ```bash
    chmod +x hyprdisplay-*.AppImage
    ```
4.  Run the application:
    ```bash
    ./hyprdisplay-*.AppImage
    ```

### Development Setup
If you want to build from source:
```bash
# Clone the repository
git clone https://github.com/almerhal76/hyprdisplay.git

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for Linux
npm run build:linux
```

---

## 🛠️ Requirements
*   **Hyprland:** The application requires a running Hyprland session to manage displays.
*   **Linux OS:** Designed specifically for the Wayland-based Hyprland compositor.

---

## 📄 License
This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/almerhal76/hyprdisplay/issues).

Developed with ❤️ for the Hyprland community.
