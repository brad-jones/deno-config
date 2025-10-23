import { expect } from "@std/expect";
import { join } from "@std/path";
import { findDenoConfigFile, readDenoConfigFile, writeDenoConfigFile } from "../src/functional.ts";
import { DenoConfigFile } from "../src/schema.ts";
import {
  createIsolatedTestDir,
  createNestedTestProject,
  createNoConfigTestDir,
  createTestProject,
  sampleConfigs,
  testWithCleanup,
} from "./test_helpers.ts";

testWithCleanup(
  "findDenoConfigFile - should find config file in same directory",
  async (cleanup) => {
    const { rootDir, configPath, files } = await createTestProject({
      prefix: "functional-find-same-",
      config: sampleConfigs.minimal,
      files: {
        "test.ts": "// test file",
      },
    });
    cleanup(rootDir);

    const foundConfigPath = await findDenoConfigFile(files["test.ts"]);

    expect(foundConfigPath).toBe(configPath);
  },
);

testWithCleanup(
  "findDenoConfigFile - should find config file in parent directory",
  async (cleanup) => {
    const { rootDir, configPath, deepFile } = await createNestedTestProject();
    cleanup(rootDir);

    const foundConfigPath = await findDenoConfigFile(deepFile);

    expect(foundConfigPath).toBe(configPath);
  },
);

testWithCleanup(
  "findDenoConfigFile - should return undefined when no config file found",
  async (cleanup) => {
    const { rootDir, testFile } = await createNoConfigTestDir();
    cleanup(rootDir);

    const foundConfigPath = await findDenoConfigFile(testFile);

    expect(foundConfigPath).toBeUndefined();
  },
);

testWithCleanup(
  "findDenoConfigFile - should cache config file lookups",
  async (cleanup) => {
    const { rootDir, deepFile } = await createNestedTestProject();
    cleanup(rootDir);

    const configPath1 = await findDenoConfigFile(deepFile);
    const configPath2 = await findDenoConfigFile(deepFile);

    expect(configPath1).toBe(configPath2);
    expect(configPath1).toBeDefined();
  },
);

testWithCleanup(
  "readDenoConfigFile - should read and parse valid config file",
  async (cleanup) => {
    const { rootDir, files } = await createTestProject({
      prefix: "functional-read-valid-",
      config: sampleConfigs.complete,
      files: {
        "main.ts": "// main file",
      },
    });
    cleanup(rootDir);

    const configData = await readDenoConfigFile(files["main.ts"]);

    expect(configData).toBeDefined();
    expect(configData?.name).toBe("test-project");
    expect(configData?.version).toBe("1.0.0");
    expect(configData?.compilerOptions?.strict).toBe(true);
    expect(configData?.compilerOptions?.allowJs).toBe(true);
    expect(configData?.exports).toEqual({
      ".": "./mod.ts",
      "./utils": "./utils.ts",
    });
    expect(configData?.tasks?.dev).toBe("deno run --watch main.ts");
    expect(configData?.unstable).toEqual(["kv", "temporal"]);
  },
);

testWithCleanup(
  "readDenoConfigFile - should read minimal config file",
  async (cleanup) => {
    const { rootDir, files } = await createTestProject({
      prefix: "functional-read-minimal-",
      config: sampleConfigs.minimal,
      files: {
        "app.ts": "// app file",
      },
    });
    cleanup(rootDir);

    const configData = await readDenoConfigFile(files["app.ts"]);

    expect(configData).toBeDefined();
    expect(configData?.compilerOptions?.strict).toBe(true);
    expect(configData?.tasks?.start).toBe("deno run main.ts");
  },
);

testWithCleanup(
  "readDenoConfigFile - should read nested config file",
  async (cleanup) => {
    const { rootDir, deepFile } = await createNestedTestProject();
    cleanup(rootDir);

    const configData = await readDenoConfigFile(deepFile);

    expect(configData).toBeDefined();
    expect(configData?.name).toBe("nested-test-project");
    expect(configData?.compilerOptions?.strict).toBe(false);
    expect(configData?.compilerOptions?.allowJs).toBe(true);
    expect(configData?.tasks?.build).toBe("deno compile main.ts");
  },
);

testWithCleanup(
  "readDenoConfigFile - should return undefined when no config file found",
  async (cleanup) => {
    const { rootDir, testFile } = await createNoConfigTestDir();
    cleanup(rootDir);

    const configData = await readDenoConfigFile(testFile);

    expect(configData).toBeUndefined();
  },
);

