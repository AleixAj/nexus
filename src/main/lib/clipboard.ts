// The user's clipboard, kept intact when NEXUS borrows it (dictation pastes through it and the
// floating bar copies the selection with it). Everything in it is saved, not only text: an
// image or a rich text copied before must still be there afterwards.
import { ClipboardItem, clipboard } from 'electron'

export type Saved = ClipboardItem[] | null

/** A real copy of what is in the clipboard now (the items read are only views of it). */
export async function saveClipboard(): Promise<Saved> {
  try {
    const items = await clipboard.read()
    return await Promise.all(items.map(async item => new ClipboardItem(Object.fromEntries(
      await Promise.all(item.types.map(async t => [t, await item.getType(t)] as const))
    ))))
  } catch { return null }
}

export async function restoreClipboard(saved: Saved) {
  try {
    if (saved && saved.length) await clipboard.write(saved)
    else clipboard.clear()
  } catch (e: any) { console.warn('[clipboard]', e?.message || e) }
}
