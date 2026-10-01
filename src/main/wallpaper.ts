// Desktop wallpaper mode for Windows.
// The window is re-parented behind the desktop icons (the WorkerW trick used by
// Lively Wallpaper). Win32 calls go through a small PowerShell + C# helper, so
// no native Node module has to be compiled.
import { app, BrowserWindow } from 'electron'
import { execFile, spawn, type ChildProcess } from 'child_process'
import { writeFileSync } from 'fs'
import { join } from 'path'

const HELPER = String.raw`
param([string]$Action, [string]$Hwnd = '0', [int]$ParentPid = 0)
$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using System.Text;

public static class NxDesk {
  delegate bool EnumProc(IntPtr h, IntPtr l);
  [DllImport("user32.dll")] static extern bool SetProcessDPIAware();
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern IntPtr FindWindow(string c, string n);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern IntPtr FindWindowEx(IntPtr p, IntPtr after, string c, string n);
  [DllImport("user32.dll")] static extern IntPtr SendMessageTimeout(IntPtr h, uint msg, IntPtr w, IntPtr l, uint flags, uint timeout, out IntPtr res);
  [DllImport("user32.dll")] static extern bool EnumWindows(EnumProc f, IntPtr l);
  [DllImport("user32.dll")] static extern IntPtr SetParent(IntPtr child, IntPtr parent);
  [DllImport("user32.dll")] static extern bool SetWindowPos(IntPtr h, IntPtr after, int x, int y, int cx, int cy, uint flags);
  [DllImport("user32.dll")] static extern int GetSystemMetrics(int i);
  [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] static extern bool IsZoomed(IntPtr h);
  [DllImport("user32.dll")] static extern bool IsIconic(IntPtr h);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetClassName(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] static extern IntPtr MonitorFromWindow(IntPtr h, uint f);
  [DllImport("user32.dll")] static extern bool GetMonitorInfo(IntPtr m, ref MONITORINFO mi);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern bool SystemParametersInfo(uint a, uint p, StringBuilder s, uint f);

  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L, T, R, B; }
  [StructLayout(LayoutKind.Sequential)] public struct MONITORINFO { public int cbSize; public RECT rcMonitor; public RECT rcWork; public uint dwFlags; }

  static MONITORINFO Info(IntPtr mon) {
    MONITORINFO mi = new MONITORINFO();
    mi.cbSize = Marshal.SizeOf(typeof(MONITORINFO));
    GetMonitorInfo(mon, ref mi);
    return mi;
  }

  public static string Attach(long hwnd) {
    SetProcessDPIAware();
    IntPtr me = new IntPtr(hwnd);
    IntPtr progman = FindWindow("Progman", null);
    if (progman == IntPtr.Zero) return "error: no Progman";
    IntPtr res;
    // ask Explorer to create the WorkerW that sits behind the icons
    SendMessageTimeout(progman, 0x052C, new IntPtr(0xD), new IntPtr(1), 0, 1000, out res);
    SendMessageTimeout(progman, 0x052C, IntPtr.Zero, IntPtr.Zero, 0, 1000, out res);

    IntPtr worker = IntPtr.Zero;
    EnumWindows(delegate (IntPtr h, IntPtr l) {
      if (FindWindowEx(h, IntPtr.Zero, "SHELLDLL_DefView", null) != IntPtr.Zero)
        worker = FindWindowEx(IntPtr.Zero, h, "WorkerW", null);
      return true;
    }, IntPtr.Zero);

    IntPtr parent = worker, after = IntPtr.Zero;
    if (parent == IntPtr.Zero) {
      // Windows 11 24H2+: the WorkerW is a child of Progman; go right below the icons
      if (FindWindowEx(progman, IntPtr.Zero, "WorkerW", null) == IntPtr.Zero) return "error: no WorkerW";
      parent = progman;
      after = FindWindowEx(progman, IntPtr.Zero, "SHELLDLL_DefView", null);
    }

    // primary monitor, in coordinates relative to the virtual screen
    MONITORINFO mi = Info(MonitorFromWindow(IntPtr.Zero, 1));
    int vx = GetSystemMetrics(76), vy = GetSystemMetrics(77);
    SetParent(me, parent);
    uint flags = after == IntPtr.Zero ? 0x0054u : 0x0050u; // (NOZORDER |) NOACTIVATE | SHOWWINDOW
    SetWindowPos(me, after, mi.rcMonitor.L - vx, mi.rcMonitor.T - vy, mi.rcMonitor.R - mi.rcMonitor.L, mi.rcMonitor.B - mi.rcMonitor.T, flags);
    return "ok";
  }

  // 0 = the desktop is in front, 1 = another app is in front, 2 = a maximized or fullscreen
  // window hides the monitor our window is on
  public static int Covered(long ours) {
    IntPtr fg = GetForegroundWindow();
    if (fg == IntPtr.Zero || fg == new IntPtr(ours) || IsIconic(fg)) return 0;
    StringBuilder c = new StringBuilder(64);
    GetClassName(fg, c, 64);
    string cls = c.ToString();
    if (cls == "Progman" || cls == "WorkerW" || cls == "Shell_TrayWnd") return 0;
    IntPtr mon = MonitorFromWindow(fg, 2);
    if (mon != MonitorFromWindow(new IntPtr(ours), 2)) return 1;
    if (IsZoomed(fg)) return 2;
    RECT r; GetWindowRect(fg, out r);
    MONITORINFO mi = Info(mon);
    return (r.L <= mi.rcMonitor.L && r.T <= mi.rcMonitor.T && r.R >= mi.rcMonitor.R && r.B >= mi.rcMonitor.B) ? 2 : 1;
  }

  // re-apply the current wallpaper so the desktop does not keep our last frame
  public static void Refresh() {
    StringBuilder p = new StringBuilder(520);
    SystemParametersInfo(0x0073, 520, p, 0);
    SystemParametersInfo(0x0014, 0, p, 3);
  }
}
"@

if ($Action -eq 'attach') { [NxDesk]::Attach([long]$Hwnd) }
elseif ($Action -eq 'refresh') { [NxDesk]::Refresh() }
elseif ($Action -eq 'watch') {
  $last = -1
  while ($true) {
    if ($ParentPid -and -not (Get-Process -Id $ParentPid -ErrorAction SilentlyContinue)) { exit }
    $c = [NxDesk]::Covered([long]$Hwnd)
    if ($c -ne $last) { [Console]::Out.WriteLine("covered $c"); [Console]::Out.Flush(); $last = $c }
    Start-Sleep -Milliseconds 1000
  }
}
`

