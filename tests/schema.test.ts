import { expect } from "@std/expect";
import { DenoConfigFile } from "../src/schema.ts";

Deno.test("DenoConfigFile Schema - should parse valid minimal config", () => {
  const minimalConfig = {
    compilerOptions: {
      strict: true,
    },
  };

  const result = DenoConfigFile.safeParse(minimalConfig);
  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data.compilerOptions?.strict).toBe(true);
  }
});

Deno.test("DenoConfigFile Schema - should parse valid complete config", () => {
  const completeConfig = {
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
      allowImportingTsExtensions: true,
      checkJs: false,
      experimentalDecorators: true,
      keyofStringsOnly: false,
      moduleResolution: "node",
      noEmitOnError: true,
      noImplicitAny: true,
      strictBindCallApply: true,
      useDefineForClassFields: true,
    },
    lint: {
      include: ["src/", "tests/"],
      exclude: ["build/"],
      rules: {
        tags: ["recommended"],
        exclude: ["no-unused-vars"],
        include: ["prefer-const"],
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
      exclude: ["benches/old/"],
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
  };

  const result = DenoConfigFile.safeParse(completeConfig);
  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data.name).toBe("test-project");
    expect(result.data.version).toBe("1.0.0");
    expect(result.data.compilerOptions?.jsx).toBe("react-jsx");
    expect(result.data.lint?.report).toBe("pretty");
    expect(result.data.fmt?.singleQuote).toBe(true);
    expect(result.data.tasks?.dev).toBe("deno run --watch main.ts");
    expect(result.data.unstable).toEqual(["kv", "temporal"]);
  }
});

Deno.test("DenoConfigFile Schema - should parse empty config", () => {
  const emptyConfig = {};

  const result = DenoConfigFile.safeParse(emptyConfig);
  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data).toEqual({});
  }
});

Deno.test("DenoConfigFile Schema - should handle string exports", () => {
  const configWithStringExports = {
    exports: "./mod.ts",
  };

  const result = DenoConfigFile.safeParse(configWithStringExports);
  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data.exports).toBe("./mod.ts");
  }
});

Deno.test("DenoConfigFile Schema - should handle boolean nodeModulesDir", () => {
  const configWithBooleanNodeModules = {
    nodeModulesDir: false,
  };

  const result = DenoConfigFile.safeParse(configWithBooleanNodeModules);
  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data.nodeModulesDir).toBe(false);
  }
});

Deno.test("DenoConfigFile Schema - should handle string nodeModulesDir", () => {
  const configWithStringNodeModules = {
    nodeModulesDir: "./node_modules",
  };

  const result = DenoConfigFile.safeParse(configWithStringNodeModules);
  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data.nodeModulesDir).toBe("./node_modules");
  }
});

Deno.test("DenoConfigFile Schema - should handle boolean unstable", () => {
  const configWithBooleanUnstable = {
    unstable: true,
  };

  const result = DenoConfigFile.safeParse(configWithBooleanUnstable);
  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data.unstable).toBe(true);
  }
});

Deno.test("DenoConfigFile Schema - should handle array unstable", () => {
  const configWithArrayUnstable = {
    unstable: ["kv", "cron", "temporal"],
  };

  const result = DenoConfigFile.safeParse(configWithArrayUnstable);
  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data.unstable).toEqual(["kv", "cron", "temporal"]);
  }
});

Deno.test("DenoConfigFile Schema - should handle boolean lock", () => {
  const configWithBooleanLock = {
    lock: false,
  };

  const result = DenoConfigFile.safeParse(configWithBooleanLock);
  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data.lock).toBe(false);
  }
});

Deno.test("DenoConfigFile Schema - should handle string lock", () => {
  const configWithStringLock = {
    lock: "./custom.lock",
  };

  const result = DenoConfigFile.safeParse(configWithStringLock);
  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data.lock).toBe("./custom.lock");
  }
});

