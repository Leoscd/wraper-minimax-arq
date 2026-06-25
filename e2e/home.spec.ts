import { test, expect } from '@playwright/test';

test.describe('Home page', () => {
  test('carga correctamente con título y CTA', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/SoyLeo AI/);

    await expect(
      page.getByRole('heading', { level: 1 })
    ).toContainText(/Presentaciones/);

    await expect(
      page.getByRole('link', { name: /Generar presentación/i })
    ).toBeVisible();

    await expect(page.getByText(/soyleoai\.com/i)).toBeVisible();
  });

  test('muestra las 3 features principales', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText(/Cómputos precisos/i)).toBeVisible();
    await expect(page.getByText(/Presupuestos completos/i)).toBeVisible();
    await expect(page.getByText(/Diseño editorial/i)).toBeVisible();
  });
});
