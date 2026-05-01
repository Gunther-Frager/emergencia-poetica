# emergencia-poetica-local

Versión local completa separada en `backend/` y `frontend/`, preparada para usar LLM por internet con proveedor intercambiable: **OpenAI**, **Gemini** o **mock**.

## Estructura

- `backend/` API Node/Express + estado persistente en `state.json`.
- `frontend/` UI estática simple.

## Backend: instalación

```bash
cd backend
npm install
cp .env.example .env
```

Edita `.env`:

- `LLM_PROVIDER=openai` o `gemini` o `mock`
- `OPENAI_API_KEY=...` (si openai)
- `GEMINI_API_KEY=...` (si gemini)

Inicia:

```bash
npm run dev
```

## Endpoints

- `GET /health`
- `GET /state`
- `POST /init`
- `POST /cycle`

### `POST /cycle`
Puedes forzar proveedor por request:

```bash
curl -X POST http://localhost:8787/cycle \
  -H "Content-Type: application/json" \
  -d '{"provider":"openai"}'
```

Valores posibles: `openai`, `gemini`, `mock`.

## Reglas del ciclo

- 20 versos máximo
- 10 palabras máximo por verso
- 1 expansión por ciclo
- 1 poda por ciclo
- archivo de descartes (`discard_file`)
- reaparición ocasional (configurable con `REAPPEAR_PROBABILITY`)

## Frontend

Abre `frontend/index.html` en el navegador. Botón de ciclo usa el backend local en `http://localhost:8787`.
