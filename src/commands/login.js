import { SITE, ensureConfigDir, getProfilePath, lockDownProfileIfPresent } from '../config.js';
import { runDiscourseMcp } from '../discourse.js';

export function login() {
  console.log('VCG Forum MCP — login');
  console.log('');
  console.log('1. Log into the forum in your browser FIRST: https://forum.vibecoding-germany.de');
  console.log('   (the forum uses Clerk SSO — make sure you are signed in before continuing).');
  console.log('2. This will open a URL to generate a personal User API Key.');
  console.log('   Open that URL, approve the request, and paste the resulting payload back here.');
  console.log('');

  ensureConfigDir();
  const profilePath = getProfilePath();

  const exitCode = runDiscourseMcp([
    'generate-user-api-key',
    '--site',
    SITE,
    '--application-name',
    'VCG Forum MCP',
    '--save-to',
    profilePath,
  ]);

  if (exitCode !== 0) {
    console.error('');
    console.error('Login did not complete successfully.');
    return exitCode;
  }

  lockDownProfileIfPresent();

  console.log('');
  console.log('Login complete. Your profile was saved to:');
  console.log(`  ${profilePath}`);
  console.log('');
  console.log(
    'Note: write access additionally requires the forum admin setting ' +
      '"allow_user_api_key_scopes" to include "write" (a one-time admin change).'
  );
  console.log('You can now run: vcg-forum-mcp serve');

  return 0;
}
