<div align="center">
  <img src="icons/icon128.png" width="80" />
  <h1>Tsuzukuyomi</h1>
  <p><em>Japanese flashcards that interrupt your browsing — because you won't study on your own.</em></p>
</div>

---

A browser extension that pulls cards from your Anki decks and throws them in your face at random intervals while you're browsing. You can't dismiss it until you answer correctly (or fail 3 times trying).

## Features

- Connects to your local [AnkiConnect](https://ankiweb.net/shared/info/2055492159) addon
- Configurable review interval (e.g. every 10–20 minutes)
- Supports multiple decks with custom field mapping (question, answer, sentence)
- Full-page overlay with 3 attempts and a 10s cooldown between them
- Renders images from your cards
- Light and dark theme

## Setup

1. Install [Anki](https://apps.ankiweb.net/) and the [AnkiConnect](https://ankiweb.net/shared/info/2055492159) addon
2. Build the extension (`npm run build`) and load `dist-chrome/` or `dist-firefox/` in developer mode
3. Open the extension popup, point it at your AnkiConnect URL, pick your decks, and enable it

## Build

```bash
npm install
npm run dev      # watch mode (chrome + firefox)
npm run build    # production build
```

Output goes to `dist-chrome/` and `dist-firefox/`.
