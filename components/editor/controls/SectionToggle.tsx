'use client';

import type { SectionId } from '@/lib/editor-types';

interface Props {
  visible: Record<SectionId, boolean>;
  onChange: (id: SectionId, visible: boolean) => void;
  disabled?: boolean;
}

export function SectionToggle({ visible, onChange, disabled }: Props) {
  return null;
}
