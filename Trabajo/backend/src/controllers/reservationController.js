const db = require('../db');

// Almacenamiento en memoria para demostración/desarrollo si PostgreSQL no está disponible
let mockReservations = [
  {
    id: 1,
    userName: 'Juan Pérez',
    userEmail: 'juan@example.com',
    dateTime: new Date(Date.now() + 86400000).toISOString().slice(0, 16) + ':00', // Mañana
    status: 'CONFIRMADO',
    createdAt: new Date().toISOString()
  },
  {
    id: 2,
    userName: 'Maria Gomez',
    userEmail: 'maria@example.com',
    dateTime: new Date(Date.now() + 172800000).toISOString().slice(0, 16) + ':00', // Pasado mañana
    status: 'PENDIENTE',
    createdAt: new Date().toISOString()
  }
];

/**
 * Auxiliar para validar sintaxis de email (R2)
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return typeof email === 'string' && emailRegex.test(email.trim());
}

/**
 * 1. Obtener todas las reservas (GET /api/reservations)
 */
async function getReservations(req, res) {
  try {
    // Intentar obtener desde PostgreSQL
    const result = await db.query('SELECT * FROM reservations ORDER BY date_time ASC');
    return res.status(200).json({ success: true, data: result.rows });
  } catch (err) {
    // Fallback a memoria si la base de datos aún no ha sido migrada o conectada
    return res.status(200).json({
      success: true,
      data: mockReservations,
      warning: 'Usando datos en memoria (PostgreSQL no conectado o sin tabla creadas)'
    });
  }
}

/**
 * 2. Crear una nueva reserva (POST /api/reservations)
 * Aplica Reglas: R1, R2, R3, R6
 */
async function createReservation(req, res) {
  const { userName, userEmail, dateTime } = req.body;

  // --- REGLA 2 (R2): Validación de Email y Nombre ---
  if (!userName || typeof userName !== 'string' || userName.trim().length === 0) {
    return res.status(400).json({
      success: false,
      code: 'R2_INVALID_NAME',
      message: 'Regla 2 (R2): El nombre del usuario es obligatorio y no puede estar vacío.'
    });
  }

  if (!isValidEmail(userEmail)) {
    return res.status(400).json({
      success: false,
      code: 'R2_INVALID_EMAIL',
      message: 'Regla 2 (R2): Debe proporcionar un correo electrónico válido.'
    });
  }

  // --- REGLA 1 (R1): Fecha futura e intervalo de 30 minutos ---
  if (!dateTime) {
    return res.status(400).json({
      success: false,
      code: 'R1_REQUIRED_DATE',
      message: 'Regla 1 (R1): La fecha y hora son obligatorias.'
    });
  }

  const reservationDate = new Date(dateTime);
  const now = new Date();

  if (isNaN(reservationDate.getTime()) || reservationDate <= now) {
    return res.status(400).json({
      success: false,
      code: 'R1_PAST_DATE',
      message: 'Regla 1 (R1): La fecha y hora de la reserva deben ser en el futuro.'
    });
  }

  const minutes = reservationDate.getMinutes();
  const seconds = reservationDate.getSeconds();
  if (minutes % 30 !== 0 || seconds !== 0) {
    return res.status(400).json({
      success: false,
      code: 'R1_INVALID_INTERVAL',
      message: 'Regla 1 (R1): Los turnos deben reservarse en intervalos exactos de 30 minutos (ej. 10:00, 10:30).'
    });
  }

  const formattedDateTime = reservationDate.toISOString();
  const targetDateStr = reservationDate.toISOString().slice(0, 10); // YYYY-MM-DD

  // Obtener lista actual (DB o Memoria)
  let activeReservations = [];
  let isDb = true;
  try {
    const res = await db.query(
      "SELECT * FROM reservations WHERE status IN ('PENDIENTE', 'CONFIRMADO')"
    );
    activeReservations = res.rows;
  } catch (err) {
    isDb = false;
    activeReservations = mockReservations.filter(r => r.status !== 'CANCELADO');
  }

  // --- REGLA 3 (R3): Evitar solapamiento de horarios ---
  const overlap = activeReservations.find(r => {
    const rDate = new Date(r.date_time || r.dateTime).toISOString();
    return rDate === formattedDateTime;
  });

  if (overlap) {
    return res.status(409).json({
      success: false,
      code: 'R3_SCHEDULE_OVERLAP',
      message: 'Regla 3 (R3): Ya existe un turno activo agendado para ese horario exacto.'
    });
  }

  // --- REGLA 6 (R6): Máximo 3 turnos activos por usuario al día ---
  const userDailyActiveCount = activeReservations.filter(r => {
    const rEmail = (r.user_email || r.userEmail).toLowerCase();
    const rDateStr = new Date(r.date_time || r.dateTime).toISOString().slice(0, 10);
    return rEmail === userEmail.trim().toLowerCase() && rDateStr === targetDateStr;
  }).length;

  if (userDailyActiveCount >= 3) {
    return res.status(422).json({
      success: false,
      code: 'R6_MAX_DAILY_RESERVATIONS',
      message: 'Regla 6 (R6): El usuario ha alcanzado el límite máximo de 3 turnos activos para este día.'
    });
  }

  // Creación de la reserva
  const newReservation = {
    userName: userName.trim(),
    userEmail: userEmail.trim().toLowerCase(),
    dateTime: formattedDateTime,
    status: 'PENDIENTE',
    createdAt: new Date().toISOString()
  };

  if (isDb) {
    try {
      const insertQuery = `
        INSERT INTO reservations (user_name, user_email, date_time, status, created_at)
        VALUES ($1, $2, $3, $4, $5) RETURNING *
      `;
      const values = [newReservation.userName, newReservation.userEmail, newReservation.dateTime, newReservation.status, newReservation.createdAt];
      const result = await db.query(insertQuery, values);
      return res.status(201).json({ success: true, data: result.rows[0] });
    } catch (dbErr) {
      return res.status(500).json({ success: false, message: 'Error en la base de datos', error: dbErr.message });
    }
  } else {
    const mockId = mockReservations.length + 1;
    const created = { id: mockId, ...newReservation };
    mockReservations.push(created);
    return res.status(201).json({ success: true, data: created });
  }
}

