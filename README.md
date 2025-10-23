# @brad-jones/deno-config

A solution for: <https://github.com/denoland/deno/issues/15482>

A TypeScript library for discovering, reading, and writing Deno configuration
files (`deno.json`) with type safety and automatic restoration capabilities.

## Features

- 🔍 **Automatic Discovery**: Finds `deno.json` files by traversing up the directory tree from any TypeScript file
- 📝 **Type-Safe Schema**: Complete Zod schema validation for Deno configuration files
- 🔄 **Automatic Restoration**: Class-based API with `AsyncDisposable` support for automatic config restoration
- 🛠️ **Dual API**: Choose between class-based or functional programming styles
- ⚡ **Caching**: Built-in caching for config file lookups to improve performance
- 🧪 **Well Tested**: Comprehensive test suite with integration tests

## Installation

```bash
deno add jsr:@brad-jones/deno-config
```

## Quick Start

### Functional API (Simple)

```typescript
import { readDenoConfigFile, writeDenoConfigFile } from "jsr:@brad-jones/deno-config";

// Read config starting from any TypeScript file
const config = await readDenoConfigFile("./src/my-file.ts");

if (config) {
  console.log("Project name:", config.name);
  console.log("Strict mode:", config.compilerOptions?.strict);

  // Modify and write back
  config.compilerOptions = { ...config.compilerOptions, strict: true };
  await writeDenoConfigFile("./src/my-file.ts", config);
}
```

### Class-based API (Advanced)

The class-based API provides automatic restoration of the original configuration when disposed:

```typescript
import { DenoConfig } from "jsr:@brad-jones/deno-config";

// Automatic restoration with 'await using'
await using config = new DenoConfig("./src/my-file.ts");

const configData = await config.readConfig();
if (configData) {
  // Make temporary changes
  configData.compilerOptions = { strict: true, allowJs: false };
  await config.writeConfig(configData);

  // Perform operations with modified config...
} // Original config is automatically restored here
```

## API Reference

### Functional API

#### `findDenoConfigFile(tsFilePath: string)`

Finds a `deno.json` file by searching upward from the given TypeScript file's directory.

```typescript
const configPath = await findDenoConfigFile("./src/utils/helper.ts");
if (configPath) {
  console.log(`Found config at: ${configPath}`);
}
```

#### `readDenoConfigFile(tsFilePath: string)`

Reads and parses a Deno configuration file.

```typescript
const config = await readDenoConfigFile("./src/main.ts");
if (config?.compilerOptions) {
  console.log("TypeScript target:", config.compilerOptions.target);
}
```

#### `writeDenoConfigFile(tsFilePath: string, config: DenoConfigFile)`

Writes a configuration object back to the discovered config file.

```typescript
await writeDenoConfigFile("./src/main.ts", {
  name: "my-project",
  compilerOptions: { strict: true },
});
```

### Class-based API

#### `new DenoConfig(tsFilePath: string)`

Creates a new DenoConfig instance for the given TypeScript file path.

#### Properties

- `configFilePath?: string` - Path to the discovered config file
- `originalConfig?: string` - Original config content (for restoration)

#### Methods

- `findConfigFile(): Promise<string | undefined>` - Discover the config file
- `readConfig(): Promise<DenoConfigFile | undefined>` - Read and parse the config
- `writeConfig(config: DenoConfigFile): Promise<void>` - Write the config
- `restoreConfig(): Promise<void>` - Manually restore the original config

### Type Definitions

The library exports a complete `DenoConfigFile` type that covers all supported Deno configuration options:

```typescript
import { DenoConfigFile } from "jsr:@brad-jones/deno-config";

const config: DenoConfigFile = {
  name: "my-project",
  version: "1.0.0",
  exports: "./mod.ts",
  compilerOptions: {
    strict: true,
    target: "es2022",
    lib: ["dom", "es2022"],
    jsx: "react-jsx",
  },
  tasks: {
    start: "deno run main.ts",
    test: "deno test",
  },
  lint: {
    include: ["src/"],
    rules: { tags: ["recommended"] },
  },
  fmt: {
    singleQuote: true,
    lineWidth: 100,
  },
};
```

## Use Cases

### Dynamic Bundling with JSX Mode Switching

One of the main motivations for this library is to work around limitations in
the [`Deno.bundle` Runtime API](https://docs.deno.com/runtime/reference/bundling/#runtime-api),
which cannot modify compiler options dynamically. This is particularly useful for
projects that need different JSX modes for server-side rendering (SSR) and
client-side rendering (CSR) components.

```typescript
import { $ } from "jsr:@david/dax";
import { DenoConfig } from "jsr:@brad-jones/deno-config";

// Bundle client components with "react-jsx" mode, while your SSR components use the new "precompile" mode.
async function bundleClientComponent(componentPath: string): Promise<string> {
  await using config = new DenoConfig(componentPath);

  const originalConfig = await config.readConfig();
  if (originalConfig) {
    // Temporarily switch to react-jsx for client bundling
    originalConfig.compilerOptions = {
      ...originalConfig.compilerOptions,
      jsx: "react-jsx",
      jsxImportSource: "react",
    };
    await config.writeConfig(originalConfig);

    // Bundle with the modified config
    //
    // NB: You can not use Deno.bundle directly as it will still use the original
    // config that was loaded by the main module. You must start a child process,
    // either by wrapping the `deno bundle` CLI or by generating a temporary
    // TypeScript file that uses `Deno.bundle` and executing that script.
    const code = await $`deno bundle ${componentPath}`.text();

    // Config is automatically restored when exiting scope
    return code;
  }

  throw new Error("No deno.json config found");
}
```

This approach allows you to:

- **Dynamically switch JSX modes** based on the component type (client vs server)
- **Bundle on-demand** with the correct compiler settings
- **Maintain clean separation** between SSR and CSR components
- **Automatically restore** the original configuration after bundling

### Testing with Temporary Configurations

```typescript
import { DenoConfig } from "jsr:@brad-jones/deno-config";

Deno.test("should work with strict mode enabled", async () => {
  await using config = new DenoConfig("./test-file.ts");

  const original = await config.readConfig();
  if (original) {
    // Enable strict mode for this test
    original.compilerOptions = { ...original.compilerOptions, strict: true };
    await config.writeConfig(original);

    // Run test logic with strict mode...

    // Config automatically restored after test
  }
});
```

### Build Tools and Scripts

```typescript
import { readDenoConfigFile, writeDenoConfigFile } from "jsr:@brad-jones/deno-config";

// Build script that modifies compiler options
const config = await readDenoConfigFile("./src/main.ts");
if (config) {
  // Set production build options
  config.compilerOptions = {
    ...config.compilerOptions,
    strict: true,
    noImplicitAny: true,
    target: "es2022",
  };

  await writeDenoConfigFile("./src/main.ts", config);
  console.log("Updated config for production build");
}
```

### Configuration Analysis

```typescript
import { findDenoConfigFile, readDenoConfigFile } from "jsr:@brad-jones/deno-config";

// Analyze project configurations
async function analyzeProject(entryFile: string) {
  const configPath = await findDenoConfigFile(entryFile);
  const config = await readDenoConfigFile(entryFile);

  return {
    hasConfig: !!configPath,
    configPath,
    isStrict: config?.compilerOptions?.strict ?? false,
    target: config?.compilerOptions?.target ?? "es2022",
    hasTasks: !!config?.tasks,
    taskCount: config?.tasks ? Object.keys(config.tasks).length : 0,
  };
}
```
