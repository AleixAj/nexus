// Parses an OpenAI-style SSE stream, forwarding text as it arrives and collecting tool calls.

// extra_content: Gemini 3 sends a thought signature with each call and wants it back unchanged
export type ToolCall = { id: string; type: 'function'; function: { name: string; arguments: string }; extra_content?: any }

export async function readStream(body: ReadableStream<Uint8Array>, onDelta: (t: string) => void) {
  const reader = body.getReader()
  const dec = new TextDecoder()
  let buf = '', content = ''
  // tokens that count towards the free limit (the last chunk carries them; cached ones are free)
  let usage: number | null = null
  const calls: ToolCall[] = []

  const handle = (line: string) => {
    if (!line.startsWith('data:')) return
    const data = line.slice(5).trim()
    if (!data || data === '[DONE]') return
    let json
    try { json = JSON.parse(data) } catch { return }
    if (json.error) throw new Error(json.error.message || 'Error del modelo')
    const u = json.usage || json.x_groq?.usage
    if (u?.total_tokens != null) usage = u.total_tokens - (u.prompt_tokens_details?.cached_tokens || 0)
    const delta = json.choices?.[0]?.delta
    if (!delta) return
    // zero-width characters some models emit would be read aloud as silence or garbage
    const text = typeof delta.content === 'string' ? delta.content.replace(/[​-‍⁠﻿]/g, '') : ''
    if (text) { content += text; onDelta(text) }
    for (const tc of delta.tool_calls || []) {
      const c = (calls[tc.index ?? calls.length] ??= { id: '', type: 'function', function: { name: '', arguments: '' } })
      if (tc.id) c.id = tc.id
      if (tc.function?.name) c.function.name += tc.function.name
      if (tc.function?.arguments) c.function.arguments += tc.function.arguments
      if (tc.extra_content) c.extra_content = { ...c.extra_content, ...tc.extra_content }
    }
  }

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop() || ''
    lines.forEach(handle)
  }
  buf += dec.decode()
  if (buf) handle(buf)

  const toolCalls = calls.filter(Boolean).map((c, i) => ({ ...c, id: c.id || `call_${i}` }))
  return { content, toolCalls, usage }
}
