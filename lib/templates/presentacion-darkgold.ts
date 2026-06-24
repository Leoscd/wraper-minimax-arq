/**
 * Template HTML: presentación "Dark Gold" premium.
 *
 * Estructura portada del index.html de la Casa Rogeris.
 * Diseño editorial dark con acento dorado, tipografía Cormorant + DM Mono.
 *
 * Salida: HTML completo autocontenido (CSS embebido, fonts via Google).
 * Imágenes: rutas absolutas (URLs) que M3 inyecta desde el input del usuario.
 */

import type { BrandingInput, ProyectoInput, ArchivosInput, RubrosInput } from '../types';

export interface PresentacionData {
  proyecto: ProyectoInput;
  rubros?: RubrosInput;
  archivos: ArchivosInput;
  branding: BrandingInput;
  descripcion_larga?: string;
}

const GOLD = '#C9A84C';
const DARK = '#080808';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
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

export function renderPresentacionDarkGold(data: PresentacionData): string {
  const { proyecto, archivos, branding, rubros } = data;
  const gold = branding.color_primario || GOLD;
  const logoHtml = branding.logo_url
    ? `<img src="${escapeHtml(branding.logo_url)}" alt="${escapeHtml(branding.empresa_nombre)}" class="logo" />`
    : `<span class="logo-text">${escapeHtml(branding.empresa_nombre)}</span>`;

  const videoHtml = archivos.video_hero
    ? `<video class="hero-video" autoplay muted loop playsinline>
        <source src="${escapeHtml(archivos.video_hero)}" type="video/mp4" />
      </video>`
    : archivos.imagen_principal
      ? `<img src="${escapeHtml(archivos.imagen_principal)}" class="hero-image" alt="${escapeHtml(proyecto.nombre)}" />`
      : '';

  const galeriaHtml = (archivos.galeria || [])
    .map(
      (img) => `
      <figure class="gallery-item">
        <img src="${escapeHtml(img.url)}" alt="${escapeHtml(img.nombre)}" />
        <figcaption>${escapeHtml(img.nombre)}</figcaption>
      </figure>
    `
    )
    .join('');

  const rubrosHtml = rubros
    ? `
    <section class="section presupuesto" id="presupuesto">
      <div class="container">
        <span class="s-tag">Presupuesto</span>
        <h2 class="s-title">Inversión estimada</h2>

        <div class="presupuesto-grid">
          <div class="presupuesto-tabla">
            <table>
              <thead>
                <tr>
                  <th>N°</th>
                  <th>Rubro</th>
                  <th class="num">Materiales</th>
                  <th class="num">Mano de Obra</th>
                  <th class="num">Total</th>
                </tr>
              </thead>
              <tbody>
                ${rubros.rubros
                  .map(
                    (r) => `
                  <tr>
                    <td>${escapeHtml(r.numero)}</td>
                    <td>${escapeHtml(r.nombre)}</td>
                    <td class="num">${formatCurrency(r.materiales)}</td>
                    <td class="num">${formatCurrency(r.mano_de_obra)}</td>
                    <td class="num">${formatCurrency(r.total)}</td>
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="2"><strong>TOTAL</strong></td>
                  <td class="num"><strong>${formatCurrency(rubros.totales.materiales)}</strong></td>
                  <td class="num"><strong>${formatCurrency(rubros.totales.mano_de_obra)}</strong></td>
                  <td class="num"><strong>${formatCurrency(rubros.totales.total_obra)}</strong></td>
                </tr>
              </tfoot>
            </table>
            ${rubros.nota ? `<p class="presupuesto-nota">${escapeHtml(rubros.nota)}</p>` : ''}
          </div>

          <aside class="presupuesto-resumen">
            <div class="resumen-card">
              <span class="resumen-label">Total obra</span>
              <span class="resumen-value">${formatCurrency(rubros.totales.total_obra)}</span>
            </div>
            <div class="resumen-card">
              <span class="resumen-label">Materiales</span>
              <span class="resumen-value-sm">${formatCurrency(rubros.totales.materiales)}</span>
            </div>
            <div class="resumen-card">
              <span class="resumen-label">Mano de obra</span>
              <span class="resumen-value-sm">${formatCurrency(rubros.totales.mano_de_obra)}</span>
            </div>
            ${
              rubros.totales.costo_m2
                ? `<div class="resumen-card">
                    <span class="resumen-label">Costo por m²</span>
                    <span class="resumen-value-sm">${formatCurrency(rubros.totales.costo_m2)}</span>
                  </div>`
                : ''
            }
          </aside>
        </div>
      </div>
    </section>
  `
    : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(proyecto.nombre)} — ${escapeHtml(branding.empresa_nombre)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=DM+Mono:wght@300;400;500&display=swap" rel="stylesheet">
<style>
  :root {
    --gold: ${gold};
    --gold-dim: ${gold}1e;
    --gold-mid: ${gold}59;
    --dark: ${DARK};
    --dark-2: #0f0f0f;
    --dark-3: #161616;
    --dark-4: #1e1e1e;
    --light: #ede9e0;
    --light-dim: #ede9e08c;
    --text: #cac6be;
    --serif: 'Cormorant Garamond', Georgia, serif;
    --mono: 'DM Mono', monospace;
  }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; font-size: 16px; }
  body {
    background: var(--dark);
    color: var(--text);
    font-family: var(--mono);
    overflow-x: hidden;
    -webkit-font-smoothing: antialiased;
  }
  a { color: inherit; text-decoration: none; }
  img { max-width: 100%; height: auto; display: block; }

  /* NAV */
  nav {
    position: fixed; top: 0; left: 0; right: 0; z-index: 200;
    display: flex; justify-content: space-between; align-items: center;
    padding: 20px 5vw;
    background: linear-gradient(to bottom, rgba(8,8,8,0.92) 0%, transparent 100%);
    backdrop-filter: blur(2px);
  }
  .nav-brand {
    display: flex; align-items: center; gap: 12px;
    font-family: var(--serif); font-size: 17px; font-weight: 300;
    color: var(--light); letter-spacing: 0.5px;
  }
  .nav-brand em { font-style: italic; color: var(--gold); }
  .logo { height: 32px; width: auto; }
  .logo-text { font-family: var(--serif); font-size: 18px; }
  .nav-links { display: flex; gap: 28px; list-style: none; }
  .nav-links a {
    font-size: 9px; letter-spacing: 3.5px; text-transform: uppercase;
    color: var(--light-dim); transition: color 0.25s;
  }
  .nav-links a:hover { color: var(--gold); }

  /* HERO */
  .hero {
    position: relative; height: 100vh; min-height: 640px;
    display: flex; align-items: flex-end; overflow: hidden;
  }
  .hero-video, .hero-image {
    position: absolute; inset: 0; width: 100%; height: 100%;
    object-fit: cover; filter: brightness(0.38) saturate(0.9);
  }
  .hero-overlay {
    position: absolute; inset: 0;
    background: linear-gradient(to top, rgba(8,8,8,0.97) 0%, rgba(8,8,8,0.3) 45%, rgba(8,8,8,0.1) 100%),
                linear-gradient(to right, rgba(8,8,8,0.5) 0%, transparent 60%);
  }
  .hero-content {
    position: relative; z-index: 2; padding: 0 5vw 9vh; max-width: 860px;
  }
  .hero-eyebrow {
    display: flex; align-items: center; gap: 14px; margin-bottom: 22px;
  }
  .hero-tag {
    font-size: 9px; letter-spacing: 4px; text-transform: uppercase; color: var(--gold);
  }
  .hero-line { width: 40px; height: 1px; background: var(--gold); opacity: 0.6; }
  .hero-title {
    font-family: var(--serif); font-size: clamp(58px, 9vw, 116px);
    font-weight: 300; line-height: 0.88; color: var(--light);
    letter-spacing: -2px; margin-bottom: 28px;
  }
  .hero-title em { font-style: italic; color: var(--gold); display: block; }
  .hero-subtitle {
    font-size: 14px; color: var(--text); max-width: 600px; line-height: 1.6;
  }

  /* SECTIONS */
  section { padding: 100px 5vw; }
  .container { max-width: 1400px; margin: 0 auto; }
  .s-tag {
    font-size: 9px; letter-spacing: 4px; text-transform: uppercase;
    color: var(--gold); margin-bottom: 14px; display: block;
  }
  .s-title {
    font-family: var(--serif); font-size: clamp(38px, 5.5vw, 68px);
    font-weight: 300; color: var(--light); line-height: 1.02;
    margin-bottom: 56px; letter-spacing: -1px;
  }

  /* PROYECTO INFO */
  .proyecto-grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: 80px;
    align-items: start;
  }
  .proyecto-info h3 {
    font-family: var(--serif); font-size: 28px; color: var(--light);
    font-weight: 400; margin-bottom: 16px;
  }
  .proyecto-info p { font-size: 14px; line-height: 1.8; margin-bottom: 16px; }
  .proyecto-meta {
    display: grid; grid-template-columns: 1fr 1fr; gap: 24px;
    margin-top: 32px;
  }
  .meta-item {
    border-top: 1px solid var(--gold-mid);
    padding-top: 12px;
  }
  .meta-label {
    font-size: 9px; letter-spacing: 3px; text-transform: uppercase;
    color: var(--gold); display: block; margin-bottom: 6px;
  }
  .meta-value {
    font-family: var(--serif); font-size: 22px; color: var(--light);
    font-weight: 400;
  }

  /* GALERIA */
  .galeria {
    display: flex; gap: 16px; overflow-x: auto;
    padding: 20px 5vw; scroll-snap-type: x mandatory;
  }
  .gallery-item {
    flex: 0 0 80vw; max-width: 800px; scroll-snap-align: start;
    position: relative;
  }
  .gallery-item img {
    width: 100%; height: 60vh; object-fit: cover; border-radius: 2px;
  }
  .gallery-item figcaption {
    margin-top: 12px; font-size: 11px; letter-spacing: 2px;
    text-transform: uppercase; color: var(--light-dim);
  }

  /* PRESUPUESTO */
  .presupuesto-grid {
    display: grid; grid-template-columns: 2fr 1fr; gap: 48px;
  }
  .presupuesto-tabla table {
    width: 100%; border-collapse: collapse; font-size: 12px;
  }
  .presupuesto-tabla th {
    text-align: left; padding: 12px 8px;
    border-bottom: 1px solid var(--gold);
    font-size: 9px; letter-spacing: 2px; text-transform: uppercase;
    color: var(--gold);
  }
  .presupuesto-tabla td {
    padding: 14px 8px; border-bottom: 1px solid rgba(201,168,76,0.1);
  }
  .presupuesto-tabla .num { text-align: right; font-variant-numeric: tabular-nums; }
  .presupuesto-tabla tfoot td {
    border-top: 1px solid var(--gold); border-bottom: none;
    padding-top: 20px; color: var(--light);
  }
  .presupuesto-nota {
    margin-top: 20px; font-size: 11px; color: var(--light-dim);
    font-style: italic; line-height: 1.6;
  }
  .presupuesto-resumen {
    display: flex; flex-direction: column; gap: 16px;
  }
  .resumen-card {
    border: 1px solid var(--gold-mid);
    padding: 20px;
    background: var(--dark-2);
  }
  .resumen-label {
    font-size: 9px; letter-spacing: 2.5px; text-transform: uppercase;
    color: var(--gold); display: block; margin-bottom: 8px;
  }
  .resumen-value {
    font-family: var(--serif); font-size: 28px; color: var(--gold);
    font-weight: 400;
  }
  .resumen-value-sm {
    font-family: var(--serif); font-size: 22px; color: var(--light);
    font-weight: 400;
  }

  /* FOOTER */
  footer {
    padding: 60px 5vw 40px;
    border-top: 1px solid rgba(201,168,76,0.1);
    text-align: center;
  }
  .footer-content {
    font-family: var(--serif); font-size: 20px; color: var(--light);
    margin-bottom: 12px;
  }
  .footer-content em { font-style: italic; color: var(--gold); }
  .footer-meta {
    font-size: 10px; letter-spacing: 2px; text-transform: uppercase;
    color: var(--text-muted);
  }

  /* RESPONSIVE */
  @media (max-width: 768px) {
    .proyecto-grid, .presupuesto-grid, .proyecto-meta { grid-template-columns: 1fr; gap: 32px; }
    .gallery-item { flex: 0 0 90vw; }
    section { padding: 60px 6vw; }
  }

  /* PRINT */
  @media print {
    nav, footer { display: none; }
    body { background: white; color: #1a1a1a; }
    .hero { height: 50vh; }
    section { padding: 40px 5vw; page-break-inside: avoid; }
    .s-title { color: #1a1a1a; }
    .presupuesto-tabla th { color: ${gold}; }
  }
</style>
</head>
<body>

<nav>
  <div class="nav-brand">
    ${logoHtml}
    <em>${escapeHtml(branding.empresa_nombre)}</em>
  </div>
  <ul class="nav-links">
    <li><a href="#proyecto">Proyecto</a></li>
    ${archivos.galeria?.length ? '<li><a href="#galeria">Galería</a></li>' : ''}
    ${rubros ? '<li><a href="#presupuesto">Presupuesto</a></li>' : ''}
    <li><a href="#contacto">Contacto</a></li>
  </ul>
</nav>

<section class="hero">
  ${videoHtml}
  <div class="hero-overlay"></div>
  <div class="hero-content">
    <div class="hero-eyebrow">
      <span class="hero-tag">${escapeHtml(proyecto.año)} · ${escapeHtml(proyecto.ubicacion)}</span>
      <span class="hero-line"></span>
    </div>
    <h1 class="hero-title">
      ${escapeHtml(proyecto.nombre)}
      <em>${escapeHtml(proyecto.subtitulo ?? proyecto.sistema ?? '')}</em>
    </h1>
    <p class="hero-subtitle">${escapeHtml(proyecto.descripcion)}</p>
  </div>
</section>

<section class="section proyecto" id="proyecto">
  <div class="container">
    <span class="s-tag">El proyecto</span>
    <h2 class="s-title">Información técnica</h2>

    <div class="proyecto-grid">
      <div class="proyecto-info">
        <h3>${escapeHtml(proyecto.subtitulo ?? proyecto.nombre)}</h3>
        <p>${escapeHtml(proyecto.descripcion)}</p>
      </div>
      <div class="proyecto-meta">
        ${
          proyecto.superficie_total
            ? `<div class="meta-item">
            <span class="meta-label">Superficie total</span>
            <span class="meta-value">${escapeHtml(proyecto.superficie_total)}</span>
          </div>`
            : ''
        }
        ${
          proyecto.unidades
            ? `<div class="meta-item">
            <span class="meta-label">Unidades</span>
            <span class="meta-value">${escapeHtml(proyecto.unidades)}</span>
          </div>`
            : ''
        }
        ${
          proyecto.sistema
            ? `<div class="meta-item">
            <span class="meta-label">Sistema</span>
            <span class="meta-value">${escapeHtml(proyecto.sistema)}</span>
          </div>`
            : ''
        }
        <div class="meta-item">
          <span class="meta-label">Estado</span>
          <span class="meta-value">${escapeHtml(proyecto.estado)}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Año</span>
          <span class="meta-value">${escapeHtml(proyecto.año)}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Ubicación</span>
          <span class="meta-value">${escapeHtml(proyecto.ubicacion)}</span>
        </div>
      </div>
    </div>
  </div>
</section>

${
  galeriaHtml
    ? `<section class="section galeria-section" id="galeria">
    <div class="container">
      <span class="s-tag">Galería</span>
      <h2 class="s-title">Renders del proyecto</h2>
    </div>
    <div class="galeria">${galeriaHtml}</div>
  </section>`
    : ''
}

${rubrosHtml}

<footer id="contacto">
  <div class="footer-content">
    ${escapeHtml(proyecto.arquitecto)}<br>
    <em>${escapeHtml(branding.empresa_nombre)}</em>
  </div>
  <div class="footer-meta">
    ${escapeHtml(proyecto.email)}${proyecto.telefono ? ' · ' + escapeHtml(proyecto.telefono) : ''}${proyecto.web ? ' · ' + escapeHtml(proyecto.web) : ''}${proyecto.instagram ? ' · ' + escapeHtml(proyecto.instagram) : ''}
  </div>
</footer>

</body>
</html>`;
}
