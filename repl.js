/* Chaltteok REPL for Node.js */
import readlineSync from "readline-sync";

import { runInteractive } from "./dist/chaltteok.modern.js";

console.log("[Chaltteok Interpreter shell. Quit with Ctrl-C.]");
const runner = runInteractive();
let { value: prompt } = runner.next();
while (true) {
  const input = readlineSync.question(prompt);
  const output = runner.next(input + "\n");
  prompt = output.value;
  if (output.done) break;
}
