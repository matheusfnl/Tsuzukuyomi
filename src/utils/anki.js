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
  const notes = await invoke('notesInfo', { notes: noteIds.slice(0, 1) }, url)
  if (!notes.length) return []
  return Object.keys(notes[0].fields)
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
