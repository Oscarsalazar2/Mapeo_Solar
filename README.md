# Mapeo Solar — UI + API + DB

## Requisitos
- Node 18+
- PostgreSQL 14+

## 1) Base de datos
```bash
createdb mapeo_solar
psql mapeo_solar -f db/schema.sql
psql mapeo_solar -f db/views.sql
```
(Ingresa datos de prueba en `readings` si quieres ver reportes reales).

## 2) Servidor
```bash
cd server
cp .env.example .env   # edita si es necesario
npm i
npm start
```
Esto levanta la API en `http://localhost:3000`.

## 3) Frontend
```bash
cd frontend
npm i
npm run dev
```
Abre `http://localhost:5173`

El `vite.config.js` ya **proxy** `/api` y `/ws` al server.

## Endpoints clave
- `GET /api/heatmap` → última lectura por sensor (para el heatmap)
- `GET /api/series?sensorId=1&from=...&to=...` → serie por sensor
- `GET /api/reports?range=day|week|month` → agregados

## Notas
- La UI usa **Tailwind** (ya configurado).  
- La pestaña **Reportes** funciona con mock interno; si quieres usar tu API, cambia a un `fetch` contra `/api/reports` y pasa los datos al componente.
