# NEXUS

Asistente virtual de escritorio para Windows, al estilo J.A.R.V.I.S.: un núcleo de energía animado
que vive en una galaxia, te escucha, te contesta con voz y hace cosas en tu PC.

- **Voz y texto.** Háblale con el micro (o un atajo global) o escríbele en el chat.
- **Voces.** Diez voces (cinco femeninas y cinco masculinas): naturales tipo asistente moderno, españolas
  y dos premium con Gemini. Un *Efecto IA* opcional les da un toque de J.A.R.V.I.S.
- **Arranque cinematográfico.** Intro con comprobación real de sistemas y sonido lo-fi sintetizado; se salta con un clic.
- **Configuración inicial.** La primera vez te pregunta cómo llamarte, si te habla de usted o de tú, la voz,
  la personalidad, el color, la calidad gráfica, la clave de la IA, el micrófono y cómo quieres tenerla.
- **Agente.** Responde cualquier pregunta buscando en internet si hace falta, analiza y busca archivos y
  carpetas, mira estadísticas del equipo y procesos, crea o modifica archivos y ejecuta comandos de PowerShell.
  Todo lo que cambia el equipo pide permiso antes, y lo que borra va a la papelera.
- **Acciones rápidas.** Abre aplicaciones y webs y controla la música y el volumen.
- **Halo reactivo.** El núcleo y su halo se mueven con el sonido real: tu voz mientras escucha y la suya mientras habla.
- **Personalidad.** Mayordomo británico, copiloto directo o sarcástico, con calidez y formalidad ajustables.
- **Datos reales en el escritorio.** Hora, tiempo de tu ciudad y efeméride del día.
- **Temas y calidad gráfica.** Cinco temas de color y tres niveles de calidad para PCs potentes o portátiles.
- **Fondo de escritorio.** NEXUS puede ponerse detrás de los iconos del escritorio y quedarse ahí en segundo plano.

## Requisitos

