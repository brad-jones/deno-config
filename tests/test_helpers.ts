import { join } from "@std/path";
import { DenoConfigFile } from "../src/schema.ts";

/**
 * Creates an isolated temporary directory for testing that won't interfere
 * with the project's deno.json file discovery.
 */
export async function createIsolatedTestDir(
  prefix = "deno-config-test-",
): Promise<string> {
  // Create temp dir in system temp, not in project directory
  const tempDir = await Deno.makeTempDir({ prefix });
  return tempDir;
}

/**
 * Creates a test project structure with a deno.json file and TypeScript files.
 */
export async function createTestProject(options: {
  prefix?: string;
  config?: DenoConfigFile;
  files?: Record<string, string>;
}): Promise<
  { rootDir: string; configPath: string; files: Record<string, string> }
> {
  const rootDir = await createIsolatedTestDir(options.prefix);
  const configPath = join(rootDir, "deno.json");

  // Write config file
  const config = options.config || {
    compilerOptions: {
      strict: true,
    },
  };
  await Deno.writeTextFile(configPath, JSON.stringify(config, null, 2));

  // Write additional files
  const files: Record<string, string> = {};
  if (options.files) {
    for (const [relativePath, content] of Object.entries(options.files)) {
      const fullPath = join(rootDir, relativePath);
      const dir = join(fullPath, "..");
      await Deno.mkdir(dir, { recursive: true });
      await Deno.writeTextFile(fullPath, content);
      files[relativePath] = fullPath;
    }
  }

  return { rootDir, configPath, files };
}

/**
 * Creates a nested project structure for testing config discovery.
 */
export async function createNestedTestProject(): Promise<{
  rootDir: string;
  configPath: string;
  deepFile: string;
}> {
  const rootDir = await createIsolatedTestDir("nested-test-");
  const configPath = join(rootDir, "deno.json");
  const deepDir = join(rootDir, "src", "utils", "deep");
  const deepFile = join(deepDir, "helper.ts");

  await Deno.mkdir(deepDir, { recursive: true });

  const config: DenoConfigFile = {
    name: "nested-test-project",
    compilerOptions: {
      strict: false,
      allowJs: true,
    },
    tasks: {
      build: "deno compile main.ts",
    },
  };

  await Deno.writeTextFile(configPath, JSON.stringify(config, null, 2));
  await Deno.writeTextFile(
    deepFile,
    'export function helper() { return "nested helper"; }',
  );

  return { rootDir, configPath, deepFile };
}

/**
 * Creates a directory with no deno.json file for testing "not found" scenarios.
 * This is completely isolated from any parent deno.json files.
 */
export async function createNoConfigTestDir(): Promise<
  { rootDir: string; testFile: string }
> {
  const rootDir = await createIsolatedTestDir("no-config-test-");
  const testFile = join(rootDir, "standalone.ts");

  await Deno.writeTextFile(
    testFile,
    'export function standalone() { return "no config"; }',
  );

  return { rootDir, testFile };
}

/**
 * Cleans up a test directory.
 */
export async function cleanupTestDir(dir: string): Promise<void> {
  try {
    await Deno.remove(dir, { recursive: true });
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Sample configurations for testing.
 */
export const sampleConfigs = {
  minimal: {
    compilerOptions: {
      strict: true,
    },
    tasks: {
      start: "deno run main.ts",
    },
  } as DenoConfigFile,

  complete: {
    name: "test-project",
    version: "1.0.0",
    exports: {
      ".": "./mod.ts",
      "./utils": "./utils.ts",
    },
    compilerOptions: {
      allowJs: true,
      strict: true,
      lib: ["dom", "es2022"],
      jsx: "react-jsx",
      jsxImportSource: "react",
      target: "es2022",
    },
    lint: {
      include: ["src/", "tests/"],
      exclude: ["build/"],
      rules: {
        tags: ["recommended"],
        exclude: ["no-unused-vars"],
      },
      report: "pretty",
    },
    fmt: {
      useTabs: false,
      lineWidth: 100,
      indentWidth: 2,
      singleQuote: true,
      proseWrap: "preserve",
      semiColons: false,
    },
    tasks: {
      dev: "deno run --watch main.ts",
      test: "deno test",
      lint: "deno lint",
    },
    test: {
      include: ["tests/"],
      exclude: ["tests/fixtures/"],
    },
    bench: {
      include: ["benches/"],
    },
    importMap: "./import_map.json",
    imports: {
      "@std/path": "jsr:@std/path@^1.1.2",
      "react": "npm:react@^18.0.0",
    },
    scopes: {
      "./src/": {
        "utils": "./src/utils.ts",
      },
    },
    nodeModulesDir: true,
    vendor: false,
    lock: "./deno.lock",
    workspace: {
      members: ["./packages/*"],
    },
    publish: {
      include: ["src/", "README.md"],
      exclude: ["tests/"],
    },
    unstable: ["kv", "temporal"],
  } as DenoConfigFile,

  invalid: {
    compilerOptions: {
      jsx: "invalid-jsx-mode",
      target: "invalid-target",
    },
  } as unknown as DenoConfigFile,
};

/**
 * Creates a test with automatic cleanup.
 */
export function testWithCleanup(
  name: string,
  testFn: (cleanup: (dir: string) => void) => Promise<void> | void,
): void {
  Deno.test(name, async () => {
    const dirsToCleanup: string[] = [];

    const addCleanup = (dir: string) => {
      dirsToCleanup.push(dir);
    };

    try {
      await testFn(addCleanup);
    } finally {
      // Clean up all directories
      for (const dir of dirsToCleanup) {
        await cleanupTestDir(dir);
      }
    }
  });
}
