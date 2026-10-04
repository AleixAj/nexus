// Voice and personality panel.
import { PERSONAS, SLIDERS, VOICES } from '../constants';
import { card, seg } from '../util';

/** Advice on the wake phrase: very short ones wake it up by mistake. */
export function wakeHint(w) {
  const letters = (w || '').replace(/[^a-záéíóúüñ]/gi, '').length;
  if (letters < 6) return 'Muy corta: puede despertarse sola. Mejor dos palabras, como «Oye Jarvis».';
  if (letters > 22) return 'Larga: cuesta decirla. Con dos palabras basta.';
  return 'Se activa en Ajustes → Escuchar siempre. Funciona en tu PC, sin internet.';
}

/** How a premium voice describes itself depending on its key and quota. */
function voiceDesc(v, S) {
  if (!v.premium) return v.desc;
  const azure = v.premium === 'azure';
  const noKey = azure ? !S.hasAzure : !(S.providers.Gemini || {}).hasKey;
  if (noKey) return v.desc.replace('premium', azure ? 'Azure · con clave gratis' : 'premium · con clave gratis');
  if (azure) return S.azurePaused ? 'Cupo del mes agotado · suena con voz normal' : v.desc.replace('premium', 'Azure');
  if (!(S.gemini || {}).tts) return v.desc.replace('premium', 'premium · usa cupo Gemini');
  return S.premiumPaused ? 'Cupo de hoy agotado · suena con voz normal hasta las 9:00' : v.desc;
}

export function sliderView(S, key) {
  const c = SLIDERS[key], v = S.sliders[key];
  return { key, label: c.label, val: c.fmt(v), pct: ((v - c.min) / (c.max - c.min) * 100).toFixed(1) + '%' };
}

export function voiceView(app, c) {
  const { S } = c;
  return {
    voiceCards: VOICES.map((v, i) => {
      const playing = S.preview === v.id;
      return {
        ...v, ...card(S.voiceSel === v.id), desc: voiceDesc(v, S), selected: S.voiceSel === v.id, delay: (140 + i * 40) + 'ms',
        state: playing ? (S.previewLoading ? 'thinking' : 'speaking') : 'idle',
        previewLabel: playing ? (S.previewLoading ? '··· CARGANDO' : '■ SONANDO…') : '▶ ESCUCHAR',
        select: () => app.selectVoice(v.id), selectSay: () => app.selectVoice(v.id),
        preview: e => { e.stopPropagation(); app.previewVoice(v.id); },
      };
    }),
    personaCards: PERSONAS.map((p, i) => ({
      ...p, ...card(S.persona === p.id), sel: S.persona === p.id, delay: (320 + i * 40) + 'ms',
      select: () => { app.setState({ persona: p.id }); app.save({ persona: p.id }); },
    })),
    voiceSliders: ['speed', 'pitch', 'fx', 'warmth', 'formal'].map((k, i) => ({ ...sliderView(S, k), delay: (200 + i * 40) + 'ms' })),
    volSlider: sliderView(S, 'volume'), onSlider: e => app.onSlider(e),
    langOpts: [['es-ES', 'Español (ES)'], ['es-MX', 'Español (MX)'], ['en', 'English']].map(([id, label]) => ({ label, ...seg(S.lang === id), pick: () => { app.setState({ lang: id }); app.save({ lang: id }); } })),
    wakeWord: S.wakeWord, onWake: e => app.setWakeWord(e.target.value),
    wakeHint: wakeHint(S.wakeWord),
    userName: S.userName, onName: e => app.setName(e.target.value),
    testVoice: () => app.testVoice(),
  };
}
