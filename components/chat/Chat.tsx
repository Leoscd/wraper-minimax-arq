'use client';

/**
 * Asistente SoyLeo AI — UI de chat (Fase 1).
 *
 * Mantiene el historial en estado local y lo manda completo a /api/chat en
 * cada turno (el server es stateless). Muestra las tools que se usaron en cada
 * respuesta como chips, para transparencia (sabés cuándo el número salió de una
 * herramienta determinística y no del modelo).
 */

import { useRef, useState, useEffect } from 'react';

interface Mensaje {
  role: 'user' | 'assistant';
  content: string;
  tools?: string[];
}

const SUGERENCIAS = [
  '¿Precio del cemento en el NOA?',
  'Calculá el hormigón de una losa de 6×4 m y 0,12 m de espesor (H-21)',
  '¿Cuánta mano de obra lleva levantar 50 m² de mampostería?',
  '¿Qué desperdicio conviene prever para cerámicos?',
];

export default function Chat() {
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [input, setInput] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const finRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes, cargando]);

  const enviar = async (texto: string) => {
    const consulta = texto.trim();
    if (!consulta || cargando) return;

    setError(null);
    const historial: Mensaje[] = [...mensajes, { role: 'user', content: consulta }];
    setMensajes(historial);
    setInput('');
    setCargando(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: historial.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) {
        let msg = 'Error consultando al asistente';
        try {
          const err = await res.json();
          msg = err.error || err.message || msg;
          if (Array.isArray(err.issues) && err.issues.length) {
            msg += ': ' + err.issues.map((i: any) => i.message).join(', ');
          }
        } catch {
          /* cuerpo no JSON */
        }
        throw new Error(msg);
      }

      const data = await res.json();
      setMensajes((prev) => [
        ...prev,
        { role: 'assistant', content: data.reply, tools: data.tools_invocadas },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setCargando(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    enviar(input);
  };

  return (
    <div className="chat">
      <div className="chat-mensajes">
        {mensajes.length === 0 && !cargando && (
          <div className="chat-vacio">
            <p className="chat-vacio-titulo">
              Consultá precios, cómputos, mano de obra y más.
            </p>
            <p className="chat-vacio-sub">
              Los números salen de herramientas determinísticas, no inventados.
            </p>
            <div className="chat-sugerencias">
              {SUGERENCIAS.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="chat-chip"
                  onClick={() => enviar(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {mensajes.map((m, i) => (
          <div key={i} className={`chat-msg chat-msg-${m.role}`}>
            <div className="chat-burbuja">
              {m.content.split('\n').map((linea, j) => (
                <p key={j}>{linea || ' '}</p>
              ))}
            </div>
            {m.tools && m.tools.length > 0 && (
              <div className="chat-tools">
                {m.tools.map((t) => (
                  <span key={t} className="chat-tool-badge">
                    🔧 {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}

        {cargando && (
          <div className="chat-msg chat-msg-assistant">
            <div className="chat-burbuja chat-pensando">Pensando…</div>
          </div>
        )}

        {error && <div className="chat-error">⚠️ {error}</div>}
        <div ref={finRef} />
      </div>

      <form className="chat-form" onSubmit={onSubmit}>
        <input
          className="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Preguntá sobre precios, cómputos, obra…"
          disabled={cargando}
        />
        <button className="chat-enviar" type="submit" disabled={cargando || !input.trim()}>
          Enviar
        </button>
      </form>

      <style jsx>{`
        .chat {
          display: flex;
          flex-direction: column;
          height: calc(100vh - 200px);
          max-width: 820px;
          margin: 0 auto;
          border: 1px solid var(--gold-mid);
          border-radius: 4px;
          overflow: hidden;
        }
        .chat-mensajes {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        .chat-vacio {
          margin: auto;
          text-align: center;
          max-width: 520px;
        }
        .chat-vacio-titulo {
          font-family: var(--serif);
          font-size: 22px;
          color: var(--light);
          margin-bottom: 8px;
        }
        .chat-vacio-sub {
          font-size: 13px;
          color: var(--text-muted);
          margin-bottom: 24px;
        }
        .chat-sugerencias {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          justify-content: center;
        }
        .chat-chip {
          background: transparent;
          border: 1px solid var(--gold-mid);
          color: var(--gold);
          padding: 10px 14px;
          font-size: 12px;
          border-radius: 20px;
          cursor: pointer;
          transition: background 0.2s;
          text-align: left;
        }
        .chat-chip:hover {
          background: rgba(201, 168, 76, 0.1);
        }
        .chat-msg {
          display: flex;
          flex-direction: column;
          gap: 6px;
          max-width: 88%;
        }
        .chat-msg-user {
          align-self: flex-end;
          align-items: flex-end;
        }
        .chat-msg-assistant {
          align-self: flex-start;
        }
        .chat-burbuja {
          padding: 12px 16px;
          border-radius: 12px;
          font-size: 14px;
          line-height: 1.6;
        }
        .chat-msg-user .chat-burbuja {
          background: var(--gold);
          color: var(--dark);
        }
        .chat-msg-assistant .chat-burbuja {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(201, 168, 76, 0.18);
          color: var(--text);
        }
        .chat-burbuja :global(p) {
          margin: 0 0 4px;
        }
        .chat-pensando {
          color: var(--text-muted);
          font-style: italic;
        }
        .chat-tools {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .chat-tool-badge {
          font-size: 10px;
          letter-spacing: 1px;
          color: var(--gold);
          background: rgba(201, 168, 76, 0.08);
          border: 1px solid rgba(201, 168, 76, 0.2);
          padding: 3px 8px;
          border-radius: 4px;
        }
        .chat-error {
          align-self: center;
          color: #ff9a9a;
          font-size: 13px;
          background: rgba(255, 80, 80, 0.08);
          border: 1px solid rgba(255, 80, 80, 0.25);
          padding: 10px 14px;
          border-radius: 6px;
        }
        .chat-form {
          display: flex;
          gap: 10px;
          padding: 16px;
          border-top: 1px solid var(--gold-mid);
        }
        .chat-input {
          flex: 1;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--gold-mid);
          border-radius: 6px;
          padding: 12px 14px;
          color: var(--light);
          font-size: 14px;
          outline: none;
        }
        .chat-input:focus {
          border-color: var(--gold);
        }
        .chat-enviar {
          background: var(--gold);
          color: var(--dark);
          border: none;
          padding: 0 24px;
          font-size: 11px;
          letter-spacing: 2px;
          text-transform: uppercase;
          font-weight: 600;
          cursor: pointer;
          border-radius: 6px;
        }
        .chat-enviar:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
