/**
 * Template HTML: cronograma tipo Gantt.
 *
 * Render del output de la tool `calcular_cronograma` (ver
 * `lib/tools/cronograma.ts`) como diagrama de Gantt. Estética coherente con
 * el template `presentacion-darkgold` (Dark Gold).
 *
 * Implementación:
 *   - Una fila por tarea con barra horizontal de ancho proporcional a su
 *     duración. El offset horizontal marca el día de inicio.
 *   - Escala de días arriba (cada 5 días para no saturar visualmente).
 *   - Tareas críticas: barra en dorado (color de acento).
 *   - Tareas no críticas: barra en gris translúcido.
 *   - Holgura: marker cyan en el lado derecho de la barra.
 *   - Resumen arriba: duración total + camino crítico.
 *   - Layout responsive: scroll horizontal si el proyecto es largo.
 *
 * No usamos SVG para mantener el render portable a PDF sin libs externas.
 */

export interface CronogramaGanttData {
  proyecto: {
    nombre: string;
    ubicacion?: string;
    año?: string;
  };
  /** Output de `calcular_cronograma`. */
  cronograma: {
    duracion_total_dias: number;
    fin_proyecto_dia: number;
    camino_critico: string[];
    tareas: Array<{
      id: string;
      nombre: string;
      duracion_dias: number;
      inicio_dia: number;
      fin_dia: number;
      holgura_dias: number;
      critica: boolean;
      predecesoras: string[];
    }>;
  };
  /** Optional curva de inversion para mostrar abajo del Gantt en el mismo HTML. */
  curva?: {
    granularidad: 'semanal' | 'mensual';
    duracion_total_dias: number;
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
const GOLD_DIM = 'rgba(201, 168, 76, 0.35)';
const DARK = '#080808';
const DARK_2 = '#0f0f0f';
const DARK_3 = '#161616';
const DARK_4 = '#1e1e1e';
const LIGHT = '#ede9e0';
const LIGHT_DIM = 'rgba(237, 233, 224, 0.55)';
const TEXT = '#cac6be';
const TEXT_MUTED = 'rgba(202, 198, 190, 0.4)';
const ACCENT = '#22d3ee';

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

function ticksDeEscala(duracion: number): number[] {
  if (duracion <= 0) return [];
  const paso = duracion > 60 ? 10 : duracion > 20 ? 5 : 2;
  const ticks: number[] = [];
  for (let d = 0; d <= duracion; d += paso) ticks.push(d);
  if (ticks[ticks.length - 1] !== duracion) ticks.push(duracion);
  return ticks;
}

export function renderCronogramaGantt(data: CronogramaGanttData): string {
  const { proyecto, cronograma, curva, fecha } = data;
  const duracion = cronograma.duracion_total_dias;
  const inicioAbs = cronograma.tareas.reduce(
    (min, t) => Math.min(min, t.inicio_dia),
    Number.POSITIVE_INFINITY
  );
  // El Gantt arranca en día 1 relativo (independiente del día absoluto).
  const tasksRel = cronograma.tareas
    .map((t) => ({
      ...t,
      relInicio: t.inicio_dia - inicioAbs + 1,
      relFin: t.fin_dia - inicioAbs + 1,
    }))
    .sort((a, b) => a.relInicio - b.relInicio);

  const ticks = ticksDeEscala(duracion);

  const rowsHtml = tasksRel
    .map((t) => {
      const leftPct = ((t.relInicio - 1) / duracion) * 100;
      const widthPct = (t.duracion_dias / duracion) * 100;
      const isCritical = t.critica;
      return `
      <div class="gantt-row">
        <div class="gantt-label">
          <span class="gantt-label-name">${escapeHtml(t.nombre)}</span>
          <span class="gantt-label-meta">
            ${t.duracion_dias}d · holgura ${t.holgura_dias}d ${isCritical ? '· <span class="gantt-critical">CRÍTICA</span>' : ''}
          </span>
        </div>
        <div class="gantt-track" style="--gantt-duration: ${duracion}">
          <div class="gantt-grid" style="--gantt-ticks: ${ticks.length}">
            ${ticks
              .map(
                (d) =>
                  `<div class="gantt-tick" style="left: ${(d / duracion) * 100}%"><span>${inicioAbs + d - 1}</span></div>`
              )
              .join('')}
          </div>
          <div
            class="gantt-bar ${isCritical ? 'gantt-bar-critical' : 'gantt-bar-normal'}"
            style="left: ${leftPct}%; width: ${widthPct}%"
            title="${escapeHtml(t.nombre)} (${t.duracion_dias} días)${isCritical ? ' — crítica' : ''}"
          >
            <span class="gantt-bar-id">${escapeHtml(t.id)}</span>
            ${
              t.holgura_dias > 0 && !isCritical
                ? `<span class="gantt-holgura" title="Holgura: ${t.holgura_dias} días"></span>`
                : ''
            }
          </div>
        </div>
      </div>`;
    })
    .join('');

  const resumenHtml = `
    <div class="cron-resumen">
      <div class="cron-stat">
        <span class="cron-stat-label">Duración</span>
        <span class="cron-stat-value">${duracion} días</span>
      </div>
      <div class="cron-stat">
        <span class="cron-stat-label">Inicio</span>
        <span class="cron-stat-value">día ${cronograma.tareas[0]?.inicio_dia ?? 1}</span>
      </div>
      <div class="cron-stat">
        <span class="cron-stat-label">Fin</span>
        <span class="cron-stat-value">día ${cronograma.fin_proyecto_dia}</span>
      </div>
      <div class="cron-stat">
        <span class="cron-stat-label">Críticas</span>
        <span class="cron-stat-value">${cronograma.camino_critico.length} tareas</span>
      </div>
    </div>`;

  const tareasTable = cronograma.tareas
    .sort((a, b) => a.inicio_dia - b.inicio_dia)
    .map(
      (t) => `
      <tr>
        <td>${escapeHtml(t.id)}</td>
        <td>${escapeHtml(t.nombre)}</td>
        <td>${t.duracion_dias}d</td>
        <td>${t.inicio_dia}</td>
        <td>${t.fin_dia}</td>
        <td>${t.holgura_dias}d</td>
        <td>${t.predecesoras.length ? t.predecesoras.join(', ') : '—'}</td>
        <td>${t.critica ? '<span class="cron-cell-critica">CRÍTICA</span>' : ''}</td>
      </tr>`
    )
    .join('');

  let curvaHtml = '';
  if (curva && curva.periodos.length > 0) {
    const maxCosto = Math.max(...curva.periodos.map((p) => p.costo_total), 1);
    const barRows = curva.periodos
      .map((p) => {
        const widthPct = (p.costo_total / maxCosto) * 100;
        return `
        <tr>
          <td class="curva-periodo">P${p.periodo}</td>
          <td class="curva-dias">${p.inicio_dia}–${p.fin_dia}</td>
          <td>
            <div class="curva-bar-wrap">
              <div class="curva-bar" style="width: ${widthPct}%"></div>
            </div>
          </td>
          <td class="curva-num">${formatCurrency(p.costo_total)}</td>
          <td class="curva-num curva-acum">${formatCurrency(p.costo_acumulado)}</td>
          <td class="curva-pct">${p.porcentaje_avance.toFixed(1)}%</td>
        </tr>`;
      })
      .join('');
    curvaHtml = `
    <section class="curva-section">
      <h2 class="curva-title">Curva de inversión (${curva.granularidad})</h2>
      <p class="curva-sub">Total ${formatCurrency(curva.costo_total_obra)} en ${curva.duracion_total_dias} días.</p>
      <table class="curva-tabla">
        <thead>
          <tr>
            <th>Periodo</th><th>Días</th><th>Gasto parcial</th><th>Monto</th><th>Acumulado</th><th>%</th>
          </tr>
        </thead>
        <tbody>${barRows}</tbody>
      </table>
    </section>`;
  }

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Cronograma · ${escapeHtml(proyecto.nombre)}</title>
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
    --serif: 'Cormorant Garamond', Georgia, serif;
    --mono: 'DM Mono', monospace;
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
    background: var(--gold-mid, rgba(201, 168, 76, 0.3));
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

  /* Gantt */
  .gantt {
    border: 1px solid rgba(201, 168, 76, 0.3);
    background: var(--dark-2);
  }
  .gantt-row {
    display: flex;
    align-items: stretch;
    border-bottom: 1px solid rgba(201, 168, 76, 0.1);
  }
  .gantt-row:last-child { border-bottom: none; }
  .gantt-label {
    width: 200px;
    flex-shrink: 0;
    padding: 10px 12px;
    border-right: 1px solid rgba(201, 168, 76, 0.15);
    background: var(--dark-3);
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  .gantt-label-name {
    font-size: 12px;
    color: var(--light);
    font-weight: 500;
    margin-bottom: 2px;
  }
  .gantt-label-meta {
    font-size: 9px;
    color: var(--text-muted);
    letter-spacing: 0.5px;
  }
  .gantt-critical { color: var(--gold); font-weight: 600; }
  .gantt-track {
    flex: 1;
    position: relative;
    height: 44px;
    background: var(--dark-2);
    overflow: hidden;
  }
  .gantt-grid {
    position: absolute;
    inset: 0;
    --gantt-ticks: 5;
    display: flex;
  }
  .gantt-tick {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 1px;
    background: rgba(201, 168, 76, 0.08);
  }
  .gantt-tick span {
    position: absolute;
    top: 2px;
    left: 2px;
    font-size: 9px;
    color: var(--text-muted);
  }
  .gantt-bar {
    position: absolute;
    top: 8px;
    bottom: 8px;
    border-radius: 3px;
    display: flex;
    align-items: center;
    padding: 0 8px;
    font-size: 10px;
    color: var(--dark);
    font-weight: 600;
    letter-spacing: 0.5px;
    overflow: hidden;
  }
  .gantt-bar-critical {
    background: var(--gold);
  }
  .gantt-bar-normal {
    background: rgba(201, 168, 76, 0.25);
    color: var(--text);
    border: 1px solid rgba(201, 168, 76, 0.4);
  }
  .gantt-bar-id { white-space: nowrap; }
  .gantt-holgura {
    position: absolute;
    top: 0;
    bottom: 0;
    right: -6px;
    width: 2px;
    background: ${ACCENT};
  }

  /* Tabla */
  .cron-tabla {
    width: 100%;
    border-collapse: collapse;
    margin-top: 32px;
    font-size: 12px;
  }
  .cron-tabla th, .cron-tabla td {
    padding: 8px 10px;
    border-bottom: 1px solid rgba(201, 168, 76, 0.1);
    text-align: left;
  }
  .cron-tabla th {
    font-size: 10px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: var(--gold);
    background: var(--dark-3);
  }
  .cron-cell-critica {
    color: var(--gold);
    font-weight: 600;
    font-size: 10px;
    letter-spacing: 0.5px;
  }

  /* Curva */
  .curva-section { margin-top: 60px; }
  .curva-title { color: var(--gold); }
  .curva-sub {
    font-size: 12px;
    color: var(--text-muted);
    margin-bottom: 16px;
  }
  .curva-tabla { width: 100%; border-collapse: collapse; font-size: 12px; }
  .curva-tabla th, .curva-tabla td {
    padding: 8px 10px;
    border-bottom: 1px solid rgba(201, 168, 76, 0.1);
    text-align: left;
  }
  .curva-tabla th {
    font-size: 10px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: var(--gold);
    background: var(--dark-3);
  }
  .curva-periodo { color: var(--gold); font-weight: 600; }
  .curva-dias { color: var(--text-muted); }
  .curva-num { font-variant-numeric: tabular-nums; }
  .curva-acum { color: var(--light); font-weight: 500; }
  .curva-pct { color: var(--gold); font-weight: 500; }
  .curva-bar-wrap {
    background: var(--dark-3);
    height: 16px;
    border-radius: 3px;
    overflow: hidden;
  }
  .curva-bar {
    height: 100%;
    background: linear-gradient(90deg, var(--gold), rgba(201, 168, 76, 0.6));
  }

  @media print {
    body { padding: 20px; }
    .gantt { page-break-inside: avoid; }
    .cron-tabla, .curva-tabla { page-break-inside: avoid; }
  }
</style>
</head>
<body>
  <h1>${escapeHtml(proyecto.nombre)}</h1>
  <div class="meta">
    <strong>Cronograma</strong> · ${escapeHtml(proyecto.ubicacion ?? '')} · ${escapeHtml(proyecto.año ?? '')}${fecha ? ' · ' + escapeHtml(fecha) : ''}
  </div>

  ${resumenHtml}

  <h2>Diagrama de Gantt</h2>
  <div class="gantt">${rowsHtml}</div>

  <h2>Detalle de tareas</h2>
  <table class="cron-tabla">
    <thead>
      <tr>
        <th>ID</th><th>Tarea</th><th>Duración</th><th>Inicio</th><th>Fin</th>
        <th>Holgura</th><th>Predecesoras</th><th>Camino crítico</th>
      </tr>
    </thead>
    <tbody>${tareasTable}</tbody>
  </table>

  ${curvaHtml}
</body>
</html>`;
}
