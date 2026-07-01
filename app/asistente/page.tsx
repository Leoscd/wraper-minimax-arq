import Link from 'next/link';
import Chat from '@/components/chat/Chat';
import AuthButton from '@/components/auth/AuthButton';

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
            fontFamily: 'var(--font-inter), var(--sans)',
            fontSize: '20px',
            color: 'var(--light)',
            fontWeight: 600,
            letterSpacing: '-0.3px',
            textDecoration: 'none',
          }}
        >
          SoyLeo <em style={{ color: 'var(--gold)', fontStyle: 'normal' }}>AI</em>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
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
          <AuthButton />
        </div>
      </nav>

      <header style={{ maxWidth: '760px', margin: '0 auto 20px', padding: '0 8px' }}>
        <span
          style={{
            fontFamily: 'var(--font-inter), var(--sans)',
            fontSize: '10px',
            letterSpacing: '4px',
            textTransform: 'uppercase',
            color: 'var(--gold)',
            fontWeight: 500,
          }}
        >
          Asistente · Arquitectura y construcción
        </span>
        <h1
          style={{
            fontFamily: 'var(--font-inter), var(--sans)',
            fontSize: 'clamp(28px, 5vw, 44px)',
            fontWeight: 600,
            letterSpacing: '-1px',
            color: 'var(--light)',
            margin: '8px 0 0',
            lineHeight: 1.15,
          }}
        >
          Preguntá. Te respondo con <em style={{ color: 'var(--gold)', fontStyle: 'normal' }}>números reales</em>.
        </h1>
      </header>

      <Chat />
    </main>
  );
}
