/**
 * Skill "Presentador" — Design tokens "Dark Gold".
 *
 * Guía de diseño explícita (valores, no CSS fijo) para que el modelo mantenga
 * coherencia visual mientras conserva libertad creativa sobre la estructura.
 *
 * Bloque ESTÁTICO → cacheable. Si el branding del proyecto trae colores custom,
 * esos PISAN estos defaults (se aclara en el brief dinámico).
 */

export const DESIGN_TOKENS_DARKGOLD = `## Sistema de diseño "Dark Gold" (default)

Estos son los tokens de referencia. Si el branding del proyecto define colores propios, usá esos en su lugar.

### Paleta
- Fondo base:        #080808
- Fondo suave:       #111111
- Fondo de card:     #141414
- Dorado (acento):   #C9A84C
- Dorado suave:      #b08d35
- Glow dorado:       rgba(201, 168, 76, 0.18)
- Texto:             #ede9e0
- Texto atenuado:    #9a948a
- Líneas/bordes:     rgba(201, 168, 76, 0.22)

### Tipografía (Google Fonts)
- Títulos / editorial: 'Cormorant Garamond', serif (pesos 300–700, también itálica)
- Datos / mono:        'DM Mono', monospace (pesos 300–500)
- Títulos grandes con \`font-size: clamp(...)\` para fluidez; line-height ajustado (~0.9 en hero).

### Lenguaje visual
- Estética editorial dark, lujosa y sobria. Mucho aire/espacio negativo.
- Acentos dorados finos: hairlines de 1px, eyebrows en mayúscula con letter-spacing amplio (0.3–0.4em).
- Hero a pantalla completa (min-height: 100vh) con gradientes radiales dorados sutiles y una grilla tenue de fondo.
- Números/datos en DM Mono; títulos de proyecto en Cormorant.
- Cards de resumen con borde dorado tenue y fondo de card.
- Para print: respetar saltos de página por sección, fondos oscuros conservados.`;
