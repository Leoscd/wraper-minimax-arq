import { auth, signOut } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getUserProyectos, deleteProyecto, type ProyectoGuardado } from '@/lib/db/proyectos';
import { storage } from '@/lib/kv';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/login?callbackUrl=/dashboard');
  }

  const userId = session.user.id;
  const userName = session.user.name ?? session.user.email ?? 'Usuario';
  const userEmail = session.user.email ?? '';
  if (!userId) {
    redirect('/login');
  }

  const proyectos = await getUserProyectos(userId);
  const usingMemory = !storage.isKV;

  return (
    <main style={mainStyle}>
      <header style={headerStyle}>
        <Link href="/" style={logoStyle}>
          SoyLeo <em>AI</em>
        </Link>
        <div style={userInfoStyle}>
          {session.user.image ? (
            <img src={session.user.image} alt={userName} style={avatarStyle} />
          ) : null}
          <div>
            <div style={userNameStyle}>{userName}</div>
            <div style={userEmailStyle}>{userEmail}</div>
          </div>
          <form action={async () => { 'use server'; await signOut({ redirectTo: '/' }); }}>
            <button type="submit" style={signOutBtnStyle}>Cerrar sesión</button>
          </form>
        </div>
      </header>

      {usingMemory && (
        <div style={warningStyle}>
          ⚠️ Modo desarrollo: usando storage in-memory. Los datos se pierden al reiniciar el servidor. Configurá <code>KV_REST_API_URL</code> y <code>KV_REST_API_TOKEN</code> en Vercel para persistencia real.
        </div>
      )}

      <section style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <h1 style={sectionTitleStyle}>Mis presentaciones</h1>
          <Link href="/generar" style={newBtnStyle}>+ Nueva presentación</Link>
        </div>

        {proyectos.length === 0 ? (
          <div style={emptyStyle}>
            <p style={{ fontSize: '16px', color: 'var(--text)', marginBottom: '20px' }}>
              Aún no tenés presentaciones guardadas.
            </p>
            <Link href="/generar" style={newBtnStyle}>
              Crear la primera
            </Link>
          </div>
        ) : (
          <div style={gridStyle}>
            {proyectos.map((p) => (
              <ProyectoCard key={p.id} proyecto={p} userId={userId} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

async function ProyectoCard({
  proyecto,
  userId,
}: {
  proyecto: ProyectoGuardado;
  userId: string;
}) {
  async function handleDelete() {
    'use server';
    await deleteProyecto(userId, proyecto.id);
  }

  return (
    <article style={cardStyle}>
      <div style={cardPreviewStyle}>
        <iframe
          srcDoc={proyecto.html}
          style={cardIframeStyle}
          title={proyecto.nombre}
          sandbox=""
        />
      </div>
      <div style={cardBodyStyle}>
        <h3 style={cardTitleStyle}>{proyecto.nombre}</h3>
        <p style={cardMetaStyle}>
          {new Date(proyecto.updatedAt).toLocaleDateString('es-AR', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </p>
        <div style={cardActionsStyle}>
          <Link href={`/preview/${proyecto.id}`} style={actionPrimaryStyle}>
            Editar
          </Link>
          <a
            href={`data:text/html;charset=utf-8,${encodeURIComponent(proyecto.html)}`}
            download={`${proyecto.nombre.replace(/\s+/g, '-').toLowerCase()}.html`}
            style={actionSecondaryStyle}
          >
            Descargar
          </a>
          <form action={handleDelete} style={{ display: 'inline' }}>
            <button type="submit" style={actionDeleteStyle}>
              Eliminar
            </button>
          </form>
        </div>
      </div>
    </article>
  );
}

const mainStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: 'var(--dark)',
  color: 'var(--light)',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '20px 5vw',
  borderBottom: '1px solid var(--gold-mid)',
};

const logoStyle: React.CSSProperties = {
  fontFamily: 'var(--serif)',
  fontSize: '20px',
  color: 'var(--light)',
  fontWeight: 300,
};

const userInfoStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
};

const avatarStyle: React.CSSProperties = {
  width: '36px',
  height: '36px',
  borderRadius: '50%',
  border: '1px solid var(--gold-mid)',
};

const userNameStyle: React.CSSProperties = {
  fontSize: '13px',
  color: 'var(--light)',
  fontWeight: 500,
};

const userEmailStyle: React.CSSProperties = {
  fontSize: '11px',
  color: 'var(--text-muted)',
};

const signOutBtnStyle: React.CSSProperties = {
  fontSize: '11px',
  letterSpacing: '1.5px',
  textTransform: 'uppercase',
  padding: '8px 16px',
  background: 'transparent',
  color: 'var(--text)',
  border: '1px solid var(--gold-mid)',
  cursor: 'pointer',
};

const warningStyle: React.CSSProperties = {
  background: 'rgba(245, 158, 11, 0.1)',
  border: '1px solid rgba(245, 158, 11, 0.3)',
  padding: '12px 5vw',
  fontSize: '12px',
  color: '#fbbf24',
};

const sectionStyle: React.CSSProperties = {
  padding: '40px 5vw',
};

const sectionHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '32px',
  flexWrap: 'wrap',
  gap: '16px',
};

const sectionTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--serif)',
  fontSize: '36px',
  color: 'var(--light)',
  fontWeight: 300,
};

const newBtnStyle: React.CSSProperties = {
  background: 'var(--gold)',
  color: 'var(--dark)',
  padding: '10px 20px',
  fontSize: '11px',
  letterSpacing: '2px',
  textTransform: 'uppercase',
  fontWeight: 500,
};

const emptyStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: '80px 20px',
  border: '1px dashed var(--gold-mid)',
  background: 'var(--dark-2)',
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
  gap: '24px',
};

const cardStyle: React.CSSProperties = {
  background: 'var(--dark-2)',
  border: '1px solid var(--gold-mid)',
  overflow: 'hidden',
};

const cardPreviewStyle: React.CSSProperties = {
  height: '180px',
  background: 'white',
  overflow: 'hidden',
};

const cardIframeStyle: React.CSSProperties = {
  width: '200%',
  height: '200%',
  border: 'none',
  transform: 'scale(0.5)',
  transformOrigin: 'top left',
};

const cardBodyStyle: React.CSSProperties = {
  padding: '20px',
};

const cardTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--serif)',
  fontSize: '20px',
  color: 'var(--light)',
  fontWeight: 400,
  marginBottom: '4px',
};