let helperPath = ''
function helper() {
  if (!helperPath) {
    helperPath = join(app.getPath('userData'), 'nexus-desktop.ps1')
    writeFileSync(helperPath, HELPER, 'utf8')
  }
  return helperPath
}

const args = (action: string, hwnd = '0') =>
  ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', helper(), '-Action', action, '-Hwnd', hwnd, '-ParentPid', String(process.pid)]

const handleOf = (win: BrowserWindow) => win.getNativeWindowHandle().readBigUInt64LE(0).toString()

/** Puts the window behind the desktop icons, covering the primary monitor. */
export function attachToDesktop(win: BrowserWindow): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile('powershell', args('attach', handleOf(win)), { windowsHide: true, timeout: 20000 }, (err, out) => {
      if (err) return reject(err)
      const msg = out.trim()
      msg.endsWith('ok') ? resolve() : reject(new Error(msg || 'sin respuesta'))
    })
  })
}

/** Restores the normal wallpaper image (call after leaving wallpaper mode). */
export function refreshWallpaper() {
  return new Promise<void>(resolve => execFile('powershell', args('refresh'), { windowsHide: true, timeout: 15000 }, () => resolve()))
}

let watcher: ChildProcess | null = null

/** Reports when a maximized/fullscreen app hides our window, so drawing can pause. */
/** What is in front of the wallpaper: 'desktop', 'app' or 'covered' (maximized or fullscreen). */
export function watchCovered(win: BrowserWindow, onChange: (state: 'desktop' | 'app' | 'covered') => void) {
  stopWatching()
  const p = spawn('powershell', args('watch', handleOf(win)), { windowsHide: true })
  let buf = ''
  p.stdout.on('data', d => {
    buf += d
    const lines = buf.split(/\r?\n/)
    buf = lines.pop() || ''
    for (const l of lines) if (l.startsWith('covered ')) onChange(l.endsWith('2') ? 'covered' : l.endsWith('1') ? 'app' : 'desktop')
  })
  p.on('error', () => {})
  watcher = p
}

export function stopWatching() {
  watcher?.kill()
  watcher = null
}
