import Link from 'next/link';

export default function Home() {
  return (
    <main style={{ minHeight: '100vh', padding: '40px 5vw' }}>
      <nav
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px 0',
          marginBottom: '120px',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--serif)',
            fontSize: '20px',
            color: 'var(--light)',
            fontWeight: 300,
          }}
        >
          SoyLeo <em style={{ color: 'var(--gold)' }}>AI</em>
        </div>
        <div
          style={{
            fontSize: '10px',
            letterSpacing: '3px',
            textTransform: 'uppercase',
            color: 'var(--light-dim)',
          }}
        >
          Presentador con IA
        </div>
      </nav>

      <section style={{ maxWidth: '900px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            marginBottom: '24px',
          }}
        >
          <span
            style={{
              fontSize: '10px',
              letterSpacing: '4px',
              textTransform: 'uppercase',
              color: 'var(--gold)',
            }}
          >
            Wrapper · MiniMax M3
          </span>
          <span
            style={{
              width: '40px',
              height: '1px',
              background: 'var(--gold)',
              opacity: 0.6,
            }}
          />
        </div>

        <h1
          style={{
            fontFamily: 'var(--serif)',
            fontSize: 'clamp(48px, 8vw, 96px)',
            fontWeight: 300,
            color: 'var(--light)',
            lineHeight: 0.95,
            letterSpacing: '-2px',
            marginBottom: '32px',
          }}
        >
          Presentaciones <em style={{ color: 'var(--gold)' }}>premium</em>
          <br />
          para tus proyectos.
        </h1>

        <p
          style={{
            fontSize: '15px',
            lineHeight: 1.7,
            color: 'var(--text)',
            maxWidth: '640px',
            marginBottom: '48px',
          }}
        >
          Cargá los datos de tu proyecto, los renders y el presupuesto. La
          metodología SoyLeo AI, potenciada por MiniMax M3, genera una
          presentación HTML lista para imprimir a PDF.
        </p>

        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <Link
            href="/generar"
            style={{
              display: 'inline-block',
              background: 'var(--gold)',
              color: 'var(--dark)',
              padding: '16px 32px',
              fontSize: '11px',
              letterSpacing: '3px',
              textTransform: 'uppercase',
              fontWeight: 500,
              transition: 'transform 0.2s',
            }}
          >
            Generar presentación
          </Link>
          <Link
            href="/asistente"
            style={{
              display: 'inline-block',
              border: '1px solid var(--gold-mid)',
              color: 'var(--gold)',
              padding: '16px 32px',
              fontSize: '11px',
              letterSpacing: '3px',
              textTransform: 'uppercase',
            }}
          >
            Abrir asistente
          </Link>
        </div>
      </section>

      <section
        style={{
          marginTop: '120px',
          paddingTop: '60px',
          borderTop: '1px solid var(--gold-mid)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '40px',
        }}
      >
        {[
          {
            tag: '01',
            title: 'Cómputos precisos',
            text: 'Cálculos determinísticos para hormigón, hierros y morteros. Sin errores de cálculo.',
          },
          {
            tag: '02',
            title: 'Presupuestos completos',
            text: '25 rubros estándar con mano de obra, cargas sociales y materiales del NOA.',
          },
          {
            tag: '03',
            title: 'Diseño editorial',
            text: 'HTML premium "Dark Gold" customizable con tu logo y colores.',
          },
        ].map((f) => (
          <div key={f.tag}>
            <div
              style={{
                fontSize: '10px',
                letterSpacing: '3px',
                color: 'var(--gold)',
                marginBottom: '12px',
              }}
            >
              {f.tag}
            </div>
            <h3
              style={{
                fontFamily: 'var(--serif)',
                fontSize: '24px',
                color: 'var(--light)',
                marginBottom: '12px',
                fontWeight: 400,
              }}
            >
              {f.title}
            </h3>
            <p
              style={{
                fontSize: '13px',
                lineHeight: 1.6,
                color: 'var(--text)',
              }}
            >
              {f.text}
            </p>
          </div>
        ))}
      </section>

      <footer
        style={{
          marginTop: '120px',
          paddingTop: '40px',
          borderTop: '1px solid rgba(201, 168, 76, 0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '10px',
          letterSpacing: '2px',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <span>© 2026 SoyLeo AI</span>
        <span>Arq. Leonardo Díaz · Tucumán, Argentina</span>
      </footer>
    </main>
  );
}
