# SoyLeo AI — Presentador · Avance, Tareas y Protocolo de Código

> Documento vivo. Última actualización: 2026-06-25.
> App web Next.js 14 que genera presentaciones HTML "Dark Gold" de proyectos de
> arquitectura con **MiniMax M3** (LLM vía Anthropic SDK) + tools determinísticas.

---

## 0. Qué es y cómo correrlo

### Qué hace
SoyLeo AI — Presentador es una app web donde un arquitecto carga los datos de un
proyecto a través de un **wizard de 5 pasos**, y la app genera una **presentación
HTML "Dark Gold"** (presentación comercial + presupuesto técnico) usando el LLM
**MiniMax M3**. Todos los **cálculos** (hormigón, hierro, precios, mano de obra,
etc.) los hacen **tools determinísticas** —no los inventa el LLM—, y la salida se
puede **editar post-generación** (textos, orden de secciones, colores, mostrar/ocultar)
y **descargar en PDF**. Hay **login con Google**, **dashboard** de proyectos guardados
y **captura de leads**.

### Stack
- **Next.js 14.2** (App Router, `runtime = 'nodejs'`) + **React 18** + **TypeScript 5.7**.
- **LLM:** MiniMax M3 vía **`@anthropic-ai/sdk`** (API compatible con Anthropic), con
  `ANTHROPIC_BASE_URL=https://api.minimax.io/anthropic`.
- **Auth:** `next-auth@5` (beta) con proveedor Google.
- **Persistencia:** `@vercel/kv` (proyectos), `@vercel/blob` (imágenes, opcional).
- **Editor:** `@dnd-kit/*` (drag & drop de secciones).
- **Validación:** `zod` (presente; pendiente de aplicar en endpoints).
- **Tests:** `vitest` (unit) + `@playwright/test` (E2E). Scripts con `tsx`.

### Comandos
```bash
npm install                 # deps (ver nota rollup en FASE 0 si falla en linux)
cp .env.local.example .env.local   # y completar las claves (ver abajo)
npm run dev                 # http://localhost:3000
npm run typecheck           # tsc --noEmit (debe dar 0 errores)
npm run test:run            # vitest (59 tests verdes)
npx playwright test         # E2E (e2e/*.spec.ts)
npm run build && npm start  # build de producción
```

### Variables de entorno (`.env.local`, gitignoreado)
| Var | Obligatoria | Para qué |
|---|---|---|
| `ANTHROPIC_API_KEY` | **Sí** | Key de MiniMax. |
| `ANTHROPIC_BASE_URL` | **Sí** | `https://api.minimax.io/anthropic` (¡no `.minimaxi.com` → 401!). |
| `AUTH_SECRET` | Sí (auth) | Secret de NextAuth. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Sí (login) | OAuth 2.0 de Google Cloud. |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | Sí (dashboard) | Vercel KV (proyectos). |
| `BLOB_READ_WRITE_TOKEN` | Opcional | Vercel Blob (imágenes). |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | Opcional | Envío de PDFs por email. |

> ⚠️ `.env.local.example` todavía trae `ANTHROPIC_BASE_URL=https://api.minimaxi.com/...`
> que es **incorrecto** para esta cuenta (da 401). Corregirlo a `api.minimax.io` es un
> pendiente abierto (ver §1).

---

## 0bis. Arquitectura y mapa de archivos

