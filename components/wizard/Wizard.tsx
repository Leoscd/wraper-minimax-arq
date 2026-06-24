'use client';

import { useState, useCallback } from 'react';
import { Step1Proyecto } from './Step1Proyecto';
import { Step2Empresa } from './Step2Empresa';
import { Step3Archivos } from './Step3Archivos';
import { Step4Estilo } from './Step4Estilo';
import { Step5Marca } from './Step5Marca';
import type { GenerationRequest } from '@/lib/types';

export interface WizardData {
  proyecto: Partial<GenerationRequest['proyecto']>;
  branding: Partial<GenerationRequest['branding']>;
  archivos: {
    video_hero?: string;
    imagen_principal?: string;
    galeria: Array<{ nombre: string; url: string }>;
  };
  opciones: Partial<NonNullable<GenerationRequest['opciones']>>;
}

const initialData: WizardData = {
  proyecto: {
    nombre: '',
    subtitulo: '',
    tagline: '',
    descripcion: '',
    arquitecto: '',
    estudio: '',
    ubicacion: '',
    año: new Date().getFullYear().toString(),
    sistema: '',
    email: '',
    telefono: '',
    direccion: '',
    instagram: '',
    linkedin: '',
    twitter: '',
    facebook: '',
  },
  branding: {
    empresa_nombre: '',
    logo_url: '',
    color_primario: '#C9A84C',
    color_secundario: '#8a7434',
    color_fondo: '#080808',
    color_texto: '#ede9e0',
    color_acento: '#E5C66B',
    estilo: 'premium',
  },
  archivos: {
    galeria: [],
  },
  opciones: {
    incluir_cronograma: false,
    incluir_curva_inversion: false,
    incluir_honorarios: false,
  },
};

const STEPS = [
  { id: 1, title: 'Proyecto', component: Step1Proyecto },
  { id: 2, title: 'Empresa', component: Step2Empresa },
  { id: 3, title: 'Archivos', component: Step3Archivos },
  { id: 4, title: 'Estilo', component: Step4Estilo },
  { id: 5, title: 'Marca', component: Step5Marca },
];

interface WizardProps {
  onComplete: (data: GenerationRequest) => void;
}

export function Wizard({ onComplete }: WizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<WizardData>(initialData);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateData = useCallback(
    (section: keyof WizardData, updates: Partial<WizardData[keyof WizardData]>) => {
      setData((prev) => ({
        ...prev,
        [section]: { ...prev[section], ...updates },
      }));
    },
    []
  );

  const canAdvance = (): boolean => {
    const { proyecto, branding } = data;
    switch (currentStep) {
      case 0:
        return !!(proyecto.nombre && proyecto.descripcion && proyecto.arquitecto && proyecto.ubicacion && proyecto.email);
      case 1:
        return !!branding.empresa_nombre;
      case 2:
        return data.archivos.galeria.length > 0;
      case 3:
        return true;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const payload: GenerationRequest = {
        proyecto: data.proyecto as GenerationRequest['proyecto'],
        branding: {
          ...data.branding,
          empresa_nombre: data.branding.empresa_nombre || data.proyecto.estudio || 'Estudio',
        } as GenerationRequest['branding'],
        archivos: data.archivos as GenerationRequest['archivos'],
        opciones: data.opciones as GenerationRequest['opciones'],
      };

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Error generando la presentación');
      }

      const result = await response.json();
      onComplete({ ...payload, html: result.html, metadata: result.metadata } as any);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setSubmitting(false);
    }
  };

  const StepComponent = STEPS[currentStep].component;

  return (
    <div className="wizard">
      <div className="wizard-header">
        <div className="wizard-steps">
          {STEPS.map((s, i) => (
            <div
              key={s.id}
              className={`wizard-step ${i === currentStep ? 'active' : ''} ${i < currentStep ? 'done' : ''}`}
            >
              <span className="step-num">{String(i + 1).padStart(2, '0')}</span>
              <span className="step-title">{s.title}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="wizard-body">
        <StepComponent data={data} updateData={updateData} />
      </div>

      {error && (
        <div className="wizard-error">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="wizard-footer">
        <button
          type="button"
          className="btn-secondary"
          onClick={handleBack}
          disabled={currentStep === 0 || submitting}
        >
          Atrás
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={handleNext}
          disabled={!canAdvance() || submitting}
        >
          {submitting
            ? 'Generando...'
            : currentStep === STEPS.length - 1
              ? 'Generar presentación'
              : 'Siguiente'}
        </button>
      </div>

      <style jsx>{`
        .wizard {
          max-width: 800px;
          margin: 0 auto;
          padding: 40px 20px;
        }
        .wizard-header {
          margin-bottom: 60px;
        }
        .wizard-steps {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          border-bottom: 1px solid var(--gold-mid);
          padding-bottom: 24px;
        }
        .wizard-step {
          display: flex;
          flex-direction: column;
          gap: 6px;
          opacity: 0.4;
          transition: opacity 0.3s;
        }
        .wizard-step.active, .wizard-step.done {
          opacity: 1;
        }
        .wizard-step.active .step-num {
          color: var(--gold);
        }
        .step-num {
          font-size: 10px;
          letter-spacing: 3px;
          color: var(--text-muted);
          font-family: var(--mono);
        }
        .step-title {
          font-family: var(--serif);
          font-size: 22px;
          color: var(--light);
        }
        .wizard-body {
          min-height: 400px;
          margin-bottom: 40px;
        }
        .wizard-error {
          background: rgba(220, 38, 38, 0.1);
          border: 1px solid rgba(220, 38, 38, 0.3);
          padding: 16px;
          margin-bottom: 20px;
          color: #fca5a5;
          font-size: 13px;
        }
        .wizard-footer {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          padding-top: 24px;
          border-top: 1px solid var(--gold-mid);
        }
        .btn-primary, .btn-secondary {
          font-family: var(--mono);
          font-size: 11px;
          letter-spacing: 2px;
          text-transform: uppercase;
          padding: 14px 28px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-primary {
          background: var(--gold);
          color: var(--dark);
          font-weight: 500;
        }
        .btn-primary:hover:not(:disabled) {
          background: var(--gold-bright);
        }
        .btn-primary:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .btn-secondary {
          background: transparent;
          color: var(--text);
          border: 1px solid var(--gold-mid);
        }
        .btn-secondary:hover:not(:disabled) {
          color: var(--gold);
          border-color: var(--gold);
        }
        .btn-secondary:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        @media (max-width: 600px) {
          .wizard-steps {
            flex-direction: column;
            gap: 12px;
          }
          .step-title { font-size: 18px; }
        }
      `}</style>
    </div>
  );
}
