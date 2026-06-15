import { describe, expect, it } from 'vitest';

const {
  listBundledSkills,
  loadBundledSkill,
  findSkills,
  buildSkillCatalogPrompt,
  MAX_SECTION_BYTES,
} = require('./skills.cjs');

describe('Bundled skills registry', () => {
  it('discovers the bundled seedance-cartoon skill with its frontmatter', () => {
    const skills = listBundledSkills();
    const seedance = skills.find((skill: { name: string }) => skill.name === 'seedance-cartoon');

    expect(seedance).toBeTruthy();
    expect(seedance.description).toContain('usada para planejar e gerar cenas e frames para o Seedance');
    expect(seedance.references).toContain('camera-and-staging.md');
    expect(skills.some((skill: { name: string }) => skill.name === 'direcao-de-cena')).toBe(false);
  });

  it('lists every skill with its description through findSkills', () => {
    const result = findSkills();

    expect(Array.isArray(result.skills)).toBe(true);
    const seedance = result.skills.find((skill: { name: string }) => skill.name === 'seedance-cartoon');
    expect(seedance).toBeTruthy();
    expect(seedance.description).toContain('Seedance');
    // findSkills advertises only metadata (name + when-to-use), never the body.
    expect(seedance.content).toBeUndefined();
    expect(result.skills.some((skill: { name: string }) => skill.name === 'direcao-de-cena')).toBe(false);
  });

  it('renders the skill catalog prompt with the loadSkill instruction', () => {
    const prompt = buildSkillCatalogPrompt();

    expect(prompt).toContain('loadSkill');
    expect(prompt).toContain('seedance-cartoon');
    expect(prompt).not.toContain('direcao-de-cena');
  });
});

describe('Skill progressive disclosure', () => {
  it('activation returns an overview + section index, not the whole body', () => {
    const result = loadBundledSkill('seedance-cartoon');

    expect(result.found).toBe(true);
    expect(result.name).toBe('seedance-cartoon');
    // Title / overview present
    expect(result.content).toContain('Seedance Cartoon');
    // Section index is exposed so the agent can drill in
    expect(Array.isArray(result.sections)).toBe(true);
    expect(result.sections.length).toBeGreaterThan(5);
    // Reference files are advertised
    expect(result.references).toContain('camera-and-staging.md');
    expect(result.content).toContain('camera-and-staging.md');
    // The body is NOT dumped wholesale: activation stays small.
    expect(result.content.length).toBeLessThan(8000);
  });

  it('fetches a single section by slug, capped in size', () => {
    const activation = loadBundledSkill('seedance-cartoon');
    const slug = activation.sections[1];

    const section = loadBundledSkill('seedance-cartoon', { section: slug });

    expect(section.found).toBe(true);
    expect(section.section).toBe(slug);
    expect(section.content.length).toBeGreaterThan(0);
    expect(Buffer.byteLength(section.content, 'utf8')).toBeLessThanOrEqual(MAX_SECTION_BYTES + 64);
  });

  it('reports a missing section as not found', () => {
    const result = loadBundledSkill('seedance-cartoon', { section: 'no-such-section' });
    expect(result.found).toBe(false);
  });

  it('loads a specific reference document when requested', () => {
    const result = loadBundledSkill('seedance-cartoon', { reference: 'camera-and-staging.md' });

    expect(result.found).toBe(true);
    expect(result.reference).toBe('camera-and-staging.md');
    expect(result.content.length).toBeGreaterThan(0);
  });

  it('still accepts the legacy positional reference argument', () => {
    const result = loadBundledSkill('seedance-cartoon', 'camera-and-staging.md');

    expect(result.found).toBe(true);
    expect(result.reference).toBe('camera-and-staging.md');
  });

  it('rejects unknown skills and path traversal attempts', () => {
    expect(loadBundledSkill('does-not-exist').found).toBe(false);
    expect(loadBundledSkill('../../package').found).toBe(false);
    expect(loadBundledSkill('direcao-de-cena').found).toBe(false);
    expect(loadBundledSkill('seedance-cartoon', { reference: '../../../etc/passwd' }).found).toBe(false);
  });
});
