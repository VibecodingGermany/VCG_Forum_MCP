// Resolves and spawns the official, locally-installed @discourse/mcp binary.
// This wrapper never reimplements Discourse/MCP logic — it only orchestrates
// the upstream, pinned dependency.

import { createRequire } from 'node:module';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const require = createRequire(import.meta.url);

/**
 * Resolve the absolute path to the official discourse-mcp binary script,
 * without going through npx (so no re-download / network needed at runtime).
 */
export function resolveDiscourseMcpBin() {
  const pkg = require('@discourse/mcp/package.json');
  const pkgDir = path.dirname(require.resolve('@discourse/mcp/package.json'));
  const binField = pkg.bin;

  let binRel;
  if (typeof binField === 'string') {
    binRel = binField;
  } else if (binField && typeof binField === 'object') {
    // Prefer the well-known bin name, fall back to the first defined bin entry.
    binRel = binField['discourse-mcp'] ?? Object.values(binField)[0];
  }

  if (!binRel) {
    throw new Error(
      'Could not resolve the @discourse/mcp binary entry from its package.json "bin" field.'
    );
  }

  return path.join(pkgDir, binRel);
}

/**
 * Spawn the official discourse-mcp binary with the given args, inheriting stdio
 * so both interactive flows (login paste) and MCP stdio transport (serve) work
 * transparently. Returns the child's exit code (or 1 on spawn failure).
 */
export function runDiscourseMcp(args) {
  const binAbs = resolveDiscourseMcpBin();
  const result = spawnSync(process.execPath, [binAbs, ...args], { stdio: 'inherit' });

  if (result.error) {
    console.error(`Failed to launch @discourse/mcp: ${result.error.message}`);
    return 1;
  }

  return result.status ?? 1;
}
