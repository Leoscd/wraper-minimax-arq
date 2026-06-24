'use client';

import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, Suspense } from 'react';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/dashboard';
  const { status } = useSession();

  useEffect(() => {
    if (status === 'authenticated') {
      router.push(callbackUrl);
    }
  }, [status, callbackUrl, router]);

  return (
    <main style={mainStyle}>
      <div style={cardStyle}>
        <div style={logoStyle}>
          SoyLeo <em>AI</em>
        </div>
        <h1 style={titleStyle}>Iniciar sesión</h1>
        <p style={subtitleStyle}>
          Accedé a tu dashboard para gestionar tus presentaciones.
        </p>

        <button onClick={() => signIn('google', { callbackUrl })} style={btnStyle}>
          <GoogleIcon />
          Continuar con Google
        </button>

        <p style={footerStyle}>
          Al continuar aceptás los términos de uso y la política de privacidad.
        </p>
      </div>

      <style jsx global>{`
        body { background: var(--dark); }
      `}</style>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main style={mainStyle}><div>Cargando...</div></main>}>
      <LoginContent />
    </Suspense>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

const mainStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '20px',
  background: 'var(--dark)',
};

const cardStyle: React.CSSProperties = {
  background: 'var(--dark-2)',
  border: '1px solid var(--gold-mid)',
  padding: '48px',
  maxWidth: '440px',
  width: '100%',
  textAlign: 'center',
};

const logoStyle: React.CSSProperties = {
  fontFamily: 'var(--serif)',
  fontSize: '24px',
  color: 'var(--light)',
  marginBottom: '32px',
  fontWeight: 300,
};

const titleStyle: React.CSSProperties = {
  fontFamily: 'var(--serif)',
  fontSize: '32px',
  color: 'var(--light)',
  fontWeight: 300,
  marginBottom: '8px',
};

const subtitleStyle: React.CSSProperties = {
  color: 'var(--text)',
  fontSize: '13px',
  marginBottom: '32px',
  lineHeight: 1.6,
};

const btnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '12px',
  width: '100%',
  padding: '14px 24px',
  background: 'var(--light)',
  color: '#1a1a1a',
  border: 'none',
  fontSize: '13px',
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: 'var(--mono)',
  letterSpacing: '0.5px',
  marginBottom: '24px',
};

const footerStyle: React.CSSProperties = {
  fontSize: '10px',
  color: 'var(--text-muted)',
  lineHeight: 1.5,
};
