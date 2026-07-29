import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getEntregablePorId } from '@/lib/tools/generar-entregable';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/entregable/[id]/html
 *
 * Devuelve el HTML del entregable como descarga. C2 del PLAN-LANZAMIENTO.md:
 * el tier pago puede descargar el .html del entregable. Por ahora, sin
 * sistema de planes real, lo abrimos a cualquier user autenticado. Cuando
 * se implemente el gating (C4 + pagos), la verificacion de plan se hace
 * aca.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'No autenticado', message: 'Iniciá sesión para descargar.' },
      { status: 401 }
    );
  }

  const entregable = getEntregablePorId(params.id);
  if (!entregable) {
    return NextResponse.json(
      { error: 'Entregable no encontrado' },
      { status: 404 }
    );
  }

  return new NextResponse(entregable.html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `attachment; filename="${entregable.filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
