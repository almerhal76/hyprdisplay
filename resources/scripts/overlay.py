import sys
import gi
import os

# Force Wayland
os.environ["GDK_BACKEND"] = "wayland"

gi.require_version('Gtk', '3.0')
gi.require_version('GtkLayerShell', '0.1')
gi.require_version('WebKit2', '4.1')

from gi.repository import Gtk, Gdk, GtkLayerShell, WebKit2, GLib

def main():
    monitor_name = sys.argv[1] if len(sys.argv) > 2 else "Unknown"
    display_text = sys.argv[2] if len(sys.argv) > 2 else "Unknown"
    timeout = int(sys.argv[3]) if len(sys.argv) > 3 else 4000
    display_index = sys.argv[4] if len(sys.argv) > 4 else "1"
    gdk_idx = int(sys.argv[5]) if len(sys.argv) > 5 else 0

    win = Gtk.Window()
    
    # Transparency Setup
    screen = win.get_screen()
    visual = screen.get_rgba_visual()
    if visual:
        win.set_visual(visual)
    
    win.set_app_paintable(True)
    style_provider = Gtk.CssProvider()
    style_provider.load_from_data(b"window, grid, box, webview { background-color: rgba(0,0,0,0); background: transparent; }")
    Gtk.StyleContext.add_provider_for_screen(
        screen, style_provider, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION
    )

    # Initialize Layer Shell
    GtkLayerShell.init_for_window(win)
    GtkLayerShell.set_layer(win, GtkLayerShell.Layer.OVERLAY)
    GtkLayerShell.set_namespace(win, "hyprdisplay-overlay")
    
    # Set monitor
    display = Gdk.Display.get_default()
    try:
        target_monitor = display.get_monitor(gdk_idx)
        if target_monitor:
            GtkLayerShell.set_monitor(win, target_monitor)
    except:
        pass

    # Anchor to bottom left
    GtkLayerShell.set_anchor(win, GtkLayerShell.Edge.BOTTOM, True)
    GtkLayerShell.set_anchor(win, GtkLayerShell.Edge.LEFT, True)
    
    # Fixed size
    win.set_size_request(600, 300)

    # Configure WebView
    webview = WebKit2.WebView()
    transparent = Gdk.RGBA()
    transparent.parse("rgba(0,0,0,0)")
    webview.set_background_color(transparent)
    
    html_content = f"""
    <!DOCTYPE html>
    <html style="background: transparent !important;">
    <head>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;900&display=swap');
            
            * {{ box-sizing: border-box; }}

            html, body {{
                margin: 0; padding: 0;
                background: transparent !important;
                font-family: 'Outfit', sans-serif;
                overflow: hidden;
                width: 100%; height: 100%;
            }}

            body {{
                display: flex;
                align-items: flex-end;
                justify-content: flex-start;
            }}

            .overlay-container {{
                background: rgba(18, 18, 24, 0.94);
                backdrop-filter: blur(20px);
                border-top: 1px solid rgba(255, 255, 255, 0.1);
                border-right: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 0 35px 0 0;
                padding: 25px 45px;
                color: white;
                display: flex; 
                align-items: center; 
                gap: 30px;
                border-left: 8px solid #6366f1;
                box-shadow: 0 20px 50px rgba(0,0,0,0.6);
                /* Entry Animation */
                animation: slideIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }}

            /* Kebalikan animasi saat keluar */
            .overlay-container.closing {{
                animation: slideOut 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }}

            @keyframes slideIn {{
                from {{ transform: translateX(-100%); opacity: 0; }}
                to {{ transform: translateX(0); opacity: 1; }}
            }}

            @keyframes slideOut {{
                from {{ transform: translateX(0); opacity: 1; }}
                to {{ transform: translateX(-100%); opacity: 0; }}
            }}

            .monitor-number {{ 
                font-size: 85px; 
                font-weight: 900; 
                color: #6366f1; 
                line-height: 1; 
                text-shadow: 0 0 30px rgba(99, 102, 241, 0.4);
            }}

            .info-block {{ display: flex; flex-direction: column; }}

            .label-tag {{ 
                font-size: 11px; 
                font-weight: 800; 
                color: #818cf8; 
                text-transform: uppercase; 
                letter-spacing: 5px; 
                margin-bottom: 6px; 
                opacity: 0.8; 
            }}

            .monitor-name {{ 
                font-size: 24px; 
                font-weight: 700; 
                margin: 0; 
                line-height: 1.2; 
            }}

            .monitor-id {{ 
                font-size: 13px; 
                color: rgba(255, 255, 255, 0.4); 
                margin-top: 6px; 
                font-weight: 500; 
            }}
        </style>
    </head>
    <body style="background: transparent !important;">
        <div class="overlay-container" id="container">
            <div class="monitor-number">{display_index}</div>
            <div class="info-block">
                <div class="label-tag">Output Identifier</div>
                <div class="monitor-name">{display_text}</div>
                <div class="monitor-id">{monitor_name}</div>
            </div>
        </div>
    </body>
    </html>
    """
    webview.load_html(html_content, None)
    win.add(webview)
    
    # Fungsi untuk menutup dengan animasi
    def quit_gracefully():
        # Picu animasi keluar via JavaScript (Modern API for WebKit2 4.1)
        webview.evaluate_javascript("document.getElementById('container').classList.add('closing');", -1, None, None, None, None)
        # Tunggu animasi selesai (500ms) baru benar-benar quit
        GLib.timeout_add(500, Gtk.main_quit)
        return False

    # Jalankan quit_gracefully 500ms sebelum timeout total habis
    GLib.timeout_add(timeout - 500 if timeout > 500 else 10, quit_gracefully)
    
    win.show_all()
    Gtk.main()

if __name__ == "__main__":
    main()
