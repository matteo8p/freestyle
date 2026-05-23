export function pcm16ToWavBlob(chunks: Int16Array[], sampleRate = 16000): Blob {
  let total = 0
  for (const c of chunks) total += c.length
  const dataBytes = total * 2
  const buf = new ArrayBuffer(44 + dataBytes)
  const view = new DataView(buf)

  writeString(view, 0, 'RIFF')
  view.setUint32(4, 36 + dataBytes, true)
  writeString(view, 8, 'WAVE')
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeString(view, 36, 'data')
  view.setUint32(40, dataBytes, true)

  let offset = 44
  for (const chunk of chunks) {
    for (let i = 0; i < chunk.length; i++, offset += 2) {
      view.setInt16(offset, chunk[i], true)
    }
  }
  return new Blob([buf], { type: 'audio/wav' })
}

function writeString(view: DataView, offset: number, s: string): void {
  for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i))
}
