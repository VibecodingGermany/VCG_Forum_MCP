// Baked configuration for the VCG forum wrapper.
// No secrets live here — only the public forum URL and profile *paths*.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/** The VCG forum this wrapper is pre-configured for. */
export const SITE = 'https://forum.vibecoding-germany.de';

/** Directory holding the wrapper's local config/profile (never committed). */
export function getConfigDir() {
  const xdgConfigHome = process.env.XDG_CONFIG_HOME;
  const base = xdgConfigHome && xdgConfigHome.trim() !== '' ? xdgConfigHome : path.join(os.homedir(), '.config');
  return path.join(base, 'vcg-forum-mcp');
}

/** Full path to the local User API Key profile written by @discourse/mcp. */
export function getProfilePath() {
  return path.join(getConfigDir(), 'profile.json');
}

/**
 * Ensure the config directory exists with restrictive permissions (0700).
 * Safe to call repeatedly.
 */
export function ensureConfigDir() {
  const dir = getConfigDir();
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  // mkdirSync's mode is not always honored on existing dirs / due to umask — enforce it.
  try {
    fs.chmodSync(dir, 0o700);
  } catch {
    // best-effort; non-fatal if the filesystem doesn't support chmod (e.g. some Windows setups)
  }
  return dir;
}

/**
 * Lock down the profile file to 0600 if it exists. Never reads or logs its contents.
 */
export function lockDownProfileIfPresent() {
  const profilePath = getProfilePath();
  if (fs.existsSync(profilePath)) {
    try {
      fs.chmodSync(profilePath, 0o600);
    } catch {
      // best-effort; non-fatal
    }
    return true;
  }
  return false;
}

export function profileExists() {
  return fs.existsSync(getProfilePath());
}
