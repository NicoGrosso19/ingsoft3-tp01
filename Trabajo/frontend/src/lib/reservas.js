/**
 * Valida los datos de una reserva según las reglas de negocio (R1 y R2).
 * Es una función pura: no toca base de datos, ni red, ni DOM.
 */
export function validarReserva(userName, userEmail, dateTimeStr, ahora = new Date()) {
  const nombreValido = typeof userName === 'string' && userName.trim().length > 0;
  if (!nombreValido) {
    return { valido: false, error: 'El nombre es obligatorio y no puede estar vacío (R2).' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const emailValido = typeof userEmail === 'string' && emailRegex.test(userEmail.trim());
  if (!emailValido) {
    return { valido: false, error: 'Debe ingresar un correo electrónico válido (R2).' };
  }

  if (!dateTimeStr) {
    return { valido: false, error: 'La fecha y hora son obligatorias (R1).' };
  }

  const fecha = new Date(dateTimeStr);
  if (isNaN(fecha.getTime())) {
    return { valido: false, error: 'Formato de fecha inválido (R1).' };
  }

  if (fecha <= ahora) {
    return { valido: false, error: 'La fecha debe ser en el futuro (R1).' };
  }

  if (fecha.getMinutes() % 30 !== 0) {
    return { valido: false, error: 'Los turnos deben ser en intervalos de 30 minutos (R1).' };
  }

  return { valido: true, error: null };
}

/**
 * Filtra las reservas activas (pendientes o confirmadas).
 */
export function filtrarReservasActivas(reservas) {
  if (!Array.isArray(reservas)) return [];
  return reservas.filter(r => r.status === 'PENDIENTE' || r.status === 'CONFIRMADO');
}

/**
 * Función que realiza la llamada al backend para obtener las reservas de un usuario.
 * Recibe el cliente HTTP por parámetro ('traer') para permitir inyección de dependencias y Mocking.
 */
export async function obtenerReservasDeUsuario(email, traer = fetch) {
  if (!email) return [];
  const respuesta = await traer(`/api/reservations?email=${encodeURIComponent(email)}`);
  const datos = await respuesta.json();
  return datos.data || [];
}

/**
 * Determina la prioridad de atención de una reserva según la anticipación.
 * (Función nueva con múltiples ramas y deliberadamente SIN tests para probar el freno del Quality Gate)
 */
export function calcularPrioridadReserva(dateTimeStr, ahora = new Date()) {
  if (!dateTimeStr) {
    return 'SIN_FECHA';
  }
  const fecha = new Date(dateTimeStr);
  const horasDiferencia = (fecha - ahora) / (1000 * 60 * 60);

  if (horasDiferencia < 0) {
    return 'VENCIDA';
  }
  if (horasDiferencia <= 4) {
    return 'URGENTE';
  }
  if (horasDiferencia <= 24) {
    return 'ALTA';
  }
  if (horasDiferencia <= 72) {
    return 'MEDIA';
  }
  return 'NORMAL';
}

/**
 * Calcula un porcentaje de descuento según días de anticipación de la reserva.
 * (Función nueva SIN tests para mantener el PR #2 abierto en rojo para la defensa)
 */
export function calcularDescuentoPorAnticipacion(diasAnticipacion, esClienteFrecuente = false) {
  if (diasAnticipacion <= 0) {
    return 0;
  }
  if (diasAnticipacion >= 30) {
    return esClienteFrecuente ? 25 : 20;
  }
  if (diasAnticipacion >= 15) {
    return esClienteFrecuente ? 15 : 10;
  }
  if (diasAnticipacion >= 7) {
    return esClienteFrecuente ? 10 : 5;
  }
  return esClienteFrecuente ? 5 : 0;
}


