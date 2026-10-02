// Desktop wallpaper mode for Windows.
// The window is re-parented behind the desktop icons (the WorkerW trick used by
// Lively Wallpaper). Win32 calls go through a small PowerShell + C# helper, so
// no native Node module has to be compiled. The C# is compiled once and kept as a
// DLL in the app data folder: compiling it every time took several seconds.
//
// Behind the icons Windows sends no clicks to the window, so the helper also listens to the
// mouse (a low-level hook, like Wallpaper Engine) and reports clicks and wheel turns that land
// on the bare desktop; the page then acts as if they had been made on it.
import { app, BrowserWindow, screen } from 'electron'
import { execFile, spawn, type ChildProcess } from 'child_process'
import { existsSync, readdirSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'

// bump when the C# changes, so the cached DLL is rebuilt
const VERSION = 3

const CSHARP = String.raw`
using System;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;

public static class NxDesk {
  delegate bool EnumProc(IntPtr h, IntPtr l);
  delegate IntPtr HookProc(int code, IntPtr w, IntPtr l);
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
  [DllImport("user32.dll")] static extern IntPtr WindowFromPoint(POINT p);
  [DllImport("user32.dll")] static extern IntPtr GetAncestor(IntPtr h, uint flags);
  [DllImport("user32.dll")] static extern IntPtr SetWindowsHookEx(int id, HookProc f, IntPtr mod, uint thread);
  [DllImport("user32.dll")] static extern IntPtr CallNextHookEx(IntPtr h, int code, IntPtr w, IntPtr l);
  [DllImport("user32.dll")] static extern int GetMessage(out MSG m, IntPtr h, uint min, uint max);
  [DllImport("kernel32.dll", CharSet = CharSet.Unicode)] static extern IntPtr GetModuleHandle(string name);

  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L, T, R, B; }
  [StructLayout(LayoutKind.Sequential)] public struct POINT { public int X, Y; }
  [StructLayout(LayoutKind.Sequential)] public struct MSG { public IntPtr h; public uint msg; public IntPtr w, l; public uint time; public POINT pt; }
  [StructLayout(LayoutKind.Sequential)] struct MOUSEHOOK { public POINT pt; public uint data, flags, time; public IntPtr extra; }
  [StructLayout(LayoutKind.Sequential)] public struct MONITORINFO { public int cbSize; public RECT rcMonitor; public RECT rcWork; public uint dwFlags; }

  static MONITORINFO Info(IntPtr mon) {
    MONITORINFO mi = new MONITORINFO();
    mi.cbSize = Marshal.SizeOf(typeof(MONITORINFO));
    GetMonitorInfo(mon, ref mi);
    return mi;
  }
  static string ClassOf(IntPtr h) { StringBuilder c = new StringBuilder(64); GetClassName(h, c, 64); return c.ToString(); }

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
    string cls = ClassOf(fg);
    if (cls == "Progman" || cls == "WorkerW" || cls == "Shell_TrayWnd") return 0;
    IntPtr mon = MonitorFromWindow(fg, 2);
    if (mon != MonitorFromWindow(new IntPtr(ours), 2)) return 1;
    if (IsZoomed(fg)) return 2;
    RECT r; GetWindowRect(fg, out r);
    MONITORINFO mi = Info(mon);
    return (r.L <= mi.rcMonitor.L && r.T <= mi.rcMonitor.T && r.R >= mi.rcMonitor.R && r.B >= mi.rcMonitor.B) ? 2 : 1;
  }

  // ---------- clicks on the desktop ----------
  static IntPtr ours, hook;
  static HookProc keep; // the delegate must outlive the hook
  static bool inside, pressed;
  static int lastMove;

  static void Say(string s) { Console.Out.WriteLine(s); Console.Out.Flush(); }

  static IntPtr OnMouse(int code, IntPtr w, IntPtr l) {
    int msg = w.ToInt32();
    // move, left button down/up, wheel
    if (code >= 0 && (msg == 0x0200 || msg == 0x0201 || msg == 0x0202 || msg == 0x020A)) {
      try {
        MOUSEHOOK m = (MOUSEHOOK)Marshal.PtrToStructure(l, typeof(MOUSEHOOK));
        // moves are many: at most ~40 a second
        if (msg == 0x0200 && unchecked(Environment.TickCount - lastMove) < 25) return CallNextHookEx(hook, code, w, l);
        if (msg == 0x0200) lastMove = Environment.TickCount;
        // only what happens on the bare desktop (icons layer or wallpaper), never on an app
        string root = ClassOf(GetAncestor(WindowFromPoint(m.pt), 2));
        RECT r; GetWindowRect(ours, out r);
        bool onDesk = (root == "Progman" || root == "WorkerW") && m.pt.X >= r.L && m.pt.X < r.R && m.pt.Y >= r.T && m.pt.Y < r.B;
        string at = " " + (m.pt.X - r.L) + " " + (m.pt.Y - r.T);
        if (!onDesk) {
          if (inside) { inside = false; Say("leave"); }
          if (msg == 0x0202 && pressed) { pressed = false; Say("up" + at); }
        } else {
          inside = true;
          if (msg == 0x0200) Say("move" + at);
          else if (msg == 0x0201) { pressed = true; Say("down" + at); }
          else if (msg == 0x0202) { pressed = false; Say("up" + at); }
          else Say("wheel" + at + " " + (short)(m.data >> 16));
        }
      } catch { }
    }
    return CallNextHookEx(hook, code, w, l);
  }

  /** Listens to the mouse on its own thread (low-level hooks need a message loop). */
  public static void ListenMouse(long hwnd) {
    ours = new IntPtr(hwnd);
    Thread t = new Thread(delegate () {
      keep = new HookProc(OnMouse);
      hook = SetWindowsHookEx(14, keep, GetModuleHandle(null), 0);
      MSG m;
      while (GetMessage(out m, IntPtr.Zero, 0, 0) > 0) { }
    });
    t.IsBackground = true;
    t.Start();
  }

  // re-apply the current wallpaper so the desktop does not keep our last frame
  public static void Refresh() {
    StringBuilder p = new StringBuilder(520);
    SystemParametersInfo(0x0073, 520, p, 0);
    SystemParametersInfo(0x0014, 0, p, 3);
  }
}
`

const HELPER = String.raw`
param([string]$Action, [string]$Hwnd = '0', [int]$ParentPid = 0, [string]$Dll, [int]$Mouse = 0)
$ErrorActionPreference = 'Stop'
# compiled once; later runs just load the DLL (much faster)
if (-not (Test-Path $Dll)) {
  $src = Get-Content -Raw -LiteralPath ($Dll -replace '\.dll$', '.cs')
  Add-Type -TypeDefinition $src -OutputAssembly $Dll -OutputType Library
}
Add-Type -LiteralPath $Dll

if ($Action -eq 'refresh') { [NxDesk]::Refresh(); exit }
if ($Action -eq 'run') {
  [Console]::Out.WriteLine('attach ' + [NxDesk]::Attach([long]$Hwnd)); [Console]::Out.Flush()
  if ($Mouse) { [NxDesk]::ListenMouse([long]$Hwnd) }
  $last = -1
  while ($true) {
    if ($ParentPid -and -not (Get-Process -Id $ParentPid -ErrorAction SilentlyContinue)) { exit }
    $c = [NxDesk]::Covered([long]$Hwnd)
    if ($c -ne $last) { [Console]::Out.WriteLine("covered $c"); [Console]::Out.Flush(); $last = $c }
    Start-Sleep -Milliseconds 1000
  }
}
`

let files: { ps1: string; dll: string } | null = null
function helper() {
  if (!files) {
    const dir = app.getPath('userData')
    const dll = join(dir, `nexus-desktop-${VERSION}.dll`)
    const ps1 = join(dir, 'nexus-desktop.ps1')
    writeFileSync(ps1, HELPER, 'utf8')
    if (!existsSync(dll)) writeFileSync(dll.replace(/\.dll$/, '.cs'), CSHARP, 'utf8')
    // helpers of older versions are not needed any more
    for (const old of readdirSync(dir)) {
      if (/^nexus-desktop-\d+\.(dll|cs)$/.test(old) && !old.startsWith(`nexus-desktop-${VERSION}.`)) rmSync(join(dir, old), { force: true })
    }
    files = { ps1, dll }
  }
  return files
}

const args = (action: string, hwnd = '0', mouse = false) => {
  const { ps1, dll } = helper()
  return ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', ps1, '-Action', action, '-Hwnd', hwnd, '-ParentPid', String(process.pid), '-Dll', dll, '-Mouse', mouse ? '1' : '0']
}

const handleOf = (win: BrowserWindow) => win.getNativeWindowHandle().readBigUInt64LE(0).toString()

export type Front = 'desktop' | 'app' | 'covered'
export type Pointer = { kind: 'move' | 'down' | 'up' | 'wheel' | 'leave'; x: number; y: number; delta?: number }
export type DeskEvents = {
  onFront: (state: Front) => void
  /** the mouse on the bare desktop, in page pixels */
  onPointer?: (e: Pointer) => void
}

let helperProc: ChildProcess | null = null

/**
 * Puts the window behind the desktop icons (primary monitor) and keeps one helper running
 * that reports what is in front of it and, if wanted, clicks on the desktop.
 */
export function attachToDesktop(win: BrowserWindow, ev: DeskEvents): Promise<void> {
  stopDesktop()
  return new Promise((resolve, reject) => {
    const p = spawn('powershell', args('run', handleOf(win), !!ev.onPointer), { windowsHide: true })
    helperProc = p
    const scale = screen.getPrimaryDisplay().scaleFactor || 1
    let buf = '', settled = false
    const fail = (msg: string) => { if (!settled) { settled = true; stopDesktop(); reject(new Error(msg)) } }
    const timer = setTimeout(() => fail('sin respuesta'), 20000)
    p.stdout!.on('data', d => {
      buf += d
      const lines = buf.split(/\r?\n/)
      buf = lines.pop() || ''
      for (const l of lines) {
        if (l.startsWith('attach ')) {
          clearTimeout(timer)
          if (l.endsWith('ok')) { settled = true; resolve() } else fail(l.slice(7))
        } else if (l.startsWith('covered ')) ev.onFront(l.endsWith('2') ? 'covered' : l.endsWith('1') ? 'app' : 'desktop')
        else if (ev.onPointer && /^(move|down|up|wheel|leave)( |$)/.test(l)) {
          const [kind, x, y, delta] = l.split(' ')
          ev.onPointer({ kind: kind as Pointer['kind'], x: +x / scale || 0, y: +y / scale || 0, delta: delta ? +delta : undefined })
        }
      }
    })
    p.stderr!.on('data', d => { if (!settled) console.warn('[wallpaper]', String(d).slice(0, 300)) })
    p.on('error', e => fail(e.message))
    p.on('exit', () => fail('el ayudante se ha cerrado'))
  })
}

/** Restores the normal wallpaper image (call after leaving wallpaper mode). */
export function refreshWallpaper() {
  return new Promise<void>(resolve => execFile('powershell', args('refresh'), { windowsHide: true, timeout: 15000 }, () => resolve()))
}

export function stopDesktop() {
  helperProc?.kill()
  helperProc = null
}
