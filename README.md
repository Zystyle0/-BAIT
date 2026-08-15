# Calorie Bank

**Flexible calories. Real progress.**

A personalized nutrition tracker built around a **Weekly Calorie Bank** — so dinner-eaters, busy schedules, and real life still work. Win the week without daily guilt.

## Theme

Lighter **Duke Blue Devils**-inspired palette:

- Duke blue `#1E4D8C` (lifted from classic `#003087`)
- Bright accent `#4B8FD4` / soft `#7EB6E8`
- Soft blue-white backgrounds `#EEF4FB`
- Deep ink `#0B1F3A`

## Run locally

```bash
npm install
npm run dev
```

Open the URL Vite prints (default `http://localhost:5173`).

## Core flow

1. Landing → Get Started  
2. Onboarding (basics, body, goals, optional schedule blocks)  
3. Plan Results (maintenance + weekly budget + landmark pace)  
4. Dashboard (weekly bank, streak, protein, insights)  
5. Log Today (food withdrawals + activity deposits)  
6. Explore (weekly bank history + recent days)  
7. Settings (goals, units, exercise-credit mode, availability)  
8. Demo bar → **Coach view** (roster, colors, heat map, priorities)

Food is a withdrawal. Activity is a deposit (credited by the exercise mode in Settings). The weekly bank uses net calories.

Use the sticky **Client view / Coach view** toggle to open the demo coach dashboard at `/coach`. It uses 22 fake clients and does not overwrite your personal local log.

Data is stored in `localStorage` for this MVP.

```bash
npm test
```
