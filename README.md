# Tic Tac Toe Online

Ein schlichtes Tic-Tac-Toe-Spiel fuer den Webbrowser. Zwei Personen koennen mit demselben Link gegeneinander spielen.

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
- Der Spielstand wird in Supabase gespeichert.

## Mit Freund spielen

1. Dean oeffnet die GitHub-Pages-Seite.
2. Dean waehlt "Dean".
3. Dean klickt "Link kopieren".
4. Dean schickt den Link an den Freund.
5. Der Freund oeffnet den Link und waehlt "Eine andere Person".

## Dateien

- `index.html`: Aufbau der Seite
- `style.css`: Farben, Abstaende und Layout
- `script.js`: Spiellogik

## Datenbank

Die Supabase REST-Adresse und der `anon public` Key sind in `script.js` hinterlegt.

Die Tabelle in Supabase muss `games` heissen und diese Felder haben:

```sql
create table games (
  id uuid primary key default gen_random_uuid(),
  board text[] not null default array['','','','','','','','',''],
  current_symbol text not null default 'X',
  winner text,
  player_dean text,
  player_other text,
  updated_at timestamptz default now()
);
```
