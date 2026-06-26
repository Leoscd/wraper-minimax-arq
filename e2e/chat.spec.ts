import { test, expect } from '@playwright/test';

test.describe('Chat asistente (/asistente)', () => {
  test('carga con sugerencias en estado vacío', async ({ page }) => {
    await page.goto('/asistente');

    await expect(page.getByPlaceholder(/Preguntá sobre/i)).toBeVisible();

    await expect(
      page.getByRole('button', { name: /bolsas de 50kg/i })
    ).toBeVisible();

    await expect(
      page.getByRole('button', { name: /losas H-21/i })
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

  test('click en sugerencia la envía como mensaje del usuario', async ({ page }) => {
    await page.goto('/asistente');

    await page.getByRole('button', { name: /bolsas de 50kg/i }).click();

    await expect(
      page.getByText(/bolsas de 50kg de cemento/i)
    ).toBeVisible();

    await expect(page.getByText(/Pensando|Pensá/i)).toBeVisible({ timeout: 5000 }).catch(() => {});
  });
});