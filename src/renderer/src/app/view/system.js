// System panel: six gauges around the core, CPU threads, top processes and the PC's facts.
import { fmt, hm } from '../util';

const ANGLES = [-90, -30, 30, 90, 150, 210];

// short labels: they must fit inside the rings
function gauges(si) {
  if (!si) return ['CPU', 'GPU', 'TEMP. GPU', 'RED', 'DISCO C:', 'RAM'].map(label => ({ label, val: '··', unit: '', detail: 'MIDIENDO…', p: 0 }));
  const gb = n => fmt(n, n >= 100 ? 0 : 1);
  const { cpu, gpu, net, disk, ram } = si;
  return [
    { label: 'CPU', val: cpu.use, unit: ' %', detail: cpu.name.replace(/^(Intel|AMD)\s+(Core\s+|Ryzen\s+)?/i, '').toUpperCase().slice(0, 16), p: cpu.use / 100, warn: cpu.use > 90 },
    { label: 'GPU', val: gpu.use ?? '—', unit: gpu.use != null ? ' %' : '', detail: gpu.memTotal ? 'VRAM ' + fmt(gpu.memUsed / 1024) + ' / ' + fmt(gpu.memTotal / 1024, 0) + ' GB' : gpu.name.toUpperCase().slice(0, 18), p: (gpu.use || 0) / 100, warn: gpu.memTotal && gpu.memUsed / gpu.memTotal > .95 },
    { label: 'TEMP. GPU', val: gpu.temp ?? '—', unit: gpu.temp != null ? ' °C' : '', detail: gpu.fan != null ? 'VENTILADOR ' + gpu.fan + ' %' : 'NO DISPONIBLE', p: (gpu.temp || 0) / 100, warn: gpu.temp > 83 },
    { label: 'RED ↓', val: net.rxMbps != null ? fmt(net.rxMbps) : '—', unit: net.rxMbps != null ? ' Mb/s' : '', detail: net.txMbps != null ? '↑ ' + fmt(net.txMbps) + ' MB/S' : '', p: Math.min(1, (net.rxMbps || 0) / 100) },
    { label: 'DISCO C:', val: disk ? Math.round(disk.used / disk.total * 100) : '—', unit: disk ? ' %' : '', detail: disk ? 'LIBRES ' + gb(disk.total - disk.used) + ' GB' : '', p: disk ? disk.used / disk.total : 0, warn: disk && disk.used / disk.total > .9 },
    { label: 'RAM', val: fmt(ram.used), unit: ' GB', detail: ('DE ' + ram.total + ' GB' + (ram.type ? ' · ' + ram.type : '')).toUpperCase(), p: ram.used / ram.total, warn: ram.used / ram.total > .9 },
  ];
}

function facts(si) {
  if (!si) return [['···', 'Midiendo el equipo…', 'Un segundo']];
  const up = si.uptimeH >= 24 ? Math.floor(si.uptimeH / 24) + ' d ' + Math.round(si.uptimeH % 24) + ' h' : fmt(si.uptimeH) + ' h';
  return [
    ['SO', si.os, si.host + ' · ' + si.user],
    ['ON', 'Encendido hace ' + up, 'Desde el último reinicio'],
    ['CPU', si.cpu.name, (si.cpu.cores ? si.cpu.cores + ' núcleos · ' : '') + si.cpu.threads + ' hilos' + (si.cpu.ghz ? ' · ' + fmt(si.cpu.ghz) + ' GHz' : '')],
    ['GPU', si.gpu.name.replace('NVIDIA ', ''), [si.gpu.memTotal ? fmt(si.gpu.memTotal / 1024, 0) + ' GB VRAM' : '', si.gpu.driver ? 'driver ' + si.gpu.driver : ''].filter(Boolean).join(' · ')],
    ['RAM', si.ram.total + ' GB' + (si.ram.type ? ' ' + si.ram.type : ''), si.ram.speed ? si.ram.speed + ' MT/s' : 'Memoria del sistema'],
    ['RED', si.net.ip || 'Sin conexión', [si.net.name, si.net.link].filter(Boolean).join(' · ')],
    ...(si.battery ? [['BAT', si.battery.pct + ' %' + (si.battery.charging ? ' · cargando' : ''), 'Batería']] : []),
  ];
}

export function systemView(app, c) {
  const { S } = c, si = S.sysInfo;
  const per = si ? si.cpu.perThread : [];
  return {
    gauges: gauges(si).map((g, i) => {
      const a = ANGLES[i] * Math.PI / 180;
      return { ...g, left: (660 + Math.cos(a) * 300 - 85) + 'px', top: (520 + Math.sin(a) * 262 - 85) + 'px', dash: (414.7 * g.p).toFixed(1) + ' 999', color: g.warn ? '#FB7185' : i === 2 ? '#F5B971' : 'rgb(var(--acc2))', delay: (200 + i * 60) + 'ms' };
    }),
    coreBars: per.map((u, i) => ({ h: Math.max(3, u) + '%', color: u > 90 ? '#FB7185' : u > 60 ? '#F5B971' : 'rgb(var(--acc2))', tip: 'Hilo ' + (i + 1) + ': ' + u + ' %' })),
    coreTitle: si ? 'CPU · ' + per.length + ' HILOS' : 'CPU', coreNote: si ? 'EL MÁS CARGADO ' + Math.max(0, ...per) + ' %' : '',
    procs: (si ? si.procs : []).slice(0, 6).map((p, i) => ({ name: p.name + (p.count > 1 ? ' · ' + p.count : ''), cpu: p.cpu + ' %', ram: p.ramMB >= 1024 ? fmt(p.ramMB / 1024) + ' GB' : Math.round(p.ramMB) + ' MB', pct: Math.min(100, Math.max(2, p.cpu * 2)) + '%', delay: (160 + i * 40) + 'ms' })),
    agenda: facts(si).map((a, i) => ({ time: a[0], title: a[1], sub: a[2], op: 1, dot: 'rgb(var(--acc2))', timeColor: 'rgb(var(--acc2) / .8)', delay: (160 + i * 40) + 'ms' })),
    sysHeader: si ? ('SISTEMA · ' + si.host + ' · ' + si.os).toUpperCase() : 'SISTEMA', sysLoading: !!S.sysLoading, refreshSystem: () => app.loadSystem(),
    sysTaken: si ? 'MEDIDO A LAS ' + hm() : '', dateShort: c.d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' }).toUpperCase(),
  };
}
