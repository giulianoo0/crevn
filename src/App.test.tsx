import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { App } from './App';
import * as electronApi from './lib/electron-api';
import * as errors from './lib/errors';
import { toast } from 'sonner';

let scenePlanListener: ((event: { jobId: string; threadId: string; count: number; applyToShimmers: boolean }) => void) | null = null;

const projectFixture = {
  id: 'project-1',
  name: 'Project One',
  systemInstructions: 'Keep silhouettes crisp and the environment grounded.',
  artStyle: 'cartoon',
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
  updateProjectSettings: vi.fn(),
  renameThread: vi.fn(),
  deleteProject: vi.fn(),
  deleteThread: vi.fn(),
  generateImages: vi.fn(),
  copyGeneratedImage: vi.fn(async () => undefined),
  downloadGeneratedImage: vi.fn(async () => undefined),
  deleteGeneratedImage: vi.fn(async () => undefined),
  subscribeToScenePlan: vi.fn((listener) => {
    scenePlanListener = listener;
    return () => {
      if (scenePlanListener === listener) {
        scenePlanListener = null;
      }
    };
  }),
}));

vi.mock('sonner', () => ({
  Toaster: () => null,
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    message: vi.fn(),
  },
}));

vi.mock('@number-flow/react', () => ({
  default: ({ value }: { value: number }) => <span>{value}</span>,
}));

