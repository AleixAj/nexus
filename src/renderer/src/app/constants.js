// Fixed data of the interface: themes, voices, personalities, icons, sliders and texts.

export const THEMES = {
  nexus: { name: 'Nexus', acc: '139 92 246', acc2: '196 181 253', c1: '#8B5CF6', c2: '#C4B5FD' },
  arc: { name: 'Arc', acc: '34 211 238', acc2: '165 243 252', c1: '#22D3EE', c2: '#A5F3FC' },
  mark3: { name: 'Mark III', acc: '239 68 68', acc2: '253 208 150', c1: '#EF4444', c2: '#FCD34D' },
  emerald: { name: 'Esmeralda', acc: '16 185 129', acc2: '167 243 208', c1: '#10B981', c2: '#A7F3D0' },
  solar: { name: 'Solar', acc: '249 115 22', acc2: '254 215 170', c1: '#F97316', c2: '#FED7AA' },
};

// fx: the AI processing preset applied on top of the neural voice (services/voice.ts)
// premium 'azure': Azure Speech, free 500K characters a month · 'gemini': the most human, a few samples a day
// Spanish (Spain) voices first, then the neutral-accent ones
export const VOICES = [
  { id: 'lyra', name: 'Lyra', desc: 'Femenina · española · natural', fx: 'clean', female: true },
  { id: 'orion', name: 'Orión', desc: 'Masculina · española · estilo Jarvis', fx: 'jarvis' },
  { id: 'nova', name: 'Nova', desc: 'Femenina · española · serena', fx: 'soft', female: true },
  { id: 'ximenahd', name: 'Ximena HD ◆', desc: 'Femenina · premium · española muy natural', fx: 'clean', premium: 'azure', female: true },
  { id: 'tristan', name: 'Tristán HD ◆', desc: 'Masculina · premium · español muy natural', fx: 'clean', premium: 'azure' },
  { id: 'isidora', name: 'Isidora ◆', desc: 'Femenina · premium · española y expresiva', fx: 'clean', premium: 'azure', female: true },
  { id: 'dario', name: 'Darío ◆', desc: 'Masculina · premium · español y cercano', fx: 'clean', premium: 'azure' },
  { id: 'zenit', name: 'Zenit ✦', desc: 'Masculina · premium · española y profunda', fx: 'clean', premium: 'gemini' },
  { id: 'aura', name: 'Aura ✦', desc: 'Femenina · premium · española y cálida', fx: 'clean', premium: 'gemini', female: true },
  { id: 'draco', name: 'Draco ✦', desc: 'Masculina · premium · española y serena', fx: 'clean', premium: 'gemini' },
  { id: 'selene', name: 'Selene ✦', desc: 'Femenina · premium · española y suave', fx: 'clean', premium: 'gemini', female: true },
  { id: 'kairo', name: 'Kairo', desc: 'Masculina · cercana · acento neutro', fx: 'clean' },
  { id: 'vega', name: 'Vega', desc: 'Femenina · alegre · acento neutro', fx: 'clean', female: true },
  { id: 'atlas', name: 'Atlas', desc: 'Masculina · joven · acento neutro', fx: 'clean' },
];
export const voiceById = id => VOICES.find(v => v.id === id) || VOICES[0];
export const voiceName = v => v.name.replace(/ [✦◆]$/, '');

export const PERSONAS = [
  { id: 'butler', name: 'Mayordomo británico', line: '«Por supuesto, señor. Ya está hecho.»' },
  { id: 'direct', name: 'Copiloto directo', line: '«Hecho. Siguiente.»' },
  { id: 'sarcastic', name: 'Sarcástico', line: '«Claro. Abrir Spotify tú solo era demasiado.»' },
];

