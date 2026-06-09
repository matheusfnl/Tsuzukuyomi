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

export async function getRandomCard(deckConfig, url) {
  const { deckName, questionField, answerField, sentenceField } = deckConfig
  const noteIds = await invoke('findNotes', { query: `deck:"${deckName}"` }, url)
  if (!noteIds.length) throw new Error(`Deck "${deckName}" está vazio`)

  const randomId = noteIds[Math.floor(Math.random() * noteIds.length)]
  const notes = await invoke('notesInfo', { notes: [randomId] }, url)
  const note = notes[0]

  const getFieldValue = (fieldName) => {
    if (!fieldName || !note.fields[fieldName]) return null
    return note.fields[fieldName].value
  }

  return {
    question: getFieldValue(questionField),
    answer: getFieldValue(answerField),
    sentence: sentenceField ? getFieldValue(sentenceField) : null,
    deckName,
  }
}

export async function pingAnki(url) {
  try {
    await invoke('version', {}, url)
    return true
  } catch {
    return false
  }
}
