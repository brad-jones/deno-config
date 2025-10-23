import { dirname, join } from "@std/path";
import { DenoConfigFile } from "./schema.ts";
import { Type } from "@brad-jones/deno-net-container";
import type { ContainerModule, IContainer } from "@brad-jones/deno-net-container";

/** Cache for storing config file paths to avoid repeated filesystem lookups */
const cachedConfigLookups: Record<string, string> = {};

/**
 * Dependency injection token for the IDenoConfigFactory.
 *
 * This token is used to register and resolve the DenoConfig factory function
 * in the deno-net-container IoC container. It ensures type safety when working
 * with the factory in a DI context.
 */
export const IDenoConfigFactory = new Type<IDenoConfigFactory>("IDenoConfigFactory");

/**
 * Factory function type for creating IDenoConfig instances.
 *
 * This type defines a factory function that takes a TypeScript file path
 * and returns a new IDenoConfig instance. The factory pattern allows for
 * flexible creation of DenoConfig instances while maintaining dependency
 * injection principles.
 *
 * @param tsFilePath - The path to a TypeScript file, used as starting point for config discovery
 * @returns A new IDenoConfig instance configured for the given file path
 */
export type IDenoConfigFactory = (tsFilePath: string) => IDenoConfig;

/**
 * Container module for registering the DenoConfig factory in the deno-net-container IoC container.
 *
 * This module provides a convenient way to register the IDenoConfigFactory with a DI container.
 * It registers a singleton factory function that creates new DenoConfig instances when called.
 * The singleton pattern ensures that the same factory function is reused across the application,
 * while still allowing multiple DenoConfig instances to be created as needed.
 *
 * @param c - The dependency injection container instance
 *
 * @example
 * ```ts
 * import { Container } from "@brad-jones/deno-net-container";
 * import { inject, denoConfigFactory, IDenoConfigFactory } from "@brad-jones/deno-config";
 *
 * // Register the module
 * const container = new Container();
 * container.addModule(denoConfigFactory);
 *
 * // Use the factory
 * const factory = container.get(IDenoConfigFactory);
 * const config = factory("./src/main.ts");
 *
 * // Or in a class constructor
 * class MyService {
 *   constructor(private configFactory = inject(IDenoConfigFactory)) {}
 *
 *   async processFile(filePath: string) {
 *     await using config = this.configFactory(filePath);
 *     // ... work with config
 *   }
 * }
 * ```
 *
 * @remarks
 * The factory is registered as a singleton, meaning the container will create and reuse
 * the same factory function instance. However, each call to the factory creates a new
 * DenoConfig instance, allowing for proper isolation between different file operations.
 */
export const denoConfigFactory: ContainerModule = (c: IContainer) => {
  c.addSingleton(IDenoConfigFactory, {
    useValue: (tsFilePath: string) => new DenoConfig(tsFilePath),
  });
};

/**
 * Interface for managing Deno configuration files with automatic discovery and restoration capabilities.
 *
 * This interface defines the contract for classes that can discover, read, write, and restore
 * Deno configuration files. It extends AsyncDisposable to support automatic cleanup.
 */
export interface IDenoConfig extends AsyncDisposable {
  /** The path to the TypeScript file used as starting point for config discovery */
  readonly tsFilePath: string;

  /** The path to the discovered configuration file, or undefined if not found */
  readonly configFilePath: string | undefined;

  /** The original configuration content before any modifications, or undefined if not read */
  readonly originalConfig: string | undefined;

  /**
   * Searches for a Deno configuration file (deno.json) starting from the TypeScript file's directory
   * and traversing upward through parent directories until found or root is reached.
   *
   * @returns Promise that resolves to the path of the found config file, or undefined if not found
   * @throws {Error} If there's a filesystem error other than file not found
   */
  findConfigFile(): Promise<string | undefined>;

  /**
   * Reads and parses the Deno configuration file.
   *
   * @returns Promise that resolves to the parsed config object, or undefined if no config file exists
   * @throws {Error} If the file cannot be read or parsed as valid JSON
   */
  readConfig(): Promise<DenoConfigFile | undefined>;

  /**
   * Writes a configuration object to the Deno config file.
   *
   * @param config - The configuration object to write
   * @returns Promise that resolves when the file has been written
   * @throws {Error} If no config file is found or if the config object is invalid
   */
  writeConfig(config: DenoConfigFile): Promise<void>;

  /**
   * Restores the configuration file to its original state.
   *
   * @returns Promise that resolves when the original config has been restored
   */
  resetConfig(): Promise<void>;
}