```
app/
├── page.tsx                      landing
├── login/page.tsx                login con Google
├── generar/page.tsx              wizard + preview en vivo (streaming) + PDF
├── dashboard/page.tsx            proyectos guardados (Vercel KV)
├── preview/[id]/page.tsx         vista pública de una presentación
├── providers.tsx · layout.tsx
└── api/
    ├── generate/route.ts         ★ one-shot + ?stream=1 (genera el HTML con M3 + tools)
    ├── auth/[...nextauth]/route.ts   NextAuth (Google)
    ├── lead/route.ts             captura de leads
    └── upload/route.ts           subida de archivos/imágenes (Blob)

components/
├── wizard/Wizard.tsx + Step1..Step5   wizard de 5 pasos (proyecto, empresa,
│                                       archivos, estilo, marca/paleta)
└── editor/Editor.tsx + controls/      edición post-generación:
        TextControl · SectionReorder (dnd) · SectionToggle · ColorControl

lib/
├── minimax.ts                    cliente M3: system en bloques, staticBlock(),
│                                 sendMessage()/streamMessage(), baseURL .io
├── skills/presentador/           ★ bloques ESTÁTICOS (prefijo cacheable):
│       metodologia.ts · design-tokens.ts · ejemplo.ts (few-shot) · index.ts
├── generation/                   ★ bloques DINÁMICOS:
│       brief.ts (datos del proyecto) · presupuesto.ts (números pre-calculados)
├── tools/                        cálculo determinístico (8 tools, ver §3.2):
│       hormigon · hierro · estribos · mortero · mamposteria · precios ·
│       mano-obra · desperdicios + registry.ts + types.ts
├── data/                         datasets JSON + loaders:
│       precios.ts (getPreciosDataset) · index.ts
└── templates/                    presentacion-darkgold.ts · presupuesto-tecnico.ts

data/        precios-noa.json (825 ítems, 112 cat.) · hormigon · hierro ·
             rendimientos · desperdicios · rubros (todos con metadata)
scripts/     parse-precios.ts (CSV→JSON) · generate-examples.ts · issues.json
e2e/         home · auth · wizard · editor (Playwright)
```

★ = núcleo de la generación. El flujo central es:
**wizard → `/api/generate` (M3 arma el brief estático+dinámico, llama tools para los
números, escribe el HTML) → preview/editor → PDF**.

---

## 1. Avance (✅ tachado = hecho)

### Base ya construida (commits previos, funcionando)
- ~~Wizard de 5 pasos (proyecto, empresa, archivos, estilo, marca + paleta de 5 colores)~~ ✅
- ~~Templates HTML "Dark Gold": presentación comercial + presupuesto técnico~~ ✅
- ~~8 tools determinísticas de cálculo (hormigón, hierro, estribos, mortero, mampostería,
  precios, mano de obra, desperdicios) con tests~~ ✅
- ~~Editor post-generación: editar textos, reordenar secciones (drag&drop), colores,
  toggle de secciones~~ ✅
- ~~**Login con Google** (next-auth@5) + **dashboard** de proyectos con **Vercel KV**~~ ✅
- ~~Captura de leads + preview público `/preview/[id]` + descarga PDF~~ ✅
- ~~Tests E2E con Playwright (home, auth, wizard, editor)~~ ✅

### Puesta en marcha local
- ~~Reinstalar deps y resolver bug de rollup (`@rollup/rollup-linux-x64-gnu`)~~ ✅
- ~~Crear `.env.local` (MiniMax key + `AUTH_SECRET`)~~ ✅
- ~~Detectar y corregir base URL: la key va en `api.minimax.io`, no `api.minimaxi.com` (401)~~ ✅
- ~~Validar flujo central de punta a punta (wizard → generar → editar → PDF)~~ ✅

### Generación eficiente (skill / brief one-shot)
- ~~Bug one-shot: el modelo se detenía a "pedir confirmación"; ajustado a generación directa~~ ✅
- ~~`lib/skills/presentador/` (metodología one-shot + design tokens + ejemplo few-shot)~~ ✅
- ~~`lib/generation/brief.ts` + `presupuesto.ts` (bloques estáticos cacheables + datos)~~ ✅
- ~~`lib/minimax.ts`: `system` como bloques + `staticBlock()` + baseURL por defecto corregido~~ ✅
- ~~`/api/generate` reescrito a one-shot con captura de métricas de cache~~ ✅
- ~~Verificado: **68s → 43s** (warm, cache_read 11.284 tokens), HTML válido, sin contaminación del few-shot~~ ✅

### Streaming (latencia percibida)
- ~~`streamMessage()` en `lib/minimax.ts` + path `?stream=1` en `/api/generate`~~ ✅
- ~~Cliente `Wizard.tsx` + `app/generar/page.tsx` con preview en vivo (throttle ~200ms)~~ ✅
- ~~Verificado en vivo: **TTFB 6.3s** (antes ~50s para ver algo), total 51.8s, cierra con `__META__`~~ ✅

