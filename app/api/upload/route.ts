import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No file' }, { status: 400 });
    }

    return NextResponse.json({
      status: 'ok',
      message: 'Endpoint /api/upload placeholder. Se implementa con Vercel Blob.',
      filename: file.name,
      size: file.size,
    });
  } catch {
    return NextResponse.json({ error: 'Error al subir' }, { status: 500 });
  }
}