/**
 * 3. Actualizar estado / Cancelar reserva (PATCH /api/reservations/:id/status)
 * Aplica Reglas: R4, R5
 */
async function updateReservationStatus(req, res) {
  const { id } = req.params;
  const { newStatus } = req.body;

  let existing = null;
  let isDb = true;

  try {
    const result = await db.query('SELECT * FROM reservations WHERE id = $1', [id]);
    if (result.rows.length > 0) existing = result.rows[0];
  } catch (err) {
    isDb = false;
    existing = mockReservations.find(r => r.id === parseInt(id, 10));
  }

  if (!existing) {
    return res.status(404).json({ success: false, message: 'Reserva no encontrada.' });
  }

  const currentStatus = existing.status;
  const reservationTime = new Date(existing.date_time || existing.dateTime).getTime();
  const nowTime = Date.now();

  // --- REGLA 4 (R4): Transición de estado prohibida desde Cancelado ---
  if (currentStatus === 'CANCELADO') {
    return res.status(400).json({
      success: false,
      code: 'R4_FORBIDDEN_TRANSITION',
      message: 'Regla 4 (R4): Una reserva en estado CANCELADO no puede cambiar a ningún otro estado.'
    });
  }

  // --- REGLA 5 (R5): Bloqueo de cancelación si faltan < 2hs ---
  if (newStatus === 'CANCELADO') {
    const twoHoursInMs = 2 * 60 * 60 * 1000;
    if (reservationTime - nowTime < twoHoursInMs) {
      return res.status(422).json({
        success: false,
        code: 'R5_CANCELLATION_LOCKED',
        message: 'Regla 5 (R5): No se puede cancelar la reserva si faltan menos de 2 horas para el turno.'
      });
    }
  }

  if (isDb) {
    try {
      const updateResult = await db.query(
        'UPDATE reservations SET status = $1 WHERE id = $2 RETURNING *',
        [newStatus, id]
      );
      return res.status(200).json({ success: true, data: updateResult.rows[0] });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  } else {
    existing.status = newStatus;
    return res.status(200).json({ success: true, data: existing });
  }
}

module.exports = {
  getReservations,
  createReservation,
  updateReservationStatus
};