const cardMetaStyle: React.CSSProperties = {
  fontSize: '10px',
  color: 'var(--text-muted)',
  letterSpacing: '1.5px',
  textTransform: 'uppercase',
  marginBottom: '16px',
};

const cardActionsStyle: React.CSSProperties = {
  display: 'flex',
  gap: '6px',
  flexWrap: 'wrap',
};

const actionPrimaryStyle: React.CSSProperties = {
  background: 'var(--gold)',
  color: 'var(--dark)',
  padding: '6px 12px',
  fontSize: '10px',
  letterSpacing: '1.5px',
  textTransform: 'uppercase',
  fontWeight: 500,
};

const actionSecondaryStyle: React.CSSProperties = {
  background: 'transparent',
  color: 'var(--text)',
  border: '1px solid var(--gold-mid)',
  padding: '6px 12px',
  fontSize: '10px',
  letterSpacing: '1.5px',
  textTransform: 'uppercase',
};

const actionDeleteStyle: React.CSSProperties = {
  background: 'transparent',
  color: '#f87171',
  border: '1px solid rgba(248, 113, 113, 0.3)',
  padding: '6px 12px',
  fontSize: '10px',
  letterSpacing: '1.5px',
  textTransform: 'uppercase',
  cursor: 'pointer',
};
