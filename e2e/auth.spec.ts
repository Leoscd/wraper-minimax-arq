import { test, expect } from '@playwright/test';

test.describe('Login page', () => {
  test('muestra el botón de Google y el branding', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByText(/Iniciar sesión/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Continuar con Google/i })).toBeVisible();

    await expect(page.getByText(/SoyLeo/).first()).toBeVisible();
  });
});

test.describe('Dashboard (sin auth)', () => {
  test('redirige a /login si no estás autenticado', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain('/login');
  });
});