/**
 * A class for managing Deno configuration files with automatic discovery and restoration capabilities.
 *
 * This class implements the IDenoConfig interface and AsyncDisposable interface to automatically
 * restore the original configuration when disposed, making it ideal for temporary configuration modifications.
 *
 * @example
 * ```ts
 * await using config = new DenoConfig("/path/to/file.ts");
 * const configData = await config.readConfig();
 * if (configData) {
 *   configData.compilerOptions = { strict: true };
 *   await config.writeConfig(configData);
 * }
 * // Configuration is automatically restored when exiting scope
 * ```
 */
export class DenoConfig implements IDenoConfig {
  /** The original configuration content before any modifications */
  #originalConfig: string | undefined;

  /**
   * Gets the original configuration content that was read from the file.
   * @returns The original config as a string, or undefined if no config has been read
   */
  get originalConfig(): string | undefined {
    return this.#originalConfig;
  }

  /** The path to the discovered Deno configuration file */
  #configFilePath: string | undefined;

  /**
   * Gets the path to the configuration file that was discovered.
   * @returns The path to the config file, or undefined if no config file was found
   */
  get configFilePath(): string | undefined {
    return this.#configFilePath;
  }

  /**
   * Creates a new DenoConfig instance for managing configuration files.
   *
   * @param tsFilePath - The path to a TypeScript file, used as starting point for config discovery
   */
  constructor(public readonly tsFilePath: string) {}

  /**
   * Searches for a Deno configuration file (deno.json) starting from the TypeScript file's directory
   * and traversing upward through parent directories until found or root is reached.
   *
   * Results are cached to avoid repeated filesystem operations for the same file paths.
   *
   * @returns Promise that resolves to the path of the found config file, or undefined if not found
   * @throws {Error} If there's a filesystem error other than file not found
   */
  async findConfigFile(): Promise<string | undefined> {
    if (cachedConfigLookups[this.tsFilePath]) {
      this.#configFilePath = cachedConfigLookups[this.tsFilePath];
      return this.#configFilePath;
    }

    let currentDir = dirname(this.tsFilePath);

    while (currentDir !== dirname(currentDir)) { // Stop at root directory
      const denoJsonPath = join(currentDir, "deno.json");
      try {
        await Deno.stat(denoJsonPath);
        cachedConfigLookups[this.tsFilePath] = denoJsonPath;
        this.#configFilePath = denoJsonPath;
        return this.#configFilePath;
      } catch (e) {
        if (!(e instanceof Deno.errors.NotFound)) {
          throw e;
        }
        // File doesn't exist, continue
      }

      // Move up one directory
      currentDir = dirname(currentDir);
    }
  }

  /**
   * Reads and parses the Deno configuration file.
   *
   * This method first attempts to find the config file, then reads its contents
   * and parses it as JSON. The original content is stored for potential restoration.
   *
   * @returns Promise that resolves to the parsed config object, or undefined if no config file exists
   * @throws {Error} If the file cannot be read or parsed as valid JSON
   */
  async readConfig(): Promise<DenoConfigFile | undefined> {
    const configFilePath = await this.findConfigFile();
    if (!configFilePath) return undefined;

    // Only store the original config on the first read
    if (!this.#originalConfig) {
      this.#originalConfig = await Deno.readTextFile(configFilePath);
    }

    // Always read the current config from disk
    const currentConfigContent = await Deno.readTextFile(configFilePath);
    return DenoConfigFile.parse(JSON.parse(currentConfigContent));
  }

  /**
   * Writes a configuration object to the Deno config file.
   *
   * The config object is validated against the schema before being serialized to JSON.
   *
   * @param config - The configuration object to write
   * @returns Promise that resolves when the file has been written
   * @throws {Error} If no config file is found or if the config object is invalid
   */
  async writeConfig(config: DenoConfigFile): Promise<void> {
    const configFilePath = await this.findConfigFile();
    if (!configFilePath) throw new Error("no config file found");
    const raw = JSON.stringify(DenoConfigFile.parse(config));
    await Deno.writeTextFile(configFilePath, raw);
  }

  /**
   * Restores the configuration file to its original state.
   *
   * This method writes back the original configuration content that was stored
   * when {@link readConfig} was first called.
   *
   * @returns Promise that resolves when the original config has been restored
   */
  async resetConfig(): Promise<void> {
    if (this.#configFilePath && this.#originalConfig) {
      await Deno.writeTextFile(this.#configFilePath!, this.#originalConfig!);
    }
  }

  /**
   * AsyncDisposable implementation that automatically restores the original configuration.
   *
   * This method is called automatically when the object is used with `await using` or
   * when explicitly disposed. It ensures that any configuration changes are reverted.
   *
   * @returns Promise that resolves when cleanup is complete
   */
  async [Symbol.asyncDispose](): Promise<void> {
    await this.resetConfig();
  }
}
