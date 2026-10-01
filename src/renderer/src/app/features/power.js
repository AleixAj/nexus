// How much NEXUS draws, so it can stay on all day: full speed only while something happens,
// 30 fps on screen in calm, 15 fps when another window has the focus, and nothing at all when
// hidden, covered or (as a wallpaper) while you work in another app.
import * as voice from '../../services/voice';
import { LIVE_STATES } from '../constants';
import { WALLPAPER } from '../util';

export const power = {
  // mouse or keyboard on the window: back to the normal frame rate at once
  noteActivity() {
    const wasResting = Date.now() - (this.lastActivity || 0) > 45000;
    this.lastActivity = Date.now();
    clearTimeout(this.restT);
    this.restT = setTimeout(() => this.updatePower(), 45500);
    if (wasResting) this.updatePower();
  },
  // what is in front of the wallpaper: 'desktop', 'app' or 'covered' (sent by the main process)
  onScreenState(state) { this.screenState = state; this.updatePower(); },
  updatePower() {
    const E = this.E(); if (!E) return;
    const S = this.state, live = LIVE_STATES.includes(S.core) || !!S.intro || S.onb;
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
