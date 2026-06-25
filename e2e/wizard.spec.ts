import { test, expect } from '@playwright/test';

test.describe('Wizard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/generar');
  });

  test('muestra los 5 pasos del wizard', async ({ page }) => {
    await expect(page.getByText(/01/).first()).toBeVisible();
    await expect(page.getByText(/02/).first()).toBeVisible();
    await expect(page.getByText(/03/).first()).toBeVisible();
    await expect(page.getByText(/04/).first()).toBeVisible();
    await expect(page.getByText(/05/).first()).toBeVisible();

    await expect(page.getByText(/Proyecto/i).first()).toBeVisible();
    await expect(page.getByText(/Empresa/i).first()).toBeVisible();
    await expect(page.getByText(/Archivos/i).first()).toBeVisible();
    await expect(page.getByText(/Estilo/i).first()).toBeVisible();
    await expect(page.getByText(/Marca/i).first()).toBeVisible();
  });

  test('valida campos requeridos en paso 1', async ({ page }) => {
    const nextBtn = page.getByRole('button', { name: /Siguiente/i });
    await expect(nextBtn).toBeDisabled();

    await page.getByLabel(/Nombre del proyecto/).fill('Casa Test E2E');
    await page.getByLabel(/Descripción/).fill('Una descripción de prueba para el e2e test.');
    await page.getByLabel(/Arquitecto/).fill('Arq. Test');
    await page.getByLabel(/Ubicación/).fill('Tucumán, Argentina');
    await page.getByLabel(/Email de contacto/).fill('test@example.com');

    await expect(nextBtn).toBeEnabled();
  });

  test('navega entre pasos correctamente', async ({ page }) => {
    await page.getByLabel(/Nombre del proyecto/).fill('Casa Test E2E');
    await page.getByLabel(/Descripción/).fill('Una descripción de prueba para el e2e test.');
    await page.getByLabel(/Arquitecto/).fill('Arq. Test');
    await page.getByLabel(/Ubicación/).fill('Tucumán, Argentina');
    await page.getByLabel(/Email de contacto/).fill('test@example.com');

    await page.getByRole('button', { name: /Siguiente/i }).click();

    await expect(page.getByText(/Branding de la empresa/i)).toBeVisible();

    await page.getByLabel(/Nombre de la empresa/).fill('Estudio Test');

    await page.getByRole('button', { name: /Siguiente/i }).click();
    await expect(page.getByText(/Archivos del proyecto/i)).toBeVisible();

    await page.getByRole('button', { name: /Atrás/i }).click();
    await expect(page.getByText(/Branding de la empresa/i)).toBeVisible();
  });
});
