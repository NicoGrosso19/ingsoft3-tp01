import React, { useState } from 'react';

export default function ReservationForm({ onReservationCreated }) {
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [serverMessage, setServerMessage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validaciones en cliente
  const isNameValid = userName.trim().length > 0;
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail.trim());

  let isDateValid = false;
  let dateErrorMessage = '';

  if (dateTime) {
    const selectedDate = new Date(dateTime);
    const now = new Date();
    if (selectedDate <= now) {
      dateErrorMessage = 'La fecha debe ser en el futuro (R1).';
    } else if (selectedDate.getMinutes() % 30 !== 0) {
      dateErrorMessage = 'Debes seleccionar intervalos de 30 min (ej. 10:00, 10:30) (R1).';
    } else {
      isDateValid = true;
    }
  }

  // El botón permanece deshabilitado si los campos no cumplen las reglas
  const isFormValid = isNameValid && isEmailValid && isDateValid;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;

    setIsSubmitting(true);
    setServerMessage(null);

    try {
      const response = await fetch('http://localhost:3000/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName, userEmail, dateTime })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setServerMessage({ type: 'success', text: '¡Reserva creada exitosamente!' });
        setUserName('');
        setUserEmail('');
        setDateTime('');
        if (onReservationCreated) onReservationCreated(data.data);
      } else {
        setServerMessage({
          type: 'error',
          text: data.message || 'Error al procesar la reserva.'
        });
      }
    } catch (err) {
      setServerMessage({
        type: 'error',
        text: 'No se pudo conectar con el servidor backend (http://localhost:3000).'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="card">
      <h2 className="card-title">
        <span>📅</span> Agendar Nuevo Turno
      </h2>

      {serverMessage && (
        <div className={`alert-message ${serverMessage.type === 'success' ? 'alert-success' : 'alert-error'}`}>
          {serverMessage.text}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="userName">Nombre Completo *</label>
          <input
            id="userName"
            type="text"
            className={`form-control ${userName && !isNameValid ? 'invalid' : ''}`}
            placeholder="Ej: Laura Gómez"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
          />
          {userName && !isNameValid && (
            <p className="hint-text error">El nombre es requerido (R2).</p>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="userEmail">Correo Electrónico *</label>
          <input
            id="userEmail"
            type="email"
            className={`form-control ${userEmail && !isEmailValid ? 'invalid' : ''}`}
            placeholder="ejemplo@dominio.com"
            value={userEmail}
            onChange={(e) => setUserEmail(e.target.value)}
          />
          {userEmail && !isEmailValid && (
            <p className="hint-text error">Ingrese un e-mail válido (R2).</p>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="dateTime">Fecha y Hora del Turno (Intervalos de 30 min) *</label>
          <input
            id="dateTime"
            type="datetime-local"
            step="1800"
            className={`form-control ${dateTime && !isDateValid ? 'invalid' : ''}`}
            value={dateTime}
            onChange={(e) => setDateTime(e.target.value)}
          />
          {dateTime && !isDateValid ? (
            <p className="hint-text error">{dateErrorMessage}</p>
          ) : (
            <p className="hint-text">Intervalos válidos: hh:00 o hh:30 (R1).</p>
          )}
        </div>

        <button
          id="submitReservationBtn"
          type="submit"
          className="btn-primary"
          disabled={!isFormValid || isSubmitting}
        >
          {isSubmitting ? 'Procesando...' : 'Confirmar Reserva'}
        </button>
      </form>
    </div>
  );
}
