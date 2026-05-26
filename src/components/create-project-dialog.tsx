import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

export function CreateProjectDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (projectName: string) => void | Promise<void>;
}) {
  const [projectName, setProjectName] = useState('');
  const trimmedProjectName = projectName.trim();

  useEffect(() => {
    if (!open) {
      setProjectName('');
    }
  }, [open]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!trimmedProjectName) return;

    await onSubmit(trimmedProjectName);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create project</DialogTitle>
          <DialogDescription>
            Start a new workspace for its own threads, generations, and review flow.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="project-name"
              className="text-[13px] font-medium text-[var(--foreground)]"
            >
              Project name
            </label>
            <Input
              id="project-name"
              value={projectName}
              onChange={(event) => setProjectName(event.target.value)}
              placeholder="Campaign Boards"
              autoFocus
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="surface"
              className="border-transparent bg-[var(--surface2)] hover:bg-[var(--surface3)]"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!trimmedProjectName}>
              Create project
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
