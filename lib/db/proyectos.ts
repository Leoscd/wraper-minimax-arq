/**
 * CRUD de proyectos en Vercel KV.
 *
 * Keys:
 * - proyecto:{id}            → JSON del proyecto
 * - proyectos:user:{userId}   → array de IDs del usuario
 *
 * Estructura del proyecto:
 * {
 *   id: string
 *   userId: string
 *   nombre: string
 *   data: EditorState
 *   html: string
 *   createdAt: string
 *   updatedAt: string
 * }
 */

import { storage } from '@/lib/kv';
import type { EditorState } from '@/lib/editor-types';

export interface ProyectoGuardado {
  id: string;
  userId: string;
  nombre: string;
  data: EditorState;
  html: string;
  createdAt: string;
  updatedAt: string;
}

function generateId(): string {
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
}

function userProyectosKey(userId: string): string {
  return `proyectos:user:${userId}`;
}

export async function saveProyecto(
  userId: string,
  nombre: string,
  data: EditorState,
  html: string,
  existingId?: string
): Promise<ProyectoGuardado> {
  const now = new Date().toISOString();
  const id = existingId ?? generateId();

  const existing = existingId
    ? await storage.get<ProyectoGuardado>(`proyecto:${existingId}`)
    : null;

  const proyecto: ProyectoGuardado = {
    id,
    userId,
    nombre,
    data,
    html,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  await storage.set(`proyecto:${id}`, proyecto);

  if (!existing) {
    const userProyectos = (await storage.get<string[]>(userProyectosKey(userId))) ?? [];
    if (!userProyectos.includes(id)) {
      userProyectos.unshift(id);
      await storage.set(userProyectosKey(userId), userProyectos);
    }
  }

  return proyecto;
}

export async function getProyecto(id: string): Promise<ProyectoGuardado | null> {
  return await storage.get<ProyectoGuardado>(`proyecto:${id}`);
}

export async function getUserProyectos(userId: string): Promise<ProyectoGuardado[]> {
  const ids = (await storage.get<string[]>(userProyectosKey(userId))) ?? [];
  const proyectos: ProyectoGuardado[] = [];
  for (const id of ids) {
    const p = await getProyecto(id);
    if (p) proyectos.push(p);
  }
  return proyectos;
}

export async function deleteProyecto(userId: string, id: string): Promise<void> {
  const proyecto = await getProyecto(id);
  if (!proyecto || proyecto.userId !== userId) return;

  await storage.del(`proyecto:${id}`);

  const userProyectos = (await storage.get<string[]>(userProyectosKey(userId))) ?? [];
  const filtered = userProyectos.filter((pid) => pid !== id);
  await storage.set(userProyectosKey(userId), filtered);
}
