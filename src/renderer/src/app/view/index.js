// Turns the app state into the flat object `v` the views read. Each panel builds its own part.
import { LIVE_STATES } from '../constants';
import { chatView } from './chat';
import { desktopView } from './desktop';
import { memoryView } from './memory';
import { musicView, nowPlaying } from './music';
import { newsView } from './news';
import { onboardingView } from './onboarding';
import { routinesView } from './routines';
import { settingsView } from './settings';
import { shellView } from './shell';
import { systemView } from './system';
import { voiceView } from './voice';

export function buildView(app) {
  const S = app.state;
  // shared by several panels
  const c = {
    S, P: S.panel, L: app.layout(), core: S.core, live: LIVE_STATES.includes(S.core), d: new Date(S.now),
    kp: app.keyProv(), musicCard: nowPlaying(app),
  };
  return {
    ...shellView(app, c), ...desktopView(app, c), ...musicView(app, c), ...chatView(app, c), ...voiceView(app, c),
    ...routinesView(app, c), ...systemView(app, c), ...memoryView(app, c), ...newsView(app, c), ...settingsView(app, c), ...onboardingView(app, c),
  };
}