vi.mock('./components/generated-image-grid', () => ({
  GeneratedImageGrid: ({
    images,
    selectedImageIds,
    onImageSelect,
    onImageOpen,
    onImageCopy,
    onImageDownload,
    onImageDelete,
  }: {
    images?: Array<{ id: string; fileName: string }>;
    selectedImageIds?: string[];
    onImageSelect?: (image: { id: string; fileName: string }) => void;
    onImageOpen?: (image: { id: string; fileName: string }) => void;
    onImageCopy?: (image: { id: string; fileName: string }) => void;
    onImageDownload?: (image: { id: string; fileName: string }) => void;
    onImageDelete?: (image: { id: string; fileName: string }) => void;
  }) => {
    const clickTimeouts = new Map<string, number>();

    return (
      <div data-testid="generated-image-grid">
        {images?.map((image) => (
          <div key={image.id}>
            {'isLoading' in image && image.isLoading ? (
              <div aria-label={`${image.fileName} loading`}>{image.fileName}</div>
            ) : (
              <button
                type="button"
                aria-label={`Select ${image.fileName}`}
                data-selected={selectedImageIds?.includes(image.id) ? 'true' : 'false'}
                onClick={() => {
                  const existingTimeoutId = clickTimeouts.get(image.id);
                  if (existingTimeoutId !== undefined) {
                    window.clearTimeout(existingTimeoutId);
                  }

                  clickTimeouts.set(
                    image.id,
                    window.setTimeout(() => {
                      clickTimeouts.delete(image.id);
                      onImageSelect?.(image);
                    }, 200)
                  );
                }}
                onDoubleClick={() => {
                  const timeoutId = clickTimeouts.get(image.id);
                  if (timeoutId !== undefined) {
                    window.clearTimeout(timeoutId);
                    clickTimeouts.delete(image.id);
                  }
                  onImageOpen?.(image);
                }}
              >
                {image.fileName}
              </button>
            )}
            {!('isLoading' in image && image.isLoading) ? (
              <div>
                <button type="button" onClick={() => onImageCopy?.(image)}>
                  Copy {image.fileName}
                </button>
                <button type="button" onClick={() => onImageDownload?.(image)}>
                  Download {image.fileName}
                </button>
                <button type="button" onClick={() => onImageDelete?.(image)}>
                  Delete {image.fileName}
                </button>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    );
  },
}));

vi.mock('./lib/errors', async () => {
  const actual = await vi.importActual<typeof import('./lib/errors')>('./lib/errors');
  return {
    ...actual,
    getErrorMessage: vi.fn(actual.getErrorMessage),
  };
});

vi.mock('./components/project-row', () => ({
  ProjectRow: ({
    id,
    name,
    onOpenProperties,
    onRename,
    onDelete,
  }: {
    id: string;
    name: string;
    onOpenProperties: (projectId: string) => void;
    onRename: () => void;
    onDelete: () => void;
  }) => (
    <div>
      <div>{name}</div>
      <button type="button" onClick={() => onOpenProperties(id)}>
        Properties {name}
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

vi.mock('./components/thread-row', () => ({
  ThreadRow: ({
    name,
    isRunning,
    onClick,
    onRename,
    onDelete,
  }: {
    name: string;
    isRunning: boolean;
    onClick: () => void;
    onRename: () => void;
    onDelete: () => void;
  }) => (
    <div>
      <button type="button" onClick={onClick}>
        {name}
      </button>
      {isRunning ? <span aria-label={`${name} is generating`}>running</span> : null}
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
    vi.restoreAllMocks();
    scenePlanListener = null;
    vi.mocked(electronApi.listReferences).mockResolvedValue([]);
    vi.mocked(electronApi.listGeneratedImages).mockResolvedValue([]);
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

  it('opens project properties with stored values and saves them', async () => {
    const updateProjectSettingsMock = vi.mocked(electronApi.updateProjectSettings);
    const toastSuccessMock = vi.mocked(toast.success);

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Properties Project One' }));

    expect(screen.getByRole('dialog', { name: 'Project One' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'General' })).toBeInTheDocument();

    const systemInstructionsField = screen.getByLabelText('System Instructions');
    const artStyleField = screen.getByRole('combobox', { name: 'Art Style' });
    expect(systemInstructionsField).toHaveValue('Keep silhouettes crisp and the environment grounded.');
    expect(artStyleField).toHaveTextContent('Cartoon');

    fireEvent.change(systemInstructionsField, {
      target: { value: 'Stay precise with lighting continuity and keep the wardrobe grounded.' },
    });

    await act(async () => {
      fireEvent.click(artStyleField);
      await vi.runAllTimersAsync();
    });

    await act(async () => {
      const photorealOption = screen.getByRole('option', { name: 'Photoreal' });
      fireEvent.pointerDown(photorealOption, { pointerType: 'mouse' });
      fireEvent.click(photorealOption);
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save properties' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(updateProjectSettingsMock).toHaveBeenCalledWith('project-1', {
      systemInstructions: 'Stay precise with lighting continuity and keep the wardrobe grounded.',
      artStyle: 'photoreal',
    });
    expect(toastSuccessMock).toHaveBeenCalledWith('Project properties saved');
  });

  it('keeps the project properties dialog open when saving fails', async () => {
    vi.mocked(electronApi.updateProjectSettings).mockRejectedValueOnce(new Error('save failed'));

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Properties Project One' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save properties' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.getByRole('dialog', { name: 'Project One' })).toBeInTheDocument();
    expect(vi.mocked(toast.error)).toHaveBeenCalledWith('Failed to save project properties');
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

    await act(async () => {
      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: 'Use the attached reference' },
      });
      await vi.runAllTimersAsync();
    });

    await act(async () => {
      fireEvent.change(screen.getByTestId('composer-reference-input'), {
        target: { files: [referenceImage] },
      });
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(generateImagesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining('Use the attached RefImage1 (reference)'),
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

  it('defaults generation count to 1 and caps it at 25', async () => {
    vi.mocked(electronApi.generateImages).mockResolvedValue({
      jobId: 'job-1',
      assets: [],
    });

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.focus(screen.getByRole('textbox'));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.getByText('1')).toBeInTheDocument();

    const incrementButton = screen.getByRole('button', { name: 'Increase image count' });
    for (let index = 0; index < 30; index += 1) {
      fireEvent.click(incrementButton);
    }

    expect(screen.getByText('25')).toBeInTheDocument();
    expect(incrementButton).toBeDisabled();
  });

  it('opens the mode dropdown without collapsing the composer and switches to scene mode', async () => {
    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.focus(screen.getByRole('textbox'));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.getByRole('button', { name: 'Mode' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Low Angle' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Mode' }));

    expect(screen.getByRole('button', { name: 'Scene' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Low Angle' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Scene' }));

    expect(screen.queryByRole('button', { name: 'Low Angle' })).not.toBeInTheDocument();
  });

  it('uses scene mode and reacts to the emitted scene plan count when the agent opts into shimmer expansion', async () => {
    let resolveGeneration: ((value: { jobId: string; assets: [] }) => void) | null = null;
    vi.mocked(electronApi.generateImages).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveGeneration = resolve;
        })
    );

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.focus(screen.getByRole('textbox'));
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Mode' }));
    fireEvent.click(screen.getByRole('button', { name: 'Scene' }));

    await act(async () => {
      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: 'A consistent subway platform scene' },
      });
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(electronApi.generateImages).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'scene',
        count: 1,
      })
    );
    expect(screen.getByLabelText('Thread One is generating')).toBeInTheDocument();

    await act(async () => {
      scenePlanListener?.({ jobId: 'job-1', threadId: 'thread-1', count: 6, applyToShimmers: true });
      await vi.runAllTimersAsync();
    });

    expect(vi.mocked(toast.message)).toHaveBeenCalledWith('Generating 6 images');
    expect(screen.getAllByLabelText(/loading$/i)).toHaveLength(6);

    await act(async () => {
      resolveGeneration?.({ jobId: 'job-1', assets: [] });
      await vi.runAllTimersAsync();
    });
  });

  it('keeps the original shimmer count when the agent does not opt into shimmer expansion', async () => {
    let resolveGeneration: ((value: { jobId: string; assets: [] }) => void) | null = null;
    vi.mocked(electronApi.generateImages).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveGeneration = resolve;
        })
    );

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.focus(screen.getByRole('textbox'));
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Mode' }));
    fireEvent.click(screen.getByRole('button', { name: 'Scene' }));

    await act(async () => {
      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: 'A consistent subway platform scene' },
      });
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.getByLabelText('Thread One is generating')).toBeInTheDocument();

    await act(async () => {
      scenePlanListener?.({ jobId: 'job-1', threadId: 'thread-1', count: 6, applyToShimmers: false });
      await vi.runAllTimersAsync();
    });

    expect(vi.mocked(toast.message)).toHaveBeenCalledWith('Generating 6 images');
    expect(screen.getAllByLabelText(/loading$/i)).toHaveLength(1);

    await act(async () => {
      resolveGeneration?.({ jobId: 'job-1', assets: [] });
      await vi.runAllTimersAsync();
    });
  });

  it('shows a running indicator in the sidebar while generation is in flight', async () => {
    let resolveGeneration: ((value: { jobId: string; assets: [] }) => void) | null = null;
    vi.mocked(electronApi.generateImages).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveGeneration = resolve;
        })
    );

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    await act(async () => {
      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: 'Generate a studio portrait' },
      });
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.getByLabelText('Thread One is generating')).toBeInTheDocument();

    await act(async () => {
      resolveGeneration?.({ jobId: 'job-1', assets: [] });
      await vi.runAllTimersAsync();
    });

    expect(screen.queryByLabelText('Thread One is generating')).not.toBeInTheDocument();
  });

  it('persists loading placeholders when leaving and re-entering the active thread during generation', async () => {
    let resolveGeneration: ((value: { jobId: string; assets: [] }) => void) | null = null;
    vi.mocked(electronApi.generateImages).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveGeneration = resolve;
        })
    );

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    await act(async () => {
      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: 'Generate a studio portrait' },
      });
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.getAllByLabelText(/loading$/i)).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'Thread Two' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.queryAllByLabelText(/loading$/i)).toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: 'Thread One' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.getAllByLabelText(/loading$/i)).toHaveLength(1);

    await act(async () => {
      resolveGeneration?.({ jobId: 'job-1', assets: [] });
      await vi.runAllTimersAsync();
    });
  });

  it('toggles generated images as composer references from the grid', async () => {
    vi.mocked(electronApi.listGeneratedImages).mockResolvedValue([
      {
        id: 'generated-1',
        fileName: 'frame-1.png',
        fileUrl: 'crenv-asset://generated?path=frame-1.png',
        createdAt: '2026-05-26T10:30:00.000Z',
      },
    ]);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      arrayBuffer: async () => Uint8Array.from([1, 2, 3, 4]).buffer,
      blob: async () => new Blob([Uint8Array.from([1, 2, 3, 4])], { type: 'image/png' }),
    } as Response);

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const gridButton = screen.getByRole('button', { name: 'Select frame-1.png' });
    fireEvent.click(gridButton);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(gridButton).toHaveAttribute('data-selected', 'true');
    expect(screen.getByLabelText('Remove frame-1.png')).toBeInTheDocument();

    fireEvent.click(gridButton);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(gridButton).toHaveAttribute('data-selected', 'false');
    expect(screen.queryByLabelText('Remove frame-1.png')).not.toBeInTheDocument();
  });

  it('opens a generated image preview dialog on double click without selecting it', async () => {
    vi.mocked(electronApi.listGeneratedImages).mockResolvedValue([
      {
        id: 'generated-1',
        fileName: 'frame-1.png',
        fileUrl: 'crenv-asset://generated?path=frame-1.png',
        createdAt: '2026-05-26T10:30:00.000Z',
      },
    ]);

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const gridButton = screen.getByRole('button', { name: 'Select frame-1.png' });
    fireEvent.doubleClick(gridButton);

    expect(screen.getByRole('dialog', { name: 'frame-1.png' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'frame-1.png preview' })).toBeInTheDocument();
    expect(gridButton).toHaveAttribute('data-selected', 'false');
  });

  it('opens the player for an attached reference image from the composer row', async () => {
    const referenceImage = new File(['stub-image'], 'reference.png', { type: 'image/png' });

    Object.defineProperty(referenceImage, 'arrayBuffer', {
      value: vi.fn(async () => Uint8Array.from([1, 2, 3, 4]).buffer),
    });

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    await act(async () => {
      fireEvent.change(screen.getByTestId('composer-reference-input'), {
        target: { files: [referenceImage] },
      });
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Open reference.png' }));

    expect(screen.getByRole('dialog', { name: 'reference.png' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'reference.png preview' })).toBeInTheDocument();
  });

  it('submits a pinpoint generation from the player and closes back into a single shimmer', async () => {
    vi.mocked(electronApi.listGeneratedImages).mockResolvedValue([
      {
        id: 'generated-1',
        fileName: 'frame-1.png',
        fileUrl: 'crenv-asset://generated?path=frame-1.png',
        createdAt: '2026-05-26T10:30:00.000Z',
      },
    ]);
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      const bytes = url.includes('character-sheet')
        ? Uint8Array.from([5, 6, 7, 8])
        : Uint8Array.from([1, 2, 3, 4]);

      return {
        arrayBuffer: async () => bytes.buffer,
        blob: async () => new Blob([bytes], { type: 'image/png' }),
        headers: {
          get: () => 'image/png',
        },
      } as Response;
    });

    let resolveGeneration: ((value: { jobId: string; assets: [] }) => void) | null = null;
    vi.mocked(electronApi.generateImages).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveGeneration = resolve;
        })
    );

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    await act(async () => {
      fireEvent.doubleClick(screen.getByRole('button', { name: 'Select frame-1.png' }));
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Pin Point' }));

    const stage = screen.getByTestId('player-image-stage');
    Object.defineProperty(stage, 'getBoundingClientRect', {
      value: () => ({
        left: 0,
        top: 0,
        width: 1000,
        height: 500,
        right: 1000,
        bottom: 500,
        x: 0,
        y: 0,
        toJSON: () => null,
      }),
    });

    fireEvent.click(stage, { clientX: 250, clientY: 200 });

    const characterReference = new File(['character-sheet'], 'character-sheet.png', { type: 'image/png' });
    Object.defineProperty(characterReference, 'arrayBuffer', {
      value: vi.fn(async () => Uint8Array.from([5, 6, 7, 8]).buffer),
    });

    await act(async () => {
      fireEvent.change(screen.getByTestId('pinpoint-reference-input'), {
        target: { files: [characterReference] },
      });
      await vi.runAllTimersAsync();
    });

    await act(async () => {
      const extraPromptInput = screen.getByRole('textbox', { name: 'Extra prompt' }) as HTMLDivElement & {
        value: string;
      };
      extraPromptInput.value = 'Place the character naturally near the shoreline.';
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Generate pinpoint image' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(electronApi.generateImages).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'pinpoint',
        count: 1,
        prompt: expect.stringContaining('Place the character naturally near the shoreline.'),
        pinPoint: expect.objectContaining({
          point: { x: 0.25, y: 0.4 },
        }),
      })
    );
    expect(screen.queryByRole('dialog', { name: 'frame-1.png' })).not.toBeInTheDocument();
    expect(screen.getAllByLabelText(/loading$/i)).toHaveLength(1);

    await act(async () => {
      resolveGeneration?.({ jobId: 'job-1', assets: [] });
      await vi.runAllTimersAsync();
    });
  });

  it('submits a camera generation from the player with orbit controls', async () => {
    vi.mocked(electronApi.listGeneratedImages).mockResolvedValue([
      {
        id: 'generated-1',
        fileName: 'frame-1.png',
        fileUrl: 'crenv-asset://generated?path=frame-1.png',
        createdAt: '2026-05-26T10:30:00.000Z',
      },
    ]);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      arrayBuffer: async () => Uint8Array.from([1, 2, 3, 4]).buffer,
      blob: async () => new Blob([Uint8Array.from([1, 2, 3, 4])], { type: 'image/png' }),
      headers: {
        get: () => 'image/png',
      },
    } as Response);

    let resolveGeneration: ((value: { jobId: string; assets: [] }) => void) | null = null;
    vi.mocked(electronApi.generateImages).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveGeneration = resolve;
        })
    );

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    await act(async () => {
      fireEvent.doubleClick(screen.getByRole('button', { name: 'Select frame-1.png' }));
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Camera' }));

    fireEvent.change(screen.getByRole('slider', { name: 'Rotation' }), {
      target: { value: '38' },
    });
    fireEvent.change(screen.getByRole('slider', { name: 'Tilt' }), {
      target: { value: '-12' },
    });
    fireEvent.change(screen.getByRole('slider', { name: 'Zoom' }), {
      target: { value: '0.35' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Generate camera image' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(electronApi.generateImages).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'camera',
        count: 1,
        prompt: expect.stringContaining('Camera rotation: 38°'),
        camera: {
          rotationDeg: 38,
          tiltDeg: -12,
          zoom: 0.35,
          generateBestAngles: false,
        },
        referenceImages: [
          expect.objectContaining({
            title: 'RefImage1',
            description: expect.stringContaining('Preserve original aspect ratio, quality, and style'),
            bytesBase64: 'AQIDBA==',
          }),
        ],
      })
    );
    expect(electronApi.generateImages).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining('Aspect ratio: match RefImage1 exactly'),
      })
    );
    const cameraRequest = vi.mocked(electronApi.generateImages).mock.calls[0]?.[0];
    expect(cameraRequest?.prompt).not.toContain('Aspect ratio: 16:9');
    expect(screen.queryByRole('dialog', { name: 'frame-1.png' })).not.toBeInTheDocument();
    expect(screen.getAllByLabelText(/loading$/i)).toHaveLength(1);

    await act(async () => {
      resolveGeneration?.({ jobId: 'job-1', assets: [] });
      await vi.runAllTimersAsync();
    });
  });

  it('moves the camera handle in the orbit graph when dragging and when rotation changes', async () => {
    vi.mocked(electronApi.listGeneratedImages).mockResolvedValue([
      {
        id: 'generated-1',
        fileName: 'frame-1.png',
        fileUrl: 'crenv-asset://generated?path=frame-1.png',
        createdAt: '2026-05-26T10:30:00.000Z',
      },
    ]);

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    await act(async () => {
      fireEvent.doubleClick(screen.getByRole('button', { name: 'Select frame-1.png' }));
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Camera' }));

    expect(screen.getByTestId('camera-position-handle')).toHaveAttribute('data-camera-centered', 'true');
    expect(screen.getByTestId('camera-position-handle').className).not.toContain('-translate-x-1/2');
    expect(screen.getByText('Generate 12-angle sweep').closest('label')).toHaveAttribute(
      'title',
      expect.stringContaining('45/-30')
    );

    const orbitControl = screen.getByRole('application', { name: 'Camera angle control' });
    Object.defineProperty(orbitControl, 'getBoundingClientRect', {
      value: () => ({
        left: 0,
        top: 0,
        width: 224,
        height: 224,
        right: 224,
        bottom: 224,
        x: 0,
        y: 0,
        toJSON: () => null,
      }),
    });

    fireEvent.pointerDown(orbitControl, { pointerId: 1, clientX: 112, clientY: 112 });
    fireEvent.pointerMove(orbitControl, { pointerId: 1, clientX: 212, clientY: 62 });
    fireEvent.pointerUp(orbitControl, { pointerId: 1, clientX: 212, clientY: 62 });

    expect(screen.getByTestId('camera-position-handle')).toHaveAttribute('data-camera-rotation', '315');
    expect(screen.getByTestId('camera-position-handle')).toHaveAttribute('data-camera-tilt', '28');

    fireEvent.change(screen.getByRole('slider', { name: 'Rotation' }), {
      target: { value: '400' },
    });

    expect(screen.getByRole('slider', { name: 'Rotation' })).toHaveAttribute('max', '315');
    expect(screen.getByTestId('camera-position-handle')).toHaveAttribute('data-camera-rotation', '315');
  });

  it('continues the camera orbit past 90 degrees and places the handle behind the image', async () => {
    vi.mocked(electronApi.listGeneratedImages).mockResolvedValue([
      {
        id: 'generated-1',
        fileName: 'frame-1.png',
        fileUrl: 'crenv-asset://generated?path=frame-1.png',
        createdAt: '2026-05-26T10:30:00.000Z',
      },
    ]);

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    await act(async () => {
      fireEvent.doubleClick(screen.getByRole('button', { name: 'Select frame-1.png' }));
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Camera' }));

    fireEvent.change(screen.getByRole('slider', { name: 'Rotation' }), {
      target: { value: '135' },
    });

    expect(screen.getByTestId('camera-position-handle')).toHaveAttribute('data-camera-rotation', '135');
    expect(screen.getByTestId('camera-position-handle')).toHaveAttribute('data-camera-depth', 'behind');
    expect(screen.getByTestId('camera-source-preview')).toHaveAttribute('data-depth-layer', 'front');
  });

  it('lets the pinpoint extra prompt mention list float above the input and select with keyboard', async () => {
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
        description: 'Color guide',
        mimeType: 'image/png',
        bytesBase64: 'BAUG',
        createdAt: '2026-05-26T12:01:00.000Z',
      },
    ]);
    vi.mocked(electronApi.listGeneratedImages).mockResolvedValue([
      {
        id: 'generated-1',
        fileName: 'frame-1.png',
        fileUrl: 'crenv-asset://generated?path=frame-1.png',
        createdAt: '2026-05-26T10:30:00.000Z',
      },
    ]);
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => ({
      arrayBuffer: async () => Uint8Array.from([1, 2, 3, 4]).buffer,
      blob: async () => new Blob([Uint8Array.from([1, 2, 3, 4])], { type: 'image/png' }),
      headers: {
        get: () => 'image/png',
      },
    } as Response));

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    await act(async () => {
      fireEvent.doubleClick(screen.getByRole('button', { name: 'Select frame-1.png' }));
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Pin Point' }));

    const extraPromptInput = screen.getByRole('textbox', { name: 'Extra prompt' }) as HTMLDivElement & {
      value: string;
    };

    await act(async () => {
      extraPromptInput.value = 'Use @';
      await vi.runAllTimersAsync();
    });

    const heroOption = screen.getByRole('option', { name: /Hero face/ });
    const paletteOption = screen.getByRole('option', { name: /Palette board/ });
    expect(heroOption).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('listbox', { name: 'Extra prompt references' })).toHaveStyle({ bottom: '108px' });

    fireEvent.keyDown(extraPromptInput, { key: 'ArrowDown' });

    expect(heroOption).toHaveAttribute('aria-selected', 'false');
    expect(paletteOption).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(extraPromptInput, { key: 'Enter' });

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.getByTestId('selected-reference-mention')).toHaveTextContent('Palette board');
  });

  it('handles generated image copy, download, and delete actions from the grid context menu', async () => {
    vi.mocked(electronApi.listGeneratedImages).mockResolvedValue([
      {
        id: 'generated-1',
        fileName: 'frame-1.png',
        fileUrl: 'crenv-asset://generated?path=frame-1.png',
        createdAt: '2026-05-26T10:30:00.000Z',
      },
    ]);

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Copy frame-1.png' }));
    fireEvent.click(screen.getByRole('button', { name: 'Download frame-1.png' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(vi.mocked(electronApi.copyGeneratedImage)).toHaveBeenCalledWith('generated-1');
    expect(vi.mocked(electronApi.downloadGeneratedImage)).toHaveBeenCalledWith('generated-1');

    fireEvent.click(screen.getByRole('button', { name: 'Delete frame-1.png' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(vi.mocked(electronApi.deleteGeneratedImage)).toHaveBeenCalledWith('generated-1');
  });

  it('shows centered header actions for selected generated images and hides copy for multi-select', async () => {
    vi.mocked(electronApi.listGeneratedImages).mockResolvedValue([
      {
        id: 'generated-1',
        fileName: 'frame-1.png',
        fileUrl: 'crenv-asset://generated?path=frame-1.png',
        createdAt: '2026-05-26T10:30:00.000Z',
      },
      {
        id: 'generated-2',
        fileName: 'frame-2.png',
        fileUrl: 'crenv-asset://generated?path=frame-2.png',
        createdAt: '2026-05-26T10:31:00.000Z',
      },
    ]);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      arrayBuffer: async () => Uint8Array.from([1, 2, 3, 4]).buffer,
      blob: async () => new Blob([Uint8Array.from([1, 2, 3, 4])], { type: 'image/png' }),
      headers: {
        get: () => 'image/png',
      },
    } as Response);

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Select frame-1.png' }));
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.getByRole('button', { name: 'Copy selected images' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download selected images' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete selected images' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Select frame-2.png' }));
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.queryByRole('button', { name: 'Copy selected images' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download selected images' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete selected images' })).toBeInTheDocument();
  });

  it('shows the backend generation error message when generation fails', async () => {
    vi.mocked(electronApi.generateImages).mockRejectedValue(new Error('Codex CLI failed to initialize.'));

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    await act(async () => {
      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: 'Generate a studio portrait' },
      });
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(vi.mocked(errors.getErrorMessage)).toHaveBeenCalledWith(
      expect.any(Error),
      'Failed to generate images'
    );
    expect(toast.error).toHaveBeenCalledWith('Codex CLI failed to initialize.');
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
    await act(async () => {
      fireEvent.change(composerInput, {
        target: { value: 'Use pasted image' },
      });
      await vi.runAllTimersAsync();
    });

    await act(async () => {
      fireEvent.paste(composerInput, {
        clipboardData: {
          files: [pastedImage],
          items: [],
        },
      });
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
    await act(async () => {
      fireEvent.change(composerInput, {
        target: { value: 'Use @hero' },
      });
      await vi.runAllTimersAsync();
    });

    expect(screen.getByRole('option', { name: 'Hero face' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Palette board' })).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('option', { name: 'Hero face' }));
      await vi.runAllTimersAsync();
    });

    expect(composerInput).toHaveValue('Use Hero face ');
    expect(screen.getByTestId('selected-reference-mention')).toHaveTextContent('Hero face');
    expect(screen.getByTestId('selected-reference-mention')).toHaveStyle({ color: 'var(--accent)' });
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
    await act(async () => {
      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: 'Generate with library reference' },
      });
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

  it('lets Enter create a new line without submitting', async () => {
    const generateImagesMock = vi.mocked(electronApi.generateImages).mockResolvedValue({
      jobId: 'job-1',
      assets: [],
    });
    generateImagesMock.mockClear();

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const composerInput = screen.getByRole('textbox');
    fireEvent.focus(composerInput);

    await act(async () => {
      fireEvent.change(composerInput, {
        target: { value: 'First line' },
      });
      await vi.runAllTimersAsync();
    });

    await act(async () => {
      fireEvent.keyDown(composerInput, { key: 'Enter', code: 'Enter' });
      await vi.runAllTimersAsync();
    });

    expect(generateImagesMock).not.toHaveBeenCalled();
    expect(composerInput).toHaveValue('First line\n');
  });

  it('submits with Shift+Enter and clears the composer state', async () => {
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
    fireEvent.focus(composerInput);

    await act(async () => {
      fireEvent.change(composerInput, {
        target: { value: 'Use pasted image' },
      });
      await vi.runAllTimersAsync();
    });

    await act(async () => {
      fireEvent.paste(composerInput, {
        clipboardData: {
          files: [pastedImage],
          items: [],
        },
      });
      await vi.runAllTimersAsync();
    });

    expect(screen.getByRole('button', { name: 'Open pasted.png' })).toBeInTheDocument();

    await act(async () => {
      fireEvent.keyDown(composerInput, { key: 'Enter', code: 'Enter', shiftKey: true });
      await vi.runAllTimersAsync();
    });

    expect(generateImagesMock).toHaveBeenCalledTimes(1);
    expect(composerInput).toHaveValue('');
    expect(composerInput).toHaveAttribute('rows', '1');
    expect(screen.queryByRole('button', { name: 'Open pasted.png' })).not.toBeInTheDocument();
  });

  it('keeps angle guidance off by default', async () => {
    const generateImagesMock = vi.mocked(electronApi.generateImages).mockResolvedValue({
      jobId: 'job-1',
      assets: [],
    });
    generateImagesMock.mockClear();

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const composerInput = screen.getByRole('textbox');
    fireEvent.focus(composerInput);

    await act(async () => {
      fireEvent.change(composerInput, {
        target: { value: 'Generate an interior scene' },
      });
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(generateImagesMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        prompt: expect.not.stringContaining('Angle:'),
      })
    );
  });

  it('includes angle guidance when enabled', async () => {
    const generateImagesMock = vi.mocked(electronApi.generateImages).mockResolvedValue({
      jobId: 'job-1',
      assets: [],
    });
    generateImagesMock.mockClear();

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const composerInput = screen.getByRole('textbox');
    fireEvent.focus(composerInput);
    fireEvent.click(screen.getByRole('switch', { name: 'Use camera angle' }));

    await act(async () => {
      fireEvent.change(composerInput, {
        target: { value: 'Generate another interior scene' },
      });
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(generateImagesMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining('Angle: Low Angle'),
      })
    );
  });
});
