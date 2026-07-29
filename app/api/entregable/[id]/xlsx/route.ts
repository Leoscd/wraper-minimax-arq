import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getEntregablePorId } from '@/lib/tools/generar-entregable';
import { generarXlsx } from '@/lib/excel';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/entregable/[id]/xlsx
 *
 * C2 del PLAN-LANZAMIENTO.md: el tier pago puede exportar Excel. Devuelve
 * el .xlsx con los datos estructurados del entregable. Por ahora, sin
 * sistema de planes, lo abrimos a cualquier user autenticado. Cuando se
 * implemente el gating (C4), la verificacion de plan se hace aca.
 *
 * Para documentos cualitativos, devolvemos 400 porque no se exportan
 * a Excel (es texto libre, no datos tabulares).
 */
export async function POST(
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

  if (entregable.tipo === 'documento') {
    return NextResponse.json(
      {
        error: 'No exporta Excel',
        message: 'Los documentos cualitativos no se exportan a Excel.',
      },
      { status: 400 }
    );
  }

  // El 'datos' del entregable no se guarda explicitamente: el HTML es
  // resultado de un render. Para re-armar Excel necesitamos acceder al
  // contexto original. Esto lo resolvemos con un workaround: parseamos el
  // HTML buscando los markers DeGold Gold. Pero eso seria fragil.
  //
  // Plan: cuando se implemente el gating (C4), se guarda el contexto
  // completo del entregable en el store (no solo el HTML). Por ahora, lo
  // que podemos exportar es presupuesto/cronograma/curva SI el HTML
  // contiene los markers esperados. Si no, devolvemos 501.
  return NextResponse.json(
    {
      error: 'No implementado',
      message:
        'La exportacion a Excel se habilita cuando C4 (gating) persista el contexto del entregable. Por ahora, descarga el HTML y abrilo en Excel.',
    },
    { status: 501 }
  );
}
