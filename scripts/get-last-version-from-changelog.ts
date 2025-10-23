#!/usr/bin/env -S deno run -qA --ext=ts
import { canParse } from "jsr:@std/semver@1.0.6";

const changelog = await Deno.readTextFile(`${import.meta.dirname}/../CHANGELOG.md`);

let version;

for (const line of changelog.split("\n")) {
  if (line.startsWith("##")) {
    if (line.startsWith("## [")) {
      // ## [1.0.1](https://github.com/brad-jones/deno-config/compare/v1.0.0...v1.0.1) (2025-10-23)
      const match = line.match(/^## \[(.*?)\].*$/);
      if (match) {
        version = match[1];
        break;
      }
    } else {
      version = line.split(" ")[1];
      break;
    }
  }
}

if (!version) {
  console.error("failed to locate version");
  Deno.exit(1);
}

if (!canParse(version)) {
  console.error("failed to parse version");
  Deno.exit(1);
}

console.log(version);