export const SLIDERS = {
  speed: { min: .5, max: 2, step: .05, label: 'Velocidad', fmt: v => v.toFixed(2).replace('.', ',') + '×' },
  pitch: { min: -12, max: 12, step: 1, label: 'Tono', fmt: v => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v) + ' st' },
  warmth: { min: 0, max: 100, step: 1, label: 'Calidez', fmt: v => v + ' %' },
  formal: { min: 0, max: 100, step: 1, label: 'Formalidad', fmt: v => v + ' %' },
  volume: { min: 0, max: 100, step: 1, label: 'Volumen', fmt: v => v + ' %' },
  fx: { min: 0, max: 100, step: 1, label: 'Efecto IA', fmt: v => v + ' %' },
};

export const ICON = {
  chat: 'M4 5h16v11H9l-5 4z',
  voice: 'M4 10v4M8 7v10M12 4v16M16 7v10M20 10v4',
  routines: 'M6 4a2 2 0 1 0 0 4a2 2 0 1 0 0-4M18 16a2 2 0 1 0 0 4a2 2 0 1 0 0-4M8 6h5a3 3 0 0 1 0 6h-2a3 3 0 0 0 0 6h5',
  system: 'M7 6h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zM10 10h4v4h-4zM9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4',
  music: 'M9 18V5l11-2v13M9 18a3 3 0 1 1-6 0a3 3 0 1 1 6 0M20 16a3 3 0 1 1-6 0a3 3 0 1 1 6 0',
  news: 'M5 5h12v14H6a1 1 0 0 1-1-1zM17 9h2v9a1 1 0 0 1-2 0M8 9h6M8 12h6M8 15h4',
  memory: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M12 7v5l3 2',
  settings: 'M4 7h10M18 7h2M4 17h4M12 17h8M16 5a2 2 0 1 0 0 4a2 2 0 1 0 0-4M10 15a2 2 0 1 0 0 4a2 2 0 1 0 0-4',
  volume: 'M4 9h4l5-4v14l-5-4H4zM16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11',
  trigger: 'M12 3l9 9-9 9-9-9z',
  app: 'M4 5h16v14H4zM4 9h16',
  audio: 'M9 18V5l11-2v13M9 18a3 3 0 1 1-6 0a3 3 0 1 1 6 0',
  bell: 'M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4M4 4l16 16',
  speak: 'M4 5h16v11H9l-5 4zM8 10h8',
  light: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5V16h8v-2.5A6 6 0 0 0 12 3z',
  power: 'M12 3v9M6.3 6.3a8 8 0 1 0 11.4 0',
  save: 'M5 4h11l3 3v13H5zM8 4v5h8V4M8 20v-6h8v6',
};

export const DOCK = [['chat', 'CHAT'], ['voice', 'VOZ Y PERSONALIDAD'], ['routines', 'RUTINAS'], ['system', 'SISTEMA'], ['music', 'MÚSICA'], ['news', 'NOTICIAS'], ['memory', 'MEMORIA'], ['settings', 'AJUSTES'], ['volume', 'VOLUMEN']];

export const CORE_LABELS = { idle: 'EN REPOSO', wake: 'ACTIVANDO', listening: 'ESCUCHANDO', thinking: 'PENSANDO', speaking: 'HABLANDO', action: 'EJECUTANDO ACCIÓN', error: 'SIN CONEXIÓN', music: 'MODO MÚSICA' };
export const LIVE_STATES = ['wake', 'listening', 'thinking', 'speaking', 'action'];

// where the core sits (in the 1920×1080 stage) for each screen
export const CORE_LAYOUT = {
  overlay: { x: 960, y: 540, s: .5, v: 0 },
  onboarding: { x: 960, y: 230, s: .5, v: 1 },
  chat: { x: 652, y: 480, s: .8, v: 1 },
  voice: { x: 410, y: 440, s: .62, v: 1 }, routines: { x: 410, y: 440, s: .62, v: 1 }, memory: { x: 410, y: 440, s: .62, v: 1 }, news: { x: 410, y: 440, s: .62, v: 1 }, settings: { x: 410, y: 440, s: .62, v: 1 },
  system: { x: 960, y: 520, s: .46, v: 1 },
  music: { x: 960, y: 470, s: .92, v: 1 },
  home: { x: 960, y: 480, s: 1, v: 1 },
};

