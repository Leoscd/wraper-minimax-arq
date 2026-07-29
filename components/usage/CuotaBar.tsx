'use client';

import { useEffect, useState } from 'react';

/**
 * Barra de cuota amigable segun PLAN-LANZAMIENTO.md §2 / A7:
 * - "Te queda el 78% de tu cuota" (no se muestran tokens crudos)
 * - "~ N presupuestos" cuando quedan
 * - CTA a lista de espera si esta al 0%
 *
 * Hace fetch a /api/usage al montar. Se puede refrescar con `refreshKey`.
 */

interface Usage {
  used: number;
  limit: number;
  remainingPct: number;
  estimatedPresupuestos: number;
  resetAt: string;
}

interface Props {
  refreshKey?: number;
  signedIn: boolean;
}

export function CuotaBar({ refreshKey = 0, signedIn }: Props) {
  const [usage, setUsage] = useState<Usage | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!signedIn) return;
    let cancel = false;
    fetch('/api/usage')
      .then(async (r) => {
        if (!r.ok) {
          setError(r.status === 401 ? 'No autenticado' : `Error ${r.status}`);
          return;
        }
        const data = await r.json();
        if (!cancel) setUsage(data);
      })
      .catch((err) => setError(err.message));
    return () => {
      cancel = true;
    };
  }, [signedIn, refreshKey]);

  if (!signedIn) {
    return (
      <div className="cuota-bar cuota-bar-signedout">
        Iniciá sesión con Google para ver tu cuota.
      </div>
    );
  }

  if (error) {
    return <div className="cuota-bar cuota-bar-error">⚠️ {error}</div>;
  }

  if (!usage) {
    return <div className="cuota-bar cuota-bar-loading">Cargando cuota…</div>;
  }

  const pct = usage.remainingPct;
  const agotado = pct <= 0;

  return (
    <div className="cuota-bar-wrapper">
      <div className="cuota-bar-header">
        <span className="cuota-bar-label">
          {agotado
            ? 'Cuota agotada'
            : `Te queda el ${pct.toFixed(0)}% de tu cuota`}
        </span>
        <span className="cuota-bar-sub">
          {usage.estimatedPresupuestos > 0
            ? `~ ${usage.estimatedPresupuestos} presupuesto${
                usage.estimatedPresupuestos === 1 ? '' : 's'
              } más`
            : 'Sin margen para otro presupuesto completo'}
        </span>
      </div>
      <div className="cuota-bar-track">
        <div
          className={`cuota-bar-fill ${agotado ? 'cuota-bar-fill-empty' : ''}`}
          style={{ width: `${Math.max(0, pct)}%` }}
        />
      </div>
      {agotado && (
        <div className="cuota-bar-cta">
          Te pasaste del límite. Sumate a la{' '}
          <a href="https://forms.gle/...">lista de espera</a> para enterarte
          cuando salga el plan pago.
        </div>
      )}

      <style jsx>{`
        .cuota-bar-wrapper {
          max-width: 480px;
          margin: 0 auto;
          padding: 8px 16px;
          font-family: var(--mono);
        }
        .cuota-bar-header {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 6px;
          font-size: 11px;
        }
        .cuota-bar-label {
          color: var(--gold);
          font-weight: 500;
          letter-spacing: 0.5px;
        }
        .cuota-bar-sub {
          color: var(--text-muted);
          font-size: 10px;
        }
        .cuota-bar-track {
          height: 6px;
          background: rgba(201, 168, 76, 0.12);
          border-radius: 3px;
          overflow: hidden;
        }
        .cuota-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--gold), rgba(201, 168, 76, 0.7));
          transition: width 0.3s ease;
        }
        .cuota-bar-fill-empty {
          background: rgba(220, 80, 80, 0.4);
        }
        .cuota-bar-cta {
          margin-top: 8px;
          font-size: 11px;
          color: var(--text-muted);
        }
        .cuota-bar-cta a {
          color: var(--gold);
          text-decoration: underline;
        }
        .cuota-bar-signedout,
        .cuota-bar-error,
        .cuota-bar-loading {
          text-align: center;
          font-size: 11px;
          color: var(--text-muted);
          padding: 8px 16px;
        }
        .cuota-bar-error { color: #ff9a9a; }
      `}</style>
    </div>
  );
}
