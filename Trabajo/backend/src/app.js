const express = require('express');
const cors = require('cors');
require('dotenv').config();

const {
  getReservations,
  createReservation,
  updateReservationStatus
} = require('./controllers/reservationController');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Endpoints principales
app.get('/api/reservations', getReservations);
app.post('/api/reservations', createReservation);
app.patch('/api/reservations/:id/status', updateReservationStatus);

// Endpoint de prueba de salud
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'API de Reservas y Turnos funcionando' });
});

// Inicialización del servidor
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Servidor de Reservas corriendo en el puerto ${PORT}`);
  });
}

module.exports = app;
