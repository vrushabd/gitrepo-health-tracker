export async function parsePrDiff(prUrl: string) {
  const diffUrl = prUrl.endsWith('.diff') ? prUrl : `${prUrl}.diff`;
  const response = await fetch(diffUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch PR diff: ${response.statusText}`);
  }
  const diffText = await response.text();

  const filesModified = new Set<string>();
  let linesAdded = 0;
  let linesRemoved = 0;
  const newDependencies: string[] = [];

  const lines = diffText.split('\n');
  let currentFile = '';

  for (const line of lines) {
    if (line.startsWith('+++ b/')) {
      currentFile = line.slice(6);
      filesModified.add(currentFile);
    } else if (line.startsWith('+') && !line.startsWith('+++')) {
      linesAdded++;
      // Check for new dependencies in package.json
      if (currentFile.endsWith('package.json')) {
        const match = line.match(/"([^"]+)":\s*"[^"]+"/);
        if (match && !match[1].startsWith('//')) {
          newDependencies.push(match[1]);
        }
      }
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      linesRemoved++;
    }
  }

  return {
    filesModified: Array.from(filesModified),
    linesAdded,
    linesRemoved,
    newDependencies,
  };
}
