const fs = require('node:fs');
const path = require('node:path');

// Skills are bundled with the app under electron/skills/<name>/SKILL.md.
// This directory is shipped inside the asar (see electron-builder.yml `files`),
// so resolving relative to __dirname works both in dev and in the packaged app,
// which keeps the catalog persistent across installs and updates.
const SKILLS_ROOT = path.join(__dirname, '..', '..', 'skills');

function parseFrontmatter(markdown) {
  const match = /^---\n([\s\S]*?)\n---\n?/.exec(markdown);
  if (!match) {
    return { data: {}, body: markdown };
  }
  const data = {};
  for (const line of match[1].split('\n')) {
    const colon = line.indexOf(':');
    if (colon === -1) {
      continue;
    }
    const key = line.slice(0, colon).trim();
    const value = line.slice(colon + 1).trim();
    if (key) {
      data[key] = value;
    }
  }
  return { data, body: markdown.slice(match[0].length) };
}

function readSkillFile(skillDir) {
  const skillMdPath = path.join(skillDir, 'SKILL.md');
  if (!fs.existsSync(skillMdPath)) {
    return null;
  }
  const markdown = fs.readFileSync(skillMdPath, 'utf8');
  const { data, body } = parseFrontmatter(markdown);
  const referencesDir = path.join(skillDir, 'references');
  let references = [];
  if (fs.existsSync(referencesDir)) {
    references = fs
      .readdirSync(referencesDir)
      .filter((file) => file.endsWith('.md'))
      .sort();
  }
  return {
    name: data.name || path.basename(skillDir),
    description: data.description || '',
    body,
    references,
    skillDir,
  };
}

function listBundledSkills() {
  if (!fs.existsSync(SKILLS_ROOT)) {
    return [];
  }
  return fs
    .readdirSync(SKILLS_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => readSkillFile(path.join(SKILLS_ROOT, entry.name)))
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));
}

function loadBundledSkill(name, reference) {
  const skillDir = path.join(SKILLS_ROOT, String(name || ''));
  // Guard against path traversal: the resolved dir must stay inside SKILLS_ROOT.
  if (!path.resolve(skillDir).startsWith(path.resolve(SKILLS_ROOT) + path.sep)) {
    return { found: false, name, content: '', title: name };
  }
  const skill = readSkillFile(skillDir);
  if (!skill) {
    return { found: false, name, content: '', title: name };
  }

  if (reference) {
    const safeRef = path.basename(String(reference));
    const refPath = path.join(skillDir, 'references', safeRef);
    if (skill.references.includes(safeRef) && fs.existsSync(refPath)) {
      return {
        found: true,
        name: skill.name,
        reference: safeRef,
        title: skill.name,
        content: fs.readFileSync(refPath, 'utf8'),
      };
    }
    return { found: false, name: skill.name, reference: safeRef, content: '', title: skill.name };
  }

  const referenceHint = skill.references.length
    ? `\n\nReference files available via loadSkill({ name: "${skill.name}", reference }): ${skill.references.join(', ')}`
    : '';
  return {
    found: true,
    name: skill.name,
    title: skill.name,
    content: skill.body.trim() + referenceHint,
  };
}

function buildSkillCatalogPrompt() {
  const skills = listBundledSkills();
  if (skills.length === 0) {
    return '';
  }
  const lines = skills.map((skill) => `- ${skill.name}: ${skill.description}`);
  return [
    'Available skills (call the loadSkill tool with the skill name to read its full instructions before acting):',
    ...lines,
    'When a skill matches the request, load it first, then follow its methodology. Do not invent skills that are not listed.',
  ].join('\n');
}

module.exports = {
  SKILLS_ROOT,
  listBundledSkills,
  loadBundledSkill,
  buildSkillCatalogPrompt,
};
