import { join } from "@std/path";
import { expect } from "@std/expect";
import { DenoConfig } from "../src/classical.ts";
import { DenoConfigFile } from "../src/schema.ts";
import { createIsolatedTestDir, createTestProject, testWithCleanup } from "./test_helpers.ts";
import { findDenoConfigFile, readDenoConfigFile, writeDenoConfigFile } from "../src/functional.ts";

testWithCleanup("Integration - full workflow with class-based API", async (cleanup) => {
  // Create a temporary project structure
  const { rootDir, configPath, files } = await createTestProject({
    prefix: "integration-class-",
    config: {
      name: "integration-test-project",
      version: "1.0.0",
      compilerOptions: {
        strict: true,
        allowJs: false,
        target: "es2022",
      },
      tasks: {
        start: "deno run src/main.ts",
        test: "deno test",
      },
      lint: {
        include: ["src/"],
      },
      fmt: {
        singleQuote: true,
        semiColons: false,
      },
    },
    files: {
      "src/main.ts": 'import { helper } from "./utils/helper.ts";\nconsole.log(helper());',
      "src/utils/helper.ts": 'export function helper(): string { return "Hello from helper!"; }',
    },
  });
  cleanup(rootDir);

  // Test the full workflow using class-based API with automatic restoration
  {
    await using config = new DenoConfig(files["src/utils/helper.ts"]);

    // 1. Find config file
    const foundConfigPath = await config.findConfigFile();
    expect(foundConfigPath).toBe(configPath);
    expect(config.configFilePath).toBe(configPath);

    // 2. Read original config
    const originalConfig = await config.readConfig();
    expect(originalConfig).toBeDefined();
    expect(originalConfig?.name).toBe("integration-test-project");
    expect(originalConfig?.compilerOptions?.strict).toBe(true);
    expect(originalConfig?.compilerOptions?.allowJs).toBe(false);
    expect(config.originalConfig).toBeDefined();

    // 3. Modify config for development
    const devConfig: DenoConfigFile = {
      ...originalConfig!,
      compilerOptions: {
        ...originalConfig!.compilerOptions,
        allowJs: true,
        strict: false,
        lib: ["dom", "es2022"],
        jsx: "react-jsx",
      },
      tasks: {
        ...originalConfig!.tasks,
        dev: "deno run --watch src/main.ts",
        build: "deno compile src/main.ts",
      },
      imports: {
        "react": "npm:react@^18.0.0",
        "@std/path": "jsr:@std/path@^1.1.2",
      },
      unstable: ["kv", "cron"],
    };

    // 4. Write modified config
    await config.writeConfig(devConfig);

    // 5. Verify changes were applied
    const modifiedConfig = await config.readConfig();
    expect(modifiedConfig?.compilerOptions?.allowJs).toBe(true);
    expect(modifiedConfig?.compilerOptions?.strict).toBe(false);
    expect(modifiedConfig?.compilerOptions?.jsx).toBe("react-jsx");
    expect(modifiedConfig?.tasks?.dev).toBe("deno run --watch src/main.ts");
    expect(modifiedConfig?.imports?.react).toBe("npm:react@^18.0.0");
    expect(modifiedConfig?.unstable).toEqual(["kv", "cron"]);

    // 6. Make another modification
    const finalConfig: DenoConfigFile = {
      ...modifiedConfig!,
      version: "1.1.0",
      publish: {
        include: ["src/", "README.md"],
        exclude: ["src/**/*_test.ts"],
      },
    };

    await config.writeConfig(finalConfig);

    // Verify final changes
    const finalReadConfig = await config.readConfig();
    expect(finalReadConfig?.version).toBe("1.1.0");
    expect(finalReadConfig?.publish?.include).toEqual(["src/", "README.md"]);
  } // Config should be automatically restored here

  // 7. Verify automatic restoration worked
  const restoredConfig = await readDenoConfigFile(files["src/utils/helper.ts"]);
  expect(restoredConfig).toBeDefined();
  expect(restoredConfig?.name).toBe("integration-test-project");
  expect(restoredConfig?.version).toBe("1.0.0");
  expect(restoredConfig?.compilerOptions?.strict).toBe(true);
  expect(restoredConfig?.compilerOptions?.allowJs).toBe(false);
  expect(restoredConfig?.tasks?.dev).toBeUndefined();
  expect(restoredConfig?.imports).toBeUndefined();
  expect(restoredConfig?.unstable).toBeUndefined();
  expect(restoredConfig?.publish).toBeUndefined();
});

