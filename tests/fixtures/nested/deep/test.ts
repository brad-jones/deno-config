// This is a test TypeScript file in a deeply nested directory
// Used for testing config file discovery that traverses up the directory tree

export function deepNestedFunction(): string {
  return "This function is in a deeply nested directory";
}

export const DEEP_NESTED_CONSTANT = "deep-nested-value";

// This file helps test that the config discovery can find
// the deno.json file in the parent directory (../deno.json)
