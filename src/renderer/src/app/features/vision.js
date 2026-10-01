// What NEXUS looked at (screen, camera, an image) appears in a small card for a few seconds.
import * as voice from '../../services/voice';
import { api } from '../util';

export const vision = {
  onVisionPreview(p) {
    clearTimeout(this.visionT);
    this.setState({ visionPreview: { ...p, at: Date.now() } });
    this.visionT = setTimeout(() => this.setState({ visionPreview: null }), 15000);
  },
  async onCameraSnap(id) {
    try { api.answer(id, await voice.cameraPhoto()); }
    catch (e) { api.answer(id, { error: /NotFound|DevicesNotFound/.test(String(e)) ? 'no hay ninguna cámara conectada' : /NotAllowed|Permission/.test(String(e)) ? 'Windows no deja usar la cámara (Privacidad → Cámara)' : String((e && e.message) || e) }); }
  },
};
