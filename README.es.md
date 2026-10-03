# NEXUS

> Documentación completa en español. Resumen técnico en inglés: [README.md](README.md).

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
  Todo lo que cambia el equipo pide permiso antes, y lo que borra va a la papelera. Si pides varias consultas a la
  vez (tiempo, noticias, sistema…) las hace en paralelo.
- **Investigación a fondo.** «Investiga a fondo qué portátil comprar»: busca desde varios ángulos, lee las mejores
  fuentes y te da un informe con citas numeradas y un apartado de qué no está claro.
- **Presentaciones.** «Hazme una presentación sobre el sistema solar»: crea un PowerPoint con diseño (con los colores
  de tu tema) en `Documentos\NEXUS\Presentaciones` y lo abre.
- **Juegos de Steam.** «Abre Elden Ring», «instala Hades», «actualiza Cyberpunk», «¿qué juegos tengo?». Lee tus
  bibliotecas de Steam (en cualquier disco) y usa la tienda para lo que no tienes.
- **Acciones rápidas.** Abre aplicaciones y webs y controla la música y el volumen.
- **Tu frase de activación, sin internet.** «Hey Nexus», «Oye Jarvis», «Hola Viernes»… la que escribas en Voz y
  personalidad. Con el interruptor de Ajustes, NEXUS se despierta al oírla. Un reconocedor de voz en español funciona en
  tu PC (sherpa-onnx con el modelo comunitario de Kroko, CC-BY-SA, ~124 MB que se descargan la primera vez) y busca la
  frase por cómo suena. No se graba ni se envía nada. Gasta en torno a un 6 % de un núcleo mientras escucha.
  Si la frase incluye un nombre («Oye Jarvis»), NEXUS lo toma como suyo al hablar contigo.
- **Rutinas de verdad.** «Crea una rutina Modo trabajo que abra VS Code y ponga mi lista Focus cuando diga modo trabajo»,
  «cada día a las 8 dime el resumen del día». Los pasos son frases que el agente hace con sus herramientas; se lanzan con
  su frase, a su hora o con el botón, y se pausan o borran en el panel Rutinas (o con `/rutina nombre` en el chat).
- **Calendario.** Google Calendar, Outlook o iCloud con su dirección secreta iCal (sin iniciar sesión): «¿qué tengo
  mañana?», tus citas en el resumen del día y a la derecha del escritorio.
- **Tus listas de Spotify por nombre** (Premium). «Pon mi lista Gym», «pon mis Me gusta en aleatorio». Se conecta una
  vez desde Ajustes → Spotify con una app gratuita de developer.spotify.com (Redirect URI `http://127.0.0.1:8737/callback`).
  El inicio de sesión es en la web de Spotify (PKCE): NEXUS nunca ve tu contraseña.
- **Resumen del día.** La primera vez que abres NEXUS cada día te cuenta el tiempo, tus recordatorios de hoy y las
  noticias más interesantes (se puede apagar en Ajustes). También con «buenos días» o «¿qué tengo hoy?».
- **Dictado en cualquier app.** `Ctrl + Alt + D`, hablas, y el texto se escribe donde tengas el cursor (Word, WhatsApp,
  el navegador…). Para solo con una pausa o pulsando el atajo otra vez. Tu portapapeles queda como estaba.
- **Control del PC por voz.** Bloquear, apagar la pantalla, suspender, apagar o reiniciar en X minutos (estos tres
  piden permiso), cancelar el apagado y brillo (en portátiles).
- **Portapapeles.** «Traduce lo que he copiado», «resúmelo», «corrige la ortografía»: lo lee (texto o imagen) y te deja
  el resultado copiado para pegarlo.
- **Ve tu pantalla y tus archivos.** «¿Qué hay en mi pantalla?», «explícame este error»: hace una captura (apartando
  su ventana) y la analiza. Arrastra imágenes, PDF o documentos al chat y te los explica o resume. Los PDF se leen en tu
  PC; las imágenes las mira Gemini (clave gratuita, solo cuando lo pides) u Ollama si tienes un modelo de visión.
  También puede mirar por la webcam si se lo pides (con permiso). Lo que está viendo sale en una tarjeta en pantalla, y
  el último archivo que le pasas queda «en uso» una hora para que puedas decir «resúmelo» o «tradúcelo» sin repetirlo.
- **Noticias del día sin política.** Panel con lo más reciente de tecnología, ciencia y curiosidades (y, si quieres,
  videojuegos, cine, motor, cocina o salud), de medios en español por RSS, gratis y sin clave. Filtra la política por
  defecto y puedes añadir otros temas a evitar. «¿Qué noticias hay hoy?» o *Resumen en voz* te las cuenta.
