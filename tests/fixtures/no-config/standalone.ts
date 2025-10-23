// This is a standalone TypeScript file with no deno.json config file
// Used for testing scenarios where no configuration file is found

export function standaloneFunction(): string {
  return "This function has no deno config";
}

export const STANDALONE_CONSTANT = "no-config-value";

// This file helps test that the config discovery returns undefined
// when no deno.json file exists in the directory tree
