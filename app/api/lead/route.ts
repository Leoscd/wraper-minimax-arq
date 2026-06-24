import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    return NextResponse.json({
      status: 'ok',
      message: 'Endpoint /api/lead placeholder. Se implementa con Resend.',
      received: body,
    });
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }
}
