export function buildCodexImageGenerationPrompt(input: {
  userPrompt: string;
  outputDirectory: string;
  manifestPath: string;
  imageCount: number;
}) {
  return [
    'Generate image files for the following prompt.',
    '',
    `Creative prompt: ${input.userPrompt}`,
    '',
    `Create exactly ${input.imageCount} image file(s).`,
    `Save every generated image inside this output directory: ${input.outputDirectory}`,
    `Write a JSON manifest to this exact path: ${input.manifestPath}`,
    '',
    'The manifest must have this shape:',
    '{',
    '  "images": [',
    '    { "path": "/absolute/path/to/generated-image.png" }',
    '  ]',
    '}',
    '',
    'Rules:',
    '- Use only absolute paths in the manifest.',
    '- Include every generated image in the manifest.',
    '- Do not rely on prose output as the result contract.',
  ].join('\n');
}
