/**
 * Template HTML: presupuesto técnico "Dark Blue + Yellow".
 *
 * Formato tradicional argentino, portado del ejm-2 (Losa 50m²).
 * Estilo técnico/profesional con paleta corporativa:
 *   - Amarillo principal: #FFD700
 *   - Azul oscuro: #1B3A6B
 *   - Blanco / gris claro
 *
 * Imprimible A4 portrait, 2cm márgenes, header con datos del presupuesto.
 */

import type { ProyectoInput, RubrosInput } from '../types';

export interface PresupuestoTecnicoData {
  proyecto: ProyectoInput;
  rubros: RubrosInput;
  numero_presupuesto: string;
  fecha: string;
  cliente?: string;
  notas_tecnicas?: string[];
}

const YELLOW = '#FFD700';
const BLUE = '#1B3A6B';
const GRAFITO = '#2C3E50';

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

export function renderPresupuestoTecnico(data: PresupuestoTecnicoData): string {
  const { proyecto, rubros, numero_presupuesto, fecha, cliente, notas_tecnicas } = data;

  const grupos = new Map<string, typeof rubros.rubros>();
  rubros.rubros.forEach((r) => {
    const grupoNum = r.numero.split('.')[0];
    if (!grupos.has(grupoNum)) grupos.set(grupoNum, []);
    grupos.get(grupoNum)!.push(r);
  });

  const gruposHtml = Array.from(grupos.entries())
    .map(([numGrupo, items]) => {
      const nombreGrupo = items[0]?.nombre || `Grupo ${numGrupo}`;
      const itemsHtml = items
        .map(
          (item) => `
        <tr>
          <td class="num">${escapeHtml(item.numero)}</td>
          <td>${escapeHtml(item.nombre)}</td>
          <td class="cant">${item.cantidad} ${escapeHtml(item.unidad ?? '')}</td>
          <td class="num">${formatCurrency(item.precio_unitario_mat)}</td>
          <td class="num">${formatCurrency(item.precio_unitario_mo)}</td>
          <td class="num total">${formatCurrency(item.total)}</td>
        </tr>
      `
        )
        .join('');

      return `
        <tr class="grupo-header">
          <td colspan="6">
            <span class="grupo-num">${numGrupo}</span>
            <span class="grupo-nombre">${escapeHtml(nombreGrupo)}</span>
          </td>
        </tr>
        ${itemsHtml}
      `;
    })
    .join('');

  const notasHtml = notas_tecnicas
    ? `<div class="notas-tecnicas">
        <h3>Notas técnicas</h3>
        <ul>
          ${notas_tecnicas.map((n) => `<li>${escapeHtml(n)}</li>`).join('')}
        </ul>
      </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Presupuesto ${numero_presupuesto} — ${escapeHtml(proyecto.nombre)}</title>
<style>
  :root {
    --yellow: ${YELLOW};
    --blue: ${BLUE};
    --grafito: ${GRAFITO};
    --bg: #fafafa;
    --card: #ffffff;
  }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: var(--bg);
    color: var(--grafito);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    line-height: 1.5;
    padding: 2cm;
    max-width: 21cm;
    margin: 0 auto;
  }

  .header {
    background: var(--blue);
    color: white;
    padding: 24px 32px;
    margin: -2cm -2cm 32px -2cm;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }
  .header-left h1 {
    font-size: 18px; font-weight: 700; letter-spacing: 1px;
    text-transform: uppercase; color: var(--yellow);
  }
  .header-left .rol { font-size: 11px; color: rgba(255,255,255,0.7); }
  .header-right { text-align: right; }
  .header-right .pres-num {
    font-size: 13px; font-weight: 700; letter-spacing: 1px;
    color: var(--yellow);
  }
  .header-right .fecha { font-size: 11px; color: rgba(255,255,255,0.8); }
  .header-right .tipo {
    margin-top: 12px; font-size: 10px; letter-spacing: 2px;
    text-transform: uppercase; color: rgba(255,255,255,0.6);
  }
  .header-right h2 {
    font-size: 28px; font-weight: 700; color: white;
    margin-top: 4px;
  }

  .meta-grid {
    display: grid; grid-template-columns: repeat(5, 1fr);
    gap: 16px; padding: 16px 24px;
    background: var(--card);
    border: 1px solid #e0e0e0;
    border-bottom: 2px solid var(--yellow);
    margin-bottom: 32px;
  }
  .meta-cell .label {
    font-size: 9px; letter-spacing: 2px; text-transform: uppercase;
    color: var(--blue); display: block; margin-bottom: 4px;
    font-weight: 700;
  }
  .meta-cell .value {
    font-size: 13px; color: var(--grafito); font-weight: 500;
  }

  .rubro-titulo {
    border-left: 4px solid var(--yellow);
    padding-left: 12px; margin: 32px 0 12px;
    font-size: 12px; letter-spacing: 2px; text-transform: uppercase;
    color: var(--blue); font-weight: 700;
  }

  table {
    width: 100%; border-collapse: collapse;
    background: var(--card);
    border: 1px solid #e0e0e0;
  }
  thead { background: var(--blue); color: white; }
  th {
    text-align: left; padding: 12px 16px;
    font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase;
    font-weight: 600;
  }
  th.num, th.cant { text-align: right; }
  td {
    padding: 12px 16px;
    border-bottom: 1px solid #f0f0f0;
    font-size: 13px;
  }
  td.num, td.cant { text-align: right; font-variant-numeric: tabular-nums; }
  td.total { font-weight: 700; color: var(--blue); }
  .grupo-header td {
    background: #f5f5f5;
    padding: 8px 16px;
    border-bottom: 1px solid var(--yellow);
  }
  .grupo-num {
    background: var(--yellow); color: var(--blue);
    padding: 2px 8px; margin-right: 8px;
    font-weight: 700; font-size: 11px;
  }
  .grupo-nombre {
    font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase;
    font-weight: 700; color: var(--blue);
  }

  .resumen {
    margin-top: 32px;
    background: var(--card);
    border: 1px solid #e0e0e0;
    border-top: 3px solid var(--yellow);
    padding: 24px 32px;
    display: grid; grid-template-columns: 2fr 1fr; gap: 24px;
    align-items: center;
  }
  .resumen-linea {
    display: flex; justify-content: space-between;
    padding: 6px 0; border-bottom: 1px dashed #e0e0e0;
    font-size: 13px;
  }
  .resumen-linea:last-child { border-bottom: none; }
  .resumen-linea strong { color: var(--blue); }
  .total-box {
    background: var(--yellow);
    color: var(--blue);
    padding: 20px 24px;
    text-align: center;
  }
  .total-box .label {
    font-size: 10px; letter-spacing: 2px; text-transform: uppercase;
    font-weight: 700; display: block; margin-bottom: 6px;
  }
  .total-box .value {
    font-size: 28px; font-weight: 700;
  }

  .notas-tecnicas {
    margin-top: 32px;
    background: var(--card);
    border: 1px solid #e0e0e0;
    padding: 20px 24px;
  }
  .notas-tecnicas h3 {
    font-size: 11px; letter-spacing: 2px; text-transform: uppercase;
    color: var(--blue); margin-bottom: 12px; font-weight: 700;
  }
  .notas-tecnicas ul { list-style: none; columns: 2; column-gap: 32px; }
  .notas-tecnicas li {
    font-size: 12px; line-height: 1.6; color: var(--grafito);
    padding-left: 16px; position: relative; margin-bottom: 6px;
    break-inside: avoid;
  }
  .notas-tecnicas li::before {
    content: '·'; color: var(--yellow); font-weight: 700;
    position: absolute; left: 0; font-size: 18px;
  }

  .footer {
    margin-top: 32px; padding-top: 16px;
    border-top: 1px solid #e0e0e0;
    text-align: center; font-size: 11px; color: #888;
  }
  .footer strong { color: var(--blue); }

  @media print {
    body { padding: 0; background: white; }
    .header { margin: 0 0 24px 0; }
    table { page-break-inside: avoid; }
    .resumen { page-break-inside: avoid; }
  }
</style>
</head>
<body>

<div class="header">
  <div class="header-left">
    <h1>${escapeHtml(proyecto.arquitecto)}</h1>
    <div class="rol">Arquitecto</div>
  </div>
  <div class="header-right">
    <div class="pres-num">PRE-${escapeHtml(numero_presupuesto)}</div>
    <div class="fecha">${escapeHtml(fecha)}</div>
    <div class="tipo">Presupuesto de obra</div>
    <h2>${escapeHtml(proyecto.nombre)}</h2>
  </div>
</div>

<div class="meta-grid">
  <div class="meta-cell">
    <span class="label">Cliente</span>
    <span class="value">${escapeHtml(cliente ?? '—')}</span>
  </div>
  <div class="meta-cell">
    <span class="label">Ubicación</span>
    <span class="value">${escapeHtml(proyecto.ubicacion)}</span>
  </div>
  <div class="meta-cell">
    <span class="label">Tipo de obra</span>
    <span class="value">${escapeHtml(proyecto.sistema ?? 'Obra nueva')}</span>
  </div>
  <div class="meta-cell">
    <span class="label">Superficie</span>
    <span class="value">${escapeHtml(proyecto.superficie_total ?? '—')}</span>
  </div>
  <div class="meta-cell">
    <span class="label">Año</span>
    <span class="value">${escapeHtml(proyecto.año ?? "")}</span>
  </div>
</div>

<h3 class="rubro-titulo">Detalle de rubros</h3>
<table>
  <thead>
    <tr>
      <th class="num" style="width: 50px;">#</th>
      <th>Descripción</th>
      <th class="cant" style="width: 90px;">Cantidad</th>
      <th class="num" style="width: 100px;">P. Unit. Mat.</th>
      <th class="num" style="width: 100px;">P. Unit. MO</th>
      <th class="num" style="width: 110px;">Total</th>
    </tr>
  </thead>
  <tbody>
    ${gruposHtml}
  </tbody>
</table>

<div class="resumen">
  <div>
    <div class="resumen-linea">
      <span>Materiales</span>
      <strong>${formatCurrency(rubros.totales.materiales)}</strong>
    </div>
    <div class="resumen-linea">
      <span>Mano de Obra</span>
      <strong>${formatCurrency(rubros.totales.mano_de_obra)}</strong>
    </div>
    ${
      rubros.totales.costo_m2
        ? `<div class="resumen-linea">
        <span>Costo por m²</span>
        <strong>${formatCurrency(rubros.totales.costo_m2)}</strong>
      </div>`
        : ''
    }
  </div>
  <div class="total-box">
    <span class="label">Total estimado</span>
    <span class="value">${formatCurrency(rubros.totales.total_obra)}</span>
  </div>
</div>

${notasHtml}

<div class="footer">
  <strong>${escapeHtml(proyecto.arquitecto)}</strong> @ ${escapeHtml(proyecto.web ?? proyecto.email)}
  · Presupuesto orientativo — No reemplaza cómputo detallado
</div>

</body>
</html>`;
}
