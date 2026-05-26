import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { App } from './App';
import * as electronApi from './lib/electron-api';
import { toast } from 'sonner';

const projectFixture = {
  id: 'project-1',
  name: 'Project One',
  createdAt: '2026-05-26T10:00:00.000Z',
  updatedAt: '2026-05-26T10:00:00.000Z',
  threads: [
    {
      id: 'thread-1',
      projectId: 'project-1',
      name: 'Thread One',
      createdAt: '2026-05-26T10:00:00.000Z',
      updatedAt: '2026-05-26T10:00:00.000Z',
      hasRunningJob: false,
    },
    {
      id: 'thread-2',
      projectId: 'project-1',
      name: 'Thread Two',
      createdAt: '2026-05-26T11:00:00.000Z',
      updatedAt: '2026-05-26T11:00:00.000Z',
      hasRunningJob: false,
    },
  ],
};

vi.mock('./lib/electron-api', () => ({
  ensureProjectThreadWorkspace: vi.fn(async () => ({
    project: projectFixture,
    thread: projectFixture.threads[0],
  })),
  listProjectsWithThreads: vi.fn(async () => [projectFixture]),
  listReferences: vi.fn(async () => []),
  createReference: vi.fn(async (payload) => ({
    id: 'reference-created',
    createdAt: '2026-05-26T12:00:00.000Z',
    description: payload.description ?? null,
    ...payload,
  })),
  listGeneratedImages: vi.fn(async () => []),
  createProject: vi.fn(),
  createThread: vi.fn(),
  renameProject: vi.fn(),
  renameThread: vi.fn(),
  deleteProject: vi.fn(),
  deleteThread: vi.fn(),
  generateImages: vi.fn(),
}));

vi.mock('sonner', () => ({
  Toaster: () => null,
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    message: vi.fn(),
  },
}));

vi.mock('./components/generated-image-grid', () => ({
  GeneratedImageGrid: () => <div data-testid="generated-image-grid" />,
}));

vi.mock('./components/project-row', () => ({
  ProjectRow: ({
    name,
    onRename,
    onDelete,
  }: {
    name: string;
    onRename: () => void;
    onDelete: () => void;
  }) => (
    <div>
      <div>{name}</div>
      <button type="button" onClick={onRename}>
        Rename {name}
      </button>
      <button type="button" onClick={onDelete}>
        Delete {name}
      </button>
    </div>
  ),
}));

vi.mock('./components/thread-row', () => ({
  ThreadRow: ({
    name,
    onClick,
    onRename,
    onDelete,
  }: {
    name: string;
    onClick: () => void;
    onRename: () => void;
    onDelete: () => void;
  }) => (
    <div>
      <button type="button" onClick={onClick}>
        {name}
      </button>
      <button type="button" onClick={onRename}>
        Rename {name}
      </button>
      <button type="button" onClick={onDelete}>
        Delete {name}
      </button>
    </div>
  ),
}));

