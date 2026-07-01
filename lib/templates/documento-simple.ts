/**
 * Template HTML: documento cualitativo simple.
 *
 * Render de markdown en HTML con tema Dark Gold (consistente con los otros
 * templates). Pensado para documentos que M3 escribe **libremente** dentro del
 * dominio arquitectura/construcción (no hay números que proteger):
 *   - Memoria descriptiva
 *   - Gestión administrativa (permisos, habilitaciones, seguros)
 *   - Checklists de obra
 *   - Informes de avance narrativos
 *
 * Sin dependencias externas: implementa un parser mínimo de markdown
 * (subset seguro) que cubre los elementos que M3 suele generar.
 */

const GOLD = '#C9A84C';
const DARK = '#080808';
const DARK_2 = '#0f0f0f';
const DARK_3 = '#161616';
const LIGHT = '#ede9e0';
const LIGHT_DIM = 'rgba(237, 233, 224, 0.55)';
const TEXT = '#cac6be';
const TEXT_MUTED = 'rgba(202, 198, 190, 0.4)';
const SERIF = "'Cormorant Garamond', Georgia, serif";
const MONO = "'DM Mono', monospace";

export interface DocumentoSimpleData {
  proyecto: {
    nombre: string;
    ubicacion?: string;
    año?: string;
  };
  titulo: string;
  /** Subtítulo opcional, ej: "Memoria descriptiva" o "Checklist de obra". */
  subtitulo?: string;
  /** Contenido en markdown que escribió el modelo. */
  contenido_md: string;
  /** Metadata opcional (autor, fecha, etc). */
  metadata?: Record<string, string>;
  /** Fecha visible en el header. Default: hoy. */
  fecha?: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Parser de markdown muy simple. No es un parser compliant — solo soporta
 * el subset que M3 usa normalmente en documentos cualitativos. La idea es
 * que sea SEGURO: escapa HTML en todos lados para que M3 no pueda inyectar
 * scripts aunque lo intente.
 *
 * Soporta:
 *   - Encabezados: # / ## / ### / ####
 *   - Negrita: **texto** o __texto__
 *   - Italica: *texto* o _texto_
 *   - Code inline: `codigo`
 *   - Listas no ordenadas: - item / * item
 *   - Listas ordenadas: 1. item
 *   - Blockquote: > texto
 *   - Párrafos (separados por línea vacía)
 *   - Linea horizontal: --- / ***
 */

interface Block {
  type: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'ul' | 'ol' | 'blockquote' | 'hr';
  content: string | string[];
}

function parseInline(text: string): string {
  // Escape primero, después aplicar formato con placeholders que no se escapan.
  // Para mantener simple: escapamos todo y aplicamos regex sobre el escape.
  let s = escapeHtml(text);

  // Code inline: `...` -> <code>...</code>
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  // Bold: **text** o __text__
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  // Italic: *text* o _text_ (sin confundir con bold que ya se reemplazo)
  s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  s = s.replace(/(^|[^_])_([^_\n]+)_/g, '$1<em>$2</em>');

  return s;
}

function parseMarkdown(md: string): Block[] {
  const lines = md.split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Línea vacía: skip.
    if (!trimmed) {
      i++;
      continue;
    }

    // Línea horizontal.
    if (/^(---|\*\*\*)$/.test(trimmed)) {
      blocks.push({ type: 'hr', content: '' });
      i++;
      continue;
    }

    // Encabezado.
    const h = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (h) {
      const level = h[1]!.length;
      const text = h[2]!;
      const tag = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4';
      blocks.push({ type: tag, content: parseInline(text) });
      i++;
      continue;
    }

    // Blockquote (puede ser multilinea).
    if (trimmed.startsWith('>')) {
      const items: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        items.push(lines[i].trim().slice(1).trim());
        i++;
      }
      blocks.push({
        type: 'blockquote',
        content: items.map((l) => parseInline(l)).join('<br>'),
      });
      continue;
    }

    // Lista no ordenada.
    if (/^[-*]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ''));
        i++;
      }
      blocks.push({ type: 'ul', content: items.map((l) => parseInline(l)) });
      continue;
    }

    // Lista ordenada.
    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ''));
        i++;
      }
      blocks.push({ type: 'ol', content: items.map((l) => parseInline(l)) });
      continue;
    }

    // Párrafo: juntar todas las líneas siguientes hasta línea vacía.
    const paraLines: string[] = [trimmed];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,4}\s|[-*]\s+|\d+\.\s+|>\s*|---|\*\*\*$)/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i].trim());
      i++;
    }
    blocks.push({
      type: 'p',
      content: parseInline(paraLines.join(' ')),
    });
  }

  return blocks;
}

function renderBlock(b: Block): string {
  switch (b.type) {
    case 'h1':
      return `<h1 class="doc-h1">${b.content}</h1>`;
    case 'h2':
      return `<h2 class="doc-h2">${b.content}</h2>`;
    case 'h3':
      return `<h3 class="doc-h3">${b.content}</h3>`;
    case 'h4':
      return `<h4 class="doc-h4">${b.content}</h4>`;
    case 'p':
      return `<p class="doc-p">${b.content}</p>`;
    case 'ul':
      return `<ul class="doc-ul">${(b.content as string[])
        .map((li) => `<li>${li}</li>`)
        .join('')}</ul>`;
    case 'ol':
      return `<ol class="doc-ol">${(b.content as string[])
        .map((li) => `<li>${li}</li>`)
        .join('')}</ol>`;
    case 'blockquote':
      return `<blockquote class="doc-quote">${b.content}</blockquote>`;
    case 'hr':
      return `<hr class="doc-hr" />`;
  }
}

