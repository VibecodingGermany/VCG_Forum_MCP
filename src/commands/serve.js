import { SITE, getProfilePath, profileExists } from '../config.js';
import { runDiscourseMcp } from '../discourse.js';

export function serve(extraArgs = [], { write = false } = {}) {
  if (!profileExists()) {
    console.error('No local profile found — you need to log in first.');
    console.error('');
    console.error('Run:');
    console.error('  vcg-forum-mcp login');
    console.error('');
    console.error('Then re-run this command.');
    return 1;
  }

  const profilePath = getProfilePath();
  const writeRequested = write || process.env.VCG_FORUM_MCP_ALLOW_WRITES === '1';

  // Passthrough args go first; the wrapper's write posture is applied LAST so it is
  // authoritative and safe-by-default — a stray passthrough flag cannot silently flip
  // writes on (last flag wins in @discourse/mcp's arg parser).
  const args = ['--site', SITE, '--profile', profilePath, ...extraArgs];
  if (writeRequested) {
    args.push('--read_only=false', '--allow_writes=true');
  } else {
    args.push('--read_only=true', '--allow_writes=false');
  }

  return runDiscourseMcp(args);
}
