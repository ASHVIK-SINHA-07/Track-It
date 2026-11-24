// Starter categories do not imply any completed work or saved records.
export function createStarterAreas(now = new Date()) {
  const timestamp = now.toISOString();
  const areas = [
    { id: 'academics', name: 'DSA & Academics', icon: 'goals', color: 'sage', description: 'Build understanding, one concept at a time.' },
    { id: 'portfolio', name: 'Portfolio Projects', icon: 'overview', color: 'blue', description: 'Turn what you learn into something real.' },
    { id: 'creative', name: 'Creative Skills', icon: 'leaf', color: 'purple', description: 'Make room to explore and experiment.' },
    { id: 'content', name: 'Content Creation', icon: 'activity', color: 'sand', description: 'Share your ideas and your perspective.' },
    { id: 'personal', name: 'Personal Development', icon: 'check', color: 'rose', description: 'Invest in the person you are becoming.' },
  ];

  for (const area of areas) {
    area.createdAt = timestamp;
    area.updatedAt = timestamp;
    area.archivedAt = null;
  }
  return areas;
}

export const AREA_ICONS = ['leaf', 'goals', 'overview', 'activity', 'check'];
export const AREA_COLORS = ['sage', 'blue', 'purple', 'sand', 'rose'];
export const AREA_NAME_LIMIT = 80;

export function validateArea(input) {
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const errors = {};
  if (!name) errors.name = 'Enter a growth area name.';
  else if (name.length > AREA_NAME_LIMIT) errors.name = 'Use ' + AREA_NAME_LIMIT + ' characters or fewer.';
  if (!AREA_ICONS.includes(input.icon)) errors.icon = 'Choose an available icon.';
  if (!AREA_COLORS.includes(input.color)) errors.color = 'Choose an available color.';
  return { errors: errors, value: { name: name, icon: input.icon, color: input.color } };
}