testWithCleanup("Integration - full workflow with functional API", async (cleanup) => {
  // Create a temporary project structure
  const { rootDir, configPath, files } = await createTestProject({
    prefix: "integration-functional-",
    config: {
      name: "functional-integration-test",
      version: "0.1.0",
      compilerOptions: {
        strict: true,
      },
      tasks: {
        test: "deno test",
      },
    },
    files: {
      "src/main.ts": 'export function main(): string { return "Hello World!"; }',
      "tests/main_test.ts":
        'import { expect } from "@std/expect";\nimport { main } from "../src/main.ts";\n\nDeno.test("main test", () => {\n  expect(main()).toBe("Hello World!");\n});',
    },
  });
  cleanup(rootDir);

  // 1. Find config file using functional API
  const foundConfigPath = await findDenoConfigFile(files["tests/main_test.ts"]);
  expect(foundConfigPath).toBe(configPath);

  // 2. Read initial config
  const originalConfig = await readDenoConfigFile(files["tests/main_test.ts"]);
  expect(originalConfig).toBeDefined();
  expect(originalConfig?.name).toBe("functional-integration-test");
  expect(originalConfig?.version).toBe("0.1.0");
  expect(originalConfig?.compilerOptions?.strict).toBe(true);

  // 3. Create a comprehensive config update
  const updatedConfig: DenoConfigFile = {
    name: "functional-integration-test",
    version: "0.2.0",
    exports: {
      ".": "./src/main.ts",
    },
    compilerOptions: {
      strict: true,
      allowJs: true,
      lib: ["deno.ns", "es2022"],
      target: "es2022",
      jsx: "react-jsx",
      jsxImportSource: "preact",
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
      start: "deno run src/main.ts",
      test: "deno test --allow-all",
      lint: "deno lint",
      fmt: "deno fmt",
      build: "deno compile --allow-all --output=./dist/app src/main.ts",
      dev: "deno run --watch --allow-all src/main.ts",
    },
    test: {
      include: ["tests/"],
      exclude: ["tests/fixtures/"],
    },
    bench: {
      include: ["benches/"],
    },
    imports: {
      "@std/expect": "jsr:@std/expect@^1.0.0",
      "@std/path": "jsr:@std/path@^1.1.2",
      "preact": "npm:preact@^10.0.0",
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
      include: ["src/", "README.md", "LICENSE"],
      exclude: ["src/**/*_test.ts"],
    },
    unstable: ["kv", "temporal"],
  };

  // 4. Write the comprehensive config
  await writeDenoConfigFile(files["tests/main_test.ts"], updatedConfig);

  // 5. Verify all changes were applied correctly
  const verifyConfig = await readDenoConfigFile(files["tests/main_test.ts"]);
  expect(verifyConfig).toBeDefined();
  expect(verifyConfig?.version).toBe("0.2.0");
  expect(verifyConfig?.exports).toEqual({ ".": "./src/main.ts" });
  expect(verifyConfig?.compilerOptions?.allowJs).toBe(true);
  expect(verifyConfig?.compilerOptions?.jsx).toBe("react-jsx");
  expect(verifyConfig?.compilerOptions?.lib).toEqual(["deno.ns", "es2022"]);
  expect(verifyConfig?.lint?.rules?.tags).toEqual(["recommended"]);
  expect(verifyConfig?.fmt?.singleQuote).toBe(true);
  expect(verifyConfig?.fmt?.lineWidth).toBe(100);
  expect(verifyConfig?.tasks?.dev).toBe("deno run --watch --allow-all src/main.ts");
  expect(verifyConfig?.tasks?.build).toBe("deno compile --allow-all --output=./dist/app src/main.ts");
  expect(verifyConfig?.imports?.preact).toBe("npm:preact@^10.0.0");
  expect(verifyConfig?.scopes?.["./src/"]?.utils).toBe("./src/utils.ts");
  expect(verifyConfig?.nodeModulesDir).toBe(true);
  expect(verifyConfig?.vendor).toBe(false);
  expect(verifyConfig?.workspace?.members).toEqual(["./packages/*"]);
  expect(verifyConfig?.publish?.include).toEqual(["src/", "README.md", "LICENSE"]);
  expect(verifyConfig?.unstable).toEqual(["kv", "temporal"]);

  // 6. Test partial updates
  const partialUpdate: DenoConfigFile = {
    ...verifyConfig!,
    version: "0.3.0",
    compilerOptions: {
      ...verifyConfig!.compilerOptions,
      strict: false,
      noImplicitAny: true,
    },
    tasks: {
      ...verifyConfig!.tasks,
      deploy: "deno deploy --prod src/main.ts",
    },
  };

  await writeDenoConfigFile(files["tests/main_test.ts"], partialUpdate);

  // 7. Verify partial updates
  const finalConfig = await readDenoConfigFile(files["tests/main_test.ts"]);
  expect(finalConfig?.version).toBe("0.3.0");
  expect(finalConfig?.compilerOptions?.strict).toBe(false);
  expect(finalConfig?.compilerOptions?.noImplicitAny).toBe(true);
  expect(finalConfig?.compilerOptions?.allowJs).toBe(true); // Should still be there
  expect(finalConfig?.tasks?.deploy).toBe("deno deploy --prod src/main.ts");
  expect(finalConfig?.tasks?.dev).toBe("deno run --watch --allow-all src/main.ts"); // Should still be there
  expect(finalConfig?.unstable).toEqual(["kv", "temporal"]); // Should still be there
});

