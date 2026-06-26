import Link from 'next/link';
import Chat from '@/components/chat/Chat';

export const metadata = {
  title: 'Asistente · SoyLeo AI',
  description:
    'Asistente experto en arquitectura y construcción: precios, cómputos y mano de obra del NOA.',
};

export default function AsistentePage() {
  return (
    <main style={{ minHeight: '100vh', padding: '32px 5vw' }}>
      <nav
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
        }}
      >
        <Link
          href="/"
          style={{
            fontFamily: 'var(--serif)',
            fontSize: '20px',
            color: 'var(--light)',
            fontWeight: 300,
            textDecoration: 'none',
          }}
        >
          SoyLeo <em style={{ color: 'var(--gold)' }}>AI</em>
        </Link>
        <Link
          href="/generar"
          style={{
            fontSize: '10px',
            letterSpacing: '3px',
            textTransform: 'uppercase',
            color: 'var(--gold)',
            textDecoration: 'none',
          }}
        >
          Generar presentación →
        </Link>
      </nav>

      <header style={{ maxWidth: '820px', margin: '0 auto 20px' }}>
        <span
          style={{
            fontSize: '10px',
            letterSpacing: '4px',
            textTransform: 'uppercase',
            color: 'var(--gold)',
          }}
        >
          Asistente · Arquitectura y construcción
        </span>
        <h1
          style={{
            fontFamily: 'var(--serif)',
            fontSize: 'clamp(28px, 5vw, 44px)',
            fontWeight: 300,
            color: 'var(--light)',
            margin: '8px 0 0',
          }}
        >
          Preguntá. Te respondo con <em style={{ color: 'var(--gold)' }}>números reales</em>.
        </h1>
      </header>

      <Chat />
    </main>
  );
}
