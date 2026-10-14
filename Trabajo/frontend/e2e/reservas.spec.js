import { expect, test } from '@playwright/test';

function obtenerFechaLocalInput(diasExtra = 3) {
    const d = new Date();
    d.setDate(d.getDate() + diasExtra);
    d.setHours(11, 30, 0, 0); // Intervalo de 30 minutos (R1)

    const pad = (n) => String(n).padStart(2, '0');
    const anio = d.getFullYear();
    const mes = pad(d.getMonth() + 1);
    const dia = pad(d.getDate());
    const horas = pad(d.getHours());
    const minutos = pad(d.getMinutes());

    return `${anio}-${mes}-${dia}T${horas}:${minutos}`;
}

test.describe('Pruebas End-to-End con Navegador Real', () => {

    test('1. Crear una reserva la muestra en la lista, y borrarla la elimina', async ({ page }) => {
        await page.goto('/');

        const nombreUnico = `E2E Turno ${Date.now()}`;
        const emailUnico = `e2e_${Date.now()}@test.com`;
        const fechaInput = obtenerFechaLocalInput(4);

        // Llenar campos mediante sus etiquetas accesibles
        await page.getByLabel('Nombre Completo *').fill(nombreUnico);
        await page.getByLabel('Correo Electrónico *').fill(emailUnico);
        await page.getByLabel(/Fecha y Hora/i).fill(fechaInput);

        // Confirmar reserva
        const botonConfirmar = page.getByRole('button', { name: 'Confirmar Reserva' });
        await expect(botonConfirmar).toBeEnabled();
        await botonConfirmar.click();

        // Afirmar que el dato creado por este test es visible en la lista
        await expect(page.getByText(nombreUnico)).toBeVisible();

        // Limpieza: Borrar el turno creado y verificar que desaparece
        await page.getByRole('button', { name: `Borrar ${nombreUnico}` }).click();
        await expect(page.getByText(nombreUnico)).toHaveCount(0);
    });

    test('2. Validaciones en cliente muestran alertas y deshabilitan el envío', async ({ page }) => {
        await page.goto('/');

        // Escribir un email inválido y una fecha con intervalo inválido (no múltiplo de 30)
        await page.getByLabel('Nombre Completo *').fill('Prueba Invalida');
        await page.getByLabel('Correo Electrónico *').fill('email-no-valido');

        // Intervalo inválido (10:17)
        const fechaInvalida = obtenerFechaLocalInput(2).replace(/:30$/, ':17');
        await page.getByLabel(/Fecha y Hora/i).fill(fechaInvalida);

        // El usuario debe ver el mensaje de error de accesibilidad
        await expect(page.getByRole('alert').filter({ hasText: /e-mail válido/i })).toBeVisible();

        // El botón debe permanecer deshabilitado
        const boton = page.getByRole('button', { name: 'Confirmar Reserva' });
        await expect(boton).toBeDisabled();
    });

    test('3. Filtrar turnos por estado en la lista', async ({ page }) => {
        await page.goto('/');

        // Click en filtro Confirmados
        const filtroConfirmados = page.getByRole('button', { name: 'Confirmados' });
        await filtroConfirmados.click();
        await expect(filtroConfirmados).toHaveClass(/active/);

        // Click en filtro Cancelados
        const filtroCancelados = page.getByRole('button', { name: 'Cancelados' });
        await filtroCancelados.click();
        await expect(filtroCancelados).toHaveClass(/active/);

        // Volver al filtro Todos
        const filtroTodos = page.getByRole('button', { name: 'Todos' });
        await filtroTodos.click();
        await expect(filtroTodos).toHaveClass(/active/);
    });

});
