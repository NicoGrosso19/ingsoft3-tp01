import React, { useState } from 'react';

export default function ReservationList({ reservations, onStatusChange }) {
  const [filter, setFilter] = useState('Todos');

  const filteredReservations = reservations.filter((item) => {
    const statusUpper = (item.status || '').toUpperCase();
    if (filter === 'Confirmados') return statusUpper === 'CONFIRMADO';
    if (filter === 'Cancelados') return statusUpper === 'CANCELADO';
    return true; // 'Todos'
  });

  const getStatusBadge = (status) => {
    const st = (status || '').toUpperCase();
    switch (st) {
      case 'CONFIRMADO':
        return <span className="badge badge-confirmado">● CONFIRMADO</span>;
      case 'CANCELADO':
        return <span className="badge badge-cancelado">● CANCELADO</span>;
      case 'PENDIENTE':
      default:
        return <span className="badge badge-pendiente">● PENDIENTE</span>;
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('es-ES', {
        dateStyle: 'medium',
        timeStyle: 'short'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="card">
      <h2 className="card-title">
        <span>📋</span> Turnos Agendados
      </h2>

      {/* Filtro interactivo: Todos, Confirmados, Cancelados */}
      <div className="filters-container">
        {['Todos', 'Confirmados', 'Cancelados'].map((f) => (
          <button
            key={f}
            id={`filter-${f.toLowerCase()}`}
            className={`filter-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {filteredReservations.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem 0' }}>
          No hay reservas registradas para el filtro seleccionado ("{filter}").
        </p>
      ) : (
        <div className="reservation-list">
          {filteredReservations.map((res) => {
            const resId = res.id;
            const name = res.user_name || res.userName;
            const email = res.user_email || res.userEmail;
            const dt = res.date_time || res.dateTime;
            const status = res.status;

            return (
              <div key={resId} className="reservation-item">
                <div className="reservation-info">
                  <h3>{name}</h3>
                  <p>{email}</p>
                  <p style={{ marginTop: '0.25rem', color: '#a5b4fc' }}>
                    🕒 {formatDateTime(dt)}
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                  {getStatusBadge(status)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
