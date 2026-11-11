// PostToolUse hook: formats the file Claude just edited with Prettier.
// Claude Code sends the tool call as JSON on stdin. jq is not installed, so Node reads it.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const input = JSON.parse(readFileSync(0, 'utf8'));
const file = input.tool_input?.file_path ?? '';

// Same scope as `npm run format`: src/**/*.{ts,tsx,css} and the root config files.
if (!/\/src\/.*\.(ts|tsx|css)$|^[^/]*\/[^/]+\.(ts|js)$/.test(file.replace(process.env.CLAUDE_PROJECT_DIR ?? '', '.'))) {
  process.exit(0);
}

try {
  const prettier = `${process.env.CLAUDE_PROJECT_DIR}/node_modules/.bin/prettier`;
  execFileSync(prettier, ['--write', '--log-level', 'warn', file], { stdio: ['ignore', 'ignore', 'pipe'] });
} catch (error) {
  // Exit code 2 sends stderr back to Claude, who then fixes the syntax error.
  process.stderr.write(String(error.stderr ?? error));
  process.exit(2);
}
