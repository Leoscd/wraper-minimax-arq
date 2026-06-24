# SoyLeo AI — Presentador

> Wrapper web que consume **MiniMax M3** (vía Anthropic SDK) para generar presentaciones profesionales de proyectos arquitectónicos con la metodología de [SoyLeo AI](https://soyleoai.com).

## ¿Qué es esto?

Una herramienta web que toma información de un proyecto arquitectónico (datos, planos, renders, presupuesto) y devuelve una presentación HTML premium lista para imprimir a PDF. Está pensada para arquitectos y empresas de construcción que necesitan presentar proyectos de alto valor a sus clientes.

## Stack

- **Framework**: Next.js 14 (App Router) + TypeScript
- **Modelo de IA**: MiniMax M3 (compatible con Anthropic SDK)
- **Storage**: Vercel Blob
- **PDF**: `@media print` CSS + navegador
- **Deploy**: Vercel

## Capacidades

- 📋 Generación de presupuestos detallados por rubros (25 categorías estándar)
- 🧮 Cómputo preciso de materiales (hormigón, hierros, morteros, mampostería)
- 💰 Cálculo de mano de obra con cargas sociales
- 📅 Cronograma de obra con camino crítico
- 📈 Curva de inversión
- 🎨 Presentación HTML premium "Dark Gold" customizable por empresa
- 🖨️ Exportación a PDF A4
- 🏢 Branding dinámico (logo + colores por empresa)

## Setup local

```bash
# 1. Clonar el repo
git clone https://github.com/Leoscd/wraper-minimax-arq.git
cd wraper-minimax-arq

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.local.example .env.local
# Editar .env.local con tu ANTHROPIC_API_KEY de MiniMax

# 4. Correr en desarrollo
npm run dev
```

La app queda en `http://localhost:3000`.

## Variables de entorno

```env
# MiniMax M3 (compatible con Anthropic SDK)
ANTHROPIC_BASE_URL=https://api.minimaxi.com/anthropic
ANTHROPIC_API_KEY=tu_key_aqui

# Vercel Blob (uploads)
BLOB_READ_WRITE_TOKEN=tu_token_aqui

# Opcional: Resend para envío de PDFs por email
RESEND_API_KEY=tu_key_aqui
```

## Estructura del proyecto

```
├── app/                        # Next.js App Router
│   ├── api/
│   │   ├── generate/           # Endpoint principal (wrapper M3)
│   │   ├── upload/             # Upload de imágenes a Vercel Blob
│   │   └── lead/               # Captura de leads
│   ├── generar/                # Wizard 4 pasos
│   └── preview/[id]/           # Preview de la presentación
├── lib/
│   ├── minimax.ts              # Cliente Anthropic SDK → MiniMax
│   ├── prompts/                # System prompts
│   ├── tools/                  # ⭐ Function calling tools (determinísticas)
│   ├── data/                   # JSON estáticos (precios, rendimientos, rubros)
│   └── templates/              # Templates HTML
├── components/                 # Componentes React
├── data/                       # JSON convertidos del CSV
└── public/                     # Assets estáticos
```

## Cómo funciona

```
[Usuario] → [Wizard 4 pasos] → [Vercel Blob] → [/api/generate]
                                                      │
                                                      ▼
                                          [M3 con tu metodología]
                                                      │
                                                      ├─► Tools determinísticas
                                                      │   ├─► calcular_hormigon()
                                                      │   ├─► calcular_hierros()
                                                      │   ├─► buscar_precio()
                                                      │   └─► calcular_mano_obra()
                                                      │
                                                      └─► [HTML "Dark Gold"]
                                                              │
                                                              ▼
                                                       [Preview + PDF]
```

## Desarrollo

Issues de seguimiento en GitHub. Cada issue corresponde a una fase del MVP.

```bash
# Tests
npm run test

# Lint
npm run lint

# Build
npm run build
```

## Créditos

Sistema desarrollado para **SoyLeo AI** — [soyleoai.com](https://soyleoai.com)
Arq. Leonardo Díaz | Tucumán, Argentina
[@soy.leo_ai](https://instagram.com/soy.leo_ai)

---

Basado en la skill `presupuesto-constructor` original de SoyLeo AI, portada de Claude Code a MiniMax M3 con function calling para garantizar precisión en los cálculos.
