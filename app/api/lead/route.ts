import { NextRequest, NextResponse } from 'next/server';
import {
  LeadInputSchema,
  formatZodError,
} from '@/lib/schemas';
import {
  checkRateLimit,
  getIpFromRequest,
  rateLimitResponseHeaders,
} from '@/lib/rate-limit';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const ip = getIpFromRequest(req);
    const rl = await checkRateLimit({ action: 'lead', ip });
    if (!rl.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit excedido',
          message: `Demasiadas solicitudes de lead. Intenta después de ${rl.resetAt}.`,
          resetAt: rl.resetAt,
        },
        { status: 429, headers: rateLimitResponseHeaders(rl) }
      );
    }

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Body inválido: se esperaba JSON' },
        { status: 400 }
      );
    }

    const parsed = LeadInputSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(formatZodError(parsed.error), {
        status: 400,
        headers: rateLimitResponseHeaders(rl),
      });
    }

    return NextResponse.json(
      {
        status: 'ok',
        message:
          'Lead capturado. Cuando se implemente Resend, el PDF se enviará por email.',
        email: parsed.data.email,
        received: parsed.data,
      },
      { headers: rateLimitResponseHeaders(rl) }
    );
  } catch (err) {
    console.error('[/api/lead] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error desconocido' },
      { status: 500 }
    );
  }
}