testWithCleanup(
  "writeDenoConfigFile - should write config file",
  async (cleanup) => {
    const { rootDir, files } = await createTestProject({
      prefix: "functional-write-",
      config: {
        compilerOptions: {
          strict: false,
        },
        tasks: {
          test: "deno test",
        },
      },
      files: {
        "src.ts": "// source file",
      },
    });
    cleanup(rootDir);

    // Read the initial config to verify it exists
    const readConfig = await readDenoConfigFile(files["src.ts"]);
    expect(readConfig).toBeDefined();
    expect(readConfig?.compilerOptions?.strict).toBe(false);

    // Write a new config
    const newConfig: DenoConfigFile = {
      name: "functional-test-project",
      compilerOptions: {
        strict: true,
        allowJs: true,
        target: "es2022",
      },
      tasks: {
        test: "deno test",
        dev: "deno run --watch main.ts",
        build: "deno compile main.ts",
      },
      lint: {
        include: ["src/"],
        rules: {
          tags: ["recommended"],
        },
      },
    };

    await writeDenoConfigFile(files["src.ts"], newConfig);

    // Verify the file was written correctly by reading it back
    const writtenConfig = await readDenoConfigFile(files["src.ts"]);

    expect(writtenConfig).toBeDefined();
    expect(writtenConfig?.name).toBe("functional-test-project");
    expect(writtenConfig?.compilerOptions?.strict).toBe(true);
    expect(writtenConfig?.compilerOptions?.allowJs).toBe(true);
    expect(writtenConfig?.compilerOptions?.target).toBe("es2022");
    expect(writtenConfig?.tasks?.dev).toBe("deno run --watch main.ts");
    expect(writtenConfig?.tasks?.build).toBe("deno compile main.ts");
    expect(writtenConfig?.lint?.include).toEqual(["src/"]);
    expect(writtenConfig?.lint?.rules?.tags).toEqual(["recommended"]);
  },
);

testWithCleanup(
  "writeDenoConfigFile - should throw error when no config file found",
  async (cleanup) => {
    const { rootDir, testFile } = await createNoConfigTestDir();
    cleanup(rootDir);

    const newConfig: DenoConfigFile = {
      compilerOptions: {
        strict: true,
      },
    };

    await expect(writeDenoConfigFile(testFile, newConfig)).rejects.toThrow(
      "no config file found",
    );
  },
);

testWithCleanup(
  "readDenoConfigFile - should handle JSON parsing errors",
  async (cleanup) => {
    const tempDir = await createIsolatedTestDir("functional-invalid-json-");
    const configPath = join(tempDir, "deno.json");
    const testFile = join(tempDir, "test.ts");
    cleanup(tempDir);

    // Write invalid JSON
    await Deno.writeTextFile(configPath, "{ invalid json }");
    await Deno.writeTextFile(testFile, "// test file");

    // This should throw a JSON parsing error
    await expect(readDenoConfigFile(testFile)).rejects.toThrow();
  },
);

testWithCleanup(
  "readDenoConfigFile - should handle schema validation errors",
  async (cleanup) => {
    const tempDir = await createIsolatedTestDir("functional-invalid-schema-");
    const configPath = join(tempDir, "deno.json");
    const testFile = join(tempDir, "test.ts");
    cleanup(tempDir);

    // Write JSON that doesn't match the schema
    const invalidConfig = {
      compilerOptions: {
        jsx: "invalid-jsx-mode", // This should be rejected by the schema
      },
    };

    await Deno.writeTextFile(configPath, JSON.stringify(invalidConfig));
    await Deno.writeTextFile(testFile, "// test file");

    // This should throw a schema validation error
    await expect(readDenoConfigFile(testFile)).rejects.toThrow();
  },
);

testWithCleanup(
  "writeDenoConfigFile - should validate config before writing",
  async (cleanup) => {
    const { rootDir, files } = await createTestProject({
      prefix: "functional-validate-",
      config: {
        compilerOptions: {
          strict: true,
        },
      },
      files: {
        "validate.ts": "// validate test file",
      },
    });
    cleanup(rootDir);

    // Try to write an invalid config
    const invalidConfig = {
      compilerOptions: {
        jsx: "invalid-jsx-mode", // This should be rejected by the schema
      },
    } as unknown as DenoConfigFile;

    // This should throw a validation error
    await expect(writeDenoConfigFile(files["validate.ts"], invalidConfig)).rejects.toThrow();

    // Verify the original config is still intact
    const currentConfig = await readDenoConfigFile(files["validate.ts"]);
    expect(currentConfig?.compilerOptions?.strict).toBe(true);
  },
);

