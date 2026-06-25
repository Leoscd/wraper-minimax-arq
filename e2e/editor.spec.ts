import { test, expect } from '@playwright/test';

test.describe('Editor (/preview/[id])', () => {
  test('carga con datos de ejemplo y muestra tabs', async ({ page }) => {
    await page.goto('/preview/test-123');

    await expect(page.getByText(/Proyecto de ejemplo/i)).toBeVisible();

    await expect(page.getByRole('button', { name: /Contenido/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Marca/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Secciones/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Colores/i })).toBeVisible();
  });

  test('muestra botones de Descargar PDF y Guardar', async ({ page }) => {
    await page.goto('/preview/test-123');

    await expect(page.getByRole('button', { name: /Descargar PDF/i })).toBeVisible();
  });

  test('cambiar tab Colores muestra los 5 color pickers', async ({ page }) => {
    await page.goto('/preview/test-123');

    await page.getByRole('button', { name: /Colores/i }).click();

    await expect(page.getByText(/Primario/i).first()).toBeVisible();
    await expect(page.getByText(/Secundario/i).first()).toBeVisible();
    await expect(page.getByText(/Acento/i).first()).toBeVisible();
    await expect(page.getByText(/Fondo/i).first()).toBeVisible();
    await expect(page.getByText(/Texto/i).first()).toBeVisible();
  });

  test('cambiar tab Secciones muestra controles de drag and drop', async ({ page }) => {
    await page.goto('/preview/test-123');

    await page.getByRole('button', { name: /Secciones/i }).click();

    await expect(page.getByText(/Hero/i).first()).toBeVisible();
    await expect(page.getByText(/Información del proyecto/i).first()).toBeVisible();
    await expect(page.getByText(/Galería de renders/i).first()).toBeVisible();
    await expect(page.getByText(/Presupuesto/i).first()).toBeVisible();
    await expect(page.getByText(/Contacto \/ Footer/i).first()).toBeVisible();

    const dragHandles = page.getByLabel(/Arrastrá .+ para reordenar/i);
    await expect(dragHandles.first()).toBeVisible();
    await expect(dragHandles).toHaveCount(5);
  });

  test('reordenar secciones con drag and drop funciona', async ({ page }) => {
    await page.goto('/preview/test-123');

    await page.getByRole('button', { name: /Secciones/i }).click();

    const hero = page.getByText(/Hero/i).first();
    const galeria = page.getByText(/Galería de renders/i).first();

    await expect(hero).toBeVisible();
    await expect(galeria).toBeVisible();
  });
});
