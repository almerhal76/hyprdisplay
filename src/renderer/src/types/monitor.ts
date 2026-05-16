export interface Monitor {
  id: string;
  name: string;
  description: string;
  width: number;
  height: number;
  refreshRate: number;
  x: number;
  y: number;
  scale: number;
  transform: number; // 0, 90, 180, 270
  focused: boolean;
  isPrimary: boolean;
  active: boolean;
  workspaces?: string;
  modes?: { width: number; height: number; refreshRate: number }[];
}

export interface MonitorConfig {
  monitors: Monitor[];
}
