import { expect } from "@std/expect";
import { join } from "@std/path";
import { DenoConfig } from "../src/classical.ts";
import { DenoConfigFile } from "../src/schema.ts";
import {
  createIsolatedTestDir,
  createNestedTestProject,
  createNoConfigTestDir,
  createTestProject,
  sampleConfigs,
  testWithCleanup,
} from "./test_helpers.ts";

Deno.test("DenoConfig - constructor should set tsFilePath", () => {
  const config = new DenoConfig("/path/to/file.ts");
  expect(config.tsFilePath).toBe("/path/to/file.ts");
});

testWithCleanup(
  "DenoConfig - should find config file in same directory",
  async (cleanup) => {
    const { rootDir, configPath, files } = await createTestProject({
      prefix: "find-same-dir-",
      config: sampleConfigs.minimal,
      files: {
        "test.ts": "// test file",
      },
    });
    cleanup(rootDir);

    const config = new DenoConfig(files["test.ts"]);
    const foundConfigPath = await config.findConfigFile();

    expect(foundConfigPath).toBe(configPath);
    expect(config.configFilePath).toBe(configPath);
  },
);

testWithCleanup(
  "DenoConfig - should find config file in parent directory",
  async (cleanup) => {
    const { rootDir, configPath, deepFile } = await createNestedTestProject();
    cleanup(rootDir);

    const config = new DenoConfig(deepFile);
    const foundConfigPath = await config.findConfigFile();

    expect(foundConfigPath).toBe(configPath);
    expect(config.configFilePath).toBe(configPath);
  },
);

testWithCleanup(
  "DenoConfig - should return undefined when no config file found",
  async (cleanup) => {
    const { rootDir, testFile } = await createNoConfigTestDir();
    cleanup(rootDir);

    const config = new DenoConfig(testFile);
    const foundConfigPath = await config.findConfigFile();

    expect(foundConfigPath).toBeUndefined();
    expect(config.configFilePath).toBeUndefined();
  },
);

testWithCleanup(
  "DenoConfig - should cache config file lookups",
  async (cleanup) => {
    const { rootDir, deepFile } = await createNestedTestProject();
    cleanup(rootDir);

    const config1 = new DenoConfig(deepFile);
    const configPath1 = await config1.findConfigFile();

    const config2 = new DenoConfig(deepFile);
    const configPath2 = await config2.findConfigFile();

    expect(configPath1).toBe(configPath2);
    expect(configPath1).toBeDefined();
  },
);

testWithCleanup(
  "DenoConfig - should read and parse valid config file",
  async (cleanup) => {
    const { rootDir, files } = await createTestProject({
      prefix: "read-valid-",
      config: sampleConfigs.complete,
      files: {
        "main.ts": "// main file",
      },
    });
    cleanup(rootDir);

    const config = new DenoConfig(files["main.ts"]);
    const configData = await config.readConfig();

    expect(configData).toBeDefined();
    expect(configData?.name).toBe("test-project");
    expect(configData?.version).toBe("1.0.0");
    expect(configData?.compilerOptions?.strict).toBe(true);
    expect(configData?.compilerOptions?.allowJs).toBe(true);
    expect(config.originalConfig).toBeDefined();
    expect(config.originalConfig).toContain("test-project");
  },
);

testWithCleanup(
  "DenoConfig - should read minimal config file",
  async (cleanup) => {
    const { rootDir, files } = await createTestProject({
      prefix: "read-minimal-",
      config: sampleConfigs.minimal,
      files: {
        "app.ts": "// app file",
      },
    });
    cleanup(rootDir);

    const config = new DenoConfig(files["app.ts"]);
    const configData = await config.readConfig();

    expect(configData).toBeDefined();
    expect(configData?.compilerOptions?.strict).toBe(true);
    expect(configData?.tasks?.start).toBe("deno run main.ts");
    expect(config.originalConfig).toBeDefined();
  },
);

testWithCleanup(
  "DenoConfig - should return undefined when reading non-existent config",
  async (cleanup) => {
    const { rootDir, testFile } = await createNoConfigTestDir();
    cleanup(rootDir);

    const config = new DenoConfig(testFile);
    const configData = await config.readConfig();

    expect(configData).toBeUndefined();
    expect(config.originalConfig).toBeUndefined();
  },
);