export function renderDocumentoSimple(data: DocumentoSimpleData): string {
  const { proyecto, titulo, subtitulo, contenido_md, metadata, fecha } = data;
  const fechaStr =
    fecha ??
    new Date().toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

  const blocks = parseMarkdown(contenido_md);
  const body = blocks.map(renderBlock).join('\n');

  const metadataHtml = metadata
    ? `<dl class="doc-meta">
        ${Object.entries(metadata)
          .map(
            ([k, v]) =>
              `<dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd>`
          )
          .join('')}
      </dl>`
    : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(titulo)} · ${escapeHtml(proyecto.nombre)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=DM+Mono:wght@300;400;500&display=swap" rel="stylesheet">
<style>
  :root {
    --gold: ${GOLD};
    --dark: ${DARK};
    --dark-2: ${DARK_2};
    --dark-3: ${DARK_3};
    --light: ${LIGHT};
    --light-dim: ${LIGHT_DIM};
    --text: ${TEXT};
    --text-muted: ${TEXT_MUTED};
    --serif: ${SERIF};
    --mono: ${MONO};
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html { font-size: 16px; }
  body {
    background: var(--dark);
    color: var(--text);
    font-family: var(--serif);
    line-height: 1.75;
    padding: 60px 5vw;
    max-width: 820px;
    margin: 0 auto;
    font-size: 17px;
  }
  .doc-header {
    border-bottom: 1px solid rgba(201, 168, 76, 0.3);
    padding-bottom: 32px;
    margin-bottom: 48px;
  }
  .doc-tag {
    display: block;
    font-family: var(--mono);
    font-size: 10px;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: var(--gold);
    margin-bottom: 16px;
  }
  .doc-title {
    font-family: var(--serif);
    font-size: 44px;
    font-weight: 500;
    line-height: 1.1;
    color: var(--light);
    margin-bottom: 8px;
  }
  .doc-subtitle {
    font-family: var(--serif);
    font-style: italic;
    font-size: 22px;
    color: var(--gold);
    margin-bottom: 24px;
  }
  .doc-meta {
    display: grid;
    grid-template-columns: max-content 1fr;
    gap: 6px 16px;
    font-family: var(--mono);
    font-size: 11px;
    margin-top: 24px;
    color: var(--text-muted);
  }
  .doc-meta dt {
    color: var(--gold);
    text-transform: uppercase;
    letter-spacing: 1.5px;
  }
  .doc-meta dd { color: var(--text); }

  /* Body */
  .doc-h1 {
    font-size: 32px;
    font-weight: 500;
    color: var(--light);
    margin: 48px 0 16px;
    line-height: 1.2;
  }
  .doc-h2 {
    font-size: 26px;
    font-weight: 500;
    color: var(--light);
    margin: 40px 0 12px;
    line-height: 1.25;
  }
  .doc-h3 {
    font-size: 20px;
    font-weight: 500;
    color: var(--light);
    margin: 32px 0 10px;
  }
  .doc-h4 {
    font-size: 16px;
    font-weight: 600;
    color: var(--gold);
    text-transform: uppercase;
    letter-spacing: 1.5px;
    margin: 24px 0 8px;
  }
  .doc-p {
    margin: 0 0 18px;
    color: var(--text);
  }
  .doc-p:last-child { margin-bottom: 0; }
  .doc-ul, .doc-ol {
    margin: 0 0 18px 24px;
    color: var(--text);
  }
  .doc-ul li, .doc-ol li {
    margin-bottom: 6px;
  }
  .doc-quote {
    border-left: 3px solid var(--gold);
    padding: 8px 0 8px 20px;
    margin: 24px 0;
    color: var(--light);
    font-style: italic;
  }
  .doc-hr {
    border: none;
    border-top: 1px solid rgba(201, 168, 76, 0.3);
    margin: 40px auto;
    width: 50%;
  }
  code {
    font-family: var(--mono);
    font-size: 0.9em;
    background: var(--dark-2);
    border: 1px solid rgba(201, 168, 76, 0.2);
    padding: 1px 6px;
    border-radius: 3px;
    color: var(--gold);
  }
  strong { color: var(--light); font-weight: 600; }
  em { color: var(--gold); }

  .doc-footer {
    margin-top: 64px;
    padding-top: 24px;
    border-top: 1px solid rgba(201, 168, 76, 0.3);
    font-family: var(--mono);
    font-size: 10px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: var(--text-muted);
    text-align: center;
  }

  @media print {
    body { padding: 30px 40px; font-size: 12pt; }
    .doc-title { font-size: 28pt; }
    .doc-h1 { font-size: 22pt; page-break-before: always; }
    .doc-h1:first-of-type { page-break-before: avoid; }
  }
</style>
</head>
<body>
  <header class="doc-header">
    <span class="doc-tag">${escapeHtml(proyecto.nombre)} · ${escapeHtml(fechaStr)}</span>
    <h1 class="doc-title">${escapeHtml(titulo)}</h1>
    ${subtitulo ? `<div class="doc-subtitle">${escapeHtml(subtitulo)}</div>` : ''}
    ${metadataHtml}
  </header>

  <main class="doc-body">
    ${body}
  </main>

  <footer class="doc-footer">
    Generado por SoyLeo AI · ${escapeHtml(proyecto.nombre)}
  </footer>
</body>
</html>`;
}
