/**
 * Template HTML: curva de inversión (Curva S).
 *
 * Render del output de la tool `calcular_curva_inversion` (ver
 * `lib/tools/curva-inversion.ts`) con:
 *   - Resumen de totales arriba.
 *   - Tabla de periodos con monto parcial, acumulado y %.
 *   - Mini-chart SVG con la curva acumulada (estilo "S").
 *   - Tabla de detalle por componente (materiales, MO, equipos).
 *
 * Estética coherente con `presentacion-darkgold` (Dark Gold).
 */

export interface CurvaInversionData {
  proyecto: {
    nombre: string;
    ubicacion?: string;
    año?: string;
  };
  /** Output de `calcular_curva_inversion`. */
  curva: {
    granularidad: 'semanal' | 'mensual';
    duracion_total_dias: number;
    costo_total_materiales: number;
    costo_total_mano_obra: number;
    costo_total_equipos: number;
    costo_total_obra: number;
    periodos: Array<{
      periodo: number;
      inicio_dia: number;
      fin_dia: number;
      tareas_activas: string[];
      costo_materiales: number;
      costo_mano_obra: number;
      costo_equipos: number;
      costo_total: number;
      costo_acumulado: number;
      porcentaje_avance: number;
    }>;
  };
  fecha?: string;
}