### Precios por región
- ~~Loader `lib/data/precios.ts` (`getPreciosDataset(region)`, default NOA, fallback con warn)~~ ✅
- ~~`buscar_precio` con parámetro `region` + `region_usada` en el output~~ ✅
- ~~`scripts/parse-precios.ts` generalizado con flags `--input/--region/--output/--moneda`~~ ✅
- ~~Tests de precios 6 → 12; verificado en vivo (default/NOA/fallback)~~ ✅

### Calidad
- ~~typecheck 0 errores · **59 tests** pasando (vitest)~~ ✅

### Pendiente
- ~~Ingerir el CSV nuevo de precios NOA~~ ✅ **No aplica**: el CSV provisto traía los
  mismos 825 precios que `data/precios-noa.json` y **sin** columna proveedor (perdía
  `Arq. & Const.`/`METALTEC`). Se conserva el dataset actual; el CSV queda solo para pruebas.
- ~~Commitear el trabajo en rama (no en `main`)~~ ✅ rama `feat/generacion-eficiente-precios-region`
  (4 commits). **Falta `git push`** para que esté disponible desde otro lado.
- ~~Google OAuth (login + dashboard)~~ ✅ implementado (next-auth@5 + Vercel KV).
  Falta solo **completar las credenciales reales** en `.env.local` para el deploy.
- [ ] **Corregir `.env.local.example`**: `ANTHROPIC_BASE_URL` sigue en `api.minimaxi.com`
      (debe ser `api.minimax.io`). ← rápido, próximo paso sugerido.
- [ ] **Deploy a Vercel** (env vars + KV real; ojo `maxDuration=60` vs cold ~50s).
- [ ] Tools `cronograma` y `curva de inversión` (hoy solo en el prompt, sin tool).
- [ ] Validación Zod en endpoints · rate limiting · más templates (Light/Bold/Minimal).
- [ ] Scraper de precios de otras regiones/países → alimenta `data/precios-<region>.json`
      (recién ahí evaluar matching semántico/embeddings).

---

## 2. Tareas diagramadas (roadmap)

```
SoyLeo AI — Presentador
│
├── ✅ FASE 0 · Local funcionando
│     ├── deps + rollup
│     ├── .env.local (base URL .io)
│     └── flujo e2e validado
│
├── ✅ FASE A · Generación eficiente (skill/brief one-shot)
│     ├── skill: metodología + design tokens + ejemplo few-shot
│     ├── brief: estáticos cacheables + datos + presupuesto
│     └── /api/generate one-shot + caching implícito MiniMax
│
├── ✅ FASE B · Streaming
│     ├── streamMessage() + ?stream=1 (ReadableStream)
│     └── preview en vivo en el wizard
│
├── ✅ FASE C · Precios por región
│     ├── loader getPreciosDataset(region) + fallback
│     ├── buscar_precio(region) + region_usada
│     └── parser CSV parametrizable (--region/--input/...)
│
├── ✅ FASE D · Datos reales
│     ├── ✅ dataset NOA real (825 ítems) ya cargado vía loader
│     └── [ ] registrar regiones nuevas en DATASETS (cuando lleguen CSVs nuevos)
│           (el "CSV NOA nuevo" no aportaba datos → no se ingirió)
│
├── ⏳ FASE E · Producción
│     ├── ✅ Google OAuth + dashboard (falta cargar credenciales reales)
│     ├── [ ] fix .env.local.example (base URL .io)
│     └── [ ] deploy Vercel (cuidar timeout)
│
└── ⏳ FASE F · Features
      ├── [ ] cronograma CPM + curva de inversión (tools)
      ├── [ ] Zod + rate limiting
      ├── [ ] templates Light/Bold/Minimal
      └── [ ] scraper precios + matching semántico
```

Las 18 issues originales viven en `scripts/issues.json` (tracking en GitHub).

---

## 3. Protocolo de código (cómo escribir para este proyecto)

Reglas derivadas de los patrones existentes. Respetarlas mantiene el repo coherente.

### 3.1 Lenguaje y estilo
- **TypeScript estricto.** Evitar `any`; se aceptan `any` puntuales solo para tipar
  eventos/respuestas crudas del SDK de Anthropic (hay precedentes en `/api/generate`).
