#!/usr/bin/env node
import { createRequire } from 'node:module';

import { login } from './commands/login.js';
import { serve } from './commands/serve.js';
import { printConfig } from './commands/config.js';
import { printHelp } from './commands/help.js';

const require = createRequire(import.meta.url);

function printVersion() {
  const pkg = require('../package.json');
  console.log(pkg.version);
  return 0;
}

function main(argv) {
  const [command, ...rest] = argv;

  if (command === '--version') {
    return printVersion();
  }

  if (command === '--help' || command === '-h' || command === 'help') {
    return printHelp();
  }

  if (command === 'login' || command === 'auth') {
    return login();
  }

  if (command === 'config' || command === 'print-config') {
    return printConfig();
  }

  if (command === 'serve' || command === undefined) {
    return runServe(command === 'serve' ? rest : argv);
  }

  console.error(`Unknown command: ${command}`);
  console.error('Run "vcg-forum-mcp help" for usage.');
  return 1;
}

function runServe(args) {
  const write = args.includes('--write');
  const filtered = args.filter((arg) => arg !== '--write');

  // Support an explicit "--" separator for passthrough args; if present, only
  // forward what follows it, otherwise forward all remaining (non-flag) args.
  const dashIndex = filtered.indexOf('--');
  const extraArgs = dashIndex >= 0 ? filtered.slice(dashIndex + 1) : filtered;

  return serve(extraArgs, { write });
}

const exitCode = main(process.argv.slice(2));
process.exit(exitCode);
