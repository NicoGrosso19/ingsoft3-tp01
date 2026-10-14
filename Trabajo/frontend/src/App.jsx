import React, { useState, useEffect } from 'react';
import ReservationForm from './components/ReservationForm';
import ReservationList from './components/ReservationList';

export default function App() {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReservations = async () => {
    try {
      const response = await fetch('/api/reservations');
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setReservations(data.data);
      }
    } catch (err) {
      console.warn('Backend no disponible temporalmente, cargando estado inicial demostrativo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, []);

  const handleReservationCreated = (newRes) => {
    setReservations((prev) => [newRes, ...prev]);
  };

  const handleReservationDeleted = async (id) => {
    try {
      await fetch(`/api/reservations/${id}`, { method: 'DELETE' });
      setReservations((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error('Error al borrar reserva', err);
    }
  };

  return (
    <div className="container">
      <header className="header">
        <h1>Sistema de Reservas y Turnos (v7.0.0)</h1>
        <p>Gestión inteligente y validada de turnos — Desplegado con CD e Imágenes Inmutables</p>
      </header>

      <main className="main-grid">
        <ReservationForm onReservationCreated={handleReservationCreated} />
        <ReservationList reservations={reservations} onDelete={handleReservationDeleted} />
      </main>
    </div>
  );
}