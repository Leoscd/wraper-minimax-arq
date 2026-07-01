'use client';

/**
 * Asistente SoyLeo AI — UI de chat estilo IA moderna (Claude/ChatGPT-like).
 *
 * - Streaming: la respuesta de M3 aparece token a token (lee SSE de
 *   /api/chat?stream=1).
 * - Markdown renderizado (react-markdown + GFM): nada de **, __, listas crudas.
 * - Layout abierto, sin "caja de diálogo": el asistente responde como texto
 *   corrido; el usuario va en una burbuja sutil.
 * - Composer con botón de adjuntar archivo (por ahora solo UI) + textarea.
 *
 * Mantiene el historial en estado local y lo manda completo en cada turno (el
 * server es stateless). Los chips de tools muestran de qué herramienta salió el
 * número (transparencia: no lo inventa el modelo).
 */

import { useRef, useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  enviarChatStream,
  type ChatClientError,
} from '@/lib/chat/client';

interface Entregable {
  id: string;
  tipo: string;
  filename: string;
  url: string;
  message: string;
}

interface Mensaje {
  role: 'user' | 'assistant';
  content: string;
  tools?: string[];
  entregables?: Entregable[];
}

const SUGERENCIAS = [
  '¿Cuánto sale el m² de losa H-21 de 12cm en Tucumán?',
  '¿Cuántas bolsas de 50kg de cemento lleva un m³ de hormigón H-21?',
  'Dame el precio actual de la barra de hierro del 12',
  '¿Cuánta mano de obra lleva levantar 50 m² de mampostería de ladrillo hueco?',
  '¿Qué desperdicio conviene prever para cerámicos en diagonal?',
  'Necesito un cronograma de 3 tareas: fundaciones 5 días, estructura 15 días, revoques 8 días. ¿Cuándo arrancan las revoques?',
];