testWithCleanup(
  "functional API - should work with complex nested config structures",
  async (cleanup) => {
    const tempDir = await createIsolatedTestDir("functional-complex-");
    const configPath = join(tempDir, "deno.json");
    const nestedDir = join(tempDir, "src", "utils");
    const testFile = join(nestedDir, "helper.ts");
    cleanup(tempDir);

    await Deno.mkdir(nestedDir, { recursive: true });

    // Create a complex config
    const complexConfig: DenoConfigFile = {
      name: "complex-project",
      version: "2.1.0",
      exports: {
        ".": "./mod.ts",
        "./cli": "./cli.ts",
        "./utils": "./src/utils/mod.ts",
      },
      compilerOptions: {
        strict: true,
        allowJs: true,
        lib: ["dom", "deno.ns", "es2022"],
        jsx: "react-jsx",
        jsxImportSource: "preact",
        target: "es2022",
        experimentalDecorators: true,
        useDefineForClassFields: true,
      },
      lint: {
        include: ["src/", "tests/"],
        exclude: ["build/", "dist/"],
        rules: {
          tags: ["recommended", "fresh"],
          exclude: ["no-unused-vars", "camelcase"],
          include: ["prefer-const", "no-var"],
        },
        report: "json",
      },
      fmt: {
        useTabs: false,
        lineWidth: 120,
        indentWidth: 2,
        singleQuote: true,
        proseWrap: "always",
        semiColons: false,
      },
      tasks: {
        dev: "deno run --watch --allow-all main.ts",
        test: "deno test --allow-all",
        lint: "deno lint",
        fmt: "deno fmt",
        build: "deno compile --allow-all --output=./dist/app main.ts",
      },
      test: {
        include: ["tests/", "src/**/*_test.ts"],
        exclude: ["tests/fixtures/"],
      },
      bench: {
        include: ["benches/"],
        exclude: ["benches/old/"],
      },
      imports: {
        "@std/path": "jsr:@std/path@^1.1.2",
        "@std/fs": "jsr:@std/fs@^1.0.0",
        "preact": "npm:preact@^10.0.0",
        "preact/": "npm:/preact/",
      },
      scopes: {
        "./src/": {
          "utils": "./src/utils/mod.ts",
          "types": "./src/types.ts",
        },
        "./tests/": {
          "fixtures": "./tests/fixtures/mod.ts",
        },
      },
      nodeModulesDir: "./node_modules",
      vendor: true,
      lock: "./deno.lock",
      workspace: {
        members: ["./packages/core", "./packages/cli", "./packages/web"],
      },
      publish: {
        include: ["src/", "README.md", "LICENSE", "deno.json"],
        exclude: ["src/**/*_test.ts", "src/dev/"],
      },
      unstable: ["kv", "cron", "temporal", "worker"],
    };

    await Deno.writeTextFile(configPath, JSON.stringify(complexConfig, null, 2));
    await Deno.writeTextFile(testFile, "// helper utility");

    // Test finding the config from nested file
    const foundConfigPath = await findDenoConfigFile(testFile);
    expect(foundConfigPath).toBe(configPath);

    // Test reading the complex config
    const readConfig = await readDenoConfigFile(testFile);
    expect(readConfig).toBeDefined();
    expect(readConfig?.name).toBe("complex-project");
    expect(readConfig?.version).toBe("2.1.0");
    expect(readConfig?.compilerOptions?.jsx).toBe("react-jsx");
    expect(readConfig?.compilerOptions?.lib).toEqual(["dom", "deno.ns", "es2022"]);
    expect(readConfig?.lint?.rules?.tags).toEqual(["recommended", "fresh"]);
    expect(readConfig?.fmt?.lineWidth).toBe(120);
    expect(readConfig?.workspace?.members).toEqual([
      "./packages/core",
      "./packages/cli",
      "./packages/web",
    ]);
    expect(readConfig?.unstable).toEqual(["kv", "cron", "temporal", "worker"]);

    // Test modifying and writing back
    const modifiedConfig = { ...readConfig! };
    modifiedConfig.version = "2.2.0";
    modifiedConfig.compilerOptions = {
      ...modifiedConfig.compilerOptions,
      strict: false,
      target: "es2021",
    };
    modifiedConfig.tasks = {
      ...modifiedConfig.tasks!,
      deploy: "deno deploy --prod main.ts",
    };

    await writeDenoConfigFile(testFile, modifiedConfig);

    // Verify the changes were written correctly
    const updatedConfig = await readDenoConfigFile(testFile);
    expect(updatedConfig?.version).toBe("2.2.0");
    expect(updatedConfig?.compilerOptions?.strict).toBe(false);
    expect(updatedConfig?.compilerOptions?.target).toBe("es2021");
    expect(updatedConfig?.tasks?.deploy).toBe("deno deploy --prod main.ts");

    // Verify other properties weren't affected
    expect(updatedConfig?.name).toBe("complex-project");
    expect(updatedConfig?.lint?.rules?.tags).toEqual(["recommended", "fresh"]);
    expect(updatedConfig?.unstable).toEqual(["kv", "cron", "temporal", "worker"]);
  },
);

testWithCleanup(
  "functional API - should handle filesystem errors gracefully",
  async (cleanup) => {
    // Create a test in an accessible location that has no config
    const { rootDir, testFile } = await createNoConfigTestDir();
    cleanup(rootDir);

    // These should handle the absence of config gracefully
    const configPath = await findDenoConfigFile(testFile);
    expect(configPath).toBeUndefined();

    const configData = await readDenoConfigFile(testFile);
    expect(configData).toBeUndefined();
  },
);