export const MEMORY_CATEGORIES = ['Preferencias', 'Personas', 'Lugares', 'Trabajo', 'Otros'];

export const CHAT_COMMANDS = [
  { cmd: '/rutina', desc: 'Ejecutar una rutina guardada' }, { cmd: '/abrir', desc: 'Abrir una aplicación' }, { cmd: '/recordar', desc: 'Guardar algo en memoria' },
  { cmd: '/sistema', desc: 'Estado del equipo' }, { cmd: '/musica', desc: 'Controlar la reproducción' }, { cmd: '/voz', desc: 'Cambiar de voz o personalidad' },
];

export const PROVIDER_INFO = {
  Auto: { name: 'Automático · recomendado', url: 'https://console.groq.com/keys', note: 'Reparte las preguntas entre todas las IA gratis con clave y cambia sola si una llega a su límite. Las órdenes sencillas (música, volumen, abrir apps, alarmas) no gastan cupo.', help: 'Con Groq basta para el día a día. Para tener reserva: activa «Respaldo» con Gemini y añade OpenRouter (los dos gratis y sin tarjeta).' },
  Groq: { name: 'Groq · recomendado', url: 'https://console.groq.com/keys', note: 'Gratis y muy rápida: tres modelos con 200.000 tokens al día cada uno. También entiende tu voz.', help: 'Gratis y sin tarjeta en console.groq.com → API Keys. También se usa para entender tu voz.' },
  Mistral: { name: 'Mistral', url: 'https://console.mistral.ai/api-keys', note: 'Mucho margen, pero solo con una clave de pago o antigua.', help: 'El plan gratuito de Mistral ya no permite crear claves de API; solo sirve si ya tienes una o pagas.' },
  Gemini: { name: 'Gemini', url: 'https://aistudio.google.com/apikey', note: 'Google Gemini Flash-Lite: 500 preguntas al día. Gasta el cupo de Gemini, el mismo que las voces premium.', help: 'Gratis y sin tarjeta en aistudio.google.com → Get API key. En el plan gratuito Google puede usar las conversaciones para mejorar sus productos.' },
  OpenRouter: { name: 'OpenRouter', url: 'https://openrouter.ai/keys', note: 'Último recurso: 50 preguntas al día con el modelo gratis que esté libre.', help: 'Gratis y sin tarjeta en openrouter.ai → Keys.' },
  Cerebras: { name: 'Cerebras', url: 'https://cloud.cerebras.ai', note: '1 millón de tokens al día con las claves antiguas gratuitas.', help: 'Las cuentas nuevas de Cerebras ya piden tarjeta; si ya tienes una clave gratuita, sigue sirviendo.' },
  Ollama: { name: 'Local · sin clave', url: 'https://ollama.com/download', note: 'Funciona en tu PC sin clave ni internet. Hay que instalar Ollama y descargar un modelo (unos 5 GB).', help: 'Instala Ollama y ejecuta «ollama pull qwen2.5:7b». Para entender tu voz hace falta la clave de Gemini o Groq.' },
};
// the keys offered in Auto mode, most useful first
export const KEY_ORDER = ['Groq', 'Gemini', 'OpenRouter', 'Mistral', 'Cerebras'];
export const providerInfo = p => PROVIDER_INFO[p] || { name: p, url: '', note: '', help: '' };

// Gemini switches: the key alone turns nothing on (its free quota is small)
export const GEMINI_SETTING = { tts: 'geminiTts', search: 'geminiSearch', stt: 'geminiStt', vision: 'geminiVision', memory: 'geminiMemory', fallback: 'geminiFallback' };
