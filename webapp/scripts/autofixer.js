import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function findMcpHandlers() {
  const npxDir = '/root/.npm/_npx';
  if (fs.existsSync(npxDir)) {
    const entries = fs.readdirSync(npxDir);
    for (const entry of entries) {
      const candidateDir = path.join(npxDir, entry, 'node_modules/@sveltejs/mcp/dist');
      if (fs.existsSync(candidateDir)) {
        const files = fs.readdirSync(candidateDir);
        const handlerFile = files.find((f) => f.startsWith('handlers') && f.endsWith('.mjs'));
        if (handlerFile) {
          return path.join(candidateDir, handlerFile);
        }
      }
    }
  }
  return null;
}

function getSvelteFiles(dir) {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(getSvelteFiles(full));
    } else if (entry.name.endsWith('.svelte')) {
      results.push(full);
    }
  }
  return results;
}

async function main() {
  const handlersPath = findMcpHandlers();
  if (!handlersPath) {
    console.error('Could not locate @sveltejs/mcp handlers. Please ensure @sveltejs/mcp is installed.');
    process.exit(1);
  }

  const { r: svelte_autofixer_handler } = await import(handlersPath);
  const srcDir = path.join(rootDir, 'src');
  const files = getSvelteFiles(srcDir);

  console.log(`Running svelte-autofixer on ${files.length} Svelte files (Svelte 5 mode)...\n`);
  let totalIssues = 0;
  let totalSuggestions = 0;

  for (const file of files) {
    const relative = path.relative(rootDir, file);
    const code = fs.readFileSync(file, 'utf8');
    const result = await svelte_autofixer_handler({
      code,
      desired_svelte_version: 5,
      filename: file
    });

    const issues = result.issues || [];
    const suggestions = result.suggestions || [];
    totalIssues += issues.length;
    totalSuggestions += suggestions.length;

    if (issues.length === 0 && suggestions.length === 0) {
      console.log(`✓ ${relative}: Clean (0 issues, 0 suggestions)`);
    } else {
      console.log(`⚠ ${relative}:`);
      if (issues.length > 0) {
        console.log('  Issues:', JSON.stringify(issues, null, 2));
      }
      if (suggestions.length > 0) {
        console.log('  Suggestions:', JSON.stringify(suggestions, null, 2));
      }
    }
  }

  console.log(`\nScan complete: ${totalIssues} issue(s), ${totalSuggestions} suggestion(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