- **Recordatorios y alarmas por voz.** «Avísame en 20 minutos», «mañana a las 9 recuérdame…», «pon una alarma de
  lunes a viernes a las 7». Suena un aviso, lo dice en voz alta y sale una notificación de Windows. Los próximos aparecen
  a la derecha del escritorio. Si cierras NEXUS, el Programador de tareas de Windows lo abre en silencio un minuto antes
  para avisarte; si el PC estaba apagado, te avisa al encenderlo.
- **Memoria que busca.** «¿Qué te conté de mis vacaciones?» encuentra conversaciones pasadas por palabras y por
  significado (embeddings gratuitos de Gemini u Ollama). Lo que aprende mientras lee una web o un archivo queda
  «pendiente» hasta que tú lo confirmas, para que una página no pueda colarle datos falsos.
- **Memoria real.** Nexus aprende datos tuyos de lo que hablas (gustos, personas, lugares, trabajo) y los usa
  después; puedes añadirlos, borrarlos o desactivar el aprendizaje en el panel Memoria. Las conversaciones se guardan y
  el chat se recupera al reiniciar. Todo va cifrado con Windows (DPAPI) en `%APPDATA%\nexus\memory.bin`.
- **Música de Spotify real.** Lee lo que suena en la app de escritorio de Spotify (no el navegador): carátula,
  progreso, aleatorio, repetir, anterior/siguiente y letra sincronizada (LRCLIB, gratis). El halo toma el color de
  la carátula y se mueve con el audio real del PC.
- **Halo reactivo.** El núcleo y su halo se mueven con el sonido real: tu voz mientras escucha y la suya mientras habla.
- **Personalidad.** Mayordomo británico, copiloto directo o sarcástico, con calidez y formalidad ajustables.
- **Datos reales en el escritorio.** Hora y tiempo de tu ciudad, a la derecha para no chocar con los iconos. La efeméride del día («En un día como hoy») está en el panel de Noticias.
- **Estado del equipo real.** CPU (con cada hilo), GPU NVIDIA (uso, VRAM, temperatura y ventilador), RAM, disco, red y
  procesos que más consumen. Se mide solo al abrir el panel (unos 2 s) o al pulsar *Actualizar*; nada en segundo plano.
- **Temas y calidad gráfica.** Cinco temas de color y tres niveles de calidad; la primera vez elige el nivel solo según
  tu tarjeta gráfica, memoria y procesador.
- **Cupo que no se acaba.** Órdenes sencillas sin IA, solo las herramientas necesarias en cada pregunta, cinco
  servicios gratis en rotación y un medidor de lo que queda hoy (más abajo, en Requisitos).
- **Barra flotante.** `Ctrl + Alt + A` abre una barra pequeña encima de cualquier app (también de un juego) para
  preguntar por escrito sin abrir NEXUS. La respuesta se puede copiar.
- **Con el texto seleccionado.** Selecciona un texto en cualquier app y pulsa `Ctrl + Alt + S`: resumir, traducir,
  corregir, explicar o responder, y *Pegar en su sitio* lo sustituye donde estaba. (Como «Click to Do» de Windows.)
- **Avisos por su cuenta, pocos y útiles.** Una cita en 10 minutos, el PC al límite de CPU, batería baja o disco
  casi lleno. Máximo seis al día y nada de noche; las notificaciones de Windows se callan solas mientras juegas.
- **Resumen de la noche y prioridades.** Por la mañana te pregunta tus tres cosas importantes del día; por la noche
  (a la hora que elijas) te cuenta qué hiciste, qué queda y qué tienes mañana. Si estás jugando o presentando, espera.
- **Actividad y deshacer.** Panel con todo lo que NEXUS cambió en tu PC estos 7 días. Antes de guardar, editar o
  mover un archivo guarda una copia, así que «deshaz lo último» (o el botón) lo deja como estaba. *Pausa total*
  para que siga respondiendo pero no cambie nada.
- **Modo privado.** El botón del ojo en la barra: mientras está activo no guarda conversaciones, no aprende nada y no
  mira la pantalla ni la cámara.
- **Todas las funciones en un sitio.** Ajustes → *Funciones* lista todo lo que sabe hacer NEXUS, por temas y con
  buscador. Al pulsar una ves qué hace y frases para pedírsela, y puedes apagarla: una función apagada desaparece de
  verdad (la IA no puede usarla, su atajo de teclado queda libre y su icono sale de la barra).
