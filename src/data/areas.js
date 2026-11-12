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