testWithCleanup("Integration - mixed API usage", async (cleanup) => {
  // Test using both APIs together in the same workflow
  const { rootDir, files } = await createTestProject({
    prefix: "integration-mixed-",
    config: {
      name: "mixed-api-test",
      compilerOptions: {
        strict: true,
      },
    },
    files: {
      "src.ts": "// test file",
    },
  });
  cleanup(rootDir);

  // 1. Use functional API to read initial state
  const functionalRead = await readDenoConfigFile(files["src.ts"]);
  expect(functionalRead?.name).toBe("mixed-api-test");
  expect(functionalRead?.compilerOptions?.strict).toBe(true);

  // 2. Use class-based API for managed modifications
  {
    await using config = new DenoConfig(files["src.ts"]);

    const classRead = await config.readConfig();
    expect(classRead?.name).toBe("mixed-api-test");

    // Make temporary changes
    const tempConfig: DenoConfigFile = {
      ...classRead!,
      compilerOptions: {
        ...classRead!.compilerOptions,
        allowJs: true,
      },
      tasks: {
        dev: "deno run --watch src.ts",
      },
    };

    await config.writeConfig(tempConfig);

    // 3. Use functional API to verify changes while in managed scope
    const functionalVerify = await readDenoConfigFile(files["src.ts"]);
    expect(functionalVerify?.compilerOptions?.allowJs).toBe(true);
    expect(functionalVerify?.tasks?.dev).toBe("deno run --watch src.ts");
  } // Changes should be automatically reverted

  // 4. Use functional API to verify restoration
  const functionalFinal = await readDenoConfigFile(files["src.ts"]);
  expect(functionalFinal?.name).toBe("mixed-api-test");
  expect(functionalFinal?.compilerOptions?.strict).toBe(true);
  expect(functionalFinal?.compilerOptions?.allowJs).toBeUndefined();
  expect(functionalFinal?.tasks).toBeUndefined();

  // 5. Use functional API for permanent changes
  const permanentConfig: DenoConfigFile = {
    ...functionalFinal!,
    version: "1.0.0",
    compilerOptions: {
      ...functionalFinal!.compilerOptions,
      target: "es2022",
    },
  };

  await writeDenoConfigFile(files["src.ts"], permanentConfig);

  // 6. Verify permanent changes with both APIs
  const functionalCheck = await readDenoConfigFile(files["src.ts"]);
  expect(functionalCheck?.version).toBe("1.0.0");
  expect(functionalCheck?.compilerOptions?.target).toBe("es2022");

  const classCheck = new DenoConfig(files["src.ts"]);
  const classCheckResult = await classCheck.readConfig();
  expect(classCheckResult?.version).toBe("1.0.0");
  expect(classCheckResult?.compilerOptions?.target).toBe("es2022");
});

