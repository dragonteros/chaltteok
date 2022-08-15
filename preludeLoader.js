import { readdirSync, readFileSync, statSync, writeFileSync } from "fs";
import { resolve } from "path";

const dir = "./src/prelude/";
const data = readdirSync(dir)
  .filter((filename) => filename.endsWith(".chaltteok"))
  .map((filename) => {
    const filepath = resolve(dir, filename);
    const isFile = statSync(filepath).isFile();
    if (!isFile) return "";
    return readFileSync(filepath, { encoding: "utf-8" });
  })
  .join("\n\n")
  .split("\n")
  .map((x) => x.trim())
  .join("\n")
  .replace(/\n\n+/g, "\n\n")
  .replace(/  +/g, " ");

writeFileSync(
  "./src/prelude/prelude.ts",
  "export const PRELUDE: string = " + JSON.stringify(data) + ";"
);
