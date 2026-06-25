import { NextRequest, NextResponse } from 'next/server';
import { LIMITS } from '@/lib/schemas';
import {
  checkRateLimit,
  getIpFromRequest,
  rateLimitResponseHeaders,
} from '@/lib/rate-limit';

export const runtime = 'nodejs';

type TipoArchivo = keyof typeof LIMITS extends `${string}_${infer T}_MAX_BYTES`
  ? T extends 'IMAGEN' | 'VIDEO' | 'LOGO'
    ? T extends 'IMAGEN'
      ? 'imagen'
      : T extends 'VIDEO'
        ? 'video'
        : 'logo'
    : never
  : never;

function detectarTipo(mime: string): 'imagen' | 'video' | 'logo' | null {
  if (LIMITS.UPLOAD_IMAGE_TYPES.includes(mime)) {
    if (mime === 'image/svg+xml' || mime === 'image/x-icon') return 'logo';
    return 'imagen';
  }
  if (LIMITS.UPLOAD_VIDEO_TYPES.includes(mime)) return 'video';
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const ip = getIpFromRequest(req);
    const rl = await checkRateLimit({ action: 'upload', ip });
    if (!rl.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit excedido',
          message: `Demasiados uploads. Intenta después de ${rl.resetAt}.`,
          resetAt: rl.resetAt,
        },
        { status: 429, headers: rateLimitResponseHeaders(rl) }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file');
    const tipoParam = formData.get('tipo');

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'Falta el archivo (campo "file")' },
        { status: 400, headers: rateLimitResponseHeaders(rl) }
      );
    }

    const tipo =
      (tipoParam as 'imagen' | 'video' | 'logo' | null) ||
      detectarTipo(file.type);
    if (!tipo) {
      return NextResponse.json(
        {
          error: `Tipo de archivo no soportado: ${file.type || 'desconocido'}`,
          permitidos: [
            ...LIMITS.UPLOAD_IMAGE_TYPES,
            ...LIMITS.UPLOAD_VIDEO_TYPES,
          ],
        },
        { status: 415, headers: rateLimitResponseHeaders(rl) }
      );
    }

    const maxBytes =
      tipo === 'video'
        ? LIMITS.UPLOAD_VIDEO_MAX_BYTES
        : tipo === 'logo'
          ? LIMITS.UPLOAD_LOGO_MAX_BYTES
          : LIMITS.UPLOAD_IMAGE_MAX_BYTES;

    if (file.size > maxBytes) {
      return NextResponse.json(
        {
          error: `Archivo demasiado grande: ${file.size} bytes. Máximo permitido para ${tipo}: ${maxBytes} bytes (${Math.round(maxBytes / 1024 / 1024)} MB).`,
          size: file.size,
          maxBytes,
        },
        { status: 413, headers: rateLimitResponseHeaders(rl) }
      );
    }

    return NextResponse.json(
      {
        status: 'ok',
        message: 'Archivo válido. Subida real a Vercel Blob pendiente.',
        filename: file.name,
        size: file.size,
        tipo,
        mime: file.type,
      },
      { headers: rateLimitResponseHeaders(rl) }
    );
  } catch (err) {
    console.error('[/api/upload] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error desconocido' },
      { status: 500 }
    );
  }
}
