const fs = require("fs");
const path = require("path");

const dir = "./src/prelude/";
const data = fs
  .readdirSync(dir)
  .map((filename) => {
    const filepath = path.resolve(dir, filename);
    const isFile = fs.statSync(filepath).isFile();
    if (!isFile) return "";
    return fs.readFileSync(filepath, { encoding: "utf-8" });
  })
  .join("\n\n")
  .split("\n")
  .map((x) => x.trim())
  .join("\n")
  .replace(/\n\n+/g, "\n\n")
  .replace(/  +/g, " ");

fs.writeFileSync(
  "./src/prelude.ts",
  "export const PRELUDE: string = " + JSON.stringify(data) + ";"
);
