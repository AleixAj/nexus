// What every screen shares: the stage, the status pill, captions under the core,
// notifications, the dock, the mini overlay and the approval / key cards.
import { CORE_LABELS, DOCK, ICON, THEMES } from '../constants';
import { WALLPAPER } from '../util';

export function shellView(app, c) {
  const { S, P, L, core, live } = c;
  const th = THEMES[S.theme] || THEMES.nexus;
  const wide = ['voice', 'routines', 'memory', 'news', 'settings'].includes(P);
  const wk = S.wordsKind;
  const stateColor = core === 'error' ? '#FB7185' : core === 'thinking' || core === 'action' ? '#F5B971' : core === 'speaking' ? '#FFE4C4' : core === 'music' ? '#FDBA74' : 'rgb(var(--acc2) / .75)';
  const pillText = S.dictating ? 'DICTANDO · HABLA Y SE ESCRIBE DONDE ESTÉ EL CURSOR' : core === 'error' ? 'SIN CONEXIÓN · TOCA PARA REINTENTAR' : live ? 'EN VIVO · TOCA PARA PARAR' : core === 'music' ? 'MÚSICA · TOCA PARA PAUSAR' : WALLPAPER ? 'EN ESPERA · ' + app.hotkeyLabel() + ' PARA HABLAR' : 'EN ESPERA · TOCA EL NÚCLEO PARA HABLAR';
  const talkOrStop = () => core === 'listening' ? app.talk() : live ? app.stopAll() : app.talk();
  const on = id => P === id && !S.overlay;

  return {
    k: S.k, qualityAttr: S.quality, reducedAttr: S.reduced ? '1' : '0', acc: th.acc, acc2: th.acc2,
    bgFilter: S.overlay ? 'blur(12px) brightness(.3)' : P === 'music' ? 'brightness(.85)' : P === 'system' ? 'blur(3px) brightness(.78)' : P ? 'blur(6px) brightness(.7)' : 'none',
    overlay: S.overlay,
    showUI: S.uiIn && !S.overlay && !S.onb,
    showHud: !P, showFrame: (S.uiIn && !S.overlay) || S.onb, showNotifs: !P,
    isChat: on('chat'), isVoice: on('voice'), isRoutines: on('routines'), isSystem: on('system'), isMusic: on('music'), isMemory: on('memory'), isSettings: on('settings'),
    closePanel: () => app.openPanel(null),

    // status pill
    pillPointer: WALLPAPER ? 'none' : 'auto', dismissDisplay: WALLPAPER ? 'none' : 'grid',
    pillLeft: L.x + 'px', pillText, pillDot: core === 'error' || live ? '#FB7185' : core === 'music' ? '#FDBA74' : '#34D399',
    pillAnim: live || core === 'error' ? 'nx-pulse 1.4s ease-in-out infinite' : 'none',
    onPill: () => core === 'error' ? app.retry() : core === 'music' && !live ? app.musicCtl('pause') : talkOrStop(),

    // under the core
    capLeft: L.x + 'px', capTop: (P === 'system' ? 905 : L.y + 150 * L.s * 2.3 + 12) + 'px', capWidth: (wide ? 640 : P === 'chat' ? 760 : 1000) + 'px',
    stateLabel: S.dictating ? (core === 'thinking' ? 'ESCRIBIENDO' : 'DICTANDO') : CORE_LABELS[core] || '', stateColor, showWave: core === 'listening',
    words: S.subtitles ? S.words : [], wordsColor: wk === 'nexus' ? '#FFE9D2' : 'rgba(255,246,233,.95)', wordsOpacity: wk === 'userDim' ? .45 : 1, wordsSize: wide ? '22px' : '30px',
    hasAction: !!S.actionLabel, actionLabel: S.actionLabel, hasError: core === 'error', errorTitle: S.errorTitle || 'No puedo conectar con el modelo', errorDetail: S.errorDetail || '',
    // invisible button over the core (only where the core is on screen and clickable)
    coreHit: !WALLPAPER && S.uiIn && !S.overlay && !S.onb && (!P || P === 'chat') ? { x: L.x, y: L.y, r: 190 * L.s } : null,
    onCore: talkOrStop, onMic: talkOrStop,

    // notifications: above the music card when it is visible
    notifs: S.notifs.map(n => ({ ...n, dismiss: () => app.setState(s => ({ notifs: s.notifs.filter(x => x.id !== n.id) })) })),
    notifPos: { top: 'auto', bottom: (WALLPAPER ? 150 : 128) + (c.musicCard ? 104 : 0) + 'px' },

    // dock
    showDock: !WALLPAPER && S.uiIn && !S.onb && !S.overlay,
    dock: DOCK.map(([id, label]) => {
      const act = P === id || (id === 'volume' && S.volOpen);
      return {
        sep: id === 'volume', domId: 'dock-' + id, d: ICON[id], bg: act ? 'rgb(var(--acc) / .22)' : 'transparent', color: act ? '#FFF6E9' : 'rgba(214,204,236,.72)', dot: act || (id === 'music' && S.music) ? 1 : 0,
        click: () => id === 'volume' ? app.setState(s => ({ volOpen: !s.volOpen, hoverDock: null })) : app.openPanel(id),
        enter: () => app.setState({ hoverDock: label }), leave: () => app.setState({ hoverDock: null }),
      };
    }),
    hasHover: !!S.hoverDock && !S.volOpen, hoverLabel: S.hoverDock, volOpen: S.volOpen,

    // approval card (the agent wants to change something)
    confirm: S.confirm, confirmYes: () => app.answerConfirm(true), confirmNo: () => app.answerConfirm(false), confirmAlways: () => app.answerConfirm('always'),

    // key card (a premium voice needs its key)
    keyAsk: S.keyAsk, keyAskInput: S.keyAskInput || '',
    keyAskChange: e => app.setState({ keyAskInput: e.target.value }),
    keyAskKey: e => { if (e.key === 'Enter') { e.preventDefault(); app.keyAskSave(); } },
    keyAskSave: () => app.keyAskSave(), keyAskCancel: () => app.setState({ keyAsk: null }),
    keyAskOpen: () => window.open(S.keyAsk && S.keyAsk.engine === 'Azure' ? 'https://portal.azure.com/#create/Microsoft.CognitiveServicesSpeechServices' : 'https://aistudio.google.com/apikey'),
    keyAskRegion: e => app.setState(s => ({ keyAsk: { ...s.keyAsk, region: e.target.value } })),

    // mini overlay (Alt + N style quick question)
    ovRef: app.ovRef, ovInput: S.ovInput, ovState: S.ovState, ovLabel: S.ovLabel, ovReply: S.ovReply,
    onOvInput: e => app.setState({ ovInput: e.target.value, ovState: e.target.value ? 'listening' : 'idle' }),
    onOvKey: e => {
      if (e.key === 'Enter' && e.altKey) { e.preventDefault(); app.talk(); }
      else if (e.key === 'Enter') { e.preventDefault(); app.ovAsk(); }
      else if (e.key === 'Tab') { e.preventDefault(); app.setState({ overlay: false }); app.openPanel('chat', true); }
    },
  };
}
