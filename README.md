# emergencia-poetica-local

Proyecto local dividido en backend/frontend para experimentar con emergencia poética.

## Estructura

- `backend/`: API local en Node + Express.
- `frontend/`: interfaz HTML/JS simple.

## Requisitos

- Node.js 18+

## Ejecutar backend

```bash
cd backend
npm install
npm run dev
```

Servidor en `http://localhost:8787`.

## Ejecutar frontend

Abrir `frontend/index.html` en el navegador.

## Endpoints backend

- `GET /health`
- `GET /state`
- `POST /init`
- `POST /cycle`

### Ejemplo ciclo

```bash
curl -X POST "http://localhost:8787/cycle" \
  -H "Content-Type: application/json" \
  -d '{"new_verse":"Arde la lluvia sobre el vidrio azul"}'
```

## Reglas implementadas

- 20 versos máximo.
- 10 palabras máximo por verso.
- 1 expansión por ciclo.
- 1 poda por ciclo.
- archivo de descartes (`discard_file`).
- reaparición ocasional (~20%).
