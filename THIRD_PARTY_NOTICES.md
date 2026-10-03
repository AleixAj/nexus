# Third-party notices

NEXUS is MIT-licensed (see `LICENSE`). It uses, or took ideas from, the following work.

## Libraries shipped with the app

| Package | License |
| --- | --- |
| [React](https://react.dev) / React DOM | MIT |
| [Electron](https://www.electronjs.org) | MIT |
| [sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx) (`sherpa-onnx-node`) | Apache-2.0 |
| [ical.js](https://github.com/kewisch/ical.js) | MPL-2.0 (unmodified) |
| [msedge-tts](https://github.com/Migushthe2nd/MsEdgeTTS) | MIT |
| [PptxGenJS](https://github.com/gitbrent/PptxGenJS) | MIT |
| [unpdf](https://github.com/unjs/unpdf) | MIT |
| [tar-stream](https://github.com/mafintosh/tar-stream), [unbzip2-stream](https://github.com/regular/unbzip2-stream) | MIT |

## Downloaded at runtime (not in this repository)

- **Kroko Spanish streaming ASR model** (wake phrase), CC-BY-SA 4.0. Downloaded once to the user's
  app data folder when "Escuchar siempre" is turned on.

## Fonts

- [Space Grotesk](https://fonts.google.com/specimen/Space+Grotesk) and [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono), SIL Open Font License 1.1, loaded from Google Fonts.

## Online services (free tiers, the user's own keys)

Groq, Google Gemini, Cerebras, Mistral, OpenRouter and Ollama (AI); Microsoft Edge TTS (voices);
DuckDuckGo (search); [Open-Meteo](https://open-meteo.com) (weather, CC BY 4.0); Wikipedia (CC BY-SA 4.0);
[LRCLIB](https://lrclib.net) (lyrics); iTunes Search (album art); Spotify Web API; public RSS feeds (news).

## Ideas adapted (no code copied)

- [OpenJarvis](https://github.com/open-jarvis/OpenJarvis) (Stanford, Apache-2.0): secret redaction, memory trust
  levels, loop guard, complexity routing.
- [JARVIS-OS](https://github.com/MAL19INDUSTRIES/JARVIS-OS-V.2): self-test, vision preview, presentations, Steam,
  parallel read-only tools.
- [Open.Jarvis](https://github.com/dmrr35/Open.Jarvis): local command routing before the AI.
- [Leon](https://github.com/leon-ai/leon), [Hermes Agent](https://github.com/NousResearch/hermes-agent),
  [vierisid/jarvis](https://github.com/vierisid/jarvis): bounded proactive notices, undo checkpoints, activity log.
- [Lively Wallpaper](https://github.com/rocksdanister/lively) and Wallpaper Engine: the WorkerW wallpaper technique
  and forwarding desktop mouse input.
