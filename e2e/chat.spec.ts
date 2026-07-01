import { test, expect } from '@playwright/test';

test.describe('Chat asistente (/asistente)', () => {
  test('carga con sugerencias en estado vacío', async ({ page }) => {
    await page.goto('/asistente');

    await expect(page.getByPlaceholder(/Preguntá sobre/i)).toBeVisible();

    await expect(
      page.getByRole('button', { name: /bolsas de 50kg/i })
    ).toBeVisible();

    await expect(
      page.getByRole('button', { name: /losa H-21/i })
    ).toBeVisible();
  });

  test('input vacío deshabilita el botón Enviar', async ({ page }) => {
    await page.goto('/asistente');

    const enviar = page.getByRole('button', { name: /Enviar/i });
    await expect(enviar).toBeVisible();
    await expect(enviar).toBeDisabled();

    await page.getByPlaceholder(/Preguntá sobre/i).fill('test');
    await expect(enviar).toBeEnabled();
  });

  test('click en sugerencia la envía y muestra la respuesta + chips de tools', async ({
    page,
  }) => {
    // Mockeamos /api/chat (streaming SSE) para que el test sea determinístico y
    // no dependa de la API key de MiniMax (M3 real). El cliente lee eventos
    // `data: {json}` separados por línea en blanco.
    await page.route('**/api/chat**', async (route) => {
      const sse = [
        'data: {"type":"text","delta":"Un m³ de hormigón H-21 lleva 7 bolsas de 50kg de cemento."}',
        'data: {"type":"tool","name":"calcular_hormigon"}',
        'data: {"type":"done","tools_invocadas":["calcular_hormigon"]}',
        '',
      ].join('\n\n');
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: sse,
      });
    });

    await page.goto('/asistente');

    await page.getByRole('button', { name: /bolsas de 50kg/i }).click();

    // El mensaje del usuario aparece (texto de la sugerencia).
    await expect(
      page.getByText(/bolsas de 50kg de cemento lleva un m³/i)
    ).toBeVisible();

    // La respuesta mockeada del asistente aparece.
    await expect(page.getByText(/lleva 7 bolsas de 50kg/i)).toBeVisible();

    // El chip de la tool usada aparece (transparencia).
    await expect(page.getByText(/calcular_hormigon/i)).toBeVisible();
  });
});
