const fs = require('node:fs');
const path = require('node:path');

// Skills are bundled with the app under electron/skills/<name>/SKILL.md.
// This directory is shipped inside the asar (see electron-builder.yml `files`),
// so resolving relative to __dirname works both in dev and in the packaged app,
// which keeps the catalog persistent across installs and updates.
const SKILLS_ROOT = path.join(__dirname, '..', '..', 'skills');

// Progressive-disclosure size caps. A SKILL.md body can be hundreds of lines;
// dumping it whole floods the model's context and degrades reasoning. We never
// return more than these many bytes in a single loadSkill response.
const MAX_SECTION_BYTES = 12_000;
const MAX_REFERENCE_BYTES = 20_000;
const MAX_OVERVIEW_BYTES = 4_000;

function truncateToBytes(text, maxBytes) {
  const value = String(text ?? '');
  if (Buffer.byteLength(value, 'utf8') <= maxBytes) {
    return value;
  }
  // Trim by characters until under the byte budget, leaving room for the marker.
  const marker = '\n\n[...truncated — request a narrower section or reference...]';
  const budget = Math.max(0, maxBytes - Buffer.byteLength(marker, 'utf8'));
  let sliced = value;
  while (Buffer.byteLength(sliced, 'utf8') > budget && sliced.length > 0) {
    sliced = sliced.slice(0, Math.ceil(sliced.length * 0.95) - 1);
  }
  return `${sliced}${marker}`;
}

