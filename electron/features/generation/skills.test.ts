import { describe, expect, it } from 'vitest';

const {
  listBundledSkills,
  loadBundledSkill,
  findSkills,
  buildSkillCatalogPrompt,
  MAX_SECTION_BYTES,
} = require('./skills.cjs');

describe('Bundled skills registry', () => {
  it('discovers the bundled direcao-de-cena skill with its frontmatter', () => {
    const skills = listBundledSkills();
    const direcao = skills.find((skill: { name: string }) => skill.name === 'direcao-de-cena');

    expect(direcao).toBeTruthy();
    expect(direcao.description.length).toBeGreaterThan(0);
    expect(direcao.references).toContain('linguagem-de-camera.md');
  });

  it('lists every skill with its description through findSkills', () => {
    const result = findSkills();

    expect(Array.isArray(result.skills)).toBe(true);
    const direcao = result.skills.find((skill: { name: string }) => skill.name === 'direcao-de-cena');
    expect(direcao).toBeTruthy();
    expect(direcao.description.length).toBeGreaterThan(0);
    // findSkills advertises only metadata (name + when-to-use), never the body.
    expect(direcao.content).toBeUndefined();
  });

  it('renders the skill catalog prompt with the loadSkill instruction', () => {
    const prompt = buildSkillCatalogPrompt();

    expect(prompt).toContain('loadSkill');
    expect(prompt).toContain('direcao-de-cena');
  });
});

describe('Skill progressive disclosure', () => {
  it('activation returns an overview + section index, not the whole body', () => {
    const result = loadBundledSkill('direcao-de-cena');

    expect(result.found).toBe(true);
    expect(result.name).toBe('direcao-de-cena');
    // Title / overview present
    expect(result.content).toContain('Direção de Cena');
    // Section index is exposed so the agent can drill in
    expect(Array.isArray(result.sections)).toBe(true);
    expect(result.sections.length).toBeGreaterThan(5);
    // Reference files are advertised
    expect(result.references).toContain('linguagem-de-camera.md');
    expect(result.content).toContain('linguagem-de-camera.md');
    // The 819-line body is NOT dumped wholesale: activation stays small.
    expect(result.content.length).toBeLessThan(8000);
  });

  it('fetches a single section by slug, capped in size', () => {
    const activation = loadBundledSkill('direcao-de-cena');
    const slug = activation.sections[1];

    const section = loadBundledSkill('direcao-de-cena', { section: slug });

    expect(section.found).toBe(true);
    expect(section.section).toBe(slug);
    expect(section.content.length).toBeGreaterThan(0);
    expect(Buffer.byteLength(section.content, 'utf8')).toBeLessThanOrEqual(MAX_SECTION_BYTES + 64);
  });

  it('reports a missing section as not found', () => {
    const result = loadBundledSkill('direcao-de-cena', { section: 'no-such-section' });
    expect(result.found).toBe(false);
  });

  it('loads a specific reference document when requested', () => {
    const result = loadBundledSkill('direcao-de-cena', { reference: 'linguagem-de-camera.md' });

    expect(result.found).toBe(true);
    expect(result.reference).toBe('linguagem-de-camera.md');
    expect(result.content.length).toBeGreaterThan(0);
  });

  it('still accepts the legacy positional reference argument', () => {
    const result = loadBundledSkill('direcao-de-cena', 'linguagem-de-camera.md');

    expect(result.found).toBe(true);
    expect(result.reference).toBe('linguagem-de-camera.md');
  });

  it('rejects unknown skills and path traversal attempts', () => {
    expect(loadBundledSkill('does-not-exist').found).toBe(false);
    expect(loadBundledSkill('../../package').found).toBe(false);
    expect(loadBundledSkill('direcao-de-cena', { reference: '../../../etc/passwd' }).found).toBe(false);
  });
});
