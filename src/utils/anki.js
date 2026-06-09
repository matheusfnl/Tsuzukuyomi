export const DEFAULT_ANKI_URL = 'http://localhost:8765'

async function invoke(action, params = {}, baseUrl = DEFAULT_ANKI_URL) {
  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, version: 6, params }),
  })
  const data = await response.json()
  if (data.error) throw new Error(data.error)
  return data.result
}

export async function getDeckNames(url) {
  return invoke('deckNames', {}, url)
}

export async function getFieldsForDeck(deckName, url) {
  const noteIds = await invoke('findNotes', { query: `deck:"${deckName}"` }, url)
  if (!noteIds.length) return []

  // Amostra espalhada para cobrir todos os tipos de nota do deck
  const sample = noteIds.length <= 20
    ? noteIds
    : [0, 0.25, 0.5, 0.75, 1].map(p => noteIds[Math.floor(p * (noteIds.length - 1))])

  const notes = await invoke('notesInfo', { notes: sample }, url)

  // Descobre todos os modelos únicos presentes na amostra
  const modelNames = [...new Set(notes.map(n => n.modelName))]

  // Busca os campos de cada modelo e faz a união
  const fieldSets = await Promise.all(
    modelNames.map(m => invoke('modelFieldNames', { modelName: m }, url))
  )

  return [...new Set(fieldSets.flat())]
}

async function resolveImages(html, baseUrl) {
  if (!html || !html.includes('<img')) return html
  const imgRegex = /<img([^>]*?)src="([^"]+)"([^>]*?)>/gi
  const matches = [...html.matchAll(imgRegex)]
  if (!matches.length) return html

  const resolved = await Promise.all(
    matches.map(async ([full, pre, src, post]) => {
      if (src.startsWith('data:') || src.startsWith('http')) return [full, full]
      try {
        const b64 = await invoke('retrieveMediaFile', { filename: src }, baseUrl)
        if (!b64) return [full, full]
        const ext = src.split('.').pop().toLowerCase()
        const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
          : ext === 'png' ? 'image/png'
          : ext === 'gif' ? 'image/gif'
          : ext === 'webp' ? 'image/webp'
          : 'image/png'
        return [full, `<img${pre}src="data:${mime};base64,${b64}"${post}>`]
      } catch {
        return [full, full]
      }
    })
  )

  let out = html
  for (const [original, replacement] of resolved) {
    out = out.replace(original, replacement)
  }
  return out
}

export async function getRandomCard(deckConfig, url) {
  const { deckName, questionField, answerField, sentenceField } = deckConfig
  const noteIds = await invoke('findNotes', { query: `deck:"${deckName}"` }, url)
  if (!noteIds.length) throw new Error(`Deck "${deckName}" is empty`)

  const MAX_TRIES = 5
  const shuffled = [...noteIds].sort(() => Math.random() - 0.5)

  for (let i = 0; i < Math.min(MAX_TRIES, shuffled.length); i++) {
    const notes = await invoke('notesInfo', { notes: [shuffled[i]] }, url)
    const note = notes[0]

    const getFieldValue = (fieldName) => {
      if (!fieldName || !note.fields[fieldName]) return null
      return note.fields[fieldName].value
    }

    const rawQuestion = getFieldValue(questionField)
    const rawAnswer = getFieldValue(answerField)
    if (!rawQuestion || !rawAnswer) continue

    const [question, answer, sentence] = await Promise.all([
      resolveImages(rawQuestion, url),
      resolveImages(rawAnswer, url),
      resolveImages(sentenceField ? getFieldValue(sentenceField) : null, url),
    ])

    return { question, answer, sentence, deckName }
  }

  throw new Error(`No cards found in "${deckName}" with the configured fields`)
}

export async function pingAnki(url) {
  try {
    await invoke('version', {}, url)
    return true
  } catch {
    return false
  }
}
