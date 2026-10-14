import { expect, test } from '@playwright/test';

// La dirección de la API (en QA o local). Sin barra al final.
const API = process.env.API_BASE_URL || 'http://localhost:3000';

async function listar(request) {
    const r = await request.get(`${API}/api/reservations`);
    expect(r.status()).toBe(200);
    const json = await r.json();
    return json.data || [];
}

function generarFechaFuturaValida(diasExtra = 5) {
    const d = new Date();
    d.setDate(d.getDate() + diasExtra);
    d.setHours(14, 30, 0, 0); // Intervalo válido de 30 min (R1)
    return d.toISOString();
}

test.describe('Pruebas de Integración contra la API real', () => {

    test('1. Alta en base de datos real, verificación y borrado', async ({ request }) => {
        const userName = `API User ${Date.now()}`;
        const userEmail = `api_${Date.now()}@test.com`;
        const dateTime = generarFechaFuturaValida(6);

        // Alta (POST)
        const alta = await request.post(`${API}/api/reservations`, {
            data: { userName, userEmail, dateTime }
        });
        expect(alta.status()).toBe(201);
        const creada = await alta.json();
        expect(creada.success).toBe(true);
        const id = creada.data.id;

        // Verificación en la base de datos (GET)
        const lista = await listar(request);
        expect(lista.some(r => r.id === id && (r.userName === userName || r.user_name === userName))).toBe(true);

        // Borrado (DELETE)
        const borrado = await request.delete(`${API}/api/reservations/${id}`);
        expect(borrado.status()).toBe(200);

        // Verificación post-borrado en la base
        const despues = await listar(request);
        expect(despues.some(r => r.id === id)).toBe(false);
    });

    test('2. Alta inválida con nombre vacío es rechazada con 400 y no guarda nada', async ({ request }) => {
        const antes = await listar(request);

        const alta = await request.post(`${API}/api/reservations`, {
            data: {
                userName: '',
                userEmail: 'invalido@test.com',
                dateTime: generarFechaFuturaValida(7)
            }
        });
        expect(alta.status()).toBe(400);

        const despues = await listar(request);
        expect(despues.length).toBe(antes.length);
    });

    test('3. Regla R3: Rechazo de solapamiento de horarios (409 Conflict)', async ({ request }) => {
        const dateTime = generarFechaFuturaValida(8);
        const user1 = `Turno 1 ${Date.now()}`;
        const user2 = `Turno 2 ${Date.now()}`;

        // Crear primera reserva
        const res1 = await request.post(`${API}/api/reservations`, {
            data: { userName: user1, userEmail: 'user1@test.com', dateTime }
        });
        expect(res1.status()).toBe(201);
        const id1 = (await res1.json()).data.id;

        // Intentar crear segunda reserva en el mismo horario exacto
        const res2 = await request.post(`${API}/api/reservations`, {
            data: { userName: user2, userEmail: 'user2@test.com', dateTime }
        });
        expect(res2.status()).toBe(409);

        // Limpieza
        await request.delete(`${API}/api/reservations/${id1}`);
    });

});