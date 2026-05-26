import { useEffect, useMemo, useState } from 'react';
import { LoaderCircle, Sparkles } from 'lucide-react';

import { GeneratedImageGrid } from '@/components/generated-image-grid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { generateImages, listGeneratedImages, type GeneratedImageRecord } from '@/lib/electron-api';

export function App() {
  const [prompt, setPrompt] = useState('');
  const [images, setImages] = useState<GeneratedImageRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadImages() {
      try {
        const records = await listGeneratedImages();
        if (!cancelled) {
          setImages(records);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load images.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadImages();

    return () => {
      cancelled = true;
    };
  }, []);

  const canGenerate = prompt.trim().length > 0 && !isGenerating;
  const helperText = useMemo(() => {
    if (isGenerating) {
      return 'Codex is generating images into the local crenv library.';
    }
    if (error) {
      return error;
    }
    return 'One-shot Codex image jobs, imported into persistent local storage.';
  }, [error, isGenerating]);

  async function handleGenerate() {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) return;

    setIsGenerating(true);
    setError(null);

    try {
      const result = await generateImages({
        prompt: trimmedPrompt,
        count: 4,
      });
      setImages((current) => [...result.assets, ...current]);
      setPrompt('');
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : 'Generation failed.');
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto flex min-h-screen max-w-[1440px] flex-col gap-6 px-6 py-6">
        <header className="flex items-center justify-between rounded-[28px] border border-[var(--border-soft)] bg-[rgba(15,16,16,0.92)] px-5 py-4">
          <div>
            <div className="text-sm font-medium text-[var(--muted-foreground)]">crenv</div>
            <h1 className="mt-1 text-lg font-semibold">Codex Image Jobs</h1>
          </div>
          <div className="rounded-full border border-[var(--border-soft)] bg-[var(--surface2)] px-3 py-1 text-xs text-[var(--muted-foreground)]">
            {images.length} imported
          </div>
        </header>

        <section className="grid flex-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-[28px] border border-[var(--border-soft)] bg-[rgba(15,16,16,0.86)] p-4">
            {isLoading ? (
              <div className="flex min-h-[320px] items-center justify-center text-sm text-[var(--muted-foreground)]">
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                Loading local library
              </div>
            ) : (
              <GeneratedImageGrid images={images} />
            )}
          </div>

          <aside className="flex flex-col gap-4 rounded-[28px] border border-[var(--border-soft)] bg-[rgba(15,16,16,0.92)] p-5">
            <div>
              <div className="text-sm font-medium">Prompt</div>
              <div className="mt-1 text-sm text-[var(--muted-foreground)]">{helperText}</div>
            </div>

            <Input
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Describe the images Codex should generate"
              className="h-12 rounded-[18px] border-[var(--border-soft)] bg-[var(--surface)] px-4 text-sm"
            />

            <Button
              type="button"
              onClick={() => void handleGenerate()}
              disabled={!canGenerate}
              className="h-12 rounded-full bg-[var(--accent)] text-white hover:bg-[var(--accent)]/90"
            >
              {isGenerating ? (
                <>
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  Generating
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate 4 images
                </>
              )}
            </Button>
          </aside>
        </section>
      </div>
    </main>
  );
}
