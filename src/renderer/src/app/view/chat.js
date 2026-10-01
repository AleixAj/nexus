// Chat panel.
import { CHAT_COMMANDS } from '../constants';

export function chatView(app, c) {
  const { S } = c;
  const word = S.chatInput.split(' ')[0];
  return {
    chatRef: app.chatRef, modelName: S.provider === 'Auto' ? 'Automático' : S.model,
    chatMsgs: S.chat.map((m, i) => ({
      ...m, isUser: m.role === 'user', isNexus: m.role === 'nexus', isAction: m.role === 'action', shown: m.shown !== undefined ? m.shown : m.text,
      // restored messages come in one after another; new ones at once
      anim: 'nx-in 520ms cubic-bezier(.16,1,.3,1) ' + (m.fresh ? 0 : 120 + i * 40) + 'ms both',
      items: (m.items || []).map((t, j) => ({ t, delay: (m.fresh ? 200 : 400 + i * 40) + j * 180 + 'ms' })),
    })),
    chatInput: S.chatInput, onChatInput: e => app.setState({ chatInput: e.target.value }),
    onChatKey: e => { if (e.key === 'Enter') { e.preventDefault(); app.sendChat(); } }, onChatSend: () => app.sendChat(),
    showSlash: S.chatInput.startsWith('/'),
    slashCmds: CHAT_COMMANDS.filter(x => x.cmd.startsWith(word) || S.chatInput === '/').map(x => ({ ...x, pick: () => app.setState({ chatInput: x.cmd + ' ' }) })),
  };
}
