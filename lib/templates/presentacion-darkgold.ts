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

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function socialIcon(name: string): string {
  const icons: Record<string, string> = {
    instagram: '<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>',
    linkedin: '<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.063 2.063 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>',
    twitter: '<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
    facebook: '<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>',
    email: '<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>',
    web: '<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>',
    telefono: '<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>',
    direccion: '<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z"/></svg>',
  };
  return icons[name] || '';
}

export function renderPresentacionDarkGold(data: PresentacionData): string {
  const { proyecto, archivos, branding, rubros } = data;
  const gold = branding.color_primario || GOLD;
  const gold2 = branding.color_secundario || '#8a7434';
  const goldAccent = branding.color_acento || '#E5C66B';
  const fondo = branding.color_fondo || DARK;
  const texto = branding.color_texto || '#ede9e0';

  const goldDim = hexToRgba(gold, 0.12);
  const goldMid = hexToRgba(gold, 0.35);

  const logoHtml = branding.logo_url
    ? `<img src="${escapeHtml(branding.logo_url)}" alt="${escapeHtml(branding.empresa_nombre)}" class="logo" />`
    : `<span class="logo-text">${escapeHtml(branding.empresa_nombre)}</span>`;

  const taglineHtml = proyecto.tagline
    ? `<span class="nav-tagline">${escapeHtml(proyecto.tagline)}</span>`
    : '';

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
    --gold-2: ${gold2};
    --gold-accent: ${goldAccent};
    --gold-dim: ${goldDim};
    --gold-mid: ${goldMid};
    --dark: ${fondo};
    --dark-2: ${hexToRgba(fondo, 0.95)};
    --dark-3: ${hexToRgba(fondo, 0.88)};
    --dark-4: ${hexToRgba(fondo, 0.78)};
    --light: ${texto};
    --light-dim: ${hexToRgba(texto, 0.55)};
    --text: ${hexToRgba(texto, 0.78)};
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
    background: linear-gradient(to bottom, var(--dark) 0%, transparent 100%);
    backdrop-filter: blur(2px);
  }
  .nav-brand {
    display: flex; align-items: center; gap: 12px;
    font-family: var(--serif); font-size: 17px; font-weight: 300;
    color: var(--light); letter-spacing: 0.5px;
  }
  .nav-brand em { font-style: italic; color: var(--gold); }
  .nav-tagline {
    font-size: 9px; letter-spacing: 2.5px; text-transform: uppercase;
    color: var(--light-dim); margin-left: 12px;
    border-left: 1px solid var(--gold-mid); padding-left: 12px;
  }
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
  }
  .footer-grid {
    display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 60px;
    max-width: 1200px; margin: 0 auto;
  }
  .footer-brand {
    font-family: var(--serif); font-size: 24px; color: var(--light);
    margin-bottom: 8px;
  }
  .footer-brand em { font-style: italic; color: var(--gold); }
  .footer-tagline {
    font-size: 11px; color: var(--text);
    line-height: 1.6; max-width: 320px;
  }
  .footer-section-title {
    font-size: 9px; letter-spacing: 3px; text-transform: uppercase;
    color: var(--gold); margin-bottom: 16px; display: block;
  }
  .footer-contact-item {
    display: flex; align-items: center; gap: 8px;
    margin-bottom: 8px; font-size: 11px; color: var(--text);
  }
  .footer-contact-item svg { color: var(--gold); flex-shrink: 0; }
  .footer-social {
    display: flex; gap: 12px; flex-wrap: wrap;
  }
  .footer-social a {
    display: flex; align-items: center; justify-content: center;
    width: 36px; height: 36px;
    border: 1px solid var(--gold-mid);
    color: var(--gold);
    transition: all 0.2s;
  }
  .footer-social a:hover {
    background: var(--gold); color: var(--dark);
  }
  .footer-bottom {
    margin-top: 40px; padding-top: 20px;
    border-top: 1px solid rgba(201,168,76,0.1);
    text-align: center;
    font-size: 10px; letter-spacing: 2px; text-transform: uppercase;
    color: var(--text-muted);
  }

  /* RESPONSIVE */
  @media (max-width: 768px) {
    .proyecto-grid, .presupuesto-grid, .proyecto-meta { grid-template-columns: 1fr; gap: 32px; }
    .gallery-item { flex: 0 0 90vw; }
    section { padding: 60px 6vw; }
    .footer-grid { grid-template-columns: 1fr; gap: 32px; }
    .nav-tagline { display: none; }
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
    ${taglineHtml}
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
      <span class="hero-tag">${escapeHtml(proyecto.año ?? "")} · ${escapeHtml(proyecto.ubicacion)}</span>
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
          <span class="meta-value">${escapeHtml(proyecto.estado ?? "")}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Año</span>
          <span class="meta-value">${escapeHtml(proyecto.año ?? "")}</span>
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
  <div class="footer-grid">
    <div>
      <div class="footer-brand">
        ${escapeHtml(proyecto.arquitecto)}<br>
        <em>${escapeHtml(branding.empresa_nombre)}</em>
      </div>
      ${proyecto.tagline ? `<p class="footer-tagline">${escapeHtml(proyecto.tagline)}</p>` : ''}
    </div>

    <div>
      <span class="footer-section-title">Contacto</span>
      ${proyecto.email ? `<div class="footer-contact-item">${socialIcon('email')}<a href="mailto:${escapeHtml(proyecto.email)}">${escapeHtml(proyecto.email)}</a></div>` : ''}
      ${proyecto.telefono ? `<div class="footer-contact-item">${socialIcon('telefono')}<a href="tel:${escapeHtml(proyecto.telefono)}">${escapeHtml(proyecto.telefono)}</a></div>` : ''}
      ${proyecto.direccion ? `<div class="footer-contact-item">${socialIcon('direccion')}<span>${escapeHtml(proyecto.direccion)}</span></div>` : ''}
      ${proyecto.web ? `<div class="footer-contact-item">${socialIcon('web')}<a href="https://${escapeHtml(proyecto.web)}" target="_blank" rel="noopener">${escapeHtml(proyecto.web)}</a></div>` : ''}
    </div>

    <div>
      <span class="footer-section-title">Seguinos</span>
      <div class="footer-social">
        ${proyecto.instagram ? `<a href="https://instagram.com/${escapeHtml(proyecto.instagram.replace('@', ''))}" target="_blank" rel="noopener" title="Instagram">${socialIcon('instagram')}</a>` : ''}
        ${proyecto.linkedin ? `<a href="${escapeHtml(proyecto.linkedin)}" target="_blank" rel="noopener" title="LinkedIn">${socialIcon('linkedin')}</a>` : ''}
        ${proyecto.twitter ? `<a href="${escapeHtml(proyecto.twitter)}" target="_blank" rel="noopener" title="Twitter">${socialIcon('twitter')}</a>` : ''}
        ${proyecto.facebook ? `<a href="${escapeHtml(proyecto.facebook)}" target="_blank" rel="noopener" title="Facebook">${socialIcon('facebook')}</a>` : ''}
      </div>
    </div>
  </div>

  <div class="footer-bottom">
    © ${escapeHtml(proyecto.año ?? "")} ${escapeHtml(branding.empresa_nombre)} · Generado con SoyLeo AI
  </div>
</footer>

</body>
</html>`;
}
