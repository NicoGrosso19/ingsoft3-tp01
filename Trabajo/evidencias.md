# Registro de Evidencias de Pruebas y Validación

## 1. Estructura del Proyecto Creada

```
/
├── decisiones.md
├── evidencias.md
├── backend/
│   ├── .env.example
│   ├── package.json
│   └── src/
│       ├── app.js
│       ├── db.js
│       └── controllers/
│           └── reservationController.js
└── frontend/
    ├── index.html
    ├── package.json
    └── src/
        ├── App.jsx
        └── components/
            ├── ReservationForm.jsx
            └── ReservationList.jsx
```

---

## 2. Matriz de Cobertura de Reglas de Negocio (Backend)

| Regla | Descripción | Endpoint Responsable | Verificación |
|---|---|---|---|
| **R1** | Fecha futura e intervalo de 30 min | `POST /api/reservations` | Rechaza minutos distintos a `00` o `30` y fechas pasadas |
| **R2** | Nombre no vacío y E-mail válido | `POST /api/reservations` | Regex de e-mail y verificación `trim()` |
| **R3** | Sin solapamiento horario | `POST /api/reservations` | Consulta SQL en BD / verificación de rango |
| **R4** | No transición desde 'CANCELADO' | `PATCH /api/reservations/:id/status` | Inmutabilidad si el estado previo es `CANCELADO` |
| **R5** | Bloqueo de cancelación < 2 horas | `PATCH /api/reservations/:id/cancel` | Diferencia entre `fechaHora` y `Date.now()` < 2hs |
| **R6** | Máximo 3 turnos activos/día por usuario | `POST /api/reservations` | Conteo de turnos activos por e-mail en la misma fecha |

---

## 3. Guía de Ejecución Local

### Backend:
```bash
cd backend
npm install
cp .env.example .env
# Configurar credenciales de PostgreSQL en .env
npm start
```

### Frontend:
```bash
cd frontend
npm install
npm run dev
```
