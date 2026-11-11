// Drives "CatCHMeal dev" on the phone for interface reviews (used by the ui-inspector subagent).
//   node .claude/tools/devapp.mjs goto /food          open a route without tapping
//   node .claude/tools/devapp.mjs eval "<js>"         run JavaScript in the app (e.g. switch theme)
//   node .claude/tools/devapp.mjs shot <file.png>     real screenshot of the phone, fonts included
// Only the debug app exposes its WebView to DevTools, so the real app cannot be driven.
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const PACKAGE = 'io.github.natamun.catchmeal.debug';
const PORT = 9222;
const adb = (...args) => execFileSync('adb', args, { encoding: 'utf8' }).trim();

function forwardDevTools() {
  const pid = adb('shell', 'pidof', PACKAGE);
  if (!pid) throw new Error('CatCHMeal dev is not running: open it on the phone (or run make phone).');
  adb('forward', `tcp:${PORT}`, `localabstract:webview_devtools_remote_${pid}`);
}

async function evaluate(expression) {
  forwardDevTools();
  const targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
  const page = targets.find((t) => t.type === 'page');
  if (!page) throw new Error('No page in the WebView.');
  const socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = () => reject(new Error('DevTools connection refused.'));
  });
  const result = await new Promise((resolve) => {
    socket.onmessage = (event) => resolve(JSON.parse(event.data).result);
    socket.send(
      JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression, awaitPromise: true, returnByValue: true } }),
    );
  });
  socket.close();
  return result?.result?.value;
}

const [command, argument] = process.argv.slice(2);

if (command === 'goto') {
  // react-router listens to popstate, so this changes screen without reloading the app.
  await evaluate(
    `history.pushState(null, '', ${JSON.stringify(argument)}); dispatchEvent(new PopStateEvent('popstate')); location.pathname`,
  );
  await new Promise((resolve) => setTimeout(resolve, 800));
  console.log(`At ${argument}`);
} else if (command === 'eval') {
  console.log(JSON.stringify(await evaluate(argument)));
} else if (command === 'shot') {
  adb('shell', 'input', 'keyevent', 'KEYCODE_WAKEUP');
  writeFileSync(argument, execFileSync('adb', ['exec-out', 'screencap', '-p']));
  console.log(`Saved ${argument}`);
} else {
  console.error('Usage: devapp.mjs goto <path> | eval <js> | shot <file.png>');
  process.exit(1);
}