Deno.test("DenoConfigFile Schema - should reject invalid jsx values", () => {
  const configWithInvalidJsx = {
    compilerOptions: {
      jsx: "invalid-jsx-mode",
    },
  };

  const result = DenoConfigFile.safeParse(configWithInvalidJsx);
  expect(result.success).toBe(false);
});

Deno.test("DenoConfigFile Schema - should reject invalid target values", () => {
  const configWithInvalidTarget = {
    compilerOptions: {
      target: "es1999",
    },
  };

  const result = DenoConfigFile.safeParse(configWithInvalidTarget);
  expect(result.success).toBe(false);
});

Deno.test("DenoConfigFile Schema - should reject invalid moduleResolution values", () => {
  const configWithInvalidModuleResolution = {
    compilerOptions: {
      moduleResolution: "bundler",
    },
  };

  const result = DenoConfigFile.safeParse(configWithInvalidModuleResolution);
  expect(result.success).toBe(false);
});

Deno.test("DenoConfigFile Schema - should reject invalid lint report values", () => {
  const configWithInvalidLintReport = {
    lint: {
      report: "xml",
    },
  };

  const result = DenoConfigFile.safeParse(configWithInvalidLintReport);
  expect(result.success).toBe(false);
});

Deno.test("DenoConfigFile Schema - should reject invalid proseWrap values", () => {
  const configWithInvalidProseWrap = {
    fmt: {
      proseWrap: "sometimes",
    },
  };

  const result = DenoConfigFile.safeParse(configWithInvalidProseWrap);
  expect(result.success).toBe(false);
});

Deno.test("DenoConfigFile Schema - should handle all valid jsx options", () => {
  const validJsxOptions = ["react", "react-jsx", "react-jsxdev", "react-native", "preserve", "precompile"];

  for (const jsx of validJsxOptions) {
    const config = {
      compilerOptions: { jsx },
    };

    const result = DenoConfigFile.safeParse(config);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.compilerOptions?.jsx).toBe(jsx);
    }
  }
});

Deno.test("DenoConfigFile Schema - should handle all valid target options", () => {
  const validTargets = [
    "es3",
    "es5",
    "es6",
    "es2015",
    "es2016",
    "es2017",
    "es2018",
    "es2019",
    "es2020",
    "es2021",
    "es2022",
    "esnext",
  ];

  for (const target of validTargets) {
    const config = {
      compilerOptions: { target },
    };

    const result = DenoConfigFile.safeParse(config);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.compilerOptions?.target).toBe(target);
    }
  }
});

Deno.test("DenoConfigFile Schema - should handle all valid proseWrap options", () => {
  const validProseWrapOptions = ["always", "never", "preserve"];

  for (const proseWrap of validProseWrapOptions) {
    const config = {
      fmt: { proseWrap },
    };

    const result = DenoConfigFile.safeParse(config);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fmt?.proseWrap).toBe(proseWrap);
    }
  }
});

Deno.test("DenoConfigFile Schema - should reject non-string array values in lib", () => {
  const configWithInvalidLib = {
    compilerOptions: {
      lib: ["dom", 123, "es2022"],
    },
  };

  const result = DenoConfigFile.safeParse(configWithInvalidLib);
  expect(result.success).toBe(false);
});

Deno.test("DenoConfigFile Schema - should reject non-number lineWidth", () => {
  const configWithInvalidLineWidth = {
    fmt: {
      lineWidth: "100",
    },
  };

  const result = DenoConfigFile.safeParse(configWithInvalidLineWidth);
  expect(result.success).toBe(false);
});

Deno.test("DenoConfigFile Schema - should reject non-number indentWidth", () => {
  const configWithInvalidIndentWidth = {
    fmt: {
      indentWidth: "2",
    },
  };

  const result = DenoConfigFile.safeParse(configWithInvalidIndentWidth);
  expect(result.success).toBe(false);
});
