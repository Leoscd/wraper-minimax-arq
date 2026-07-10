import { test, expect } from '@playwright/test';

/**
 * E2E del flujo de precios propios en el chat (/asistente).
 *
 * Igual que e2e/chat.spec.ts, /api/chat se mockea con SSE para no depender
 * de la API real de MiniMax: acá lo que se prueba es la carga de la lista
 * (CSV y paste), que el body del request incluya `precios_propios` y que el
 * banner de sesión se pueda quitar.
 */

const CSV_LISTA = [
  'Categoría;Descripción;Precio',
  'CEMENTO;Cemento portland x 50kg;14.000,00',
  'CEMENTO;Cemento portland x 25kg;7.500,00',
  'ARIDOS;Arena gruesa m3;28.000,50',
].join('\n');

function mockChatSSE(body?: { onRequest?: (postData: string) => void }) {
  return async (route: import('@playwright/test').Route) => {
    body?.onRequest?.(route.request().postData() ?? '');
    const sse = [
      'data: {"type":"text","delta":"Según tu lista, el cemento x 50kg cuesta $14.000."}',
      'data: {"type":"tool","name":"buscar_precio"}',
      'data: {"type":"done","tools_invocadas":["buscar_precio"]}',
      '',
    ].join('\n\n');
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: sse,
    });
  };
}

test.describe('Precios propios en el chat (/asistente)', () => {
  test('adjuntar un CSV muestra el banner con el conteo y aviso de sesión', async ({
    page,
  }) => {
    await page.goto('/asistente');

    await page.locator('input[type="file"]').setInputFiles({
      name: 'mis-precios.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(CSV_LISTA, 'utf-8'),
    });

    const banner = page.getByTestId('lista-propia-banner');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('3 precios propios');
    await expect(banner).toContainText('mis-precios.csv');
    await expect(banner).toContainText('solo para esta sesión');
  });

  test('con lista cargada, el request del chat incluye precios_propios', async ({
    page,
  }) => {
    let postData = '';
    await page.route(
      '**/api/chat**',
      mockChatSSE({ onRequest: (d) => (postData = d) })
    );

    await page.goto('/asistente');

    await page.locator('input[type="file"]').setInputFiles({
      name: 'mis-precios.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(CSV_LISTA, 'utf-8'),
    });
    await expect(page.getByTestId('lista-propia-banner')).toBeVisible();

    await page
      .getByPlaceholder(/Preguntá sobre/i)
      .fill('¿Cuánto sale el cemento?');
    await page.getByRole('button', { name: /Enviar/i }).click();

    // La respuesta mockeada aparece y cita la fuente.
    await expect(page.getByText(/Según tu lista/i)).toBeVisible();

    const body = JSON.parse(postData);
    expect(body.precios_propios).toHaveLength(3);
    expect(body.precios_propios[0]).toMatchObject({
      descripcion: 'Cemento portland x 50kg',
      precio: 14000,
      categoria: 'CEMENTO',
    });
  });

  test('pegar una lista ofrece cargarla como precios propios', async ({
    page,
  }) => {
    await page.goto('/asistente');

    const textarea = page.getByPlaceholder(/Preguntá sobre/i);
    await textarea.click();
    // Simular paste real (el handler lee clipboardData del evento).
    await page.evaluate((texto) => {
      const ta = document.querySelector('textarea');
      if (!ta) throw new Error('textarea no encontrado');
      const dt = new DataTransfer();
      dt.setData('text/plain', texto);
      ta.dispatchEvent(
        new ClipboardEvent('paste', {
          clipboardData: dt,
          bubbles: true,
          cancelable: true,
        })
      );
    }, CSV_LISTA);

    const prompt = page.getByTestId('paste-prompt');
    await expect(prompt).toBeVisible();
    await expect(prompt).toContainText('3 items');

    await page
      .getByRole('button', { name: /Cargar como mis precios/i })
      .click();

    const banner = page.getByTestId('lista-propia-banner');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('texto pegado');
  });

  test('el botón Quitar limpia la lista cargada', async ({ page }) => {
    await page.goto('/asistente');

    await page.locator('input[type="file"]').setInputFiles({
      name: 'mis-precios.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(CSV_LISTA, 'utf-8'),
    });
    await expect(page.getByTestId('lista-propia-banner')).toBeVisible();

    await page
      .getByRole('button', { name: /Quitar lista de precios/i })
      .click();
    await expect(page.getByTestId('lista-propia-banner')).not.toBeVisible();
  });

  test('archivo que no es una lista muestra aviso de error', async ({
    page,
  }) => {
    await page.goto('/asistente');

    await page.locator('input[type="file"]').setInputFiles({
      name: 'notas.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('apuntes de la reunión de obra', 'utf-8'),
    });

    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByTestId('lista-propia-banner')).not.toBeVisible();
  });
});
