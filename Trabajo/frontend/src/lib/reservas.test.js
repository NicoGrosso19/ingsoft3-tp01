import { describe, it, expect, vi } from 'vitest';
import { validarReserva, filtrarReservasActivas, obtenerReservasDeUsuario, calcularPrioridadReserva } from './reservas.js';

describe('validarReserva - Lógica Pura (AAA)', () => {
  const ahoraFija = new Date('2026-09-23T12:00:00.000Z');

  it('valida exitosamente una reserva con todos los campos correctos', () => {
    // Arrange
    const nombre = 'Juan Pérez';
    const email = 'juan@example.com';
    const fecha = '2026-09-24T15:30:00.000Z'; // Futuro y múltiplo de 30 min

    // Act
    const resultado = validarReserva(nombre, email, fecha, ahoraFija);

    // Assert
    expect(resultado.valido).toBe(true);
    expect(resultado.error).toBeNull();
  });

  it.each([
    ['nombre vacío', '', 'ana@test.com', '2026-09-24T10:00:00.000Z'],
    ['nombre con solo espacios', '   ', 'ana@test.com', '2026-09-24T10:00:00.000Z'],
    ['email sin arroba', 'Carlos', 'carlos-invalido', '2026-09-24T10:00:00.000Z'],
    ['email sin dominio', 'Carlos', 'carlos@', '2026-09-24T10:00:00.000Z'],
  ])('rechaza entrada inválida por regla R2: %s', (_caso, nombre, email, fecha) => {
    // Act
    const resultado = validarReserva(nombre, email, fecha, ahoraFija);

    // Assert
    expect(resultado.valido).toBe(false);
    expect(resultado.error).toContain('R2');
  });

  it('rechaza una reserva con fecha en el pasado (Regla R1)', () => {
    // Arrange
    const fechaPasada = '2026-09-20T10:00:00.000Z';

    // Act
    const resultado = validarReserva('Ana', 'ana@test.com', fechaPasada, ahoraFija);

    // Assert
    expect(resultado.valido).toBe(false);
    expect(resultado.error).toBe('La fecha debe ser en el futuro (R1).');
  });

  it('rechaza una reserva con minutos fuera del intervalo de 30 min (Regla R1)', () => {
    // Arrange: 10:17 no es múltiplo de 30
    const fechaIntervaloInvalido = '2026-09-24T10:17:00.000Z';

    // Act
    const resultado = validarReserva('Ana', 'ana@test.com', fechaIntervaloInvalido, ahoraFija);

    // Assert
    expect(resultado.valido).toBe(false);
    expect(resultado.error).toBe('Los turnos deben ser en intervalos de 30 minutos (R1).');
  });
});

describe('filtrarReservasActivas', () => {
  it('excluye reservas canceladas y mantiene pendientes y confirmadas', () => {
    // Arrange
    const reservas = [
      { id: 1, status: 'PENDIENTE' },
      { id: 2, status: 'CANCELADO' },
      { id: 3, status: 'CONFIRMADO' }
    ];

    // Act
    const resultado = filtrarReservasActivas(reservas);

    // Assert
    expect(resultado).toHaveLength(2);
    expect(resultado.map(r => r.id)).toEqual([1, 3]);
  });
});

describe('obtenerReservasDeUsuario - Test con MOCK (vi.fn)', () => {
  it('llama a la API con la URL correcta y devuelve las reservas del usuario', async () => {
    // Arrange: Creamos una función espía/mock que simula la respuesta de fetch
    const mockTraer = vi.fn().mockResolvedValue({
      json: async () => ({
        data: [
          { id: 10, userName: 'Laura', dateTime: '2026-09-25T10:00:00Z', status: 'CONFIRMADO' }
        ]
      })
    });

    // Act
    const resultado = await obtenerReservasDeUsuario('laura@test.com', mockTraer);

    // Assert: Verificamos el resultado devuelto y la interacción
    expect(resultado).toHaveLength(1);
    expect(resultado[0].userName).toBe('Laura');

    // Comprobamos que el cliente HTTP haya sido invocado con la URL exacta esperada
    expect(mockTraer).toHaveBeenCalledWith('/api/reservations?email=laura%40test.com');
  });
});

describe('calcularPrioridadReserva - Tests para recuperar cobertura', () => {
  const ahora = new Date('2026-09-23T12:00:00.000Z');

  it('devuelve SIN_FECHA si no se pasa string de fecha', () => {
    expect(calcularPrioridadReserva('', ahora)).toBe('SIN_FECHA');
    expect(calcularPrioridadReserva(null, ahora)).toBe('SIN_FECHA');
  });

  it('devuelve VENCIDA si la fecha es anterior a ahora', () => {
    const fechaPasada = '2026-09-23T10:00:00.000Z';
    expect(calcularPrioridadReserva(fechaPasada, ahora)).toBe('VENCIDA');
  });

  it('devuelve URGENTE si faltan 4 horas o menos', () => {
    const fechaUrgente = '2026-09-23T15:00:00.000Z'; // 3 horas de diferencia
    expect(calcularPrioridadReserva(fechaUrgente, ahora)).toBe('URGENTE');
  });

  it('devuelve ALTA si faltan entre 4 y 24 horas', () => {
    const fechaAlta = '2026-09-24T06:00:00.000Z'; // 18 horas
    expect(calcularPrioridadReserva(fechaAlta, ahora)).toBe('ALTA');
  });

  it('devuelve MEDIA si faltan entre 24 y 72 horas', () => {
    const fechaMedia = '2026-09-25T12:00:00.000Z'; // 48 horas
    expect(calcularPrioridadReserva(fechaMedia, ahora)).toBe('MEDIA');
  });

  it('devuelve NORMAL si faltan más de 72 horas', () => {
    const fechaNormal = '2026-09-30T12:00:00.000Z'; // 7 días
    expect(calcularPrioridadReserva(fechaNormal, ahora)).toBe('NORMAL');
  });
});
