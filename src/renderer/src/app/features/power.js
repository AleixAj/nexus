// How much NEXUS draws, so it can stay on all day: full speed only while something happens,
// 30 fps on screen in calm, 15 fps when another window has the focus, and nothing at all when
// hidden, covered or (as a wallpaper) while you work in another app.
import * as voice from '../../services/voice';
import { LIVE_STATES } from '../constants';
import { WALLPAPER, api } from '../util';

export const power = {
  // mouse or keyboard on the window: back to the normal frame rate at once
  noteActivity() {
    const wasResting = Date.now() - (this.lastActivity || 0) > 45000;
    this.lastActivity = Date.now();
    clearTimeout(this.restT);
    this.restT = setTimeout(() => this.updatePower(), 45500);
    if (wasResting) this.updatePower();
  },
  // Typing as a wallpaper: the window never gets the keyboard, so a click on a text field asks
  // the main process for a real text box on top of it; what is typed there comes back here.
  watchWallTyping() {
    if (!WALLPAPER || !api) return;
    document.addEventListener('mousedown', e => {
      const el = e.target.closest && e.target.closest('input, textarea');
      if (!el || ['range', 'checkbox', 'radio'].includes(el.type) || el.disabled) return;
      el.dataset.nxEdit ||= Math.random().toString(36).slice(2);
      const r = el.getBoundingClientRect(), k = this.state.k || 1;
      const accent = getComputedStyle(el).getPropertyValue('--acc2').trim() || '196 181 253';
      api.wallEdit({
        id: el.dataset.nxEdit, x: r.left, y: r.top, w: r.width, h: r.height, value: el.value, placeholder: el.placeholder || '',
        secret: el.type === 'password', multiline: el.tagName === 'TEXTAREA', fontSize: (parseFloat(getComputedStyle(el).fontSize) || 15) * k, accent,
      });
    }, true);
  },
  onDeskEdit({ id, value, submit }) {
    const el = document.querySelector(`[data-nx-edit="${id}"]`);
    if (!el) return;
    // React keeps its own copy of the value: set it the way a keystroke would
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    if (submit) setTimeout(() => el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true, cancelable: true })), 30);
  },
  // what is in front of the wallpaper: 'desktop', 'app' or 'covered' (sent by the main process)
  onScreenState(state) { this.screenState = state; this.updatePower(); },
  updatePower() {
    const E = this.E(); if (!E) return;
    const S = this.state, live = LIVE_STATES.includes(S.core) || !!S.intro || S.onb || !!this.booting;
    const motion = S.bgMotion || 'desktop', front = this.screenState || 'desktop';
    const paused = document.hidden || front === 'covered'
      || (!live && WALLPAPER && motion !== 'always' && front === 'app')
      || (!live && WALLPAPER && motion === 'never');
    E.setPaused(paused);
    const resting = Date.now() - (this.lastActivity || Date.now()) > 45000;
    E.setPower(live ? 'full' : WALLPAPER ? 'idle' : document.hasFocus() && !resting ? 'idle' : 'calm');
    // the halo listens to the PC's music only while it can be seen
    if (S.music && !paused) voice.startLoopback(); else voice.stopLoopback();
  },
};
