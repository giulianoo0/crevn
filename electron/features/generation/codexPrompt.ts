export function buildCodexImageGenerationPrompt(input: {
  userPrompt: string;
  outputDirectory: string;
  manifestPath: string;
  imageCount: number;
  referenceImages: Array<{
    path: string;
    title?: string;
    description?: string;
  }>;
}) {
  return [
    'You are running inside a Codex batch job for an Electron app.',
    'Use Codex image generation capabilities to create image files for the following prompt.',
    '',
    `Creative prompt: ${input.userPrompt}`,
    '',
    ...(input.referenceImages.length > 0
      ? [
          'Reference image files:',
          ...input.referenceImages.map((referenceImage) => {
            const metadata = [
              referenceImage.title ? `title: ${referenceImage.title}` : null,
              referenceImage.description ? `description: ${referenceImage.description}` : null,
            ].filter(Boolean);
            return metadata.length > 0
              ? `- ${referenceImage.path} (${metadata.join('; ')})`
              : `- ${referenceImage.path}`;
          }),
          'Use those reference images as visual guidance for composition, subject, color, and mood when relevant.',
          '',
        ]
      : []),
    `Create exactly ${input.imageCount} image file(s).`,
    `The output directory is: ${input.outputDirectory}`,
    `The manifest path is: ${input.manifestPath}`,
    '',
    'The manifest must have this shape:',
    '{',
    '  "images": [',
    '    { "path": "/absolute/path/to/generated-image.png" }',
    '  ]',
    '}',
    '',
    'Rules:',
    '- Generate image assets, not text descriptions.',
    '- Save every final image file inside the output directory.',
    '- If image generation creates files elsewhere first, copy them into the output directory before writing the manifest.',
    '- Use only absolute paths in the manifest.',
    '- Include every generated image in the manifest.',
    '- Write the manifest only after all image files exist on disk.',
    '- Do not rely on prose output as the result contract.',
  ].join('\n');
}
