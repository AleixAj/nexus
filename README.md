# NEXUS

Asistente virtual de escritorio para Windows, al estilo J.A.R.V.I.S.: un núcleo de energía animado
que vive en una galaxia, te escucha, te contesta con voz y hace cosas en tu PC.

- **Voz y texto.** Háblale con el micro (o un atajo global) o escríbele en el chat.
- **Voces de IA.** Seis voces neuronales (tres femeninas y tres masculinas) con un procesado de audio que
  les da timbre de IA de película, al estilo J.A.R.V.I.S. La intensidad se regula con *Efecto IA*. Por defecto, Lyra.
- **Arranque cinematográfico.** Intro con comprobación real de sistemas y sonido lo-fi sintetizado; se salta con un clic.
- **Configuración inicial.** La primera vez te pregunta cómo llamarte, si te habla de usted o de tú, la voz,
  la personalidad, el color, la calidad gráfica, la clave de la IA, el micrófono y cómo quieres tenerla.
- **Acciones reales.** Abre aplicaciones y webs, controla la música y el volumen y consulta el estado del equipo.
- **Halo reactivo.** El núcleo y su halo se mueven con el sonido real: tu voz mientras escucha y la suya mientras habla.
- **Personalidad.** Mayordomo británico, copiloto directo o sarcástico, con calidez y formalidad ajustables.
- **Datos reales en el escritorio.** Hora, tiempo de tu ciudad y efeméride del día.
- **Temas y calidad gráfica.** Cinco temas de color y tres niveles de calidad para PCs potentes o portátiles.
- **Fondo de escritorio.** NEXUS puede ponerse detrás de los iconos del escritorio y quedarse ahí en segundo plano.

## Requisitos

- Windows 10 u 11.
- [Node.js](https://nodejs.org) 20 o superior.
- Una clave gratuita de [Groq](https://console.groq.com/keys) para la IA y para entender la voz.
  Si prefieres una IA local, puedes usar [Ollama](https://ollama.com), pero la voz sigue necesitando Groq.

## Arrancar

```bash
npm install
npm run dev
```

La primera vez aparece la **configuración inicial**; ahí mismo puedes pegar tu clave de Groq (o hacerlo luego en
**Ajustes**). La clave se guarda cifrada con el sistema de Windows y solo se envía a Groq.

Para generar la versión compilada:

```bash
npm run build
npm run preview
```

## Uso

| Acción | Cómo |
| --- | --- |
| Hablarle | Botón del micro, **Ctrl + Alt + Espacio** desde cualquier app o **Alt + N** con la ventana activa |
| Terminar de hablar | Se para solo al callarte, o vuelve a tocar el micro |
| Interrumpirle | **Esc** o la píldora de arriba |
| Escribirle | Icono de chat en el dock |
| Cambiar voz y personalidad | Icono de ondas en el dock |
| Poner o quitar el fondo de escritorio | Ajustes → *Fondo de escritorio*, o el icono de NEXUS en la bandeja |
| Panel de demostración del diseño | **Ctrl + Shift + D** |

Ejemplos: *«abre Spotify»*, *«pon la siguiente canción»*, *«sube el volumen»*,
*«busca recetas de lentejas en YouTube»*, *«¿cómo va el equipo?»*.

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
| Lyra | Femenina | Cálida y cercana |
| Orión | Masculina | Grave, estilo Jarvis |
| Vega | Femenina | Precisa, holográfica |
| Atlas | Masculina | Profunda, de nave |
| Nova | Femenina | Sintética, acento internacional |
| Kairo | Masculina | Sintética, acento internacional |

Las voces son de Microsoft Edge (gratis, sin clave). El toque "IA" lo pone NEXUS en tu PC: filtro de
presencia, un peine metálico muy corto, un doblado de la voz, una sala sintética y compresión de radio.

## Cómo está hecho

```
src/
  main/                 proceso de Electron (Node)
    index.ts            ventana, atajo global, IPC y seguridad
    brain.ts            IA: chat en streaming con herramientas y transcripción (Whisper)
    tools.ts            acciones en el PC: apps, webs, teclas multimedia y estado del sistema
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
**Servicios externos, todos gratuitos:** Groq (IA y voz a texto), Microsoft Edge TTS (voz),
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
