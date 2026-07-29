import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUsage } from '@/lib/usage';
import { checkRateLimit, getIpFromRequest } from '@/lib/rate-limit';

export const runtime = 'nodejs';

/**
 * Devuelve el snapshot de uso del usuario actual (tokens consumidos este
 * mes, restantes, % restantes, estimacion de presupuestos pendientes).
 * Endpoint para que la UI pinte la barra de cuota.
 *
 * Si no hay userId en sesion, devuelve un 401: la cuota es por usuario
 * logueado. Los usuarios anonimos usan solo el rate-limit por IP.
 */
export async function GET(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json(
      { error: 'No autenticado', message: 'Iniciá sesión para ver tu cuota.' },
      { status: 401 }
    );
  }

  // Adicional: rate-limit por IP para evitar scraping del endpoint.
  const rl = await checkRateLimit({
    action: 'usage',
    ip: getIpFromRequest(req as any),
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Rate limit excedido', resetAt: rl.resetAt },
      { status: 429 }
    );
  }

  const usage = await getUsage(userId);
  return NextResponse.json(usage);
}
