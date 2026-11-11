// Starter categories, shared by the personal workspace and the sample fixture.
// These categories do not imply any completed work or saved records.
export function createStarterAreas(now = new Date()) {
  const timestamp = now.toISOString();
  return [
    ['academics', 'DSA & Academics', 'goals', 'sage', 'Build understanding, one concept at a time.'],
    ['portfolio', 'Portfolio Projects', 'overview', 'blue', 'Turn what you learn into something real.'],
    ['creative', 'Creative Skills', 'leaf', 'purple', 'Make room to explore and experiment.'],
    ['content', 'Content Creation', 'activity', 'sand', 'Share your ideas and your perspective.'],
    ['personal', 'Personal Development', 'check', 'rose', 'Invest in the person you are becoming.'],
  ].map(([id, name, icon, color, description]) => ({ id, name, icon, color, description, createdAt: timestamp, updatedAt: timestamp, archivedAt: null }));
}
