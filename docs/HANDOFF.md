# Handoff — para continuar el desarrollo

> Documento de traspaso. Estado al 2026-06-25.
> Si es tu primera vez con el proyecto, leé también
> [`ONBOARDING.md`](./ONBOARDING.md) (setup) y
> [`AVANCE-Y-PROTOCOLO.md`](./AVANCE-Y-PROTOCOLO.md) (arquitectura + protocolo).

---

## 1. Dónde está todo

- **Repo:** https://github.com/Leoscd/wraper-minimax-arq
- **`main`** = estable y al día (incluye: generación one-shot, streaming, precios
  por región, login Google + dashboard, y los fixes recientes).
- **Trabajo en curso para auditar:** rama **`feat/asistente-chat`** → **PR #23**
  (NO mergeado a propósito: hay que revisarlo y corregir).

```bash
git fetch origin
git checkout feat/asistente-chat      # acá vive el chat nuevo + el botón de login
npm install
npm run dev                           # http://localhost:3000
```

---

## 2. Setup imprescindible (una vez)

Cada uno crea su propio `.env.local` (NO se sube a git):

```bash
cp .env.local.example .env.local
```

Mínimo para que ande el chat y la generación:
```
ANTHROPIC_API_KEY=<key de MiniMax>        # ← pedírsela a Leo, va por canal privado
ANTHROPIC_BASE_URL=https://api.minimax.io/anthropic
AUTH_SECRET=<string random; openssl rand -base64 32>
```
Para login con Google (opcional para probar la generación/chat):
```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```
KV se puede dejar vacío → usa fallback in-memory.

### ⚠️ Dos trampas que ya nos pasaron
1. **`ANTHROPIC_*` NO es Anthropic.** Usamos MiniMax. La librería `@anthropic-ai/sdk`
   es solo un "traductor"; la key y la URL son de **MiniMax** (`api.minimax.io`).
   `api.minimaxi.com` da **401**.
2. **Los secretos van SOLO en `.env.local`**, nunca en `.env.local.example`
   (ese se sube a git) ni pegados en un chat. Si se filtra una key, **rotarla**.
3. Si el login con Google falla con `redirect_uri_mismatch`, registrá en Google
   Cloud Console esta URL exacta:
   `http://localhost:3000/api/auth/callback/google`

---

## 3. Verificar que arranca

```bash
npm run typecheck     # 0 errores
npm run test:run      # 109 tests verdes
npm run dev           # y abrir localhost:3000
```
Rutas para probar a mano:
- `/asistente` → el chat nuevo (preguntá un precio o un cómputo).
- `/generar` → wizard → presentación.
- `/login` o el botón "Entrar con Google" de la nav.

---

## 4. Qué se hizo recién (lo que estás por auditar)

**PR #23 — Asistente (chat) Fase 1:**
- `lib/tools/ejecutar.ts` — ejecutor de tools **compartido** (lo usan /api/generate
  y /api/chat; no duplicar el switch).
- `lib/chat/system.ts` — system prompt del asistente (persona experta, estático/cacheable).
- `app/api/chat/route.ts` — endpoint multi-turno con loop de tools + Zod + rate limit.
- `components/chat/Chat.tsx` + `app/asistente/page.tsx` — UI del chat.
- `components/auth/AuthButton.tsx` — botón "Entrar con Google" directo en la nav.

**Ya mergeado a `main` (contexto):** fix del 400 por año/estado, fix base URL del
example, doc de panorama y onboarding.

---

## 5. Qué auditar / decisiones abiertas (Fase 1)

- **`lib/chat/system.ts`**: la personalidad y reglas del experto. Es donde más se
  va a iterar (tono, qué tan estricto, aclaraciones). Es texto plano.
- **No hay streaming** en el chat (respuesta JSON). Mejora obvia = Fase 1.1.
- **`max_tokens: 2000`** y **rate limit 40/h** en `app/api/chat/route.ts`.
- **Sugerencias** (chips) en `components/chat/Chat.tsx` → ajustar a consultas reales.

---

## 6. Mejoras conocidas pendientes (no urgentes)

- **Dato:** las bolsas de cemento en `data/precios-noa.json` figuran de 40/50 kg;
  hay presentaciones de **25 kg** que faltan. Es corrección de **dataset**, no de
  código — el chat reflejará el cambio automáticamente.
- **Fase 1.1:** streaming del chat (texto apareciendo en vivo).
- **Fase 2:** features de **conocimiento** (procesos, BIM, alternativas) → necesitan
  material curado/grounding, no respuestas sueltas del modelo.
- **Fase 3:** disparar la generación de presentación/presupuesto desde el chat.
- Producción: deploy a Vercel + KV real (hoy in-memory).

---

## 7. Reglas que NO se rompen (invariantes)

- **Ningún número lo inventa el modelo.** Todo cálculo pasa por una tool en
  `lib/tools/`. Capacidad numérica nueva = tool nueva **con test** (protocolo §3.2).
- `tsc --noEmit` 0 errores + `npm run test:run` verde **antes de mergear**.
- **No commitear en `main`:** rama por feature → PR → revisar → merge.
- Secretos solo en `.env.local`. Nunca en git ni en chats.
- Trabajo en paralelo: repartir por **archivos disjuntos** para evitar conflictos.

---

## 8. Flujo para una feature nueva

```bash
git checkout main && git pull origin main
git checkout -b feat/<lo-que-sea>
# ... codear (comentarios y textos en español argentino) ...
npm run typecheck && npm run test:run
git add <archivos> && git commit -m "feat(scope): qué hace"
git push -u origin feat/<lo-que-sea>
gh pr create --base main --title "..." --body "..."   # o el link que imprime el push
```
