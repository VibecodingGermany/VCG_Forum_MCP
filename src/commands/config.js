import { SITE, getProfilePath } from '../config.js';

const REPO = 'github:VibecodingGermany/VCG_Forum_MCP';

export function printConfig() {
  const profilePath = getProfilePath();

  console.log('VCG Forum MCP — client configuration');
  console.log('');
  console.log(`Site:    ${SITE}`);
  console.log(`Profile: ${profilePath}`);
  console.log('');
  console.log('The forum URL and your profile are baked in — no need to pass them.');
  console.log('');

  console.log('== Add to Claude Code (claude mcp add) ==');
  console.log('');
  console.log('# A) No install needed — runs from the private repo (requires gh/git access):');
  console.log('#    Read-only (default, safe):');
  console.log(`claude mcp add vcg-forum -- npx -y ${REPO} serve`);
  console.log('#    Write-enabled (opt-in; needs forum admin scope "write"):');
  console.log(`claude mcp add vcg-forum -- npx -y ${REPO} serve --write`);
  console.log('');
  console.log('# B) If the vcg-forum-mcp bin is on your PATH (npm link / global install):');
  console.log('claude mcp add vcg-forum -- vcg-forum-mcp serve            # read-only');
  console.log('claude mcp add vcg-forum -- vcg-forum-mcp serve --write    # write (opt-in)');
  console.log('');

  console.log('== .mcp.json snippet (read-only, default) ==');
  console.log('');
  console.log(
    JSON.stringify(
      { mcpServers: { 'vcg-forum': { command: 'npx', args: ['-y', REPO, 'serve'] } } },
      null,
      2
    )
  );
  console.log('');
  console.log('== .mcp.json snippet (write-enabled, opt-in) ==');
  console.log('');
  console.log(
    JSON.stringify(
      { mcpServers: { 'vcg-forum': { command: 'npx', args: ['-y', REPO, 'serve', '--write'] } } },
      null,
      2
    )
  );
  console.log('');

  console.log(
    'Note: write access also requires the forum admin setting ' +
      '"allow_user_api_key_scopes" to include "write". Once this package is published to ' +
      'npm you can replace the repo spec with "@vibecoding/forum-mcp".'
  );

  return 0;
}