describe('App header thread title', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    vi.mocked(electronApi.listReferences).mockResolvedValue([]);
    vi.mocked(electronApi.createReference).mockImplementation(async (payload) => ({
      id: 'reference-created',
      createdAt: '2026-05-26T12:00:00.000Z',
      description: payload.description ?? null,
      ...payload,
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the active thread name and updates it when switching threads', async () => {
    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.getByRole('button', { name: 'Thread Two' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Thread One' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Thread Two' }));
    await act(async () => {
      vi.advanceTimersByTime(250);
    });

    expect(screen.getByRole('heading', { name: 'Thread Two' })).toBeInTheDocument();
  });

  it('renames a thread when the rename dialog is confirmed', async () => {
    const renameThreadMock = vi.mocked(electronApi.renameThread);
    const toastSuccessMock = vi.mocked(toast.success);

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Rename Thread One' }));
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Updated Thread' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save thread' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(renameThreadMock).toHaveBeenCalledWith('thread-1', 'Updated Thread');
    expect(toastSuccessMock).toHaveBeenCalledWith('Thread renamed');
  });

  it('deletes a thread when the delete dialog is confirmed', async () => {
    const deleteThreadMock = vi.mocked(electronApi.deleteThread);
    const toastMessageMock = vi.mocked(toast.message);

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Delete Thread One' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete thread' }));

    await act(async () => {
      await vi.runAllTimersAsync();
      vi.advanceTimersByTime(500);
    });

    expect(deleteThreadMock).toHaveBeenCalledWith('thread-1');
    expect(toastMessageMock).toHaveBeenCalledWith('Thread deleted');
  });

  it('sends attached reference images with generation requests', async () => {
    const generateImagesMock = vi.mocked(electronApi.generateImages).mockResolvedValue({
      jobId: 'job-1',
      assets: [],
    });
    const referenceImage = new File(['stub-image'], 'reference.png', { type: 'image/png' });

    Object.defineProperty(referenceImage, 'arrayBuffer', {
      value: vi.fn(async () => Uint8Array.from([1, 2, 3, 4]).buffer),
    });

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Use the attached reference' },
    });

    fireEvent.change(screen.getByTestId('composer-reference-input'), {
      target: { files: [referenceImage] },
    });

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(generateImagesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining('Use the attached reference'),
        referenceImages: [
          expect.objectContaining({
            name: 'reference.png',
            mimeType: 'image/png',
            bytesBase64: 'AQIDBA==',
          }),
        ],
      })
    );
  });

  it('attaches pasted images from the composer', async () => {
    const generateImagesMock = vi.mocked(electronApi.generateImages).mockResolvedValue({
      jobId: 'job-1',
      assets: [],
    });
    generateImagesMock.mockClear();
    const pastedImage = new File(['paste-image'], 'pasted.png', { type: 'image/png' });
    Object.defineProperty(pastedImage, 'arrayBuffer', {
      value: vi.fn(async () => Uint8Array.from([5, 6, 7, 8]).buffer),
    });

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const composerInput = screen.getByRole('textbox');
    fireEvent.change(composerInput, {
      target: { value: 'Use pasted image' },
    });

    fireEvent.paste(composerInput, {
      clipboardData: {
        files: [pastedImage],
        items: [],
      },
    });

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(generateImagesMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        referenceImages: [
          expect.objectContaining({
            name: 'pasted.png',
            mimeType: 'image/png',
            bytesBase64: 'BQYHCA==',
          }),
        ],
      })
    );
  });

  it('shows a settings control pinned at the bottom of the sidebar', async () => {
    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument();
  });

  it('slides to the settings view when settings is clicked', async () => {
    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));

    expect(screen.getByRole('button', { name: 'References' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'References' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to projects' })).toBeInTheDocument();
  });

  it('opens the references page and adds a reference with metadata', async () => {
    const referenceImage = new File(['saved-reference'], 'face.png', { type: 'image/png' });
    Object.defineProperty(referenceImage, 'arrayBuffer', {
      value: vi.fn(async () => Uint8Array.from([9, 8, 7, 6]).buffer),
    });

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    fireEvent.click(screen.getByRole('button', { name: 'References' }));

    expect(screen.getByRole('heading', { name: 'References' })).toBeInTheDocument();
    expect(screen.getByText('Choose the visual memory Codex can reuse during generation.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Add reference' }));
    fireEvent.change(screen.getByLabelText('Image'), {
      target: { files: [referenceImage] },
    });
    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Hero face' },
    });
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'Keep the same facial proportions and warm palette.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save reference' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.getByText('Hero face')).toBeInTheDocument();
    expect(screen.getByText('Keep the same facial proportions and warm palette.')).toBeInTheDocument();
    expect(electronApi.createReference).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'face.png',
        title: 'Hero face',
        description: 'Keep the same facial proportions and warm palette.',
        bytesBase64: 'CQgHBg==',
      })
    );
  });

  it('accepts dropped images in the add reference dialog', async () => {
    const droppedImage = new File(['drop-reference'], 'dropped.png', { type: 'image/png' });
    Object.defineProperty(droppedImage, 'arrayBuffer', {
      value: vi.fn(async () => Uint8Array.from([7, 7, 7, 7]).buffer),
    });

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add reference' }));
    fireEvent.drop(screen.getByText('Drop an image here'), {
      dataTransfer: { files: [droppedImage] },
    });
    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Dropped guide' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save reference' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(electronApi.createReference).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'dropped.png',
        title: 'Dropped guide',
        bytesBase64: 'BwcHBw==',
      })
    );
  });

  it('filters reference mentions after @ and inserts the selected name', async () => {
    vi.mocked(electronApi.listReferences).mockResolvedValue([
      {
        id: 'reference-hero',
        name: 'hero.png',
        title: 'Hero face',
        description: 'Primary character',
        mimeType: 'image/png',
        bytesBase64: 'AQID',
        createdAt: '2026-05-26T12:00:00.000Z',
      },
      {
        id: 'reference-palette',
        name: 'palette.png',
        title: 'Palette board',
        description: null,
        mimeType: 'image/png',
        bytesBase64: 'BAUG',
        createdAt: '2026-05-26T12:01:00.000Z',
      },
    ]);

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const composerInput = screen.getByRole('textbox');
    fireEvent.change(composerInput, {
      target: { value: 'Use @hero' },
    });

    expect(screen.getByRole('option', { name: 'Hero face' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Palette board' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('option', { name: 'Hero face' }));

    expect(composerInput).toHaveValue('Use Hero face');
    expect(screen.getByTestId('selected-reference-mention')).toHaveTextContent('Hero face');
    expect(screen.getByTestId('selected-reference-mention')).toHaveClass('text-[var(--accent)]');
  });

  it('sends saved references and metadata with generation requests', async () => {
    const generateImagesMock = vi.mocked(electronApi.generateImages).mockResolvedValue({
      jobId: 'job-1',
      assets: [],
    });
    generateImagesMock.mockClear();
    const referenceImage = new File(['saved-reference'], 'palette.png', { type: 'image/png' });
    Object.defineProperty(referenceImage, 'arrayBuffer', {
      value: vi.fn(async () => Uint8Array.from([10, 11, 12, 13]).buffer),
    });

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    fireEvent.click(screen.getByRole('button', { name: 'References' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add reference' }));
    fireEvent.change(screen.getByLabelText('Image'), {
      target: { files: [referenceImage] },
    });
    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Palette guide' },
    });
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'Muted contrast and soft highlights.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save reference' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Back to projects' }));
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Generate with library reference' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(generateImagesMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        referenceImages: [
          expect.objectContaining({
            name: 'palette.png',
            title: 'Palette guide',
            description: 'Muted contrast and soft highlights.',
            bytesBase64: 'CgsMDQ==',
          }),
        ],
      })
    );
  });

  it('keeps the composer expanded while the reference picker is opening', async () => {
    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const composerInput = screen.getByRole('textbox');
    fireEvent.focus(composerInput);

    expect(composerInput).toHaveAttribute('rows', '3');

    fireEvent.pointerDown(screen.getAllByRole('button', { name: 'Adicionar anexo' })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: 'Adicionar anexo' })[0]);
    fireEvent.blur(composerInput);

    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    expect(composerInput).toHaveAttribute('rows', '3');
  });
});