- **Autodiagnóstico.** Ajustes → *Comprobar que todo funciona*: revisa internet, cada clave, las voces, el micrófono, que
  entienda lo que dices, búsqueda, noticias, tiempo, calendario, Spotify y disco, sin cambiar nada, y dice cómo arreglar
  lo que falle.
- **Fondo de escritorio.** NEXUS puede ponerse detrás de los iconos del escritorio y quedarse ahí en segundo plano.

## Requisitos

- Windows 10 u 11.
- [Node.js](https://nodejs.org) 20 o superior.
- Una IA, a elegir en la configuración inicial (todas gratis y sin tarjeta):

| Opción | Clave | Notas |
| --- | --- | --- |
| **Automático** (recomendada) | Groq (y de reserva Gemini y OpenRouter) | Reparte las preguntas entre todas las IA con clave y cambia sola si una llega a su límite. |
| **Groq** | Gratis en [console.groq.com](https://console.groq.com/keys) | Tres modelos (GPT-OSS 120B, Qwen y GPT-OSS 20B) con 200.000 tokens al día cada uno; también entiende la voz. |
| **Mistral** | [console.mistral.ai](https://console.mistral.ai/api-keys) | Solo con clave de pago o antigua: desde 2026 su plan gratuito no da claves de API. |
| **OpenRouter** | Gratis en [openrouter.ai](https://openrouter.ai/keys) | 50 preguntas al día con el modelo gratis que esté libre: último recurso. |
| **Cerebras** | [cloud.cerebras.ai](https://cloud.cerebras.ai) | 1 millón de tokens al día con las claves gratuitas antiguas; las cuentas nuevas ya piden tarjeta. |
| **Gemini Flash-Lite** | Gratis en [Google AI Studio](https://aistudio.google.com/apikey) | 500 preguntas al día. En el plan gratuito Google puede usar las conversaciones para mejorar sus productos. |
| **Local con [Ollama](https://ollama.com)** | Sin clave | Sin límites; en Automático se usa como último recurso si está instalado. |

**Cómo ahorra cupo** (ideas de [Open.Jarvis](https://github.com/dmrr35/Open.Jarvis) y
[Jarvis-AI](https://github.com/sharmakrishna1010/Jarvis-AI)):

- **Órdenes directas sin IA:** «pausa», «siguiente», «sube el volumen», «abre Discord», «qué hora es», «qué tiempo
  hace», «avísame en 20 minutos de…», «pon una alarma a las 7», «bloquea el PC»… se resuelven al instante, sin
  internet y sin gastar nada. Lo que no entiende con seguridad pasa a la IA.
- **Solo las herramientas que tocan:** una pregunta de música manda las de música y unas pocas básicas, no las 44.
  Cada petición pasa de unos 5.000 tokens a unos 1.900.
- **Contador de cupo:** Ajustes → *Cupo gratis de hoy* muestra cuánto lleva gastado cada IA. Cuando una dice que
  ha agotado el día, NEXUS no la vuelve a intentar durante unas horas, aunque se reinicie, y avisa antes de quedarse sin nada.

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

- Sigue viéndose la barra de abajo y se usa como siempre: toca el núcleo para hablar, abre paneles, usa la rueda
  y verás el hover. Como Wallpaper Engine, NEXUS recibe el ratón que pasa por el escritorio vacío (nunca el de
  otras apps) como si fuera una ventana normal.
- Para escribir, pulsa un campo de texto: aparece encima una cajita que sí recibe el teclado. Lo que escribes va
  al campo; Enter lo envía y Esc o pulsar fuera la cierran.
- Las dos cosas se apagan en Ajustes → Sistema (*Barra de abajo en el fondo* y *Pulsar en el fondo*).
- **Varias pantallas:** en Ajustes → Sistema → *En qué pantallas* eliges *Solo la principal* (por defecto) o *Todas las pantallas*. Con todas, cada secundaria (esté a la izquierda, a la derecha, arriba o abajo) muestra la
  misma galaxia, sin núcleo ni botones, con tu tema y entrando por el lado que toca la pantalla principal. Se
  rehace sola si conectas o quitas un monitor, y se queda quieta igual que la principal.
- También se le habla con **Ctrl + Alt + Espacio**. Para volver a ventana, Ajustes → Sistema o la bandeja.
- Ponerse de fondo tarda menos de un segundo: el ayudante de Windows se compila una sola vez y se guarda.
- Se pausa sola mientras una aplicación maximizada o a pantalla completa (un juego, por ejemplo) tapa el escritorio.
- Al salir se restaura tu fondo de pantalla normal.
- Con **Iniciar con Windows** activado, arranca en el último modo que usaste.

Funciona en el monitor principal y en cualquier proporción. En pantallas anchas y ultrapanorámicas el núcleo
queda centrado y el reloj, la barra, los marcos y los paneles se pegan a los bordes reales de la pantalla. Por dentro usa la
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
  main/                     proceso de Electron (Node)
    index.ts                arranque: una sola instancia, ventana, bandeja, atajo y vigilantes
    window.ts               ventana (normal o fondo de escritorio) y menú de la bandeja
    ipc.ts                  todo lo que la interfaz puede pedir al proceso principal
    brain/                  el agente
      index.ts              bucle pregunta → herramientas → respuesta, historial
      prompt.ts             instrucciones para la IA (personalidad, reglas, lo que sabe de ti)
      providers.ts          qué IA responde y cambio automático cuando una llega a su límite
      stream.ts             lectura de la respuesta en streaming
    tools/                  herramientas del agente, una lista por tema
      define.ts             formato común: descripción para la IA + lo que se ejecuta
      index.ts              registro: qué herramientas están activas según los ajustes
      apps.ts briefing.ts calendar.ts music.ts news.ts pc.ts routines.ts vision.ts web.ts files.ts system.ts memory.ts reminders.ts
    lib/                    piezas comunes: PowerShell, archivos de datos y texto
    memory.ts               memoria cifrada: datos sobre ti y conversaciones
    reminders.ts            recordatorios y alarmas
    routines.ts             rutinas: pasos, frase y horario
    calendar.ts             calendario por dirección iCal
    wakeword.ts             frase de activación en local (descarga el modelo la primera vez)
    approvals.ts            acciones permitidas para siempre
    offlineVoice.ts         voz de Windows cuando no hay internet
    media.ts                lo que suena en Spotify, carátula y letra
    spotifyApi.ts           cuenta de Spotify: tus listas por nombre
    news.ts                 noticias por RSS, por temas y sin política
    vision.ts               captura de pantalla e imágenes para un modelo que ve
    stt.ts / tts.ts         voz a texto y texto a voz
    dictation.ts            dictado: pega el texto en la app que tengas delante
    settings.ts             ajustes y claves cifradas
    sysinfo.ts world.ts wallpaper.ts
  preload/index.ts          puente seguro entre la interfaz y el proceso principal
  renderer/src/
    NexusApp.jsx            estado, arranque, posición del núcleo y panel abierto
    app/constants.js        temas, voces, iconos, textos fijos
    app/util.js             formatos y colores de interruptores
    app/features/           comportamiento por tema: conversación, música, memoria, voces, ajustes, arranque
    app/view/               qué muestra cada panel (un archivo por panel)
    views/                  los componentes visuales de cada pantalla
    services/voice.ts       micrófono, cola de voz, efecto de IA y audio para el halo
    services/sfx.ts         sonidos sintetizados (arranque, avisos)
    engine/                 motor gráfico en Canvas 2D: galaxia, núcleo, halo y partículas
resources/                  iconos de la app y de la bandeja
design/                     diseño original de Claude Design (referencia)
scripts/                    conversor del diseño e icono
```

**Para añadir una herramienta al agente:** se escribe en el archivo de su tema dentro de `src/main/tools/`
(nombre, descripción, parámetros y la función que la ejecuta) y, si es un archivo nuevo, se añade su lista en
`tools/index.ts`. Si cambia algo del equipo, se le pone `confirm` y la app pedirá permiso antes de cada uso.

**Tecnologías:** Electron, React, TypeScript, Vite (electron-vite) y Canvas 2D.
**Servicios externos, todos gratuitos:** Groq, Mistral, OpenRouter, Cerebras o Gemini (IA y voz a texto), DuckDuckGo (búsqueda sin clave), Microsoft Edge TTS (voz),
Open-Meteo (tiempo), Wikipedia (efemérides), ipapi.co (ciudad aproximada), iTunes (carátulas) y LRCLIB (letras).

### Rendimiento (pensado para estar siempre encendida)

NEXUS dibuja según lo que pasa (`src/renderer/src/app/features/power.js`):

| Situación | Animación |
|---|---|
| Habla, escucha, piensa o arranca | completa (60 fps) |
| En pantalla, en reposo | 30 fps, galaxia, grano y telemetría más lentos |
| Sin foco, o 45 s sin tocarla | 15 fps y sin grano |
| Oculta en la bandeja, tapada o, como fondo, mientras usas otra app | parada (no dibuja nada) |

Medido en un PC de 20 hilos (CPU de un núcleo; la app instalada):

- **En la bandeja o como fondo mientras trabajas en otra app:** 0,1-0,5 % de un núcleo. Tras un minuto oculta suelta
  la memoria gráfica de sus lienzos.
- **En pantalla, en reposo:** unos 40 % de un núcleo (un 2 % del PC); con música, el halo baila y sube.
- **Antes de estos cambios:** 56 % de un núcleo en reposo, también con la ventana sin foco.

Otros detalles:

- Como fondo de escritorio solo se anima cuando miras el escritorio o NEXUS te habla (Ajustes → «Fondo quieto mientras
  usas otras apps»).
- El audio se suspende tras 8 s de silencio; la captura del sonido del PC para el halo solo funciona si se ve.
- La frase de activación solo analiza el sonido que puede ser voz: el silencio y el ruido de la habitación no gastan.
- El vigilante de Spotify consulta cada 2 s si suena, cada 3 s en pausa y cada 5 s si Spotify está cerrado; solo pide
  los datos de la canción a Windows cuando cambia algo. El de ventanas solo existe en modo fondo de escritorio.
- Sin animaciones CSS infinitas en reposo: una sola (el «:» del reloj) obligaba a recomponer la ventana 60 veces por
  segundo.
- El motor gráfico se limita a 60-72 fps aunque el monitor sea de 120-144 Hz, y el texto de la IA se pinta una vez por
  fotograma. En calidad **Ahorro** se reducen además las partículas y la resolución.

### Seguridad

Varias de estas ideas vienen de [OpenJarvis](https://github.com/open-jarvis/OpenJarvis) (Stanford, Apache-2.0) y de
[JARVIS-OS](https://github.com/MAL19INDUSTRIES/JARVIS-OS-V.2).

- **Privacidad:** antes de enviar a la IA lo que sale de un archivo, el portapapeles o la pantalla, se ocultan claves,
  contraseñas, tarjetas e IBAN. No se pueden leer archivos de claves (`.env`, `.ssh`, `.pem`, `.git-credentials`…) ni los
  perfiles de los navegadores (contraseñas, cookies, carteras).
- **Claves cifradas:** las claves de las IA, la memoria, el calendario y Spotify se guardan cifradas con tu cuenta de
  Windows (DPAPI). Ninguna clave va en el código ni en el repositorio.
- **Permisos:** lo que cambia el equipo pide permiso; con «Permitir siempre» deja de preguntar para ese tipo de acción
  (se quita en Rutinas → Permisos). Borrar, PowerShell y crear o cambiar archivos que ejecutan programas (`.exe`,
  `.bat`, `.ps1`, accesos directos…) preguntan siempre, aunque el archivo de permisos diga otra cosa.
- **Zonas prohibidas:** el agente nunca escribe en el inicio de Windows, en los perfiles de PowerShell ni en los archivos
  de NEXUS (así una web no puede darle permisos ni dejar algo que se ejecute al encender el PC).
- **Solo internet público:** al leer webs no abre direcciones de este PC ni de tu red local (router, otros equipos).
- **Ventanas blindadas:** sin ventanas emergentes ni navegación fuera de NEXUS; micrófono, cámara y captura de pantalla
  solo para la ventana principal; el proceso principal solo atiende a la página propia de NEXUS.
- **Ejecutable endurecido:** `NEXUS.exe` no se puede usar como intérprete de Node ni depurar desde fuera, comprueba
  que su código no se ha manipulado y no tiene el menú oculto de herramientas de desarrollo.
- **Solo lo que pides tú:** apagar, reiniciar o borrar solo se hacen si lo has dicho con tus palabras; si la orden sale
  de una web o un archivo, se bloquea.
- **Freno de bucles:** si el agente repite la misma acción tres veces, se para (ahorra cupo gratis).
- **Modelo según la pregunta:** la charla corta va al modelo pequeño y rápido; lo que necesita herramientas, al grande.
- **Voz de respaldo:** sin internet, NEXUS habla con las voces de Windows en vez de quedarse callado.

- La interfaz se ejecuta aislada del sistema (sandbox) y solo puede usar las funciones que expone el preload.
- Lo que modifica el equipo (escribir, mover o borrar archivos, PowerShell) pide permiso en cada uso y
  se puede desactivar en Ajustes. Las apps se abren sin pasar por la consola, así que un nombre nunca ejecuta un comando.
- Una sola instancia de la app y sin navegación fuera de la interfaz.

## Pendiente

- Hablar con NEXUS desde el móvil (Telegram).
- Probar la conexión con la cuenta de Spotify (hecha, falta probarla con una cuenta real).
- Temperatura de la CPU (Windows solo la da con permisos de administrador; se muestra la de la GPU).
- Mini overlay flotante sobre otras apps y fondo de escritorio en varios monitores a la vez.
