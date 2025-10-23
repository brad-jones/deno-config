import { DenoConfig } from "./classical.ts";
import { DenoConfigFile } from "./schema.ts";

/**
 * Finds a Deno configuration file (deno.json) by searching upward from a TypeScript file's directory.
 *
 * This is a functional wrapper around the {@link DenoConfig.findConfigFile} method that provides
 * a simpler API for one-off config file discovery operations.
 *
 * @param tsFilePath - The path to a TypeScript file, used as starting point for config discovery
 * @returns Promise that resolves to the path of the found config file, or undefined if not found
 * @throws {Error} If there's a filesystem error other than file not found
 *
 * @example
 * ```ts
 * const configPath = await findDenoConfigFile("/path/to/my/file.ts");
 * if (configPath) {
 *   console.log(`Found config at: ${configPath}`);
 * }
 * ```
 */
export async function findDenoConfigFile(tsFilePath: string): Promise<string | undefined> {
  return await new DenoConfig(tsFilePath).findConfigFile();
}

/**
 * Reads and parses a Deno configuration file by searching upward from a TypeScript file's directory.
 *
 * This is a functional wrapper around the {@link DenoConfig.readConfig} method that provides
 * a simpler API for one-off config reading operations. Unlike the class-based approach,
 * this function does not store the original config for restoration.
 *
 * @param tsFilePath - The path to a TypeScript file, used as starting point for config discovery
 * @returns Promise that resolves to the parsed config object, or undefined if no config file exists
 * @throws {Error} If the file cannot be read or parsed as valid JSON
 *
 * @example
 * ```ts
 * const config = await readDenoConfigFile("/path/to/my/file.ts");
 * if (config?.compilerOptions) {
 *   console.log("Strict mode:", config.compilerOptions.strict);
 * }
 * ```
 */
export async function readDenoConfigFile(tsFilePath: string): Promise<DenoConfigFile | undefined> {
  return await new DenoConfig(tsFilePath).readConfig();
}

/**
 * Writes a configuration object to a Deno config file by searching upward from a TypeScript file's directory.
 *
 * This is a functional wrapper around the {@link DenoConfig.writeConfig} method that provides
 * a simpler API for one-off config writing operations. Unlike the class-based approach,
 * this function does not provide automatic restoration of the original config.
 *
 * @param tsFilePath - The path to a TypeScript file, used as starting point for config discovery
 * @param config - The configuration object to write
 * @returns Promise that resolves when the file has been written
 * @throws {Error} If no config file is found or if the config object is invalid
 *
 * @example
 * ```ts
 * const config = await readDenoConfigFile("/path/to/my/file.ts");
 * if (config) {
 *   config.compilerOptions = { ...config.compilerOptions, strict: true };
 *   await writeDenoConfigFile("/path/to/my/file.ts", config);
 * }
 * ```
 */
export async function writeDenoConfigFile(tsFilePath: string, config: DenoConfigFile): Promise<void> {
  return await new DenoConfig(tsFilePath).writeConfig(config);
}
