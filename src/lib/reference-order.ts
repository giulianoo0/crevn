// Persistent ordering for reference folders and their images.
//
// Default order is alphabetical. Once the user drags to reorder, the explicit
// order is saved to localStorage (keyed by parent/folder id) so it survives an
// app restart. New items that aren't in the saved order fall back to the end,
// alphabetically.

const FOLDER_KEY = (parentId: string) => `imagen.ref.folderOrder.${parentId}`;
const IMAGE_KEY = (folderId: string) => `imagen.ref.imageOrder.${folderId}`;

function read(key: string): string[] | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as string[]) : null;
  } catch {
    return null;
  }
}

function write(key: string, ids: string[]) {
  try {
    localStorage.setItem(key, JSON.stringify(ids));
  } catch {
    // storage unavailable (private mode / quota) — order just won't persist
  }
}

export function getFolderOrder(parentId: string): string[] | null {
  return read(FOLDER_KEY(parentId));
}

export function setFolderOrder(parentId: string, ids: string[]) {
  write(FOLDER_KEY(parentId), ids);
}

export function getImageOrder(folderId: string): string[] | null {
  return read(IMAGE_KEY(folderId));
}

export function setImageOrder(folderId: string, ids: string[]) {
  write(IMAGE_KEY(folderId), ids);
}

// Order a list by a saved id-order, falling back to alphabetical for items not
// present in the saved order (and when no saved order exists at all).
export function applyOrder<T>(
  items: T[],
  savedOrder: string[] | null,
  getId: (item: T) => string,
  getName: (item: T) => string,
): T[] {
  const alpha = [...items].sort((a, b) => getName(a).localeCompare(getName(b)));
  if (!savedOrder || savedOrder.length === 0) return alpha;
  const rank = new Map(savedOrder.map((id, index) => [id, index]));
  return alpha.sort((a, b) => {
    const ra = rank.has(getId(a)) ? rank.get(getId(a))! : Number.MAX_SAFE_INTEGER;
    const rb = rank.has(getId(b)) ? rank.get(getId(b))! : Number.MAX_SAFE_INTEGER;
    if (ra !== rb) return ra - rb;
    return getName(a).localeCompare(getName(b));
  });
}