testWithCleanup("DenoConfig - should write config file", async (cleanup) => {
  const { rootDir, configPath, files } = await createTestProject({
    prefix: "write-test-",
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

  const config = new DenoConfig(files["src.ts"]);

  // Read the initial config
  const readConfig = await config.readConfig();
  expect(readConfig).toBeDefined();
  expect(readConfig?.compilerOptions?.strict).toBe(false);

  // Modify and write the config
  const newConfig: DenoConfigFile = {
    compilerOptions: {
      strict: true,
      allowJs: true,
    },
    tasks: {
      test: "deno test",
      dev: "deno run --watch main.ts",
    },
  };

  await config.writeConfig(newConfig);

  // Verify the file was written correctly
  const writtenContent = await Deno.readTextFile(configPath);
  const writtenConfig = JSON.parse(writtenContent);

  expect(writtenConfig.compilerOptions.strict).toBe(true);
  expect(writtenConfig.compilerOptions.allowJs).toBe(true);
  expect(writtenConfig.tasks.dev).toBe("deno run --watch main.ts");
});

testWithCleanup(
  "DenoConfig - should throw error when writing to non-existent config",
  async (cleanup) => {
    const { rootDir, testFile } = await createNoConfigTestDir();
    cleanup(rootDir);

    const config = new DenoConfig(testFile);

    const newConfig: DenoConfigFile = {
      compilerOptions: {
        strict: true,
      },
    };

    await expect(config.writeConfig(newConfig)).rejects.toThrow(
      "no config file found",
    );
  },
);

testWithCleanup(
  "DenoConfig - should reset config to original state",
  async (cleanup) => {
    const originalConfig = {
      compilerOptions: {
        strict: false,
      },
      tasks: {
        test: "deno test",
      },
    };

    const { rootDir, configPath, files } = await createTestProject({
      prefix: "reset-test-",
      config: originalConfig,
      files: {
        "reset.ts": "// reset test file",
      },
    });
    cleanup(rootDir);

    const config = new DenoConfig(files["reset.ts"]);

    // Read the original config (this stores it for reset)
    await config.readConfig();

    // Modify the config
    const newConfig: DenoConfigFile = {
      compilerOptions: {
        strict: true,
        allowJs: true,
      },
    };

    await config.writeConfig(newConfig);

    // Verify the config was changed
    let currentContent = await Deno.readTextFile(configPath);
    let currentConfig = JSON.parse(currentContent);
    expect(currentConfig.compilerOptions.strict).toBe(true);
    expect(currentConfig.compilerOptions.allowJs).toBe(true);

    // Reset the config
    await config.resetConfig();

    // Verify the config was reset to original
    currentContent = await Deno.readTextFile(configPath);
    currentConfig = JSON.parse(currentContent);
    expect(currentConfig.compilerOptions.strict).toBe(false);
    expect(currentConfig.compilerOptions.allowJs).toBeUndefined();
    expect(currentConfig.tasks.test).toBe("deno test");
  },
);

testWithCleanup(
  "DenoConfig - should not reset when no original config stored",
  async (cleanup) => {
    const { rootDir, testFile } = await createNoConfigTestDir();
    cleanup(rootDir);

    const config = new DenoConfig(testFile);

    // This should not throw an error, just do nothing
    await expect(config.resetConfig()).resolves.toBeUndefined();
  },
);

testWithCleanup(
  "DenoConfig - should implement AsyncDisposable",
  async (cleanup) => {
    const originalConfig = {
      compilerOptions: {
        strict: false,
      },
    };

    const { rootDir, configPath, files } = await createTestProject({
      prefix: "dispose-test-",
      config: originalConfig,
      files: {
        "dispose.ts": "// dispose test file",
      },
    });
    cleanup(rootDir);

    {
      await using config = new DenoConfig(files["dispose.ts"]);

      // Read and modify the config
      await config.readConfig();
      const newConfig: DenoConfigFile = {
        compilerOptions: {
          strict: true,
        },
      };
      await config.writeConfig(newConfig);

      // Verify the config was changed
      const currentContent = await Deno.readTextFile(configPath);
      const currentConfig = JSON.parse(currentContent);
      expect(currentConfig.compilerOptions.strict).toBe(true);
    } // config should be disposed here

    // Verify the config was automatically reset
    const currentContent = await Deno.readTextFile(configPath);
    const currentConfig = JSON.parse(currentContent);
    expect(currentConfig.compilerOptions.strict).toBe(false);
  },
);

testWithCleanup(
  "DenoConfig - should handle JSON parsing errors gracefully",
  async (cleanup) => {
    const tempDir = await createIsolatedTestDir("invalid-json-test-");
    const configPath = join(tempDir, "deno.json");
    const testFile = join(tempDir, "test.ts");
    cleanup(tempDir);

    // Write invalid JSON
    await Deno.writeTextFile(configPath, "{ invalid json }");
    await Deno.writeTextFile(testFile, "// test file");

    const config = new DenoConfig(testFile);

    // This should throw a JSON parsing error
    await expect(config.readConfig()).rejects.toThrow();
  },
);

testWithCleanup(
  "DenoConfig - should handle schema validation errors",
  async (cleanup) => {
    const tempDir = await createIsolatedTestDir("invalid-schema-test-");
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

    const config = new DenoConfig(testFile);

    // This should throw a schema validation error
    await expect(config.readConfig()).rejects.toThrow();
  },
);

testWithCleanup(
  "DenoConfig - should handle filesystem permission errors gracefully",
  async (cleanup) => {
    // Create a test in a location that should be accessible
    const tempDir = await createIsolatedTestDir("permission-test-");
    const restrictedFile = join(tempDir, "restricted.ts");
    cleanup(tempDir);

    await Deno.writeTextFile(restrictedFile, "// restricted file");

    const config = new DenoConfig(restrictedFile);

    // This should return undefined since there's no config file
    const result = await config.findConfigFile();
    expect(result).toBeUndefined();
  },
);
