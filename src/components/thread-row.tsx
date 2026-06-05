import { CliSpinner } from './cli-spinner';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';

export function ThreadRow({
  id,
  name,
  createdAtLabel,
  isRunning,
  isSelected = false,
  onClick,
  onRename,
  onExport,
  onDelete,
}: {
  id: string;
  name: string;
  createdAtLabel: string;
  isRunning: boolean;
  isSelected?: boolean;
  onClick: (id: string) => void;
  onRename: (id: string) => void;
  onExport?: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <button
          type="button"
          onClick={() => onClick(id)}
          className={[
            'flex h-[36px] w-full items-center justify-between rounded-[10px] px-2 text-left transition-colors',
            isSelected ? 'bg-[var(--surface2)]' : 'hover:bg-white/4',
          ].join(' ')}
        >
          <span className="flex min-w-0 items-center gap-2">
            {isRunning ? (
              <CliSpinner
                label={`${name} is generating`}
                className="inline-flex w-3 shrink-0 items-center justify-center text-[12px] leading-none text-[var(--muted-foreground)]"
              />
            ) : (
              <span className="inline-flex w-3 shrink-0" aria-hidden="true" />
            )}
            <span className="truncate text-[13px] text-[var(--foreground)]/85">{name}</span>
          </span>
          <span className="ml-3 shrink-0 text-[12px] text-[var(--muted-foreground)]">
            {createdAtLabel}
          </span>
        </button>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => onRename(id)}>Rename thread</ContextMenuItem>
        {onExport ? <ContextMenuItem onClick={() => onExport(id)}>Export thread...</ContextMenuItem> : null}
        <ContextMenuSeparator />
        <ContextMenuItem
          className="text-[rgb(229,112,112)] data-[highlighted]:bg-[rgba(190,58,58,0.18)] data-[highlighted]:text-[rgb(245,178,178)]"
          onClick={() => onDelete(id)}
        >
          Delete thread
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
