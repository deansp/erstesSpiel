# Tic Tac Toe

Ein schlichtes Tic-Tac-Toe-Spiel fuer den Webbrowser.

## Starten

1. Oeffne den Ordner `erstesSpiel` in VS Code.
2. Oeffne die Datei `index.html`.
3. Starte sie im Browser, zum Beispiel mit der VS-Code-Erweiterung "Live Server".

## Spielidee

- Am Anfang wird gefragt: "Wer bist du?"
- Du kannst "Dean" oder "Eine andere Person" auswaehlen.
- Dean spielt mit X.
- Die andere Person spielt mit O.
- Ob Dean oder die andere Person beginnt, wird pro Runde zufaellig entschieden.
- Oben steht immer, wer gerade am Zug ist.

## Dateien

- `index.html`: Aufbau der Seite
- `style.css`: Farben, Abstaende und Layout
- `script.js`: Spiellogik

## Datenbank

Die Supabase REST-Adresse ist in `script.js` vorbereitet:

```js
const SUPABASE_REST_URL = "https://uyyeyeyiwwwwnsdlyvgn.supabase.co/rest/v1/";
```

Fuer echtes Online-Spielen mit zwei Browsern fehlen noch der Supabase `anon key` und eine Tabelle fuer die Spielzuege.
