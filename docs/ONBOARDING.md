# Onboarding — SoyLeo AI · Presentador

> Cómo levantar el proyecto desde cero en otra máquina y cómo trabajar en equipo.
> Para entender QUÉ es el proyecto, su arquitectura y el protocolo de código, leer
> primero [`AVANCE-Y-PROTOCOLO.md`](./AVANCE-Y-PROTOCOLO.md).

---

## 1. Clonar y preparar

```bash
git clone https://github.com/Leoscd/wraper-minimax-arq.git
cd wraper-minimax-arq
git checkout main
git pull origin main          # asegurate de tener lo último

npm install                   # instala dependencias
```

> **Nota rollup (linux/WSL):** si `npm install` falla con un error de
> `@rollup/rollup-linux-x64-gnu`, borrá `node_modules` y `package-lock.json`,
> y reinstalá. El binario de rollup es por-plataforma, así que cada máquina
> debe correr su propio `npm install` (no copiar `node_modules`).

---

## 2. Configurar `.env.local`

El archivo `.env.local` **NO está en el repo** (tiene secretos, está gitignoreado).
Cada uno crea el suyo:

```bash
cp .env.local.example .env.local
```

Y completá las claves. Mínimas para que arranque la generación:

| Var | De dónde se saca |
|---|---|
| `ANTHROPIC_API_KEY` | Panel de MiniMax: https://platform.minimaxi.com/user-center/payment/token-plan |
| `ANTHROPIC_BASE_URL` | **Ya viene correcta**: `https://api.minimax.io/anthropic` (¡no `.minimaxi.com` → 401!) |

Para login + dashboard (opcional para probar solo la generación):

| Var | De dónde |
|---|---|
| `AUTH_SECRET` | String random largo (ej. `openssl rand -base64 32`) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google Cloud Console → OAuth 2.0. Redirect URI: `http://localhost:3000/api/auth/callback/google` |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | Vercel Dashboard → Storage → KV |

> ⚠️ Pedile la `ANTHROPIC_API_KEY` a Leo (no compartir por canales públicos).
> Nunca commitear `.env.local`.

---

## 3. Correr y verificar

```bash
npm run dev          # http://localhost:3000
npm run typecheck    # tsc --noEmit → debe dar 0 errores
npm run test:run     # vitest → 59 tests verdes
npx playwright test  # E2E (opcional)
```

Si `dev` levanta, `typecheck` da 0 y los tests pasan, estás listo.

---

## 4. Cómo trabajamos (flujo de ramas)

`main` es la versión estable y al día. **No se commitea directo en `main`.**
Cada feature/fix sale de su propia rama y vuelve por Pull Request.

```bash
# 1. partir SIEMPRE de main actualizado
git checkout main && git pull origin main

# 2. rama nueva (prefijo feat/ , fix/ , docs/ , chore/)
git checkout -b feat/<lo-que-sea>

# 3. trabajar, commits chicos y descriptivos (en español)
git add <archivos>
git commit -m "feat(scope): qué hace"

# 4. subir y abrir PR
git push -u origin feat/<lo-que-sea>
gh pr create --base main --title "..." --body "..."
#   (o abrir el PR desde el link que imprime GitHub al pushear)

# 5. revisar el diff en GitHub → aprobar → mergear
gh pr merge <n> --merge      # o desde el botón "Merge" en la web

# 6. después del merge, volver a main al día
git checkout main && git pull origin main
```

Reglas de oro:
- Antes de dar algo por hecho: `typecheck` 0 errores + `test:run` verde.
- Toda lógica nueva con cálculo/parseo lleva **test** (ver protocolo §3.2/§3.7).
- Si trabajan dos en paralelo, repartan por **archivos disjuntos** para evitar conflictos.
- No commitear secretos ni `node_modules`.

---

## 5. Estado actual y pendientes

Ver el detalle en [`AVANCE-Y-PROTOCOLO.md`](./AVANCE-Y-PROTOCOLO.md) §1. Resumen:

**Hecho y en `main`:** wizard, generación one-shot + streaming, editor, precios por
región, login Google + dashboard, tests. Base URL del example ya corregida.

**Hecho en ramas (PRs pendientes de merge):**
- `feat/tools-cronograma-curva` (PR #22): tools `calcular_cronograma` (CPM) +
  `calcular_curva_inversion` (Curva S) con 17 tests nuevos. Commit `cc1cb35`.
- `feat/zod-rate-limiting` (PR #23): validación Zod en `/api/generate`,
  `/api/upload`, `/api/lead` + rate limiter (Vercel KV con fallback in-memory).
  30 tests nuevos. Commit `4b0a2bc`.

**Tests actuales:** **106 verdes** (eran 59 → 76 con cronograma/curva → 106 con Zod/rate-limit).

**Pendientes (abiertos):**
- [ ] Mergear PRs #22 y #23 a main.
- [ ] Cargar credenciales reales de Google OAuth + Vercel KV para el entorno.
- [ ] **Deploy a Vercel** (env vars + KV real; ojo `maxDuration=60` vs cold ~50s).
- [ ] Más templates (Light/Bold/Minimal).
- [ ] Scraper de precios de otras regiones → `data/precios-<region>.json`.

---

## 6. Datos útiles

- **Repo:** https://github.com/Leoscd/wraper-minimax-arq
- **App:** `soyleoai-presentador` (Next.js 14, App Router).
- **Endpoint clave:** `/api/generate` (one-shot; `?stream=1` para streaming).
- **Dataset de precios:** `data/precios-noa.json` (825 ítems NOA) vía
  `getPreciosDataset(region)` en `lib/data/precios.ts`.
- El archivo `lista-precios-noa - preciosNOA.csv (1).csv` de la raíz es **solo para
  pruebas** (no está trackeado, no aporta datos nuevos al dataset).
