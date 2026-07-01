'use client';

/**
 * Botón de autenticación para la navegación.
 *
 * Acceso rápido: si no estás logueado, un click te manda directo a Google
 * (sin pasar por /login). Si ya estás logueado, muestra tu cuenta + salir.
 * Se apoya en el SessionProvider (app/providers.tsx).
 */

import { signIn, signOut, useSession } from 'next-auth/react';

export default function AuthButton({
  callbackUrl = '/dashboard',
}: {
  callbackUrl?: string;
}) {
  const { status, data } = useSession();

  if (status === 'loading') {
    return <span style={hintStyle}>…</span>;
  }

  if (status === 'authenticated') {
    return (
      <span style={wrapStyle}>
        <span style={hintStyle}>{data.user?.name ?? data.user?.email}</span>
        <button onClick={() => signOut({ callbackUrl: '/' })} style={ghostBtnStyle}>
          Salir
        </button>
      </span>
    );
  }

  return (
    <button onClick={() => signIn('google', { callbackUrl })} style={googleBtnStyle}>
      <GoogleIcon />
      Entrar con Google
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

const wrapStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
};

const hintStyle: React.CSSProperties = {
  fontSize: '11px',
  color: 'var(--text-muted)',
  letterSpacing: '1px',
};

const googleBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  background: 'var(--light)',
  color: '#1a1a1a',
  border: 'none',
  padding: '9px 16px',
  fontSize: '11px',
  fontWeight: 600,
  letterSpacing: '0.5px',
  cursor: 'pointer',
  borderRadius: '4px',
};

const ghostBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid var(--gold-mid)',
  color: 'var(--gold)',
  padding: '7px 14px',
  fontSize: '10px',
  letterSpacing: '2px',
  textTransform: 'uppercase',
  cursor: 'pointer',
  borderRadius: '4px',
};
