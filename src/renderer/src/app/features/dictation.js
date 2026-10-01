// Dictation (Ctrl + Alt + D anywhere): record, transcribe and type into the app in front.
// Works with the window hidden: a blip marks the start and the end.
import * as voice from '../../services/voice';
import * as sfx from '../../services/sfx';
import { api } from '../util';

export const dictation = {
  toggleDictation() {
    if (this.state.dictating) { voice.stopListening(); return; }
    if (voice.isListening()) return; // already talking with Nexus
    this.interrupt();
    sfx.blip(true);
    this.setState({ dictating: true });
    this.setCore('listening');
    const end = () => { sfx.blip(false); this.setState({ dictating: false }); this.settle(); };
    voice.listen({
      onTranscribing: () => this.setCore('thinking'),
      onResult: async text => {
        end();
        if (text && !(await api.typeText(text))) this.notify('DICTADO', 'No he podido escribir el texto', 'Pon el cursor donde quieras escribir y vuelve a probar', '#F5B971');
      },
      onError: msg => { end(); this.notify('DICTADO', msg, 'Ctrl + Alt + D para volver a intentarlo', '#FB7185'); },
    }, { silenceMs: 2500, maxMs: 90000 });
  },
};
