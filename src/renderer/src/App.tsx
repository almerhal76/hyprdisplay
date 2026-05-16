import { useState, useEffect, useRef } from "react";
const invoke = <T,>(channel: string, args?: any): Promise<T> => (window as any).api.invoke(channel, args);
const getCurrentWindow = () => ({
  minimize: () => invoke('window_minimize'),
  toggleMaximize: () => invoke('window_toggle_maximize'),
  close: () => invoke('window_close'),
  show: () => invoke('window_show'),
  setFocus: () => invoke('window_focus')
});
import { motion, AnimatePresence } from "framer-motion";
import { 
  RefreshCcw, Save, Plus, Minus, ZoomIn, ZoomOut, Layers, X, Square, Check, Layout, ChevronDown, Monitor as ScreenIcon, Trash2, Settings, Power, Download, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Grid, Monitor, PanelLeft, PanelRight, PanelTop, PanelBottom
} from "lucide-react";
const getVersion = async () => "0.1.0";
import "./App.css";
import logoSmall from './assets/logo_small.png'

type ToastType = 'success' | 'error' | 'info';

interface MonitorMode {
  width: number;
  height: number;
  refreshRate: number;
}

interface Monitor {
  id: string;
  name: string;
  description: string;
  width: number;
  height: number;
  refreshRate: number;
  x: number;
  y: number;
  scale: number;
  transform: number;
  focused: boolean;
  isPrimary: boolean;
  active: boolean;
  assignedFrameId?: string | null;
  workspaces?: string;
  modes: MonitorMode[];
}