- Windows 10 u 11.
- [Node.js](https://nodejs.org) 20 o superior.
- Una IA, a elegir en la configuración inicial (todas gratis y sin tarjeta):

| Opción | Clave | Notas |
| --- | --- | --- |
| **Automático** (recomendada) | Las de Cerebras y/o Groq | Reparte las preguntas entre todas las IA con clave y cambia sola si una llega a su límite. Con las dos: unos 1,4 millones de tokens al día. |
| **Cerebras** | Gratis en [cloud.cerebras.ai](https://cloud.cerebras.ai) | 1 millón de tokens al día con `gpt-oss-120b`. |
| **Groq** | Gratis en [console.groq.com](https://console.groq.com/keys) | 200.000 tokens al día por modelo; también entiende la voz. |
| **Gemini Flash-Lite** | Gratis en [Google AI Studio](https://aistudio.google.com/apikey) | 500 preguntas al día. En el plan gratuito Google puede usar las conversaciones para mejorar sus productos. |
| **Local con [Ollama](https://ollama.com)** | Sin clave | Sin límites; en Automático se usa como último recurso si está instalado. |

Cada pregunta envía solo unos 1.800 tokens y la parte fija es siempre igual, así que Groq la reutiliza de su caché
sin contarla en el límite.

Sin ninguna clave, las búsquedas en internet siguen funcionando (DuckDuckGo).

**Gemini solo gasta su cupo en lo que actives.** Poner la clave no enciende nada por sí sola: en
**Ajustes → Gemini** eliges si la usa para las voces premium, para buscar con Google, para entender tu voz o
como respaldo cuando otra IA agote su cupo. Elegir una voz premium activa solo las voces.

## Arrancar

```bash
npm install
npm run dev
```

La primera vez aparece la **configuración inicial**; ahí mismo puedes pegar tu clave de Groq (o hacerlo luego en
**Ajustes**). La clave se guarda cifrada con el sistema de Windows y solo se envía a Groq.

Para generar el programa de Windows (`dist/win-unpacked/NEXUS.exe`):

```bash
npm run dist
```

## Uso

| Acción | Cómo |
| --- | --- |
| Hablarle | Tocar el núcleo, **Ctrl + Alt + Espacio** desde cualquier app o **Alt + N** con la ventana activa |
| Terminar de hablar | Se para solo al callarte, o vuelve a tocar el núcleo |
| Interrumpirle | **Esc** o la píldora de arriba |
| Escribirle | Icono de chat en el dock |
| Cambiar voz y personalidad | Icono de ondas en el dock |
| Poner o quitar el fondo de escritorio | Ajustes → *Fondo de escritorio*, o el icono de NEXUS en la bandeja |
| Panel de demostración del diseño | **Ctrl + Shift + D** |

Ejemplos: *«¿cómo quedó el Madrid ayer?»*, *«¿qué me ocupa más espacio en Descargas?»*,
*«busca mis facturas en PDF»*, *«resume el archivo notas.txt del escritorio»*, *«¿qué proceso consume más RAM?»*,
*«crea una carpeta Viaje en Documentos con una lista de equipaje»*, *«pon mis canciones que me gustan en Spotify»*,
*«busca Coldplay en Spotify»*, *«siguiente canción»*, *«sube el volumen»*. La música siempre usa la app de escritorio de Spotify.

Los permisos del agente (internet, ver archivos, modificarlos y ejecutar comandos) se activan o desactivan en **Ajustes → Agente**.
El micrófono se elige en la configuración inicial o en **Ajustes → Micrófono**.

## Fondo de escritorio y segundo plano

NEXUS vive en la **bandeja del sistema** (junto al reloj de Windows). Cerrar la ventana no la apaga: sigue
escuchando el atajo **Ctrl + Alt + Espacio**. Para cerrarla del todo, usa *Salir* en el menú de la bandeja.

En **modo fondo de escritorio** la animación sustituye a tu fondo de pantalla, detrás de los iconos:

- No se puede hacer clic en ella, así que desaparecen el dock y los botones. El reloj y el tiempo pasan a la derecha para no chocar con los iconos.
- Se le habla con **Ctrl + Alt + Espacio**. Para configurarla, *Abrir ventana* en la bandeja.
- Se pausa sola mientras una aplicación maximizada o a pantalla completa (un juego, por ejemplo) tapa el escritorio.
- Al salir se restaura tu fondo de pantalla normal.
- Con **Iniciar con Windows** activado, arranca en el último modo que usaste.

Funciona en el monitor principal y en cualquier proporción (también ultrapanorámicos). Por dentro usa la
misma técnica que Lively Wallpaper: la ventana se coloca dentro de la capa *WorkerW* del escritorio mediante
llamadas a Win32 hechas desde un pequeño script de PowerShell, sin módulos nativos que compilar.

Si la app se cierra de golpe (por ejemplo, desde el Administrador de tareas) mientras es el fondo, puede
quedarse la última imagen en el escritorio hasta que vuelvas a abrir NEXUS o cambies el fondo de Windows.

## Voces

| Voz | Tipo | Carácter |
| --- | --- | --- |
| Lyra | Femenina | Española, natural (Microsoft Ximena) |
| Vega | Femenina | Natural y alegre (Microsoft Emma, acento neutro) |
| Nova | Femenina | Española, serena (Microsoft Elvira) |
| Aura ✦ | Femenina | Premium: voz de Gemini, española y cálida |
| Orión | Masculina | Española, grave, estilo Jarvis |
| Kairo | Masculina | Natural y cercana (Microsoft Andrew, acento neutro) |
| Atlas | Masculina | Natural y joven (Microsoft Brian, acento neutro) |
| Ximena HD ◆ | Femenina | Azure: española, calidad HD |
| Tristán HD ◆ | Masculina | Azure: español, calidad HD |
| Isidora ◆ | Femenina | Azure: española y expresiva |
| Darío ◆ | Masculina | Azure: español y cercano |
| Zenit ✦ | Masculina | Premium: voz de Gemini, española y profunda |
| Selene ✦ | Femenina | Premium: voz de Gemini, española y suave |
| Draco ✦ | Masculina | Premium: voz de Gemini, española y serena |

Las voces de Microsoft son gratis y sin clave; en español de España solo hay tres (Ximena, Elvira y Álvaro). Las premium de Gemini hablan con acento de España. Las de Azure (◆) necesitan una clave gratuita de Azure Speech: 500.000 caracteres al mes (al crear la cuenta piden
tarjeta para verificar, pero el plan gratuito no cobra). Las premium de Gemini (✦) necesitan la clave de Gemini (sin ella no se pueden elegir); si se agota
su cupo gratuito, suenan con una voz de Microsoft. *Efecto IA* añade un toque de voz de película
(presencia, un leve timbre metálico y una sala muy corta); en las voces naturales es casi imperceptible.

## Cómo está hecho

```
src/
  main/                 proceso de Electron (Node)
    index.ts            ventana, atajo global, IPC y seguridad
    brain.ts            IA: chat en streaming con herramientas y transcripción (Whisper)
    agent.ts            herramientas del agente: búsqueda web, archivos, sistema y PowerShell
    tools.ts            acciones rápidas: apps, webs y teclas multimedia
    tts.ts              voz neuronal de Microsoft Edge (gratis, sin clave)
    world.ts            ubicación aproximada, tiempo (Open-Meteo) y efemérides (Wikipedia)
    wallpaper.ts        modo fondo de escritorio y detección de apps a pantalla completa
    settings.ts         ajustes en JSON y claves cifradas con safeStorage
  preload/index.ts      puente seguro entre la interfaz y el proceso principal
  renderer/src/
    NexusApp.jsx        estado de la app y del núcleo (reposo, escucha, piensa, habla…)
    services/voice.ts   micrófono con detección de silencio, cola de voz, efecto de IA y audio para el halo
    services/sfx.ts     sonidos de arranque sintetizados
    views/BootIntro.tsx intro de arranque
    views/Onboarding.tsx configuración inicial
    engine/             motor gráfico en Canvas 2D: galaxia, núcleo, halo y partículas
    views/              pantallas generadas a partir del diseño
resources/              iconos de la app y de la bandeja (scripts/make-icon.mjs)
design/                 diseño original de Claude Design (referencia)
scripts/                conversor del diseño a componentes React
```

**Tecnologías:** Electron, React, TypeScript, Vite (electron-vite) y Canvas 2D.
**Servicios externos, todos gratuitos:** Gemini o Groq (IA y voz a texto), DuckDuckGo (búsqueda sin clave), Microsoft Edge TTS (voz),
Open-Meteo (tiempo), Wikipedia (efemérides) e ipapi.co (ciudad aproximada).

### Rendimiento

- El motor gráfico se limita a unos 60-72 fps aunque el monitor sea de 120-144 Hz, y se pausa con la ventana minimizada.
- La galaxia se redibuja menos a menudo (se mueve muy despacio), sobre todo cuando está desenfocada detrás de un panel.
- El texto de la IA se pinta una vez por fotograma, no con cada palabra que llega.
- En calidad **Ahorro** se reducen las partículas, la resolución, los fps y los desenfoques de cristal.

### Seguridad

- La interfaz se ejecuta aislada del sistema (sandbox) y solo puede usar las funciones que expone el preload.
- La IA no puede ejecutar comandos: solo abre accesos directos del menú Inicio, una lista cerrada de
  herramientas de Windows y webs `http(s)`.
- Una sola instancia de la app y sin navegación fuera de la interfaz.

## Pendiente

- Palabra de activación «Hey Nexus» siempre escuchando.
- Música real (ahora el panel de música es una demostración), memoria y rutinas editables.
- Panel de sistema: CPU y RAM son reales; GPU, red y temperatura todavía son simuladas.
- Mini overlay flotante sobre otras apps y fondo de escritorio en varios monitores a la vez.
- Instalador (`electron-builder`).
