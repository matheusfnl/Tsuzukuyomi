const ANKI_URL = 'http://localhost:8765'

async function invoke(action, params = {}) {
  const response = await fetch(ANKI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, version: 6, params }),
  })
  const data = await response.json()
  if (data.error) throw new Error(data.error)
  return data.result
}

export async function getDeckNames() {
  return invoke('deckNames')
}

export async function getDeckNamesAndIds() {
  return invoke('deckNamesAndIds')
}

export async function getModelFieldNames(modelName) {
  return invoke('modelFieldNames', { modelName })
}

export async function findCards(deckName) {
  return invoke('findCards', { query: `deck:"${deckName}"` })
}

export async function getCardsInfo(cardIds) {
  return invoke('cardsInfo', { cards: cardIds })
}

export async function getDeckModels(deckName) {
  const noteIds = await invoke('findNotes', { query: `deck:"${deckName}"` })
  if (!noteIds.length) return []
  const notes = await invoke('notesInfo', { notes: noteIds.slice(0, 10) })
  const models = [...new Set(notes.map(n => n.modelName))]
  return models
}

export async function getFieldsForDeck(deckName) {
  const noteIds = await invoke('findNotes', { query: `deck:"${deckName}"` })
  if (!noteIds.length) return []
  const notes = await invoke('notesInfo', { notes: noteIds.slice(0, 1) })
  if (!notes.length) return []
  return Object.keys(notes[0].fields)
}

export async function getRandomCard(deckConfig) {
  const { deckName, questionField, answerField, sentenceField } = deckConfig
  const noteIds = await invoke('findNotes', { query: `deck:"${deckName}"` })
  if (!noteIds.length) throw new Error(`Deck "${deckName}" está vazio`)

  const randomId = noteIds[Math.floor(Math.random() * noteIds.length)]
  const notes = await invoke('notesInfo', { notes: [randomId] })
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

export async function pingAnki() {
  try {
    await invoke('version')
    return true
  } catch {
    return false
  }
}
