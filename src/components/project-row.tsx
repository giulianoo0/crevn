import { motion } from 'framer-motion';
import { ChevronDown, Folder, Plus } from 'lucide-react';

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';

export function ProjectRow({
  id,
  name,
  isOpen,
  onToggle,
  onPrepareThreadDraft,
  onOpenProperties,
  onRename,
  onDelete,
}: {
  id: string;
  name: string;
  isOpen: boolean;
  onToggle: (id: string) => void;
  onPrepareThreadDraft: (projectId: string) => void;
  onOpenProperties: (projectId: string) => void;
  onRename: (projectId: string) => void;
  onDelete: (projectId: string) => void;
}) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className="group/row rounded-[12px] transition-colors hover:bg-white/4">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => onToggle(id)}
              className="inline-flex min-w-0 flex-1 items-center gap-2 rounded-[10px] px-1.5 py-1 text-left text-[15px] font-medium text-[var(--foreground)]"
            >
              <motion.span
                animate={{ rotate: isOpen ? 0 : -90 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="inline-flex"
              >
                <ChevronDown className="size-3.5 text-[var(--muted-foreground)]" />
              </motion.span>
              <Folder className="size-4 text-[var(--muted-foreground)]" />
              <span className="truncate">{name}</span>
            </button>
            <button
              type="button"
              aria-label={`Start a new thread in ${name}`}
              onClick={() => onPrepareThreadDraft(id)}
              className="mr-1 inline-flex h-7 w-7 items-center justify-center rounded-full text-[var(--muted-foreground)] opacity-0 transition-all hover:bg-white/6 hover:text-[var(--foreground)] group-hover/row:opacity-100"
            >
              <Plus className="size-3.5" />
            </button>
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => onOpenProperties(id)}>Propriedades</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => onRename(id)}>Rename project</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          className="text-[rgb(229,112,112)] data-[highlighted]:bg-[rgba(190,58,58,0.18)] data-[highlighted]:text-[rgb(245,178,178)]"
          onClick={() => onDelete(id)}
        >
          Delete project
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
