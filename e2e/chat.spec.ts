import { test, expect } from '@playwright/test';

test.describe('Chat asistente (/asistente)', () => {
  test('carga con el texto de capacidades en estado vacío', async ({
    page,
  }) => {
    await page.goto('/asistente');

    await expect(page.getByPlaceholder(/Preguntá sobre/i)).toBeVisible();

    // El estado vacío explica qué puede hacer el asistente, sin chips.
    await expect(page.getByText(/herramientas determinísticas/i)).toBeVisible();
    const terminos = page.locator('.chat-capacidad dt');
    await expect(terminos).toHaveText([
      'Precios',
      'Cómputos',
      'Obra',
      'Entregables',
    ]);
  });

  test('input vacío deshabilita el botón Enviar', async ({ page }) => {
    await page.goto('/asistente');

    const enviar = page.getByRole('button', { name: /Enviar/i });
    await expect(enviar).toBeVisible();
    await expect(enviar).toBeDisabled();

    await page.getByPlaceholder(/Preguntá sobre/i).fill('test');
    await expect(enviar).toBeEnabled();
  });

  test('enviar una consulta muestra la respuesta + chips de tools', async ({
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

    await page
      .getByPlaceholder(/Preguntá sobre/i)
      .fill('¿Cuántas bolsas de 50kg de cemento lleva un m³ de H-21?');
    await page.getByRole('button', { name: /Enviar/i }).click();

    // El mensaje del usuario aparece.
    await expect(
      page.getByText(/bolsas de 50kg de cemento lleva un m³/i)
    ).toBeVisible();

    // La respuesta mockeada del asistente aparece.
    await expect(page.getByText(/lleva 7 bolsas de 50kg/i)).toBeVisible();

    // El chip de la tool usada aparece (transparencia).
    await expect(page.getByText(/calcular_hormigon/i)).toBeVisible();
  });
});
