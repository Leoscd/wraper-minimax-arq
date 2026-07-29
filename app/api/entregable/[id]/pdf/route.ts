import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getPdfCounter, recordPdf } from '@/lib/usage';
import { getEntregablePorId } from '@/lib/tools/generar-entregable';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/entregable/[id]/pdf
 *
 * El usuario pide bajar el PDF del entregable generado por el chat.
 * El "PDF" en sí lo genera el browser via `window.print()` (print CSS).
 * Lo que hace este endpoint es:
 *   1. Verifica que el usuario esté autenticado.
 *   2. Verifica que el id corresponda a un entregable existente.
 *   3. Verifica que el usuario no haya gastado los 3 PDFs del free tier.
 *   4. Si todo OK, incrementa el counter y devuelve 200.
 *   5. Si agotado, devuelve 429 con info del limite.
 *
 * El cliente recibe este 200 y abre `window.print()` en el HTML del
 * entregable (que tiene `@media print` configurado).
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json(
      { error: 'No autenticado', message: 'Iniciá sesión para bajar PDFs.' },
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

  const before = await getPdfCounter(userId);
  if (before.agotado) {
    return NextResponse.json(
      {
        error: 'PDFs agotados',
        message: `Ya usaste los ${before.limit} PDFs del plan gratuito.`,
        limit: before.limit,
        used: before.used,
        resetAt: before.resetAt,
      },
      { status: 429 }
    );
  }

  const after = await recordPdf(userId);
  return NextResponse.json({
    ok: true,
    pdf: {
      used: after.used,
      limit: after.limit,
      remaining: after.remaining,
      resetAt: after.resetAt,
    },
  });
}
