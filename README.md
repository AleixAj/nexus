# NEXUS

Asistente virtual de escritorio para Windows, al estilo J.A.R.V.I.S.: un núcleo de energía animado
que vive en una galaxia, te escucha, te contesta con voz y hace cosas en tu PC.

- **Voz y texto.** Háblale con el micro (o un atajo global) o escríbele en el chat.
- **Voz neuronal.** Cuatro voces (dos femeninas y dos masculinas) en español de España, de México o
  inglés británico. Por defecto, Lyra.
- **Acciones reales.** Abre aplicaciones y webs, controla la música y el volumen y consulta el estado del equipo.
- **Halo reactivo.** El núcleo y su halo se mueven con el sonido real: tu voz mientras escucha y la suya mientras habla.
- **Personalidad.** Mayordomo británico, copiloto directo o sarcástico, con calidez y formalidad ajustables.
- **Datos reales en el escritorio.** Hora, tiempo de tu ciudad y efeméride del día.
- **Temas y calidad gráfica.** Cinco temas de color y tres niveles de calidad para PCs potentes o portátiles.

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

La primera vez, abre **Ajustes** (penúltimo icono del dock), pega tu clave de Groq y pulsa **Guardar**.
La clave se guarda cifrada con el sistema de Windows y nunca sale de tu PC, salvo hacia Groq.

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
| Panel de demostración del diseño | **Ctrl + Shift + D** |

Ejemplos: *«abre Spotify»*, *«pon la siguiente canción»*, *«sube el volumen»*,
*«busca recetas de lentejas en YouTube»*, *«¿cómo va el equipo?»*.

## Cómo está hecho

```
src/
  main/                 proceso de Electron (Node)
    index.ts            ventana, atajo global, IPC y seguridad
    brain.ts            IA: chat en streaming con herramientas y transcripción (Whisper)
    tools.ts            acciones en el PC: apps, webs, teclas multimedia y estado del sistema
    tts.ts              voz neuronal de Microsoft Edge (gratis, sin clave)
    world.ts            ubicación aproximada, tiempo (Open-Meteo) y efemérides (Wikipedia)
    settings.ts         ajustes en JSON y claves cifradas con safeStorage
  preload/index.ts      puente seguro entre la interfaz y el proceso principal
  renderer/src/
    NexusApp.jsx        estado de la app y del núcleo (reposo, escucha, piensa, habla…)
    services/voice.ts   micrófono con detección de silencio, cola de voz y audio para el halo
    engine/             motor gráfico en Canvas 2D: galaxia, núcleo, halo y partículas
    views/              pantallas generadas a partir del diseño
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
- Modo fondo de escritorio y mini overlay flotante sobre otras apps.
- Instalador (`electron-builder`).
