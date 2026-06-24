export default function PreviewPage({ params }: { params: { id: string } }) {
  return (
    <main style={{ padding: '60px 5vw', minHeight: '100vh' }}>
      <h1
        style={{
          fontFamily: 'var(--serif)',
          fontSize: '48px',
          color: 'var(--light)',
          fontWeight: 300,
          marginBottom: '20px',
        }}
      >
        Preview {params.id}
      </h1>
      <p style={{ color: 'var(--text)', fontSize: '14px' }}>
        Vista previa en construcción. Se implementa en Fase 7.
      </p>
    </main>
  );
}
