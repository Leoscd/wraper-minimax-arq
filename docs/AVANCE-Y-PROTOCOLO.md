# SoyLeo AI — Presentador · Avance, Tareas y Protocolo de Código

> Documento vivo. Última actualización: 2026-06-25.
> App web Next.js 14 que genera presentaciones HTML "Dark Gold" de proyectos de
> arquitectura con **MiniMax M3** (LLM vía Anthropic SDK) + tools determinísticas.

---

## 1. Avance (✅ tachado = hecho)

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
- [ ] Ingerir el **CSV nuevo de precios NOA** (lo provee el usuario) → `data/precios-noa.json`
- [ ] Corregir el default de `ANTHROPIC_BASE_URL` en `.env.local.example` (sigue en `api.minimaxi.com`)
- [ ] Commitear el trabajo (hoy todo en working tree, sin commit) — preferible en rama, no `main`
- [ ] Google OAuth (login + dashboard) — crear credenciales y completar `.env.local`
- [ ] Deploy a Vercel (env vars + KV real; ojo `maxDuration=60` vs cold ~50s)
- [ ] Tools `cronograma` y `curva de inversión` (hoy solo en el prompt, sin tool)
- [ ] Validación Zod en endpoints · rate limiting · más templates (Light/Bold/Minimal)
- [ ] Scraper de precios de otras regiones/países → alimenta `data/precios-<region>.json`
      (recién ahí evaluar matching semántico/embeddings)

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
├── ⏳ FASE D · Datos reales
│     ├── [ ] ingerir CSV NOA nuevo
│     └── [ ] registrar regiones nuevas en DATASETS
│
├── ⏳ FASE E · Producción
│     ├── [ ] fix .env.local.example
│     ├── [ ] Google OAuth
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