export default function Chat() {
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [input, setInput] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorTipo, setErrorTipo] = useState<ChatClientError['tipo'] | null>(null);
  const [resetAt, setResetAt] = useState<string | null>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [ultimoInput, setUltimoInput] = useState<string | null>(null);
  const finRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes, cargando]);

  // Auto-alto del textarea (hasta un máximo).
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px';
  }, [input]);

  // Si el componente se desmonta mientras hay un stream abierto, lo cancelamos.
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  /** Actualiza el último mensaje (assistant) de forma inmutable. */
  const actualizarUltimo = (fn: (m: Mensaje) => Mensaje) => {
    setMensajes((prev) => {
      if (prev.length === 0) return prev;
      const copia = [...prev];
      copia[copia.length - 1] = fn(copia[copia.length - 1]);
      return copia;
    });
  };

  const enviar = async (texto: string) => {
    const consulta = texto.trim();
    if (!consulta || cargando) return;

    setError(null);
    setErrorTipo(null);
    setResetAt(null);
    setArchivo(null);
    setUltimoInput(consulta);

    const historial: Mensaje[] = [...mensajes, { role: 'user', content: consulta }];
    // Sumamos un placeholder de assistant que se va llenando con el streaming.
    setMensajes([...historial, { role: 'assistant', content: '', tools: [] }]);
    setInput('');
    setCargando(true);

    // Cancelamos cualquier stream previo antes de arrancar uno nuevo.
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await enviarChatStream({
        messages: historial.map((m) => ({ role: m.role, content: m.content })),
        signal: controller.signal,
        onEvent: (evento) => {
          if (evento.type === 'text') {
            actualizarUltimo((m) => ({ ...m, content: m.content + evento.delta }));
          } else if (evento.type === 'tool') {
            actualizarUltimo((m) => ({
              ...m,
              tools: [...new Set([...(m.tools ?? []), evento.name])],
            }));
          } else if (evento.type === 'entregable') {
            actualizarUltimo((m) => ({
              ...m,
              entregables: [
                ...(m.entregables ?? []),
                {
                  id: evento.id,
                  tipo: evento.tipo,
                  filename: evento.filename,
                  url: evento.url,
                  message: evento.message,
                },
              ],
            }));
          } else if (evento.type === 'done') {
            if (Array.isArray(evento.tools_invocadas)) {
              actualizarUltimo((m) => ({ ...m, tools: evento.tools_invocadas }));
            }
          } else if (evento.type === 'error') {
            throw new Error(evento.error);
          }
        },
      });
    } catch (err) {
      const e = err as ChatClientError;
      setError(e.message || 'Error desconocido');
      setErrorTipo(e.tipo ?? 'server');
      if (e.resetAt) setResetAt(e.resetAt);

      // Sacamos el placeholder vacío si nunca llegó texto.
      setMensajes((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.role === 'assistant' && !last.content) {
          return prev.slice(0, -1);
        }
        return prev;
      });
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
      setCargando(false);
    }
  };

  const reintentar = () => {
    if (ultimoInput) {
      setError(null);
      setErrorTipo(null);
      setResetAt(null);
      enviar(ultimoInput);
    }
  };

  const cancelar = () => {
    abortRef.current?.abort();
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    enviar(input);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      enviar(input);
    }
  };

  const ultimo = mensajes[mensajes.length - 1];
  const esperandoPrimerToken =
    cargando && ultimo?.role === 'assistant' && !ultimo.content;

  return (
    <div className="chat">
      <div className="chat-mensajes">
        {mensajes.length === 0 && !cargando && (
          <div className="chat-vacio">
            <p className="chat-vacio-titulo">¿En qué te doy una mano hoy?</p>
            <p className="chat-vacio-sub">
              Precios, cómputos, mano de obra, cronogramas. Los números salen de
              herramientas determinísticas, no inventados.
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
            {m.role === 'user' ? (
              <div className="chat-burbuja-user">{m.content}</div>
            ) : (
              <div className="chat-respuesta">
                {m.content ? (
                  <div className="chat-md">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {m.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  esperandoPrimerToken &&
                  i === mensajes.length - 1 && (
                    <div className="chat-pensando">
                      <span />
                      <span />
                      <span />
                    </div>
                  )
                )}
                {m.tools && m.tools.length > 0 && (
                  <div className="chat-tools">
                    {m.tools.map((t) => (
                      <span key={t} className="chat-tool-badge">
                        🔧 {t}
                      </span>
                    ))}
                  </div>
                )}
                {m.entregables && m.entregables.length > 0 && (
                  <div className="chat-entregables">
                    {m.entregables.map((e) => (
                      <a
                        key={e.id}
                        href={e.url}
                        target="_blank"
                        rel="noopener"
                        className="chat-entregable"
                      >
                        <span className="chat-entregable-icono">
                          {e.tipo === 'presupuesto' ? '📋' : e.tipo === 'cronograma' ? '📅' : e.tipo === 'curva' ? '📈' : '📄'}
                        </span>
                        <span className="chat-entregable-info">
                          <span className="chat-entregable-titulo">
                            {e.message}
                          </span>
                          <span className="chat-entregable-archivo">
                            {e.filename}
                          </span>
                        </span>
                        <span className="chat-entregable-accion">Abrir →</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {error && (
          <div className="chat-error" data-tipo={errorTipo ?? 'server'}>
            <div className="chat-error-titulo">
              {errorTipo === 'rate_limit' && '⏱️ Rate limit'}
              {errorTipo === 'timeout' && '⏱️ Tiempo agotado'}
              {errorTipo === 'network' && '📡 Sin conexión'}
              {errorTipo === 'validation' && '⚠️ Consulta inválida'}
              {(!errorTipo || errorTipo === 'server') && '⚠️ Error del servidor'}
            </div>
            <div className="chat-error-msg">{error}</div>
            {resetAt && errorTipo === 'rate_limit' && (
              <div className="chat-error-reset">
                Probá de nuevo a partir de las{' '}
                {new Date(resetAt).toLocaleTimeString('es-AR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            )}
            {ultimoInput && (
              <button
                type="button"
                className="chat-error-reintentar"
                onClick={reintentar}
              >
                Reintentar
              </button>
            )}
          </div>
        )}
        <div ref={finRef} />
      </div>

      <form className="chat-form" onSubmit={onSubmit}>
        {archivo && (
          <div className="chat-adjunto">
            <span className="chat-adjunto-nombre">📎 {archivo.name}</span>
            <button
              type="button"
              className="chat-adjunto-quitar"
              onClick={() => setArchivo(null)}
              aria-label="Quitar archivo"
            >
              ✕
            </button>
          </div>
        )}
        <div className="chat-composer">
          <button
            type="button"
            className="chat-adjuntar"
            onClick={() => fileRef.current?.click()}
            aria-label="Adjuntar archivo"
            title="Adjuntar archivo"
            disabled={cargando}
          >
            +
          </button>
          <input
            ref={fileRef}
            type="file"
            hidden
            onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
          />
          <textarea
            ref={textareaRef}
            className="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Preguntá sobre precios, cómputos, obra…"
            rows={1}
            disabled={cargando}
          />
          {cargando ? (
            <button
              type="button"
              className="chat-cancelar"
              onClick={cancelar}
              aria-label="Cancelar"
              title="Detener la respuesta"
            >
              ⏹
            </button>
          ) : (
            <button
              className="chat-enviar"
              type="submit"
              disabled={!input.trim()}
              aria-label="Enviar"
            >
              ↑
            </button>
          )}
        </div>
        <p className="chat-disclaimer">
          El asistente puede equivocarse. Verificá los datos críticos de obra.
        </p>
      </form>

      <style jsx>{`
        .chat {
          display: flex;
          flex-direction: column;
          height: calc(100vh - 160px);
          max-width: 760px;
          margin: 0 auto;
          font-family: var(--font-inter), 'Helvetica Neue', Helvetica, Arial, sans-serif;
        }
        .chat-mensajes {
          flex: 1;
          overflow-y: auto;
          padding: 16px 8px 8px;
          display: flex;
          flex-direction: column;
          gap: 28px;
        }
        .chat-vacio {
          margin: auto;
          text-align: center;
          max-width: 560px;
        }
        .chat-vacio-titulo {
          font-family: var(--serif);
          font-size: 30px;
          color: var(--light);
          margin-bottom: 10px;
        }
        .chat-vacio-sub {
          font-size: 14px;
          color: var(--text-muted);
          margin-bottom: 28px;
          line-height: 1.6;
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
          font-size: 12.5px;
          border-radius: 20px;
          cursor: pointer;
          transition: background 0.2s;
          text-align: left;
          font-family: var(--font-inter), 'Helvetica Neue', Helvetica, Arial, sans-serif;
        }
        .chat-chip:hover {
          background: rgba(201, 168, 76, 0.1);
        }
        .chat-msg {
          display: flex;
          flex-direction: column;
        }
        .chat-msg-user {
          align-items: flex-end;
        }
        /* Usuario: burbuja sutil a la derecha. */
        .chat-burbuja-user {
          background: rgba(201, 168, 76, 0.12);
          border: 1px solid rgba(201, 168, 76, 0.22);
          color: var(--light);
          padding: 12px 16px;
          border-radius: 16px 16px 4px 16px;
          font-size: 15px;
          line-height: 1.55;
          max-width: 85%;
          white-space: pre-wrap;
        }
        /* Asistente: texto corrido, sin caja. */
        .chat-respuesta {
          color: var(--text);
          font-size: 15px;
          line-height: 1.7;
          width: 100%;
        }
        .chat-tools {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 12px;
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
        /* Cards de entregables (presupuesto, cronograma, etc). */
        .chat-entregables {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 14px;
        }
        .chat-entregable {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          background: rgba(201, 168, 76, 0.06);
          border: 1px solid rgba(201, 168, 76, 0.28);
          border-radius: 8px;
          text-decoration: none;
          color: var(--light);
          transition: background 0.15s, transform 0.15s;
        }
        .chat-entregable:hover {
          background: rgba(201, 168, 76, 0.14);
          transform: translateY(-1px);
        }
        .chat-entregable-icono {
          font-size: 22px;
          line-height: 1;
          flex-shrink: 0;
        }
        .chat-entregable-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }
        .chat-entregable-titulo {
          font-size: 13px;
          color: var(--light);
          font-weight: 500;
        }
        .chat-entregable-archivo {
          font-size: 11px;
          color: var(--text-muted);
          font-family: var(--mono);
        }
        .chat-entregable-accion {
          font-size: 11px;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: var(--gold);
          font-weight: 600;
          flex-shrink: 0;
        }
        /* Indicador "pensando" (3 puntitos). */
        .chat-pensando {
          display: flex;
          gap: 5px;
          padding: 6px 0;
        }
        .chat-pensando span {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--gold);
          opacity: 0.5;
          animation: parpadeo 1.2s infinite ease-in-out;
        }
        .chat-pensando span:nth-child(2) {
          animation-delay: 0.2s;
        }
        .chat-pensando span:nth-child(3) {
          animation-delay: 0.4s;
        }
        @keyframes parpadeo {
          0%,
          60%,
          100% {
            opacity: 0.25;
            transform: translateY(0);
          }
          30% {
            opacity: 1;
            transform: translateY(-3px);
          }
        }
        .chat-error {
          align-self: stretch;
          max-width: 560px;
          margin: 0 auto;
          color: #ff9a9a;
          font-size: 13px;
          background: rgba(255, 80, 80, 0.08);
          border: 1px solid rgba(255, 80, 80, 0.25);
          padding: 14px 18px;
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .chat-error-titulo {
          font-size: 11px;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: #ffb0b0;
          font-weight: 600;
        }
        .chat-error-msg {
          line-height: 1.5;
          color: #ff9a9a;
        }
        .chat-error-reset {
          font-size: 12px;
          color: #d0d0d0;
        }
        .chat-error-reintentar {
          align-self: flex-start;
          margin-top: 4px;
          padding: 6px 14px;
          background: rgba(255, 80, 80, 0.18);
          border: 1px solid rgba(255, 80, 80, 0.4);
          color: #ffd0d0;
          font-size: 12px;
          letter-spacing: 0.5px;
          border-radius: 4px;
          cursor: pointer;
          font-family: var(--font-inter), 'Helvetica Neue', Helvetica, Arial, sans-serif;
        }
        .chat-error-reintentar:hover {
          background: rgba(255, 80, 80, 0.28);
        }
        .chat-cancelar {
          flex: 0 0 auto;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: rgba(255, 80, 80, 0.15);
          color: #ff9a9a;
          border: 1px solid rgba(255, 80, 80, 0.3);
          font-size: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .chat-cancelar:hover {
          background: rgba(255, 80, 80, 0.25);
        }
        /* Composer estilo IA moderna. */
        .chat-form {
          padding: 8px;
        }
        .chat-adjunto {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
          padding: 6px 10px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--gold-mid);
          border-radius: 8px;
          font-size: 12px;
          color: var(--text);
        }
        .chat-adjunto-quitar {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          font-size: 12px;
          padding: 0 2px;
        }
        .chat-adjunto-quitar:hover {
          color: var(--light);
        }
        .chat-composer {
          display: flex;
          align-items: flex-end;
          gap: 8px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--gold-mid);
          border-radius: 24px;
          padding: 8px 8px 8px 12px;
          transition: border-color 0.2s;
        }
        .chat-composer:focus-within {
          border-color: var(--gold);
        }
        .chat-adjuntar {
          flex: 0 0 auto;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: transparent;
          border: 1px solid var(--gold-mid);
          color: var(--gold);
          font-size: 20px;
          line-height: 1;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
        }
        .chat-adjuntar:hover {
          background: rgba(201, 168, 76, 0.12);
        }
        .chat-input {
          flex: 1;
          background: transparent;
          border: none;
          padding: 7px 4px;
          color: var(--light);
          font-size: 15px;
          font-family: var(--font-inter), 'Helvetica Neue', Helvetica, Arial, sans-serif;
          line-height: 1.5;
          outline: none;
          resize: none;
          max-height: 200px;
        }
        .chat-input::placeholder {
          color: var(--text-muted);
        }
        .chat-enviar {
          flex: 0 0 auto;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: var(--gold);
          color: var(--dark);
          border: none;
          font-size: 18px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .chat-enviar:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }
        .chat-disclaimer {
          text-align: center;
          font-size: 11px;
          color: var(--text-muted);
          margin-top: 8px;
        }

        /* --- Estilos del markdown renderizado del asistente --- */
        .chat-md :global(p) {
          margin: 0 0 12px;
        }
        .chat-md :global(p:last-child) {
          margin-bottom: 0;
        }
        .chat-md :global(ul),
        .chat-md :global(ol) {
          margin: 0 0 12px;
          padding-left: 22px;
        }
        .chat-md :global(li) {
          margin-bottom: 4px;
        }
        .chat-md :global(strong) {
          color: var(--light);
          font-weight: 600;
        }
        .chat-md :global(h1),
        .chat-md :global(h2),
        .chat-md :global(h3) {
          font-family: var(--serif);
          color: var(--light);
          margin: 16px 0 8px;
          line-height: 1.3;
        }
        .chat-md :global(h1) {
          font-size: 22px;
        }
        .chat-md :global(h2) {
          font-size: 19px;
        }
        .chat-md :global(h3) {
          font-size: 16px;
        }
        .chat-md :global(code) {
          font-family: var(--mono);
          font-size: 13px;
          background: rgba(255, 255, 255, 0.07);
          padding: 2px 5px;
          border-radius: 4px;
        }
        .chat-md :global(pre) {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid var(--gold-mid);
          border-radius: 8px;
          padding: 12px;
          overflow-x: auto;
          margin: 0 0 12px;
        }
        .chat-md :global(pre code) {
          background: transparent;
          padding: 0;
        }
        .chat-md :global(table) {
          border-collapse: collapse;
          width: 100%;
          margin: 0 0 12px;
          font-size: 13.5px;
        }
        .chat-md :global(th),
        .chat-md :global(td) {
          border: 1px solid var(--gold-mid);
          padding: 7px 10px;
          text-align: left;
        }
        .chat-md :global(th) {
          background: rgba(201, 168, 76, 0.1);
          color: var(--light);
        }
        .chat-md :global(a) {
          color: var(--gold);
          text-decoration: underline;
        }
        .chat-md :global(blockquote) {
          border-left: 3px solid var(--gold-mid);
          margin: 0 0 12px;
          padding-left: 12px;
          color: var(--text-muted);
        }
      `}</style>
    </div>
  );
}