testWithCleanup("Integration - error handling across APIs", async (cleanup) => {
  const tempDir = await createIsolatedTestDir("integration-errors-");
  const configPath = join(tempDir, "deno.json");
  const srcFile = join(tempDir, "src.ts");
  cleanup(tempDir);

  await Deno.writeTextFile(srcFile, "// test file");

  // Test error when no config file exists
  const noConfigResult = await readDenoConfigFile(srcFile);
  expect(noConfigResult).toBeUndefined();

  const noConfigPath = await findDenoConfigFile(srcFile);
  expect(noConfigPath).toBeUndefined();

  const invalidConfig = { compilerOptions: { strict: true } } as DenoConfigFile;
  await expect(writeDenoConfigFile(srcFile, invalidConfig)).rejects.toThrow("no config file found");

  // Create invalid JSON config
  await Deno.writeTextFile(configPath, "{ invalid json }");

  // Test JSON parsing errors
  await expect(readDenoConfigFile(srcFile)).rejects.toThrow();

  const classConfig = new DenoConfig(srcFile);
  await expect(classConfig.readConfig()).rejects.toThrow();

  // Create valid JSON but invalid schema
  const invalidSchemaConfig = {
    compilerOptions: {
      jsx: "invalid-jsx-mode",
    },
  };
  await Deno.writeTextFile(configPath, JSON.stringify(invalidSchemaConfig));

  // Test schema validation errors
  await expect(readDenoConfigFile(srcFile)).rejects.toThrow();
  await expect(classConfig.readConfig()).rejects.toThrow();

  // Create valid config for write error testing
  const validConfig = {
    compilerOptions: {
      strict: true,
    },
  };
  await Deno.writeTextFile(configPath, JSON.stringify(validConfig));

  // Test write validation errors
  const invalidWriteConfig = {
    compilerOptions: {
      jsx: "invalid-jsx-mode",
    },
  } as unknown as DenoConfigFile;

  await expect(writeDenoConfigFile(srcFile, invalidWriteConfig)).rejects.toThrow();
  await expect(classConfig.writeConfig(invalidWriteConfig)).rejects.toThrow();
});

testWithCleanup("Integration - performance and caching", async (cleanup) => {
  const tempDir = await createIsolatedTestDir("integration-performance-");
  const configPath = join(tempDir, "deno.json");
  const deepDir = join(tempDir, "src", "utils", "deep", "nested");
  const deepFile = join(deepDir, "helper.ts");
  cleanup(tempDir);

  await Deno.mkdir(deepDir, { recursive: true });

  const config = {
    name: "performance-test",
    compilerOptions: {
      strict: true,
    },
  };

  await Deno.writeTextFile(configPath, JSON.stringify(config));
  await Deno.writeTextFile(deepFile, "// deep file");

  // Test that multiple lookups are cached
  const start = performance.now();

  const path1 = await findDenoConfigFile(deepFile);
  const path2 = await findDenoConfigFile(deepFile);
  const path3 = await findDenoConfigFile(deepFile);

  const end = performance.now();

  expect(path1).toBe(configPath);
  expect(path2).toBe(configPath);
  expect(path3).toBe(configPath);

  // Subsequent calls should be much faster due to caching
  // This is a loose test since performance can vary
  expect(end - start).toBeLessThan(100); // Should complete in under 100ms

  // Test with class-based API
  const classConfig1 = new DenoConfig(deepFile);
  const classConfig2 = new DenoConfig(deepFile);

  const classPath1 = await classConfig1.findConfigFile();
  const classPath2 = await classConfig2.findConfigFile();

  expect(classPath1).toBe(configPath);
  expect(classPath2).toBe(configPath);
  expect(classPath1).toBe(classPath2);
});