- **Comentarios en español.** Cada módulo/función no trivial lleva un **JSDoc breve que
  explica el "por qué"**, no el "qué" (ver `lib/tools/precios.ts`, `lib/generation/brief.ts`).
- **Español argentino** en todo texto de cara al usuario y en prompts (vos/tenés).
- Alias de imports `@/*` (configurado en `tsconfig.json`).

### 3.2 Cálculos → SIEMPRE tools determinísticas
- Ningún número se calcula "a mano" ni lo inventa el LLM. Todo cómputo (hormigón, hierro,
  precios, MO, desperdicios) vive en `lib/tools/<nombre>.ts`.
- **Patrón de una tool** (obligatorio, ver cualquiera en `lib/tools/`):
  1. Tipos de input/output en `lib/tools/types.ts`.
  2. Función pura `calcular(input): Output` (sin side-effects, determinística).
  3. `schema: Anthropic.Tool` con `input_schema` JSON claro y descripciones útiles.
  4. Export `xTool: Tool<In,Out>` + un alias nombrado (`export { calcular as buscarPrecio }`).
  5. Registrar en `lib/tools/registry.ts` (`allToolsList`) y en el `switch` de `ejecutarTool`
     en `app/api/generate/route.ts`.
  6. **Test obligatorio** `lib/tools/<nombre>.test.ts` (vitest) con casos límite.

### 3.3 Datos (precios, rendimientos, etc.)
- Datasets en `data/*.json` con `metadata` (region, moneda, fuente, fecha).
- Acceso **siempre por loader**, nunca import hardcodeado desde una tool. Para precios:
  `getPreciosDataset(region)` en `lib/data/precios.ts` (default NOA, fallback con `console.warn`).
- Datasets nuevos por región: `data/precios-<slug>.json` + registrar en el record `DATASETS`.
- Conversión desde CSV: `scripts/parse-precios.ts` (flags `--input/--region/--output/--moneda`;
  CSV separado por `;`, números argentinos `1.234,56`).

### 3.4 Generación con el LLM (skill / brief)
- La metodología, los design tokens y el ejemplo few-shot viven en `lib/skills/presentador/`
  (bloques **estáticos**). Lo dinámico (datos del proyecto + presupuesto) se arma en
  `lib/generation/brief.ts`.
- **Mantener el prefijo estático idéntico entre llamadas**: MiniMax cachea el prefijo
  automáticamente (devuelve `cache_read_input_tokens > 0` sin `cache_control`). No metas datos
  variables en los bloques `staticBlock()`.
- Modo **one-shot**: el endpoint no es un chat. El prompt debe pedir el HTML completo en un
  único bloque ` ```html ... ``` `, sin pedir confirmaciones.
- El LLM **escribe el HTML** (libertad visual); el presupuesto va **pre-calculado** en el brief
  para fijar los números (no recalcular).

### 3.5 Endpoints / API
- `runtime = 'nodejs'`, `maxDuration` explícito. Validar campos mínimos y devolver errores JSON
  con status correcto.
- Streaming opt-in con `?stream=1` (no romper el path JSON). Headers anti-buffering
  (`no-cache`, `X-Accel-Buffering: no`). Metadata al final con sentinel `__META__`.
- (Pendiente de protocolo futuro) validar bodies con Zod.

### 3.6 Config / secretos
- Secretos solo en `.env.local` (gitignoreado). Nunca commitear claves.
- `ANTHROPIC_BASE_URL` para esta cuenta = `https://api.minimax.io/anthropic` (el `.minimaxi.com`
  da 401 con esta key).

### 3.7 Testing y verificación (antes de dar algo por hecho)
- `npx tsc --noEmit` → 0 errores.
- `npm run test:run` (vitest) → todo verde. Toda lógica nueva con cálculo/parseo lleva test.
- E2E con Playwright en `e2e/` para flujos de UI.
- Para cambios en generación: prueba **en vivo** contra MiniMax (medir latencia/TTFB) y
  verificar que el HTML use los datos reales (no el ejemplo few-shot).

### 3.8 Git / proceso
- No commitear en `main`: rama por feature. Commits chicos y descriptivos.
- No agregar dependencias sin necesidad real.
- Trabajo en paralelo (subagentes): repartir por **archivos disjuntos** para evitar conflictos.
```
