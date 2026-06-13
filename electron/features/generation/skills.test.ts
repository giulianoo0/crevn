import { describe, expect, it } from 'vitest';

const {
  listBundledSkills,
  loadBundledSkill,
  buildSkillCatalogPrompt,
} = require('./skills.cjs');

describe('Bundled skills registry', () => {
  it('discovers the bundled direcao-de-cena skill with its frontmatter', () => {
    const skills = listBundledSkills();
    const direcao = skills.find((skill: { name: string }) => skill.name === 'direcao-de-cena');

    expect(direcao).toBeTruthy();
    expect(direcao.description.length).toBeGreaterThan(0);
    expect(direcao.references).toContain('linguagem-de-camera.md');
  });

  it('loads the skill body and exposes its reference files', () => {
    const result = loadBundledSkill('direcao-de-cena');

    expect(result.found).toBe(true);
    expect(result.name).toBe('direcao-de-cena');
    expect(result.content).toContain('Direção de Cena');
    expect(result.content).toContain('linguagem-de-camera.md');
  });

  it('loads a specific reference document when requested', () => {
    const result = loadBundledSkill('direcao-de-cena', 'linguagem-de-camera.md');

    expect(result.found).toBe(true);
    expect(result.reference).toBe('linguagem-de-camera.md');
    expect(result.content.length).toBeGreaterThan(0);
  });

  it('rejects unknown skills and path traversal attempts', () => {
    expect(loadBundledSkill('does-not-exist').found).toBe(false);
    expect(loadBundledSkill('../../package').found).toBe(false);
  });

  it('renders the skill catalog prompt with the loadSkill instruction', () => {
    const prompt = buildSkillCatalogPrompt();

    expect(prompt).toContain('loadSkill');
    expect(prompt).toContain('direcao-de-cena');
  });
});
