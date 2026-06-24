'use client';

import { useRef } from 'react';
import type { WizardData } from './Wizard';

interface Props {
  data: WizardData;
  updateData: (section: 'archivos', updates: Partial<WizardData['archivos']>) => void;
}

function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function Step3Archivos({ data, updateData }: Props) {
  const videoInput = useRef<HTMLInputElement>(null);
  const principalInput = useRef<HTMLInputElement>(null);
  const galeriaInput = useRef<HTMLInputElement>(null);

  const handleVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataURL(file);
    updateData('archivos', { video_hero: dataUrl });
  };

  const handlePrincipal = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataURL(file);
    updateData('archivos', { imagen_principal: dataUrl });
  };

  const handleGaleria = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const newItems = await Promise.all(
      files.map(async (file) => ({
        nombre: file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
        url: await fileToDataURL(file),
      }))
    );

    updateData('archivos', {
      galeria: [...data.archivos.galeria, ...newItems],
    });
  };

  const removeFromGaleria = (index: number) => {
    updateData('archivos', {
      galeria: data.archivos.galeria.filter((_, i) => i !== index),
    });
  };

  return (
    <div>
      <h2 style={titleStyle}>Archivos del proyecto</h2>
      <p style={subtitleStyle}>
        Subí los renders, planos y (opcionalmente) un video. Se comprimen automáticamente
        para optimizar performance.
      </p>

      <div style={field}>
        <label style={labelStyle}>Video hero (opcional)</label>
        <div style={dropZoneStyle}>
          <input
            ref={videoInput}
            type="file"
            accept="video/mp4,video/webm"
            onChange={handleVideo}
            style={{ display: 'none' }}
            id="video-upload"
          />
          {data.archivos.video_hero ? (
            <div style={previewBoxStyle}>
              <video src={data.archivos.video_hero} style={previewMediaStyle} controls muted />
              <button
                type="button"
                onClick={() => updateData('archivos', { video_hero: undefined })}
                style={removeBtnStyle}
              >
                Quitar
              </button>
            </div>
          ) : (
            <label htmlFor="video-upload" style={dropLabelStyle}>
              <strong>Subir video</strong>
              <span>MP4 o WebM, máximo 50MB</span>
            </label>
          )}
        </div>
      </div>

      <div style={field}>
        <label style={labelStyle}>Imagen principal (opcional)</label>
        <div style={dropZoneStyle}>
          <input
            ref={principalInput}
            type="file"
            accept="image/*"
            onChange={handlePrincipal}
            style={{ display: 'none' }}
            id="principal-upload"
          />
          {data.archivos.imagen_principal ? (
            <div style={previewBoxStyle}>
              <img
                src={data.archivos.imagen_principal}
                style={previewMediaStyle}
                alt="Principal"
              />
              <button
                type="button"
                onClick={() => updateData('archivos', { imagen_principal: undefined })}
                style={removeBtnStyle}
              >
                Quitar
              </button>
            </div>
          ) : (
            <label htmlFor="principal-upload" style={dropLabelStyle}>
              <strong>Subir imagen</strong>
              <span>Si no hay video, se usa como hero</span>
            </label>
          )}
        </div>
      </div>

      <div style={field}>
        <label style={labelStyle}>Galería de renders *</label>
        <div style={dropZoneStyle}>
          <input
            ref={galeriaInput}
            type="file"
            accept="image/*"
            multiple
            onChange={handleGaleria}
            style={{ display: 'none' }}
            id="galeria-upload"
          />
          <label htmlFor="galeria-upload" style={dropLabelStyle}>
            <strong>Subir imágenes</strong>
            <span>Podés seleccionar varias a la vez</span>
          </label>
        </div>

        {data.archivos.galeria.length > 0 && (
          <div style={galeriaGridStyle}>
            {data.archivos.galeria.map((img, i) => (
              <div key={i} style={galeriaItemStyle}>
                <img src={img.url} alt={img.nombre} style={galeriaImgStyle} />
                <button
                  type="button"
                  onClick={() => removeFromGaleria(i)}
                  style={galeriaRemoveStyle}
                  title="Quitar"
                >
                  ×
                </button>
                <span style={galeriaLabelStyle}>{img.nombre}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const titleStyle: React.CSSProperties = {
  fontFamily: 'var(--serif)',
  fontSize: '36px',
  color: 'var(--light)',
  fontWeight: 300,
  marginBottom: '8px',
};
const subtitleStyle: React.CSSProperties = {
  color: 'var(--text)',
  fontSize: '13px',
  marginBottom: '40px',
};
const field: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  marginBottom: '32px',
};
const labelStyle: React.CSSProperties = {
  fontSize: '9px',
  letterSpacing: '2.5px',
  textTransform: 'uppercase',
  color: 'var(--gold)',
  fontWeight: 500,
};
const dropZoneStyle: React.CSSProperties = {
  border: '1px dashed var(--gold-mid)',
  padding: '20px',
  textAlign: 'center',
  background: 'var(--dark-2)',
};
const dropLabelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  cursor: 'pointer',
  padding: '20px',
  color: 'var(--text)',
};
const previewBoxStyle: React.CSSProperties = {
  position: 'relative',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
};
const previewMediaStyle: React.CSSProperties = {
  maxWidth: '100%',
  maxHeight: '300px',
  display: 'block',
};
const removeBtnStyle: React.CSSProperties = {
  position: 'absolute',
  top: '8px',
  right: '8px',
  background: 'rgba(8,8,8,0.8)',
  color: 'var(--light)',
  border: '1px solid var(--gold-mid)',
  padding: '4px 12px',
  fontSize: '10px',
  letterSpacing: '1.5px',
  textTransform: 'uppercase',
  cursor: 'pointer',
};
const galeriaGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
  gap: '12px',
  marginTop: '16px',
};
const galeriaItemStyle: React.CSSProperties = {
  position: 'relative',
  aspectRatio: '4 / 3',
  overflow: 'hidden',
  border: '1px solid var(--gold-mid)',
  background: 'var(--dark-2)',
};
const galeriaImgStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
};
const galeriaRemoveStyle: React.CSSProperties = {
  position: 'absolute',
  top: '4px',
  right: '4px',
  width: '24px',
  height: '24px',
  background: 'rgba(0,0,0,0.7)',
  color: 'white',
  border: 'none',
  cursor: 'pointer',
  fontSize: '16px',
  lineHeight: 1,
};
const galeriaLabelStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: '0',
  left: '0',
  right: '0',
  background: 'rgba(0,0,0,0.7)',
  color: 'var(--light)',
  fontSize: '10px',
  padding: '4px 8px',
  textTransform: 'uppercase',
  letterSpacing: '1px',
};