function slugifyHeading(heading) {
  return String(heading)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

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

// Split a markdown body into an `overview` (text before the first heading) plus
// an ordered list of sections keyed on `#`/`##` headings. Slugs are made unique
// so the agent can address any section deterministically.
function splitIntoSections(body) {
  const lines = String(body ?? '').split('\n');
  const sections = [];
  const overviewLines = [];
  let current = null;
  const usedSlugs = new Map();

  const pushCurrent = () => {
    if (current) {
      current.content = current.content.replace(/\n+$/, '');
      sections.push(current);
    }
  };

  for (const line of lines) {
    const headingMatch = /^(#{1,2})\s+(.*)$/.exec(line);
    if (headingMatch) {
      pushCurrent();
      const heading = headingMatch[2].trim();
      let slug = slugifyHeading(heading) || 'section';
      const seen = usedSlugs.get(slug) ?? 0;
      usedSlugs.set(slug, seen + 1);
      if (seen > 0) {
        slug = `${slug}-${seen + 1}`;
      }
      current = { heading, slug, content: `${line}\n` };
    } else if (current) {
      current.content += `${line}\n`;
    } else {
      overviewLines.push(line);
    }
  }
  pushCurrent();

  return { overview: overviewLines.join('\n').trim(), sections };
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

// A read-only, path-isolated view of a single skill directory. Every read is
// confined to `skillDir` and byte-capped — the model can request markdown and
// reference docs but cannot escape the skill folder or pull arbitrary files.
function createSkillSandbox(name) {
  const requestedDir = path.join(SKILLS_ROOT, String(name || ''));
  const skillDir = path.resolve(requestedDir);
  const rootPrefix = path.resolve(SKILLS_ROOT) + path.sep;
  const withinRoot = skillDir.startsWith(rootPrefix);

  return {
    name,
    skillDir,
    withinRoot,
    exists() {
      return withinRoot && fs.existsSync(path.join(skillDir, 'SKILL.md'));
    },
    readReference(reference) {
      if (!withinRoot) {
        return null;
      }
      const safeRef = path.basename(String(reference));
      const refPath = path.resolve(path.join(skillDir, 'references', safeRef));
      if (!refPath.startsWith(path.resolve(path.join(skillDir, 'references')) + path.sep)) {
        return null;
      }
      if (!safeRef.endsWith('.md') || !fs.existsSync(refPath)) {
        return null;
      }
      return { name: safeRef, content: fs.readFileSync(refPath, 'utf8') };
    },
  };
}

function buildSectionIndex(sections) {
  return sections.map((section) => `- ${section.slug}: ${section.heading}`).join('\n');
}

// Three-tier progressive disclosure:
//   loadBundledSkill(name)                      -> overview + section index + reference list
//   loadBundledSkill(name, { section })         -> a single section (capped)
//   loadBundledSkill(name, { reference })       -> a single reference doc (capped)
// A bare string second argument is accepted for backward compatibility and
// treated as { reference }.
function loadBundledSkill(name, options) {
  const opts =
    typeof options === 'string' ? { reference: options } : options && typeof options === 'object' ? options : {};

  const sandbox = createSkillSandbox(name);
  if (!sandbox.exists()) {
    return { found: false, name, content: '', title: name };
  }

  const skill = readSkillFile(sandbox.skillDir);
  if (!skill) {
    return { found: false, name, content: '', title: name };
  }

  if (opts.reference) {
    const ref = sandbox.readReference(opts.reference);
    if (!ref) {
      return { found: false, name: skill.name, reference: path.basename(String(opts.reference)), content: '', title: skill.name };
    }
    return {
      found: true,
      name: skill.name,
      reference: ref.name,
      title: skill.name,
      content: truncateToBytes(ref.content, MAX_REFERENCE_BYTES),
    };
  }

  const { overview, sections } = splitIntoSections(skill.body);

  if (opts.section) {
    const slug = slugifyHeading(opts.section);
    const match = sections.find((section) => section.slug === slug || section.slug === String(opts.section));
    if (!match) {
      return { found: false, name: skill.name, section: String(opts.section), content: '', title: skill.name };
    }
    return {
      found: true,
      name: skill.name,
      section: match.slug,
      title: match.heading,
      content: truncateToBytes(match.content, MAX_SECTION_BYTES),
    };
  }

  // Activation tier: small, navigable map of the skill.
  const referenceHint = skill.references.length
    ? `\n\nReference files (request with loadSkill({ name: "${skill.name}", reference })): ${skill.references.join(', ')}`
    : '';
  const sectionIndex = sections.length
    ? `\n\nSections (request one at a time with loadSkill({ name: "${skill.name}", section })):\n${buildSectionIndex(sections)}`
    : '';
  const content = `${truncateToBytes(overview, MAX_OVERVIEW_BYTES)}${sectionIndex}${referenceHint}`;

  return {
    found: true,
    name: skill.name,
    title: skill.name,
    overview: truncateToBytes(overview, MAX_OVERVIEW_BYTES),
    sections: sections.map((section) => section.slug),
    references: skill.references,
    content,
  };
}

// Discovery tier as a tool result: the full list of bundled skills with the
// "when to use" guidance (the frontmatter description). Metadata only — never
// the body — so the model can pick a skill before paying to load it.
function findSkills() {
  return {
    skills: listBundledSkills().map((skill) => ({
      name: skill.name,
      description: skill.description,
    })),
  };
}

function buildSkillCatalogPrompt() {
  const skills = listBundledSkills();
  if (skills.length === 0) {
    return '';
  }
  const lines = skills.map((skill) => `- ${skill.name}: ${skill.description}`);
  return [
    'Available skills (call findSkills any time to relist them, or loadSkill with a skill name to read its instructions before acting):',
    ...lines,
    'When a skill matches the request, load it first to get its overview and section index, then request individual sections or reference files on demand before following the methodology. Do not invent skills that are not listed.',
  ].join('\n');
}

module.exports = {
  SKILLS_ROOT,
  MAX_SECTION_BYTES,
  MAX_REFERENCE_BYTES,
  MAX_OVERVIEW_BYTES,
  createSkillSandbox,
  splitIntoSections,
  listBundledSkills,
  loadBundledSkill,
  findSkills,
  buildSkillCatalogPrompt,
};