function CustomSelect({ options, value, onChange, icon: Icon, searchable = false }: { options: { label: string, value: string }[], value: string, onChange: (val: string) => void, icon?: any, searchable?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpwards, setOpenUpwards] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < 250 && rect.top > spaceBelow) {
        setOpenUpwards(true);
      } else {
        setOpenUpwards(false);
      }
    } else {
      setSearch("");
    }
  }, [isOpen]);

  const selectedOption = options.find(o => o.value === value) || options[0];
  const filteredOptions = searchable ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase())) : options;

  return (
    <div className="custom-select-container" ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <div 
        className="custom-select-trigger" 
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.05)', 
          padding: '8px 12px', borderRadius: '12px', cursor: 'pointer', border: '1px solid var(--border)',
          color: 'white', fontSize: '13px', transition: 'all 0.2s'
        }}
      >
        {Icon && <Icon size={16} color="var(--text-dim)" />}
        <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedOption?.label}</span>
        <motion.div animate={{ rotate: isOpen ? (openUpwards ? -180 : 180) : 0 }}><ChevronDown size={14} color="var(--text-dim)" /></motion.div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: openUpwards ? 10 : -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: openUpwards ? 10 : -5 }}
            style={{ 
              position: 'absolute', 
              [openUpwards ? 'bottom' : 'top']: '100%', 
              left: 0, right: 0, 
              [openUpwards ? 'marginBottom' : 'marginTop']: '8px', 
              background: 'var(--bg-card)', backdropFilter: 'blur(20px)', borderRadius: '12px', 
              border: '1px solid var(--border)', zIndex: 2000, boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
              display: 'flex', flexDirection: 'column', overflow: 'hidden'
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '250px' }}>
              {searchable && (
                <div style={{ padding: '10px', borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,0.1)' }}>
                  <input 
                    type="text" 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search..." 
                    style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', color: 'white', fontSize: '13px', outline: 'none' }}
                    autoFocus
                  />
                </div>
              )}
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {filteredOptions.length > 0 ? filteredOptions.map(opt => (
                  <div 
                    key={opt.value} 
                    onClick={() => { onChange(opt.value); setIsOpen(false); setSearch(""); }}
                    style={{ 
                      padding: '10px 14px', cursor: 'pointer', fontSize: '13px', color: value === opt.value ? 'var(--accent)' : 'white',
                      background: value === opt.value ? 'rgba(99, 102, 241, 0.1)' : 'transparent', transition: 'all 0.2s'
                    }}
                    className="select-option"
                  >
                    {opt.label}
                  </div>
                )) : (
                  <div style={{ padding: '10px 14px', fontSize: '12px', color: 'var(--text-dim)', textAlign: 'center' }}>No results</div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function App() {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(0.08);
  const isDragging = useRef(false);
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [profiles, setProfiles] = useState<string[]>([]);
  const [currentProfile, setCurrentProfile] = useState('Default');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newProfileName, setNewProfileName] = useState("");
  const [layoutFrames, setLayoutFrames] = useState<{ id: string, x: number, y: number, w: number, h: number }[]>([]);
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null);
  const [frameAlignX, setFrameAlignX] = useState<'left' | 'center' | 'right'>('center');
  const [frameAlignY, setFrameAlignY] = useState<'top' | 'center' | 'bottom'>('center');
  const [activeTab, setActiveTab] = useState<'layout' | 'settings'>('settings');
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const [toast, setToast] = useState<{ title: string, message: string, type: ToastType } | null>(null);
  const [activeDraggingId, setActiveDraggingId] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  const showToast = (message: string, type: ToastType = 'info', title?: string) => {
    const defaultTitles = { success: 'Success', error: 'Error', info: 'Information' };
    setToast({ title: title || defaultTitles[type], message, type });
    setTimeout(() => setToast(null), 3000);
  };
  const [isUpdating, setIsUpdating] = useState(false);
  const [appVersion, setAppVersion] = useState("v0.1.0");
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  useEffect(() => {
    getVersion().then(v => setAppVersion(`v${v}`)).catch(() => {});
  }, []);

  const checkForUpdates = async () => {
    setIsUpdating(true);
    try {
      // Fetch latest release from GitHub API
      const response = await fetch('https://api.github.com/repos/almerhal76/hyprdisplay/releases/latest');
      if (!response.ok) throw new Error('Failed to fetch updates');
      
      const data = await response.json();
      const latestVersion = data.tag_name; // e.g., "v0.2.0"
      
      // Basic version comparison
      if (latestVersion && latestVersion !== appVersion) {
        showToast(`New version ${latestVersion} is available!`, "info", "Update Available");
      } else {
        showToast("You are using the latest version.", "success", "Up to Date");
      }
    } catch (err) {
      console.error('Update check failed:', err);
    } finally {
      setIsUpdating(false);
    }
  };
  
  const [confirmModal, setConfirmModal] = useState<{ active: boolean, backupConfig: string, timeLeft: number }>({ active: false, backupConfig: '', timeLeft: 15 });
  const [deleteConfirm, setDeleteConfirm] = useState<{ active: boolean, title: string, message: string, onConfirm: () => void }>({ active: false, title: '', message: '', onConfirm: () => {} });
  const [showSettings, setShowSettings] = useState(false);
  const [runInBackground, setRunInBackground] = useState(true);
  const [launchOnStartup, setLaunchOnStartup] = useState(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Show splash for 2.5 seconds
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);

    checkForUpdates();
    
    // Check autostart status from system
    invoke<boolean>('get_autostart').then(enabled => {
      setLaunchOnStartup(enabled);
    }).catch(() => {});

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    fetchMonitors();
    fetchProfiles();
    fetchLastProfile();
    // Identify monitors on startup after splash
    if (!showSplash) {
      identifyMonitors();
    }
  }, [showSplash]);

  const fetchProfiles = async () => {
    try {
      const p = await invoke<string[]>("get_profiles");
      setProfiles(p);
    } catch (e) {}
  };

  const fetchLastProfile = async () => {
    try {
      const name = await invoke<string>("get_last_profile");
      if (name) setCurrentProfile(name);
    } catch (e) {}
  };

  const identifyMonitors = async () => {
    try {
      await invoke('identify_monitors');
    } catch (e) {}
  };



  const fetchMonitors = async () => {
    setLoading(true);
    try {
      const currentData = await invoke<string>("get_hyprland_monitors");
      
      const envConfig = await invoke<string>("get_custom_config", { filename: "env.conf" });
      let savedPrimaryName = "";
      if (envConfig && envConfig.includes("WAYLANDDRV_PRIMARY_MONITOR")) {
        const match = envConfig.match(/WAYLANDDRV_PRIMARY_MONITOR,(.+)/);
        if (match && match[1]) savedPrimaryName = match[1].trim();
      }

      let parsed;
      try {
        parsed = JSON.parse(currentData);
      } catch (e) {
        setErrorMsg("Failed to parse monitor data. Is Hyprland running?");
        return;
      }
      
      const formatted: Monitor[] = parsed.map((m: any) => {
        // Cari workspace yang sudah ada di state agar tidak hilang saat refresh
        const existing = monitors.find(em => em.name === m.name);
        const isPrimary = m.name === savedPrimaryName || (savedPrimaryName === "" && m.x === 0 && m.y === 0);
        
        let assignedId = existing?.assignedFrameId || null;
        let x = m.x;
        let y = m.y;

        // Default profile logic: Assign primary monitor to Center Slot
        if (currentProfile === 'Default') {
          if (isPrimary) {
            assignedId = 'Center';
            // Calculate position based on alignment
            const isRot = m.transform % 2 !== 0;
            const lw = (isRot ? m.height : m.width) / m.scale;
            const lh = (isRot ? m.width : m.height) / m.scale;
            
            x = 0; // Center slot is at 0
            y = 0;
            if (frameAlignX === 'center') x = (1920 / 2) - (lw / 2);
            else if (frameAlignX === 'right') x = 1920 - lw;
            
            if (frameAlignY === 'center') y = (1080 / 2) - (lh / 2);
            else if (frameAlignY === 'bottom') y = 1080 - lh;
          } else {
            assignedId = null;
          }
        }

        return {
          id: m.name, name: m.name, description: `${m.model} (${m.make})`,
          width: m.width, height: m.height, refreshRate: m.refreshRate,
          x: x, y: y, scale: m.scale, transform: m.transform,
          focused: m.focused, isPrimary: isPrimary,
          active: true,
          assignedFrameId: assignedId,
          workspaces: existing?.workspaces || "",
          modes: (m.availableModes || []).map((modeStr: string) => {
            const [res, rate] = modeStr.split('@');
            const [w, h] = res.split('x').map(Number);
            return { width: w, height: h, refreshRate: parseFloat(rate.replace('Hz', '')) };
          }),
        };
      });

      if (formatted.length > 0) {
        const isRotated = (m: any) => m.transform === 1 || m.transform === 3 || m.transform === 5 || m.transform === 7;
        const getLogicalW = (m: any) => (isRotated(m) ? m.height : m.width) / m.scale;
        const getLogicalH = (m: any) => (isRotated(m) ? m.width : m.height) / m.scale;
        const minX = Math.min(...formatted.map(m => m.x));
        const maxX = Math.max(...formatted.map(m => m.x + getLogicalW(m)));
        const minY = Math.min(...formatted.map(m => m.y));
        const maxY = Math.max(...formatted.map(m => m.y + getLogicalH(m)));
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        setCanvasOffset({ x: -centerX * zoom, y: -centerY * zoom });
      }

      setMonitors(formatted);
      if (formatted.length > 0 && !selectedId) setSelectedId(formatted[0].id);
      
      try {
        const p = await invoke<string[]>("get_profiles");
        setProfiles(p);
      } catch (e) {}

    } catch (err) {
      showToast("Failed to fetch monitors", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadProfileData = async (profileName: string) => {
    setLoading(true);
    try {
      const currentData = await invoke<string>("get_hyprland_monitors");
      const parsedCurrent = JSON.parse(currentData);
      
      const profileStr = await invoke<string>("load_profile", { name: profileName });
      let profile;
      try {
        profile = JSON.parse(profileStr);
      } catch (e) {
        showToast("Profile format outdated. Switching to Default.", "error");
        setCurrentProfile('Default');
        return;
      }

      if (!profile.monitors || profile.monitors.length === 0) {
        setCurrentProfile('Default');
        return;
      }
      
      const formatted: Monitor[] = parsedCurrent.map((m: any) => {
        const saved = profile.monitors ? profile.monitors.find((sm: any) => sm.name === m.name) : null;
        
        if (saved) {
          // Detect if this is an OLD profile (no assignedFrameId property at all in the saved monitors list)
          const isOldProfile = !profile.monitors.some((sm: any) => sm.hasOwnProperty('assignedFrameId'));
          
          let assignedId = saved.assignedFrameId;
          
          // Only perform geometric migration for TRULY old profiles
          if (isOldProfile && !assignedId && profile.layoutFrames) {
            const isRot = (saved.transform || 0) % 2 !== 0;
            const lw = (isRot ? m.height : m.width) / (saved.scale || 1);
            const lh = (isRot ? m.width : m.height) / (saved.scale || 1);
            const cx = (saved.x || 0) + lw / 2;
            const cy = (saved.y || 0) + lh / 2;
            const frame = profile.layoutFrames.find((f: any) => 
              cx >= f.x && cx <= f.x + f.w && cy >= f.y && cy <= f.y + f.h
            );
            if (frame) assignedId = frame.id;
          }

          return {
            id: m.name, name: m.name, description: `${m.model} (${m.make})`,
            width: saved.width || m.width, 
            height: saved.height || m.height, 
            refreshRate: saved.refreshRate || m.refreshRate,
            x: saved.x, 
            y: saved.y, 
            scale: saved.scale, 
            transform: saved.transform,
            focused: m.focused,
            isPrimary: saved.isPrimary,
            active: true,
            assignedFrameId: assignedId,
            workspaces: saved.workspaces || "",
            modes: (m.availableModes || []).map((modeStr: string) => {
              const [res, rate] = modeStr.split('@');
              const [w, h] = res.split('x').map(Number);
              return { width: w, height: h, refreshRate: parseFloat(rate.replace('Hz', '')) };
            }),
          };
        }
        return { 
          id: m.name, name: m.name, description: `${m.model} (${m.make})`,
          width: m.width, height: m.height, refreshRate: m.refreshRate,
          x: 0, y: 0, scale: 1, transform: 0,
          focused: false, isPrimary: false, active: false,
          assignedFrameId: null,
          modes: (m.availableModes || []).map((modeStr: string) => {
            const [res, rate] = modeStr.split('@');
            const [w, h] = res.split('x').map(Number);
            return { width: w, height: h, refreshRate: parseFloat(rate.replace('Hz', '')) };
          }),
        };
      });

      setMonitors(formatted);
      if (profile.layoutFrames) setLayoutFrames(profile.layoutFrames);
      
    } catch (e) {
      showToast("Failed to load profile", "error");
    } finally {
      setLoading(false);
    }
  };

  const resetToStaging = () => {
    setIsCreatingNew(true);
    setLayoutFrames([]);
    fetchMonitors(); // Pastikan ambil data hardware terbaru
    setCanvasOffset({ x: 0, y: -400 }); 
    setSelectedId(null);
    setSelectedFrameId(null);
  };

  useEffect(() => {
    const init = async () => {
      console.log(">>> INIT START <<<");
      try {
        // 1. Load profiles list first
        const p = await invoke<string[]>("get_profiles");
        setProfiles(p);

        // 2. Load other settings
        const bg = await invoke<boolean>("get_background_mode");
        setRunInBackground(bg);

        const config = await invoke<string>("get_custom_config", { filename: "execs.conf" });
        const exePath = await invoke<string>("get_executable_path");
        setLaunchOnStartup(config.includes(`${exePath} --apply`));

        // 3. Load last profile
        const last = await invoke<string>("get_last_profile");
        console.log("Loading last profile:", last);
        setTimeout(() => {
          setCurrentProfile(last || 'Default');
        }, 150);
      } catch (err) {
        console.error("Startup error:", err);
        setCurrentProfile('Default');
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (currentProfile === null) return;
    
    console.log(">>> Switching to profile:", currentProfile);
    setIsCreatingNew(false);

    if (currentProfile !== 'Default') {
      loadProfileData(currentProfile);
    } else {
      const fw = 1920;
      const fh = 1080;
      setLayoutFrames([
        { id: 'Left', x: -fw, y: 0, w: fw, h: fh },
        { id: 'Center', x: 0, y: 0, w: fw, h: fh },
        { id: 'Right', x: fw, y: 0, w: fw, h: fh }
      ]);
      fetchMonitors();
    }
  }, [currentProfile]);

  const updateMonitor = (id: string, updates: Partial<Monitor>) => {
    setMonitors(prev => {
      const current = prev.find(m => m.id === id);
      if (!current) return prev;
      
      let newX = updates.x !== undefined ? updates.x : current.x;
      let newY = updates.y !== undefined ? updates.y : current.y;
      
      const isRotated = (m: Monitor) => m.transform === 1 || m.transform === 3 || m.transform === 5 || m.transform === 7;
      const getLogicalDims = (m: Monitor) => {
        const w = isRotated(m) ? m.height : m.width;
        const h = isRotated(m) ? m.width : m.height;
        return { w: w / m.scale, h: h / m.scale };
      };
      
      const currentDims = getLogicalDims(current);
      const SNAP_THRESHOLD = 20; 
      
      prev.forEach(other => {
        if (other.id === id || (layoutFrames.length > 0 && !other.assignedFrameId)) return;
        const otherDims = getLogicalDims(other);
        if (Math.abs(newX - (other.x + otherDims.w)) < SNAP_THRESHOLD) newX = other.x + otherDims.w;
        if (Math.abs((newX + currentDims.w) - other.x) < SNAP_THRESHOLD) newX = other.x - currentDims.w;
        if (Math.abs(newY - (other.y + otherDims.h)) < SNAP_THRESHOLD) newY = other.y + otherDims.h;
        if (Math.abs((newY + currentDims.h) - other.y) < SNAP_THRESHOLD) newY = other.y - currentDims.h;
        if (Math.abs(newY - other.y) < SNAP_THRESHOLD) newY = other.y;
        if (Math.abs((newY + currentDims.h) - (other.y + otherDims.h)) < SNAP_THRESHOLD) newY = other.y + otherDims.h - currentDims.h;
        if (Math.abs(newX - other.x) < SNAP_THRESHOLD) newX = other.x;
      });

      return prev.map(m => m.id === id ? { ...m, ...updates, x: newX, y: newY } : m);
    });
  };

  const handleApply = async () => {
    let backupConfig = "";
    try {
      backupConfig = await invoke<string>("get_monitors_config");
    } catch (e) {}

    const primaryMonitor = monitors.find(m => m.isPrimary) || monitors[0];
    const sortedMonitors = [...monitors].sort((a, b) => (a.isPrimary === b.isPrimary) ? 0 : a.isPrimary ? -1 : 1);
    let configLines = sortedMonitors.map(m => {
      let line = `monitor=${m.name},${m.width}x${m.height}@${m.refreshRate},${Math.round(m.x)}x${Math.round(m.y)},${m.scale}`;
      if (m.transform !== 0) line += `,transform,${m.transform}`;
      return line;
    }).join('\n');

    // Add workspace bindings
    const workspaceLines = sortedMonitors
      .filter(m => m.workspaces && m.workspaces.trim() !== "")
      .map(m => {
        const rawParts = m.workspaces!.split(',').map(s => s.trim()).filter(s => s !== "");
        const wsList: string[] = [];
        
        rawParts.forEach(part => {
          // Support range like 1~10 or 1-10
          if (part.includes('~') || (part.includes('-') && !part.startsWith('-'))) {
            const separator = part.includes('~') ? '~' : '-';
            const [startStr, endStr] = part.split(separator);
            const start = parseInt(startStr.trim());
            const end = parseInt(endStr.trim());
            
            if (!isNaN(start) && !isNaN(end)) {
              const min = Math.min(start, end);
              const max = Math.max(start, end);
              for (let i = min; i <= max; i++) {
                wsList.push(i.toString());
              }
            } else {
              wsList.push(part); // Fallback to raw string if not numbers
            }
          } else {
            wsList.push(part);
          }
        });

        return wsList.map(ws => `workspace=${ws},monitor:${m.name}`).join('\n');
      })
      .filter(line => line !== "")
      .join('\n');

    const workspaceConfig = workspaceLines ? `# Generated Workspace Bindings\n${workspaceLines}` : "";

    try {
      // Simpan konfigurasi monitor ke monitors.conf
      await invoke('apply_hyprland_config', { config: configLines });
      
      // Simpan konfigurasi workspace ke workspaces.conf
      await invoke('apply_workspace_config', { config: workspaceConfig });

      if (primaryMonitor) {
        const exePath = await invoke<string>('get_executable_path');
        await invoke('update_custom_config', { filename: 'env.conf', content: `env = WAYLANDDRV_PRIMARY_MONITOR,${primaryMonitor.name}` });
        await invoke('update_custom_config', { filename: 'execs.conf', content: `exec-once = ${exePath} --apply` });
      }

      // Save as last profile on successful apply
      if (currentProfile && currentProfile !== 'Default') {
        await invoke("save_last_profile", { name: currentProfile });
      }
      
      setConfirmModal({ active: true, backupConfig, timeLeft: 15 });
      if (countdownRef.current) clearInterval(countdownRef.current);
      countdownRef.current = setInterval(() => {
        setConfirmModal(prev => {
          if (prev.timeLeft <= 1) {
            handleRevert(prev.backupConfig);
            return { ...prev, active: false };
          }
          return { ...prev, timeLeft: prev.timeLeft - 1 };
        });
      }, 1000);
    } catch (err) {
      showToast("Failed to apply config", "error");
    }
  };

  const handleRevert = async (backupConfig: string) => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    try {
      await invoke('apply_hyprland_config', { config: backupConfig });
      showToast("Reverted to previous settings", "info");
      fetchMonitors();
    } catch (e) {
      showToast("Failed to revert", "error");
    }
    setConfirmModal(prev => ({ ...prev, active: false }));
  };

  const handleKeepChanges = () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setConfirmModal(prev => ({ ...prev, active: false }));
    showToast("Configuration applied!");
  };

  const applyPreset = (type: 'horizontal' | 'vertical' | 'cross' | 'grid' | 'dual-top' | 'dual-bottom' | 'duo-left' | 'duo-right' | 'tshape-up' | 'tshape-down' | 'tshape-left' | 'tshape-right') => {
    setShowPresetMenu(false);
    let newFrames: { id: string, x: number, y: number, w: number, h: number }[] = [];
    const fw = 1920;
    const fh = 1080;
    
    if (type === 'horizontal') {
      newFrames = [
        { id: 'Left', x: -fw, y: 0, w: fw, h: fh },
        { id: 'Center', x: 0, y: 0, w: fw, h: fh },
        { id: 'Right', x: fw, y: 0, w: fw, h: fh }
      ];
    } else if (type === 'vertical') {
      newFrames = [
        { id: 'Top', x: 0, y: -fh, w: fw, h: fh },
        { id: 'Center', x: 0, y: 0, w: fw, h: fh },
        { id: 'Bottom', x: 0, y: fh, w: fw, h: fh }
      ];
    } else if (type === 'cross') {
      newFrames = [
        { id: 'Top', x: 0, y: -fh, w: fw, h: fh },
        { id: 'Left', x: -fw, y: 0, w: fw, h: fh },
        { id: 'Center', x: 0, y: 0, w: fw, h: fh },
        { id: 'Right', x: fw, y: 0, w: fw, h: fh },
        { id: 'Bottom', x: 0, y: fh, w: fw, h: fh }
      ];
    } else if (type === 'dual-top') {
      newFrames = [
        { id: 'Top', x: 0, y: -fh, w: fw, h: fh },
        { id: 'Main', x: 0, y: 0, w: fw, h: fh }
      ];
    } else if (type === 'dual-bottom') {
      newFrames = [
        { id: 'Main', x: 0, y: 0, w: fw, h: fh },
        { id: 'Bottom', x: 0, y: fh, w: fw, h: fh }
      ];
    } else if (type === 'duo-left') {
      newFrames = [
        { id: 'Left', x: -fw, y: 0, w: fw, h: fh },
        { id: 'Main', x: 0, y: 0, w: fw, h: fh }
      ];
    } else if (type === 'duo-right') {
      newFrames = [
        { id: 'Main', x: 0, y: 0, w: fw, h: fh },
        { id: 'Right', x: fw, y: 0, w: fw, h: fh }
      ];
    } else if (type === 'tshape-up') {
      newFrames = [
        { id: 'Top Left', x: -fw, y: -fh, w: fw, h: fh },
        { id: 'Top Center', x: 0, y: -fh, w: fw, h: fh },
        { id: 'Top Right', x: fw, y: -fh, w: fw, h: fh },
        { id: 'Bottom Center', x: 0, y: 0, w: fw, h: fh }
      ];
    } else if (type === 'tshape-down') {
      newFrames = [
        { id: 'Top Center', x: 0, y: 0, w: fw, h: fh },
        { id: 'Bottom Left', x: -fw, y: fh, w: fw, h: fh },
        { id: 'Bottom Center', x: 0, y: fh, w: fw, h: fh },
        { id: 'Bottom Right', x: fw, y: fh, w: fw, h: fh }
      ];
    } else if (type === 'tshape-left') {
      newFrames = [
        { id: 'Left Top', x: -fw, y: -fh, w: fw, h: fh },
        { id: 'Left Mid', x: -fw, y: 0, w: fw, h: fh },
        { id: 'Left Bottom', x: -fw, y: fh, w: fw, h: fh },
        { id: 'Right Mid', x: 0, y: 0, w: fw, h: fh }
      ];
    } else if (type === 'tshape-right') {
      newFrames = [
        { id: 'Left Mid', x: 0, y: 0, w: fw, h: fh },
        { id: 'Right Top', x: fw, y: -fh, w: fw, h: fh },
        { id: 'Right Mid', x: fw, y: 0, w: fw, h: fh },
        { id: 'Right Bottom', x: fw, y: fh, w: fw, h: fh }
      ];
    } else if (type === 'grid') {
      newFrames = [
        { id: 'Top-Left', x: -fw, y: -fh, w: fw, h: fh },
        { id: 'Top', x: 0, y: -fh, w: fw, h: fh },
        { id: 'Top-Right', x: fw, y: -fh, w: fw, h: fh },
        { id: 'Left', x: -fw, y: 0, w: fw, h: fh },
        { id: 'Center', x: 0, y: 0, w: fw, h: fh },
        { id: 'Right', x: fw, y: 0, w: fw, h: fh },
        { id: 'Bottom-Left', x: -fw, y: fh, w: fw, h: fh },
        { id: 'Bottom', x: 0, y: fh, w: fw, h: fh },
        { id: 'Bottom-Right', x: fw, y: fh, w: fw, h: fh }
      ];
    }

    setLayoutFrames(newFrames);
    showToast(`Template '${type}' applied. Slots are ready for assignment!`, 'success');
  };

  const updateFrame = (id: string, updates: Partial<{ x: number, y: number, w: number, h: number }>) => {
    setLayoutFrames(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const addNewSlot = () => {
    setShowPresetMenu(false);
    // Ensure unique ID
    let nextNum = layoutFrames.length + 1;
    while (layoutFrames.some(f => f.id === `Slot ${nextNum}`)) nextNum++;
    const newId = `Slot ${nextNum}`;
    
    const lastFrame = layoutFrames[layoutFrames.length - 1];
    const newX = lastFrame ? lastFrame.x + lastFrame.w + 40 : 0;
    
    const newFrame = { id: newId, x: newX, y: 0, w: 1920, h: 1080 };
    setLayoutFrames(prev => [...prev, newFrame]);
    setSelectedId(null);
    setSelectedFrameId(newId);
    showToast(`Added custom slot: ${newId}`, 'success');
  };

  const performSave = async (name: string) => {
    if (!name.trim()) return;
    try {
      const primary = monitors.find(m => m.isPrimary)?.name || "";
      const dataToSave = {
        primary,
        monitors,
        layoutFrames
      };
      await invoke('save_profile', { name, data: JSON.stringify(dataToSave, null, 2) });
      await invoke('save_last_profile', { name }); // Ingat profil ini sebagai yang terakhir
      
      setProfiles(prev => [...new Set([...prev, name])]);
      setCurrentProfile(name);
      setIsCreatingNew(false);
      setShowSaveModal(false);
      setNewProfileName("");
      showToast(`Profile "${name}" saved!`);
    } catch (err) {
      showToast("Failed to save profile", "error");
    }
  };

  const performDelete = async (name: string) => {
    if (name === 'Default') return;
    setDeleteConfirm({
      active: true,
      title: 'Delete Profile',
      message: `Are you sure you want to delete the profile "${name}"? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await invoke('delete_profile', { name });
          setProfiles(prev => prev.filter(p => p !== name));
          setCurrentProfile('Default');
          showToast(`Profile "${name}" deleted!`, "info");
        } catch (err) {
          showToast("Failed to delete profile", "error");
        }
        setDeleteConfirm(prev => ({ ...prev, active: false }));
      }
    });
  };

  const selectedMonitor = monitors.find(m => m.id === selectedId);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const appWindow = useRef<any>(null);

  useEffect(() => {
    try {
      appWindow.current = getCurrentWindow();
    } catch (e) {
      console.error("Failed to get current window:", e);
    }
  }, []);

  return (
    <div className="app-container" style={{ background: 'var(--bg-dark, #0a0a0c)' }}>
      {errorMsg && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)', color: 'white', zIndex: 10000, padding: '20px', textAlign: 'center' }}>
          <div>
            <h2 style={{ color: 'var(--danger)' }}>Startup Error</h2>
            <p>{errorMsg}</p>
            <button onClick={() => window.location.reload()} className="btn-primary" style={{ marginTop: '10px' }}>Reload</button>
          </div>
        </div>
      )}
      {/* Floating Header Overlays */}
      <div className="custom-titlebar">
        <div className="top-right-toolbar" style={{ pointerEvents: 'auto', width: 'auto' }}>
          <CustomSelect 
            icon={ScreenIcon}
            searchable={true}
            options={[
              { label: 'Default', value: 'Default' },
              ...profiles.map(p => ({ label: p, value: p })),
              { label: '+ New Profile...', value: 'ADD_NEW' }
            ]}
            value={currentProfile}
            onChange={(val) => {
              if (val === 'ADD_NEW') {
                resetToStaging();
                setShowSaveModal(true);
              } else {
                setCurrentProfile(val);
              }
            }}
          />
          <button className="control-btn" onClick={() => performSave(currentProfile)} title={`Save changes to ${currentProfile}`}>
            <Save size={18} />
          </button>
          {currentProfile !== 'Default' && (
            <button className="control-btn" style={{ color: 'var(--danger, #ff4444)' }} onClick={() => performDelete(currentProfile)} title={`Delete ${currentProfile}`}>
              <Trash2 size={18} />
            </button>
          )}
          <button className="control-btn" onClick={() => {
            if (currentProfile && currentProfile !== 'Default') {
              loadProfileData(currentProfile);
              showToast("Reloaded from profile", "info");
            } else {
              const fw = 1920;
              const fh = 1080;
              setLayoutFrames([
                { id: 'Left', x: -fw, y: 0, w: fw, h: fh },
                { id: 'Center', x: 0, y: 0, w: fw, h: fh },
                { id: 'Right', x: fw, y: 0, w: fw, h: fh }
              ]);
              fetchMonitors();
              showToast("Reloaded default template", "info");
            }
          }} title="Reset layout">
            <RefreshCcw size={18} />
          </button>
          <button className="control-btn" onClick={() => invoke('identify_monitors')} title="Identify Monitors">
            <ScreenIcon size={18} />
          </button>
          <button className="control-btn" onClick={() => setShowPresetMenu(!showPresetMenu)}>
            <Layout size={18} color={showPresetMenu ? 'var(--accent)' : 'currentColor'} />
          </button>
          <button className="btn-primary" style={{ padding: '8px 16px' }} onClick={handleApply}>Apply</button>
        </div>

        <div className="window-controls" data-tauri-drag-region>
          <button className="control-btn" style={{ opacity: 0.7 }} onClick={() => setShowSettings(true)} title="Settings"><Settings size={14} /></button>
          <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.2)', margin: '0 8px', alignSelf: 'center' }} />
          <button className="control-btn" onClick={() => appWindow.current?.minimize()}><Minus size={14} /></button>
          <button className="control-btn" onClick={() => appWindow.current?.toggleMaximize()}><Square size={12} /></button>
          <button className="control-btn close" onClick={() => appWindow.current?.close()}><X size={14} /></button>
        </div>
      </div>

      {/* Preset Menu Overlay */}
      <AnimatePresence>
        {showPresetMenu && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            style={{ position: 'absolute', top: 70, left: 20, zIndex: 1100, background: 'var(--bg-card)', backdropFilter: 'blur(20px)', borderRadius: '24px', border: '1px solid var(--border)', padding: '12px', width: '220px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
          >
            <h4 style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '8px', padding: '0 8px', letterSpacing: '1px' }}>TEMPLATE LAYOUTS</h4>
            <div style={{ maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }} className="custom-scrollbar">
              <h4 style={{ fontSize: '8px', color: 'var(--text-dim)', marginBottom: '6px', marginTop: '4px', padding: '0 4px', letterSpacing: '1px' }}>STANDARD</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '10px' }}>
                <button className="control-btn" style={{ justifyContent: 'center', padding: '8px 4px', flexDirection: 'column', gap: '4px', height: 'auto' }} onClick={() => applyPreset('horizontal')}>
                  <Layout size={18} strokeWidth={1.5} /> 
                  <span style={{ fontSize: '9px', fontWeight: '500', opacity: 0.8 }}>Triple Row</span>
                </button>
                <button className="control-btn" style={{ justifyContent: 'center', padding: '8px 4px', flexDirection: 'column', gap: '4px', height: 'auto' }} onClick={() => applyPreset('vertical')}>
                  <Layers size={18} strokeWidth={1.5} /> 
                  <span style={{ fontSize: '9px', fontWeight: '500', opacity: 0.8 }}>Triple Col</span>
                </button>
              </div>

              <h4 style={{ fontSize: '8px', color: 'var(--text-dim)', marginBottom: '6px', padding: '0 4px', letterSpacing: '1px' }}>DUAL SETUP</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '10px' }}>
                <button className="control-btn" style={{ justifyContent: 'center', padding: '8px 4px', flexDirection: 'column', gap: '4px', height: 'auto' }} onClick={() => applyPreset('duo-left')}>
                  <PanelLeft size={18} strokeWidth={1.5} /> 
                  <span style={{ fontSize: '9px', fontWeight: '500', opacity: 0.8 }}>Dual Left</span>
                </button>
                <button className="control-btn" style={{ justifyContent: 'center', padding: '8px 4px', flexDirection: 'column', gap: '4px', height: 'auto' }} onClick={() => applyPreset('duo-right')}>
                  <PanelRight size={18} strokeWidth={1.5} /> 
                  <span style={{ fontSize: '9px', fontWeight: '500', opacity: 0.8 }}>Dual Right</span>
                </button>
                <button className="control-btn" style={{ justifyContent: 'center', padding: '8px 4px', flexDirection: 'column', gap: '4px', height: 'auto' }} onClick={() => applyPreset('dual-top')}>
                  <PanelTop size={18} strokeWidth={1.5} /> 
                  <span style={{ fontSize: '9px', fontWeight: '500', opacity: 0.8 }}>Dual Top</span>
                </button>
                <button className="control-btn" style={{ justifyContent: 'center', padding: '8px 4px', flexDirection: 'column', gap: '4px', height: 'auto' }} onClick={() => applyPreset('dual-bottom')}>
                  <PanelBottom size={18} strokeWidth={1.5} /> 
                  <span style={{ fontSize: '9px', fontWeight: '500', opacity: 0.8 }}>Dual Bottom</span>
                </button>
              </div>

              <h4 style={{ fontSize: '8px', color: 'var(--text-dim)', marginBottom: '6px', padding: '0 4px', letterSpacing: '1px' }}>T-SHAPE</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '10px' }}>
                <button className="control-btn" style={{ justifyContent: 'center', padding: '8px 4px', flexDirection: 'column', gap: '4px', height: 'auto' }} onClick={() => applyPreset('tshape-up')}>
                  <ArrowUp size={18} strokeWidth={1.5} /> 
                  <span style={{ fontSize: '9px', fontWeight: '500', opacity: 0.8 }}>T-Up</span>
                </button>
                <button className="control-btn" style={{ justifyContent: 'center', padding: '8px 4px', flexDirection: 'column', gap: '4px', height: 'auto' }} onClick={() => applyPreset('tshape-down')}>
                  <ArrowDown size={18} strokeWidth={1.5} /> 
                  <span style={{ fontSize: '9px', fontWeight: '500', opacity: 0.8 }}>T-Down</span>
                </button>
                <button className="control-btn" style={{ justifyContent: 'center', padding: '8px 4px', flexDirection: 'column', gap: '4px', height: 'auto' }} onClick={() => applyPreset('tshape-left')}>
                  <ArrowLeft size={18} strokeWidth={1.5} /> 
                  <span style={{ fontSize: '9px', fontWeight: '500', opacity: 0.8 }}>T-Left</span>
                </button>
                <button className="control-btn" style={{ justifyContent: 'center', padding: '8px 4px', flexDirection: 'column', gap: '4px', height: 'auto' }} onClick={() => applyPreset('tshape-right')}>
                  <ArrowRight size={18} strokeWidth={1.5} /> 
                  <span style={{ fontSize: '9px', fontWeight: '500', opacity: 0.8 }}>T-Right</span>
                </button>
              </div>

              <h4 style={{ fontSize: '8px', color: 'var(--text-dim)', marginBottom: '6px', padding: '0 4px', letterSpacing: '1px' }}>ADVANCED</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '4px' }}>
                <button className="control-btn" style={{ justifyContent: 'center', padding: '8px 4px', flexDirection: 'column', gap: '4px', height: 'auto' }} onClick={() => applyPreset('cross')}>
                  <Plus size={18} strokeWidth={1.5} /> 
                  <span style={{ fontSize: '9px', fontWeight: '500', opacity: 0.8 }}>Plus Pattern</span>
                </button>
                <button className="control-btn" style={{ justifyContent: 'center', padding: '8px 4px', flexDirection: 'column', gap: '4px', height: 'auto', gridColumn: 'span 2' }} onClick={() => applyPreset('grid')}>
                  <Grid size={18} strokeWidth={1.5} /> 
                  <span style={{ fontSize: '10px', fontWeight: '500', opacity: 0.8 }}>Extreme Grid (3x3)</span>
                </button>
              </div>
            </div>
            <button 
              className="btn-primary" 
              style={{ 
                width: '100%', 
                marginTop: '12px', 
                padding: '10px', 
                fontSize: '11px', 
                gap: '8px',
                opacity: layoutFrames.length === 0 ? 0.5 : 1,
                filter: layoutFrames.length === 0 ? 'grayscale(1)' : 'none',
                cursor: layoutFrames.length === 0 ? 'not-allowed' : 'pointer'
              }} 
              onClick={addNewSlot}
              disabled={layoutFrames.length === 0}
              title={layoutFrames.length === 0 ? "Please select a template layout first" : "Add a custom slot"}
            >
              <Plus size={14} /> Add Manual Slot
            </button>
            <button className="btn-secondary" style={{ width: '100%', marginTop: '8px', padding: '8px', fontSize: '11px', color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.2)' }} onClick={() => { setLayoutFrames([]); setShowPresetMenu(false); }}>Clear Templates</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Canvas Area */}
      <motion.main className="canvas-wrapper" style={{ cursor: isDragging.current ? 'default' : (isPanning ? 'grabbing' : 'grab') }}
        onPanStart={() => setIsPanning(true)}
        onPan={(_, info) => { if (!isDragging.current) setCanvasOffset(prev => ({ x: prev.x + info.delta.x, y: prev.y + info.delta.y })); }}
        onPanEnd={() => setIsPanning(false)}
        onWheel={(e) => { setZoom(prev => Math.max(0.02, Math.min(0.4, prev + (-e.deltaY > 0 ? 0.005 : -0.005)))); }}
      >
        {loading ? (
          <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}><RefreshCcw size={32} color="var(--accent)" /></motion.div>
          </div>
        ) : (
          <>
            <motion.div 
              className="canvas-content"
              animate={{ x: canvasOffset.x, y: canvasOffset.y }}
              transition={isPanning ? { type: "just" } : { type: 'spring', damping: 30, stiffness: 200 }}
              style={{ position: 'absolute', left: '50%', top: '50%', width: 0, height: 0 }}
            >
              {layoutFrames.filter(f => {
                // Hide frame if an ASSIGNED monitor is inside it
                return f.id === selectedFrameId || !monitors.some(m => {
                  if (!m.assignedFrameId) return false;
                  const isRot = m.transform % 2 !== 0;
                  const lw = (isRot ? m.height : m.width) / m.scale;
                  const lh = (isRot ? m.width : m.height) / m.scale;
                  const cx = m.x + lw / 2;
                  const cy = m.y + lh / 2;
                  // Only hide if monitor is perfectly overlapping the frame center
                  return Math.abs(cx - (f.x + f.w/2)) < 5 && Math.abs(cy - (f.y + f.h/2)) < 5;
                });
              }).map(f => (
                <div 
                  key={f.id} 
                  className="layout-frame" 
                  style={{ 
                    position: 'absolute',
                    width: f.w * zoom, height: f.h * zoom,
                    transform: `translate(${f.x * zoom}px, ${f.y * zoom}px)`,
                    borderColor: selectedFrameId === f.id ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
                    background: selectedFrameId === f.id ? 'rgba(99, 102, 241, 0.05)' : 'rgba(255,255,255,0.02)',
                    zIndex: selectedFrameId === f.id ? 10 : 1
                  }}
                  onClick={() => {
                    setSelectedId(null);
                    setSelectedFrameId(f.id);
                  }}
                >
                  <div style={{
                    background: selectedFrameId === f.id ? 'var(--accent)' : 'rgba(255,255,255,0.08)',
                    color: selectedFrameId === f.id ? 'white' : 'var(--text-dim)',
                    padding: '6px 14px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    backdropFilter: 'blur(8px)'
                  }}>
                    <Layout size={14} />
                    {f.id}
                  </div>
                </div>
              ))}
            {monitors.map(m => {
              const isRot = m.transform % 2 !== 0;
              const lw = (isRot ? m.height : m.width) / m.scale;
              const lh = (isRot ? m.width : m.height) / m.scale;
              
              // ONLY show monitors that are assigned to a slot
              if (!m.assignedFrameId) return null;

              return (
                <motion.div key={m.id} drag dragMomentum={false} dragElastic={0} 
                  onDragStart={() => {
                    isDragging.current = true;
                    setActiveDraggingId(m.id);
                  }}
                  onDrag={(_, info) => updateMonitor(m.id, { x: m.x + info.delta.x / zoom, y: m.y + info.delta.y / zoom })}
                  onDragEnd={() => {
                    setTimeout(() => isDragging.current = false, 100);
                    setActiveDraggingId(null);
                  }}
                  className={`monitor-box ${selectedId === m.id ? 'selected' : ''} ${!m.active ? 'offline' : ''}`}
                  style={{ 
                    width: lw * zoom, 
                    height: lh * zoom, 
                    position: 'absolute', 
                    opacity: m.active ? 1 : 0.6,
                    borderStyle: m.active ? 'solid' : 'dashed',
                    zIndex: activeDraggingId === m.id ? 100 : 1
                  }}
                  animate={{ x: m.x * zoom, y: m.y * zoom }}
                  transition={activeDraggingId === m.id ? { type: "just" } : { type: 'spring', damping: 25, stiffness: 300, mass: 0.5 }}
                  onTap={() => { 
                    if (!isDragging.current) {
                      setSelectedId(m.id);
                      setSelectedFrameId(null);
                    }
                  }}
                >
                  <div className="monitor-name" style={{ color: m.active ? 'white' : 'var(--text-dim)' }}>{m.description}</div>
                  <div className="monitor-res">{Math.round(lw)} × {Math.round(lh)}</div>
                  {m.isPrimary && m.active && <div style={{ fontSize: '8px', fontWeight: '800', color: 'var(--accent)' }}>PRIMARY</div>}
                  {!m.active && <div style={{ fontSize: '8px', fontWeight: '800', color: 'var(--danger)', marginTop: '4px' }}>DISCONNECTED</div>}
                  {selectedId === m.id && <motion.div style={{ position: 'absolute', top: -10, right: -10, background: m.active ? 'var(--accent)' : 'var(--text-dim)', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff' }}><Check size={14} color="#fff" strokeWidth={4} /></motion.div>}
                </motion.div>
              );
            })}
          </motion.div>
          </>
        )}
      </motion.main>

      {/* Floating Settings Card for Frame Assignment */}
      <AnimatePresence>
        {selectedFrameId !== null && (
          <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }} className="floating-card" style={{ width: '300px' }}>
            <div className="card-header">
              <div><h3 style={{ fontSize: '15px' }}>{selectedFrameId} Slot</h3><p style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Assign & Align a screen</p></div>
              <button onClick={() => setSelectedFrameId(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            

            <div className="settings-group" style={{ marginBottom: '20px' }}>
              <label className="settings-label">Alignment</label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <div style={{ flex: 1 }}>
                  <CustomSelect 
                    options={[
                      { label: 'Left', value: 'left' },
                      { label: 'Center X', value: 'center' },
                      { label: 'Right', value: 'right' }
                    ]}
                        value={(() => {
                          const assignedMon = monitors.find(m => m.assignedFrameId === selectedFrameId);
                          const frame = layoutFrames.find(f => f.id === selectedFrameId);
                          if (assignedMon && frame) {
                            const isRot = assignedMon.transform % 2 !== 0;
                            const lw = (isRot ? assignedMon.height : assignedMon.width) / assignedMon.scale;
                            const curX = Math.round(assignedMon.x);
                            if (Math.abs(curX - Math.round(frame.x + (frame.w / 2) - (lw / 2))) <= 2) return 'center';
                            if (Math.abs(curX - Math.round(frame.x + frame.w - lw)) <= 2) return 'right';
                            if (Math.abs(curX - Math.round(frame.x)) <= 2) return 'left';
                            return 'manual';
                          }
                          return 'center';
                        })()}
                    onChange={(val) => {
                      const newAlign = val as any;
                      setFrameAlignX(newAlign);
                      const assignedMon = monitors.find(m => m.assignedFrameId === selectedFrameId);
                      const frame = layoutFrames.find(f => f.id === selectedFrameId);
                      if (assignedMon && frame) {
                        const isRot = assignedMon.transform % 2 !== 0;
                        const lw = (isRot ? assignedMon.height : assignedMon.width) / assignedMon.scale;
                        let nx = frame.x;
                        if (newAlign === 'center') nx = frame.x + (frame.w / 2) - (lw / 2);
                        else if (newAlign === 'right') nx = frame.x + frame.w - lw;
                        // Use a dedicated update to avoid interference
                        setMonitors(prev => prev.map(m => m.id === assignedMon.id ? { ...m, x: nx } : m));
                      }
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <CustomSelect 
                    options={[
                      { label: 'Top', value: 'top' },
                      { label: 'Center Y', value: 'center' },
                      { label: 'Bottom', value: 'bottom' }
                    ]}
                        value={(() => {
                          const assignedMon = monitors.find(m => m.assignedFrameId === selectedFrameId);
                          const frame = layoutFrames.find(f => f.id === selectedFrameId);
                          if (assignedMon && frame) {
                            const isRot = assignedMon.transform % 2 !== 0;
                            const lh = (isRot ? assignedMon.width : assignedMon.height) / assignedMon.scale;
                            const curY = Math.round(assignedMon.y);
                            if (Math.abs(curY - Math.round(frame.y + (frame.h / 2) - (lh / 2))) <= 2) return 'center';
                            if (Math.abs(curY - Math.round(frame.y + frame.h - lh)) <= 2) return 'bottom';
                            if (Math.abs(curY - Math.round(frame.y)) <= 2) return 'top';
                            return 'manual';
                          }
                          return 'center';
                        })()}
                    onChange={(val) => {
                      const newAlign = val as any;
                      setFrameAlignY(newAlign);
                      const assignedMon = monitors.find(m => m.assignedFrameId === selectedFrameId);
                      const frame = layoutFrames.find(f => f.id === selectedFrameId);
                      if (assignedMon && frame) {
                        const isRot = assignedMon.transform % 2 !== 0;
                        const lh = (isRot ? assignedMon.width : assignedMon.height) / assignedMon.scale;
                        let ny = frame.y;
                        if (newAlign === 'center') ny = frame.y + (frame.h / 2) - (lh / 2);
                        else if (newAlign === 'bottom') ny = frame.y + frame.h - lh;
                        setMonitors(prev => prev.map(m => m.id === assignedMon.id ? { ...m, y: ny } : m));
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="settings-group">
              <label className="settings-label">Select Screen</label>
              {(() => {
                const assignedMon = monitors.find(m => m.assignedFrameId === selectedFrameId);
                if (assignedMon) {
                  return (
                    <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '12px', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                        <ScreenIcon size={18} color="var(--accent)" />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '12px', fontWeight: '600' }}>{assignedMon.description}</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>{assignedMon.name}</div>
                        </div>
                      </div>
                      <button className="btn-secondary" style={{ width: '100%', padding: '8px', fontSize: '11px', color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.2)' }}
                        onClick={() => {
                          updateMonitor(assignedMon.id, { assignedFrameId: null, x: 0, y: 1500 });
                          showToast("Screen removed from slot", "info");
                        }}
                      >
                        <Trash2 size={14} style={{ marginRight: '6px' }} /> Remove Screen
                      </button>
                    </div>
                  );
                }
                return (
                  <CustomSelect 
                    icon={ScreenIcon}
                    options={[
                      { label: 'Choose a screen...', value: 'UNSELECTED' },
                      ...monitors.filter(m => !m.assignedFrameId).map(m => ({ label: `${m.description} (${m.name})`, value: m.id }))
                    ]}
                    value="UNSELECTED"
                    onChange={(val) => {
                      if (val !== 'UNSELECTED') {
                        const frame = layoutFrames.find(f => f.id === selectedFrameId);
                        const mon = monitors.find(m => m.id === val);
                        if (frame && mon) {
                          const isRot = mon.transform % 2 !== 0;
                          const lw = (isRot ? mon.height : mon.width) / mon.scale;
                          const lh = (isRot ? mon.width : mon.height) / mon.scale;
                          
                          let newX = frame.x;
                          let newY = frame.y;
                          
                          if (frameAlignX === 'center') newX = frame.x + (frame.w / 2) - (lw / 2);
                          else if (frameAlignX === 'right') newX = frame.x + frame.w - lw;
                          
                          if (frameAlignY === 'center') newY = frame.y + (frame.h / 2) - (lh / 2);
                          else if (frameAlignY === 'bottom') newY = frame.y + frame.h - lh;

                          setMonitors(prev => prev.map(m => m.id === val ? { ...m, x: newX, y: newY, assignedFrameId: frame.id } : m));
                          setSelectedFrameId(null);
                          setSelectedId(val);
                          showToast("Display configuration applied successfully!", "success");
                        }
                      }
                    }}
                  />
                );
              })()}
            </div>

            <div className="settings-group" style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
              <label className="settings-label">Slot Properties</label>
              {(() => {
                const frame = layoutFrames.find(f => f.id === selectedFrameId);
                if (!frame) return null;
                return (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <span style={{ fontSize: '9px', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Width</span>
                        <input type="number" className="custom-select" style={{ padding: '8px' }} value={frame.w} onChange={(e) => updateFrame(frame.id, { w: parseInt(e.target.value) || 0 })} />
                      </div>
                      <div>
                        <span style={{ fontSize: '9px', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Height</span>
                        <input type="number" className="custom-select" style={{ padding: '8px' }} value={frame.h} onChange={(e) => updateFrame(frame.id, { h: parseInt(e.target.value) || 0 })} />
                      </div>
                      <div>
                        <span style={{ fontSize: '9px', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Pos X</span>
                        <input type="number" className="custom-select" style={{ padding: '8px' }} value={frame.x} onChange={(e) => updateFrame(frame.id, { x: parseInt(e.target.value) || 0 })} />
                      </div>
                      <div>
                        <span style={{ fontSize: '9px', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Pos Y</span>
                        <input type="number" className="custom-select" style={{ padding: '8px' }} value={frame.y} onChange={(e) => updateFrame(frame.id, { y: parseInt(e.target.value) || 0 })} />
                      </div>
                    </div>
                    <button className="btn-secondary" style={{ width: '100%', marginTop: '16px', fontSize: '11px', color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.1)' }} 
                      onClick={() => {
                        setDeleteConfirm({
                          active: true,
                          title: 'Remove Slot',
                          message: `Are you sure you want to remove the slot "${frame.id}"?`,
                          onConfirm: () => {
                            setLayoutFrames(prev => prev.filter(f => f.id !== selectedFrameId));
                            setSelectedFrameId(null);
                            setDeleteConfirm(prev => ({ ...prev, active: false }));
                          }
                        });
                      }}>
                      Remove this Slot
                    </button>
                  </>
                );
              })()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Settings Card for Monitor Settings */}
      <AnimatePresence>
        {selectedMonitor && (
          <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }} className="floating-card" style={{ width: '320px' }}>
            <div className="card-header" style={{ marginBottom: '10px' }}>
              <div><h3 style={{ fontSize: '15px' }}>{selectedMonitor.name}</h3><p style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{selectedMonitor.description}</p></div>
              <button onClick={() => setSelectedId(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', background: 'rgba(255,255,255,0.02)', padding: '4px', borderRadius: '12px' }}>
              <button 
                onClick={() => setActiveTab('layout')}
                style={{ 
                  flex: 1, padding: '6px 0', fontSize: '12px', borderRadius: '8px', border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                  background: activeTab === 'layout' ? 'var(--accent)' : 'transparent',
                  color: activeTab === 'layout' ? 'white' : 'var(--text-dim)'
                }}
              >
                Layout Slot
              </button>
              <button 
                onClick={() => setActiveTab('settings')}
                style={{ 
                  flex: 1, padding: '6px 0', fontSize: '12px', borderRadius: '8px', border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                  background: activeTab === 'settings' ? 'var(--accent)' : 'transparent',
                  color: activeTab === 'settings' ? 'white' : 'var(--text-dim)'
                }}
              >
                Settings
              </button>
            </div>

            {activeTab === 'layout' ? (
              <>
                <div className="settings-group" style={{ marginBottom: '20px' }}>
                  <label className="settings-label">Alignment</label>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <CustomSelect 
                        options={[
                          { label: 'Left', value: 'left' },
                          { label: 'Center X', value: 'center' },
                          { label: 'Right', value: 'right' },
                          { label: 'Custom/Manual', value: 'manual' }
                        ]}
                        value={(() => {
                          const frame = layoutFrames.find(f => f.id === selectedMonitor.assignedFrameId);
                          if (frame) {
                            const isRot = selectedMonitor.transform % 2 !== 0;
                            const lw = (isRot ? selectedMonitor.height : selectedMonitor.width) / selectedMonitor.scale;
                            const curX = Math.round(selectedMonitor.x);
                            if (Math.abs(curX - Math.round(frame.x + (frame.w / 2) - (lw / 2))) <= 2) return 'center';
                            if (Math.abs(curX - Math.round(frame.x + frame.w - lw)) <= 2) return 'right';
                            if (Math.abs(curX - Math.round(frame.x)) <= 2) return 'left';
                            return 'manual';
                          }
                          return 'center';
                        })()}
                        onChange={(val) => {
                          const newAlign = val as any;
                          setFrameAlignX(newAlign);
                          const frame = layoutFrames.find(f => f.id === selectedMonitor.assignedFrameId) || 
                                        layoutFrames.find(f => {
                                          const isRot = selectedMonitor.transform % 2 !== 0;
                                          const lw = (isRot ? selectedMonitor.height : selectedMonitor.width) / selectedMonitor.scale;
                                          const lh = (isRot ? selectedMonitor.width : selectedMonitor.height) / selectedMonitor.scale;
                                          const cx = selectedMonitor.x + lw / 2;
                                          const cy = selectedMonitor.y + lh / 2;
                                          return cx >= f.x && cx <= f.x + f.w && cy >= f.y && cy <= f.y + f.h;
                                        });
                          if (frame) {
                            const isRot = selectedMonitor.transform % 2 !== 0;
                            const lw = (isRot ? selectedMonitor.height : selectedMonitor.width) / selectedMonitor.scale;
                            let newX = frame.x;
                            if (newAlign === 'center') newX = frame.x + (frame.w / 2) - (lw / 2);
                            else if (newAlign === 'right') newX = frame.x + frame.w - lw;
                            setMonitors(prev => prev.map(m => m.id === selectedMonitor.id ? { ...m, x: newX, assignedFrameId: frame.id } : m));
                          }
                        }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <CustomSelect 
                        options={[
                          { label: 'Top', value: 'top' },
                          { label: 'Center Y', value: 'center' },
                          { label: 'Bottom', value: 'bottom' },
                          { label: 'Custom/Manual', value: 'manual' }
                        ]}
                        value={(() => {
                          const frame = layoutFrames.find(f => f.id === selectedMonitor.assignedFrameId);
                          if (frame) {
                            const isRot = selectedMonitor.transform % 2 !== 0;
                            const lh = (isRot ? selectedMonitor.width : selectedMonitor.height) / selectedMonitor.scale;
                            const curY = Math.round(selectedMonitor.y);
                            if (Math.abs(curY - Math.round(frame.y + (frame.h / 2) - (lh / 2))) <= 2) return 'center';
                            if (Math.abs(curY - Math.round(frame.y + frame.h - lh)) <= 2) return 'bottom';
                            if (Math.abs(curY - Math.round(frame.y)) <= 2) return 'top';
                            return 'manual';
                          }
                          return 'center';
                        })()}
                        onChange={(val) => {
                          const newAlign = val as any;
                          setFrameAlignY(newAlign);
                          const frame = layoutFrames.find(f => f.id === selectedMonitor.assignedFrameId) || 
                                        layoutFrames.find(f => {
                                          const isRot = selectedMonitor.transform % 2 !== 0;
                                          const lw = (isRot ? selectedMonitor.height : selectedMonitor.width) / selectedMonitor.scale;
                                          const lh = (isRot ? selectedMonitor.width : selectedMonitor.height) / selectedMonitor.scale;
                                          const cx = selectedMonitor.x + lw / 2;
                                          const cy = selectedMonitor.y + lh / 2;
                                          return cx >= f.x && cx <= f.x + f.w && cy >= f.y && cy <= f.y + f.h;
                                        });
                          if (frame) {
                            const isRot = selectedMonitor.transform % 2 !== 0;
                            const lh = (isRot ? selectedMonitor.width : selectedMonitor.height) / selectedMonitor.scale;
                            let newY = frame.y;
                            if (newAlign === 'center') newY = frame.y + (frame.h / 2) - (lh / 2);
                            else if (newAlign === 'bottom') newY = frame.y + frame.h - lh;
                            setMonitors(prev => prev.map(m => m.id === selectedMonitor.id ? { ...m, y: newY, assignedFrameId: frame.id } : m));
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="settings-group">
                  <label className="settings-label">Move to Slot</label>
                  <CustomSelect 
                    icon={Layout}
                    searchable={true}
                    options={[
                      { label: 'Free Move', value: 'FREE' },
                      ...layoutFrames.map(f => ({ label: `${f.id} Slot`, value: f.id }))
                    ]}
                    value="FREE"
                    onChange={(val) => {
                      if (val !== 'FREE') {
                        const frame = layoutFrames.find(f => f.id === val);
                        if (frame) {
                          const isRot = selectedMonitor.transform % 2 !== 0;
                          const lw = (isRot ? selectedMonitor.height : selectedMonitor.width) / selectedMonitor.scale;
                          const lh = (isRot ? selectedMonitor.width : selectedMonitor.height) / selectedMonitor.scale;
                          
                          let newX = frame.x;
                          let newY = frame.y;
                          
                          if (frameAlignX === 'center') newX = frame.x + (frame.w / 2) - (lw / 2);
                          else if (frameAlignX === 'right') newX = frame.x + frame.w - lw;
                          
                          if (frameAlignY === 'center') newY = frame.y + (frame.h / 2) - (lh / 2);
                          else if (frameAlignY === 'bottom') newY = frame.y + frame.h - lh;

                          updateMonitor(selectedMonitor.id, { x: newX, y: newY, assignedFrameId: frame.id });
                          showToast(`Moved to ${frame.id} Slot`, 'success');
                        }
                      }
                    }}
                  />
                </div>

                {selectedMonitor.assignedFrameId && (
                  <div style={{ marginTop: '20px', padding: '16px', background: 'rgba(239,68,68,0.05)', borderRadius: '16px', border: '1px solid rgba(239,68,68,0.1)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--danger)', marginBottom: '8px', fontWeight: '600' }}>CURRENT ASSIGNMENT</div>
                    <div style={{ fontSize: '13px', marginBottom: '12px' }}>Assigned to <b>{selectedMonitor.assignedFrameId} Slot</b></div>
                    <button className="btn-secondary" style={{ width: '100%', padding: '10px', fontSize: '11px', color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.2)' }}
                      onClick={() => {
                        updateMonitor(selectedMonitor.id, { assignedFrameId: null, x: 0, y: 1500 });
                        setSelectedId(null);
                        showToast("Monitor removed from slot", "info");
                      }}
                    >
                      <Trash2 size={14} style={{ marginRight: '8px' }} /> Unassign from Slot
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="settings-group">
                  <label className="settings-label">Resolution & Refresh</label>
                  <CustomSelect 
                    searchable={true}
                    options={Array.from(new Set(selectedMonitor.modes.map(m => `${m.width}x${m.height}@${m.refreshRate.toFixed(2)}`)))
                      .map(val => {
                        const [res, rate] = val.split('@');
                        return { label: `${res} @ ${rate}Hz`, value: val };
                      })
                    }
                    value={`${selectedMonitor.width}x${selectedMonitor.height}@${selectedMonitor.refreshRate.toFixed(2)}`}
                    onChange={(val) => {
                      const [res, rate] = val.split('@');
                      const [w, h] = res.split('x').map(Number);
                      updateMonitor(selectedMonitor.id, { width: w, height: h, refreshRate: parseFloat(rate) });
                    }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="settings-group">
                    <label className="settings-label">Scale</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button className="control-btn" style={{ width: '30px', height: '30px', background: 'rgba(255,255,255,0.05)' }} onClick={() => updateMonitor(selectedMonitor.id, { scale: Math.max(1, selectedMonitor.scale - 0.25) })}>-</button>
                      <span style={{ fontSize: '13px', width: '35px', textAlign: 'center' }}>{selectedMonitor.scale}</span>
                      <button className="control-btn" style={{ width: '30px', height: '30px', background: 'rgba(255,255,255,0.05)' }} onClick={() => updateMonitor(selectedMonitor.id, { scale: Math.min(3, selectedMonitor.scale + 0.25) })}>+</button>
                    </div>
                  </div>
                  <div className="settings-group">
                    <label className="settings-label">Orientation</label>
                    <CustomSelect 
                      options={[
                        { label: 'Normal', value: '0' },
                        { label: '90°', value: '1' },
                        { label: '180°', value: '2' },
                        { label: '270°', value: '3' },
                        { label: 'Flipped', value: '4' },
                        { label: 'Flipped 90°', value: '5' },
                        { label: 'Flipped 180°', value: '6' },
                        { label: 'Flipped 270°', value: '7' }
                      ]}
                      value={selectedMonitor.transform.toString()}
                      onChange={(val) => updateMonitor(selectedMonitor.id, { transform: parseInt(val) })}
                    />
                  </div>
                </div>
                <div className="settings-group" style={{ marginTop: '12px' }}>
                  <label className="settings-label">Bound Workspaces</label>
                  <input 
                    type="text" 
                    className="custom-select" 
                    style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.2)' }}
                    placeholder="e.g. 1,2,3" 
                    value={selectedMonitor.workspaces || ""} 
                    onChange={(e) => updateMonitor(selectedMonitor.id, { workspaces: e.target.value })}
                  />
                  <p style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '4px' }}>Workspaces bound to this monitor (comma separated)</p>
                </div>
                <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button className="btn-secondary" style={{ flex: 1, fontSize: '12px', borderColor: selectedMonitor.isPrimary ? 'var(--accent)' : 'var(--border)' }} onClick={() => setMonitors(prev => prev.map(m => ({ ...m, isPrimary: m.id === selectedMonitor.id })))}>
                    {selectedMonitor.isPrimary ? 'Primary' : 'Set Primary'}
                  </button>
                  <button className="btn-secondary" style={{ flex: 1, fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} onClick={() => invoke('identify_single_monitor', selectedMonitor.name)}>
                    <ScreenIcon size={14} /> Identify This Screen
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      {/* Save Profile Modal */}
      <AnimatePresence>
        {showSaveModal && (
          <div className="modal-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              style={{ background: 'var(--bg-card)', padding: '30px', borderRadius: '24px', border: '1px solid var(--border)', width: '350px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}
            >
              <h3 style={{ marginBottom: '10px' }}>Save New Profile</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '20px' }}>Enter a name for your current monitor layout.</p>
              <input 
                className="custom-select" 
                style={{ background: 'rgba(0,0,0,0.2)', marginBottom: '20px' }}
                placeholder="Profile Name (e.g. Work)" 
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                autoFocus
              />
              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setShowSaveModal(false)}>Cancel</button>
                <button className="btn-primary" style={{ flex: 1 }} onClick={() => performSave(newProfileName)}>Save</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="bottom-bar">
        <motion.div 
          layoutId="main-logo-header"
          style={{ display: 'flex', alignItems: 'center', gap: '15px', pointerEvents: 'auto' }}
        >
          <div className="app-logo-container" style={{ width: '42px', height: '42px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 0 20px rgba(99, 102, 241, 0.2)', background: 'rgba(255,255,255,0.05)' }}>
            <img src={logoSmall} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="App Logo" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <h1 className="app-title" style={{ margin: 0, fontSize: '18px', textTransform: 'uppercase' }}>HyprDisplay Manager</h1>
            <span className="app-version" style={{ fontSize: '10px', color: 'var(--text-dim)', letterSpacing: '1px' }}>{appVersion}</span>
          </div>
        </motion.div>

        <div className="zoom-controls" style={{ pointerEvents: 'auto', background: 'var(--bg-card)', padding: '6px', borderRadius: '16px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button className="control-btn" style={{ width: '24px', height: '24px' }} onClick={() => setZoom(z => Math.max(0.02, z - 0.01))}><ZoomOut size={12} /></button>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', width: '35px', textAlign: 'center' }}>{Math.round(zoom * 1000)}%</div>
          <button className="control-btn" style={{ width: '24px', height: '24px' }} onClick={() => setZoom(z => Math.min(0.4, z + 0.01))}><ZoomIn size={12} /></button>
        </div>
      </div>
      
      <AnimatePresence>{toast && (
        <motion.div initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 100, opacity: 0 }} style={{ position: 'absolute', top: 80, right: 20, background: 'var(--bg-card)', backdropFilter: 'blur(12px)', padding: '12px 20px', borderRadius: '24px', border: '1px solid var(--border)', zIndex: 2000, boxShadow: '0 10px 30px rgba(0,0,0,0.5)', minWidth: '200px' }}>
          <div style={{ fontWeight: 'bold', color: toast.type === 'error' ? 'var(--danger)' : 'var(--accent)', fontSize: '14px' }}>{toast.title}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{toast.message}</div>
        </motion.div>
      )}</AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmModal.active && (
          <div className="modal-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} style={{ background: 'var(--bg-card)', borderRadius: '24px', border: '1px solid var(--border)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', width: '400px', textAlign: 'center', padding: '30px' }}>
              <h3 style={{ fontSize: '18px', marginBottom: '10px' }}>Keep these display settings?</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '24px' }}>
                Reverting to previous configuration in <strong style={{ color: 'var(--accent)' }}>{confirmModal.timeLeft}</strong> seconds.
              </p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn-secondary" style={{ flex: 1 }} onClick={() => handleRevert(confirmModal.backupConfig)}>Revert</button>
                <button className="btn-primary" style={{ flex: 1 }} onClick={handleKeepChanges}>Keep Changes</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm.active && (
          <div className="modal-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} style={{ background: 'var(--bg-card)', borderRadius: '24px', border: '1px solid var(--border)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', width: '380px', textAlign: 'center', padding: '30px' }}>
              <div style={{ color: 'var(--danger)', marginBottom: '15px' }}><Trash2 size={40} style={{ margin: '0 auto' }} /></div>
              <h3 style={{ fontSize: '18px', marginBottom: '10px' }}>{deleteConfirm.title}</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '24px', lineHeight: '1.5' }}>
                {deleteConfirm.message}
              </p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setDeleteConfirm(prev => ({ ...prev, active: false }))}>Cancel</button>
                <button className="btn-primary" style={{ flex: 1, background: 'var(--danger)' }} onClick={deleteConfirm.onConfirm}>Delete Anyway</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="modal-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 11000 }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              style={{ background: 'var(--bg-card)', padding: '30px', borderRadius: '24px', border: '1px solid var(--border)', width: '380px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '18px' }}>Application Settings</h3>
                <button onClick={() => setShowSettings(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}><X size={20} /></button>
              </div>

              <div className="settings-group" style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '14px', color: 'white', marginBottom: '4px' }}>Run in Background</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Hide window to tray when closing instead of exiting</div>
                  </div>
                  <div 
                    onClick={async () => {
                      const newState = !runInBackground;
                      setRunInBackground(newState);
                      await invoke('set_background_mode', { enabled: newState });
                      showToast(`Background mode ${newState ? 'enabled' : 'disabled'}`, 'info');
                    }}
                    style={{ 
                      width: '40px', height: '22px', borderRadius: '20px', background: runInBackground ? 'var(--accent)' : 'rgba(255,255,255,0.1)', 
                      position: 'relative', cursor: 'pointer', transition: 'all 0.3s'
                    }}
                  >
                    <motion.div 
                      animate={{ x: runInBackground ? 20 : 2 }}
                      style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'white', position: 'absolute', top: 2, left: 0 }}
                    />
                  </div>
                </div>
              </div>

              <div className="settings-group" style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '14px', color: 'white', marginBottom: '4px' }}>Launch on Startup</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Automatically start the app when you log in</div>
                  </div>
                  <div 
                    onClick={async () => {
                      const newState = !launchOnStartup;
                      setLaunchOnStartup(newState);
                      await invoke('set_autostart', newState);
                      showToast(`Autostart ${newState ? 'enabled' : 'disabled'}`, 'info');
                    }}
                    style={{ 
                      width: '40px', height: '22px', borderRadius: '20px', background: launchOnStartup ? 'var(--accent)' : 'rgba(255,255,255,0.1)', 
                      position: 'relative', cursor: 'pointer', transition: 'all 0.3s'
                    }}
                  >
                    <motion.div 
                      animate={{ x: launchOnStartup ? 20 : 2 }}
                      style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'white', position: 'absolute', top: 2, left: 0 }}
                    />
                  </div>
                </div>
              </div>

              <div className="settings-group" style={{ marginBottom: '24px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Download size={16} />
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', color: 'white', marginBottom: '4px' }}>Software Update</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Check for the latest version</div>
                    </div>
                  </div>
                  <button 
                    className="btn-secondary" 
                    style={{ padding: '6px 12px', fontSize: '12px', border: '1px solid var(--border)' }}
                    onClick={checkForUpdates}
                    disabled={isUpdating}
                  >
                    {isUpdating ? 'Checking...' : 'Check Now'}
                  </button>
                </div>
              </div>

              <div style={{ paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
                <button 
                  className="btn-secondary" 
                  style={{ width: '100%', color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                  onClick={() => {
                    setDeleteConfirm({
                      active: true,
                      title: 'Quit Application',
                      message: 'Are you sure you want to completely exit the application? It will stop managing your displays until restarted.',
                      onConfirm: () => {
                         invoke('exit_app'); 
                      }
                    });
                  }}
                >
                  <Power size={16} /> Terminate Process
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showSplash && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.05, filter: "blur(20px)" }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              background: '#0a0a0f',
              display: 'flex',
              flexDirection: 'column',
              padding: '40px'
            }}
          >
            {/* Header Style Logo & Title (Top Left) */}
            <motion.div 
              layoutId="main-logo-header"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              style={{ display: 'flex', alignItems: 'center', gap: '16px' }}
            >
              <div style={{
                width: '64px',
                height: '64px',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '8px'
              }}>
                <img src={logoSmall} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <h1 style={{ 
                  fontSize: '20px', 
                  fontWeight: '700', 
                  letterSpacing: '1px', 
                  color: 'white',
                  margin: 0
                }}>
                  HYPRDISPLAY MANAGER
                </h1>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', fontWeight: '500' }}>v0.1.0</span>
              </div>
            </motion.div>

            {/* Center Animation (Rotating Gear) */}
            <div style={{ 
              flex: 1, 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center',
              gap: '32px'
            }}>
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.8, ease: "backOut" }}
                style={{ position: 'relative' }}
              >
                {/* Background Glow */}
                <motion.div
                  animate={{
                    opacity: [0.1, 0.3, 0.1],
                    scale: [1, 1.2, 1]
                  }}
                  transition={{ duration: 3, repeat: Infinity }}
                  style={{
                    position: 'absolute',
                    inset: '-40px',
                    background: 'var(--accent)',
                    filter: 'blur(60px)',
                    borderRadius: '50%',
                    zIndex: 0
                  }}
                />
                
                {/* Rotating Gear */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  style={{ position: 'relative', zIndex: 1 }}
                >
                  <Settings size={120} strokeWidth={1} color="var(--accent)" style={{ opacity: 0.8 }} />
                </motion.div>
                
                {/* Inner Small Gear (Counter-Rotating) */}
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  style={{ 
                    position: 'absolute', 
                    top: '50%', 
                    left: '50%', 
                    transform: 'translate(-50%, -50%)',
                    zIndex: 2 
                  }}
                >
                  <Settings size={40} strokeWidth={1.5} color="white" style={{ opacity: 0.4 }} />
                </motion.div>
              </motion.div>

              <div style={{ textAlign: 'center' }}>
                <motion.p
                  animate={{ opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  style={{ 
                    fontSize: '10px', 
                    letterSpacing: '3px', 
                    color: 'white', 
                    fontWeight: '600',
                    textTransform: 'uppercase'
                  }}
                >
                  Synchronizing Display Engine
                </motion.p>
                
                <motion.div 
                  style={{ 
                    width: '180px', 
                    height: '2px', 
                    background: 'rgba(255,255,255,0.05)', 
                    borderRadius: '1px',
                    overflow: 'hidden',
                    marginTop: '12px',
                    marginInline: 'auto'
                  }}
                >
                  <motion.div
                    initial={{ x: '-100%' }}
                    animate={{ x: '100%' }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    style={{
                      width: '40%',
                      height: '100%',
                      background: 'linear-gradient(to right, transparent, var(--accent), transparent)'
                    }}
                  />
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
