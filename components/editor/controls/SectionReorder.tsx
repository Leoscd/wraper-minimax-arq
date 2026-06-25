'use client';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { SectionId } from '@/lib/editor-types';

interface Props {
  sections: SectionId[];
  labels: Record<SectionId, string>;
  visible: Record<SectionId, boolean>;
  onReorder: (newOrder: SectionId[]) => void;
  onToggle: (id: SectionId, visible: boolean) => void;
  disabled?: boolean;
}

export function SectionReorder({ sections, labels, visible, onReorder, onToggle, disabled }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sections.indexOf(active.id as SectionId);
    const newIndex = sections.indexOf(over.id as SectionId);
    if (oldIndex === -1 || newIndex === -1) return;

    onReorder(arrayMove(sections, oldIndex, newIndex));
  }

  return (
    <div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sections} strategy={verticalListSortingStrategy}>
          <div style={listStyle}>
            {sections.map((id) => (
              <SortableRow
                key={id}
                id={id}
                label={labels[id]}
                visible={visible[id]}
                onToggle={onToggle}
                disabled={disabled}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <p style={hintStyle}>
        💡 Arrastrá las filas con el ícono ⠿ para reordenar.
      </p>
    </div>
  );
}

function SortableRow({
  id,
  label,
  visible,
  onToggle,
  disabled,
}: {
  id: SectionId;
  label: string;
  visible: boolean;
  onToggle: (id: SectionId, visible: boolean) => void;
  disabled?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: visible ? 1 : 0.5,
    zIndex: isDragging ? 10 : 'auto',
  };

  return (
    <div ref={setNodeRef} style={{ ...rowStyle, ...style }}>
      <button
        {...attributes}
        {...listeners}
        style={dragHandleStyle}
        title="Arrastrá para reordenar"
        aria-label={`Arrastrá ${label} para reordenar`}
        disabled={disabled}
      >
        <DragIcon />
      </button>

      <span style={labelStyle}>{label}</span>

      <label style={toggleStyle}>
        <input
          type="checkbox"
          checked={visible}
          onChange={(e) => onToggle(id, e.target.checked)}
          disabled={disabled}
        />
        <span style={toggleLabelStyle}>{visible ? 'Visible' : 'Oculta'}</span>
      </label>
    </div>
  );
}

function DragIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <circle cx="5" cy="3" r="1.2" />
      <circle cx="11" cy="3" r="1.2" />
      <circle cx="5" cy="8" r="1.2" />
      <circle cx="11" cy="8" r="1.2" />
      <circle cx="5" cy="13" r="1.2" />
      <circle cx="11" cy="13" r="1.2" />
    </svg>
  );
}

const listStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '12px',
  background: 'var(--dark-2)',
  border: '1px solid var(--gold-mid)',
  transition: 'opacity 0.2s, box-shadow 0.2s',
};

const dragHandleStyle: React.CSSProperties = {
  width: '28px',
  height: '32px',
  background: 'var(--dark)',
  border: '1px solid var(--gold-mid)',
  color: 'var(--gold)',
  cursor: 'grab',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

const labelStyle: React.CSSProperties = {
  flex: 1,
  fontFamily: 'var(--serif)',
  fontSize: '16px',
  color: 'var(--light)',
};

const toggleStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  cursor: 'pointer',
};

const toggleLabelStyle: React.CSSProperties = {
  fontSize: '10px',
  color: 'var(--text-muted)',
  letterSpacing: '1.5px',
  textTransform: 'uppercase',
};

const hintStyle: React.CSSProperties = {
  marginTop: '12px',
  fontSize: '11px',
  color: 'var(--text-muted)',
  fontStyle: 'italic',
};
