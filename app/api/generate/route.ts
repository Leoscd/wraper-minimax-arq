import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    return NextResponse.json({
      status: 'ok',
      message: 'Endpoint /api/generate placeholder. Se implementa en Fase 5.',
      received: body ? Object.keys(body) : [],
    });
  } catch {
    return NextResponse.json(
      { error: 'Body inválido' },
      { status: 400 }
    );
  }
}
