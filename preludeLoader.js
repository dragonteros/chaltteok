import { readdirSync, readFileSync, statSync, writeFileSync } from "fs";
import { resolve } from "path";

const dir = "./prelude/";
const data =
  readdirSync(dir)
    .filter((filename) => filename.endsWith(".chaltteok"))
    .map((filename) => {
      const filepath = resolve(dir, filename);
      const isFile = statSync(filepath).isFile();
      if (!isFile) return "";
      return readFileSync(filepath, { encoding: "utf-8" });
    })
    .join("\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[^\n\S]+/g, " ") + "\n";

writeFileSync(
  "./src/builtin/prelude.ts",
  "export const PRELUDE = " + JSON.stringify(data) + ";"
);