const GOLD = '#C9A84C';
const DARK = '#080808';
const DARK_2 = '#0f0f0f';
const DARK_3 = '#161616';
const DARK_4 = '#1e1e1e';
const LIGHT = '#ede9e0';
const LIGHT_DIM = 'rgba(237, 233, 224, 0.55)';
const TEXT = '#cac6be';
const TEXT_MUTED = 'rgba(202, 198, 190, 0.4)';
const SERIF = "'Cormorant Garamond', Georgia, serif";
const MONO = "'DM Mono', monospace";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(value);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildSvgCurva(
  periodos: CurvaInversionData['curva']['periodos'],
  width: number,
  height: number,
  padX: number,
  padY: number
): string {
  if (periodos.length === 0) return '';
  const w = width - 2 * padX;
  const h = height - 2 * padY;
  const maxCosto = Math.max(...periodos.map((p) => p.costo_acumulado), 1);
  const maxPeriodo = Math.max(periodos.length, 1);

  const points = periodos.map((p, i) => {
    const x = padX + (i / (maxPeriodo - 1 || 1)) * w;
    const y = padY + h - (p.costo_acumulado / maxCosto) * h;
    return [x, y] as const;
  });

  const path = points
    .map(([x, y], i) => (i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`))
    .join(' ');

  const areaPath = `${path} L ${points[points.length - 1]![0]} ${padY + h} L ${points[0]![0]} ${padY + h} Z`;

  const dots = points
    .map(
      ([x, y]) =>
        `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="3.5" fill="${GOLD}" />`
    )
    .join('');

  return `
    <svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" class="curva-svg">
      <!-- gridlines -->
      ${[0.25, 0.5, 0.75]
        .map(
          (p) =>
            `<line x1="${padX}" y1="${padY + h * (1 - p)}" x2="${padX + w}" y2="${padY + h * (1 - p)}" stroke="rgba(201,168,76,0.08)" />`
        )
        .join('')}
      <!-- area under curve -->
      <path d="${areaPath}" fill="rgba(201,168,76,0.12)" />
      <!-- curve line -->
      <path d="${path}" fill="none" stroke="${GOLD}" stroke-width="2.5" stroke-linejoin="round" />
      <!-- dots -->
      ${dots}
      <!-- 100% label -->
      <text x="${padX + w - 4}" y="${padY + 10}" text-anchor="end" font-family="${MONO}" font-size="10" fill="${TEXT_MUTED}">100%</text>
      <text x="${padX + 4}" y="${padY + h - 4}" font-family="${MONO}" font-size="10" fill="${TEXT_MUTED}">0%</text>
    </svg>`;
}

export function renderCurvaInversion(data: CurvaInversionData): string {
  const { proyecto, curva, fecha } = data;
  const maxParcial = Math.max(...curva.periodos.map((p) => p.costo_total), 1);

  const resumenHtml = `
    <div class="cron-resumen">
      <div class="cron-stat">
        <span class="cron-stat-label">Total obra</span>
        <span class="cron-stat-value">${formatCurrency(curva.costo_total_obra)}</span>
      </div>
      <div class="cron-stat">
        <span class="cron-stat-label">Materiales</span>
        <span class="cron-stat-value">${formatCurrency(curva.costo_total_materiales)}</span>
      </div>
      <div class="cron-stat">
        <span class="cron-stat-label">Mano de obra</span>
        <span class="cron-stat-value">${formatCurrency(curva.costo_total_mano_obra)}</span>
      </div>
      <div class="cron-stat">
        <span class="cron-stat-label">Equipos</span>
        <span class="cron-stat-value">${formatCurrency(curva.costo_total_equipos)}</span>
      </div>
      <div class="cron-stat">
        <span class="cron-stat-label">Duración</span>
        <span class="cron-stat-value">${curva.duracion_total_dias} días</span>
      </div>
    </div>`;

  const svg = buildSvgCurva(curva.periodos, 760, 280, 36, 24);

  const rowsHtml = curva.periodos
    .map((p) => {
      const widthPct = (p.costo_total / maxParcial) * 100;
      return `
      <tr>
        <td class="curva-periodo">P${p.periodo}</td>
        <td class="curva-dias">${p.inicio_dia}–${p.fin_dia}</td>
        <td class="curva-tareas">${p.tareas_activas.join(', ') || '—'}</td>
        <td class="curva-num">${formatCurrency(p.costo_materiales)}</td>
        <td class="curva-num">${formatCurrency(p.costo_mano_obra)}</td>
        <td class="curva-num">${formatCurrency(p.costo_equipos)}</td>
        <td>
          <div class="curva-bar-wrap">
            <div class="curva-bar" style="width: ${widthPct.toFixed(2)}%"></div>
          </div>
          <span class="curva-bar-num">${formatCurrency(p.costo_total)}</span>
        </td>
        <td class="curva-num curva-acum">${formatCurrency(p.costo_acumulado)}</td>
        <td class="curva-pct">${p.porcentaje_avance.toFixed(1)}%</td>
      </tr>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Curva de inversión · ${escapeHtml(proyecto.nombre)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=DM+Mono:wght@300;400;500&display=swap" rel="stylesheet">
<style>
  :root {
    --gold: ${GOLD};
    --dark: ${DARK};
    --dark-2: ${DARK_2};
    --dark-3: ${DARK_3};
    --dark-4: ${DARK_4};
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
    font-family: var(--mono);
    line-height: 1.6;
    padding: 40px 5vw;
  }
  h1 {
    font-family: var(--serif);
    font-size: 36px;
    font-weight: 500;
    color: var(--light);
    margin-bottom: 8px;
  }
  h2 {
    font-family: var(--serif);
    font-size: 24px;
    color: var(--light);
    margin-bottom: 16px;
    margin-top: 40px;
  }
  .meta {
    font-size: 11px;
    color: var(--text-muted);
    letter-spacing: 1.5px;
    text-transform: uppercase;
    margin-bottom: 32px;
  }
  .meta strong { color: var(--gold); }

  /* Resumen */
  .cron-resumen {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 1px;
    background: rgba(201, 168, 76, 0.3);
    border: 1px solid rgba(201, 168, 76, 0.3);
    margin-bottom: 40px;
  }
  .cron-stat {
    background: var(--dark);
    padding: 16px 20px;
  }
  .cron-stat-label {
    display: block;
    font-size: 9px;
    letter-spacing: 2.5px;
    text-transform: uppercase;
    color: var(--gold);
    margin-bottom: 6px;
  }
  .cron-stat-value {
    display: block;
    font-family: var(--serif);
    font-size: 22px;
    color: var(--light);
    font-weight: 500;
  }

  /* SVG curva S */
  .curva-svg-wrap {
    border: 1px solid rgba(201, 168, 76, 0.3);
    background: var(--dark-2);
    padding: 20px;
    margin-bottom: 32px;
  }
  .curva-svg {
    width: 100%;
    height: auto;
    display: block;
  }
  .curva-svg text { font-family: var(--mono); }

  /* Tabla */
  .curva-tabla {
    width: 100%;
    border-collapse: collapse;
    margin-top: 16px;
    font-size: 11.5px;
  }
  .curva-tabla th, .curva-tabla td {
    padding: 8px 10px;
    border-bottom: 1px solid rgba(201, 168, 76, 0.1);
    text-align: left;
    vertical-align: middle;
  }
  .curva-tabla th {
    font-size: 9.5px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: var(--gold);
    background: var(--dark-3);
    white-space: nowrap;
  }
  .curva-periodo { color: var(--gold); font-weight: 600; white-space: nowrap; }
  .curva-dias { color: var(--text-muted); white-space: nowrap; }
  .curva-tareas { color: var(--text-muted); font-size: 10.5px; }
  .curva-num { font-variant-numeric: tabular-nums; white-space: nowrap; }
  .curva-acum { color: var(--light); font-weight: 500; }
  .curva-pct { color: var(--gold); font-weight: 500; white-space: nowrap; }
  .curva-bar-wrap {
    background: var(--dark-3);
    height: 14px;
    border-radius: 3px;
    overflow: hidden;
    margin-bottom: 2px;
  }
  .curva-bar {
    height: 100%;
    background: linear-gradient(90deg, var(--gold), rgba(201, 168, 76, 0.6));
  }
  .curva-bar-num { font-size: 10px; color: var(--text-muted); }

  @media print {
    body { padding: 20px; }
    .curva-svg-wrap, .curva-tabla { page-break-inside: avoid; }
  }
</style>
</head>
<body>
  <h1>${escapeHtml(proyecto.nombre)}</h1>
  <div class="meta">
    <strong>Curva de inversión</strong> · ${curva.granularidad} · ${escapeHtml(proyecto.ubicacion ?? '')} · ${escapeHtml(proyecto.año ?? '')}${fecha ? ' · ' + escapeHtml(fecha) : ''}
  </div>

  ${resumenHtml}

  <h2>Curva S acumulada</h2>
  <div class="curva-svg-wrap">${svg}</div>

  <h2>Detalle por periodo</h2>
  <table class="curva-tabla">
    <thead>
      <tr>
        <th>Periodo</th>
        <th>Días</th>
        <th>Tareas</th>
        <th>Materiales</th>
        <th>Mano de obra</th>
        <th>Equipos</th>
        <th>Parcial</th>
        <th>Acumulado</th>
        <th>%</th>
      </tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
  </table>
</body>
</html>`;
}
