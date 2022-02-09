/// <reference types="node" />
import { from } from "env-var";
declare const SUPPORTED_EXTENSTIONS: readonly ["yaml", "env", "json"];
declare type SUPPORTED_EXTENSTIONS_TYPE = typeof SUPPORTED_EXTENSTIONS[number];
export declare enum EnvironmentType {
    Production = "production",
    Testing = "testing",
    Development = "development"
}
export declare const EnvPRODUCTION = "production";
export declare const EnvTESTING = "testing";
export declare const EnvDEVELOPMENT = "development";
export declare type EnvPossible = typeof EnvPRODUCTION | typeof EnvTESTING | typeof EnvDEVELOPMENT;
interface ConfigReaderOptions {
    path?: string | null;
    debug?: boolean;
    logger?: any;
    env?: EnvPossible;
}
export declare class ConfigReader {
    protected logger: any;
    protected path: string | null;
    protected debug: boolean;
    protected envName: EnvPossible;
    protected envContainer: NodeJS.ProcessEnv;
    protected envReader: ReturnType<typeof from>;
    constructor(options?: ConfigReaderOptions);
    get(name: string): import("env-var").IOptionalVariable<import("env-var").Extensions> & import("env-var").ExtenderTypeOptional<import("env-var").Extensions>;
    protected initLogger(options?: ConfigReaderOptions): any;
    protected checkDir(path: string): boolean;
    protected checkFile(path: string): boolean;
    protected getPossiblePaths(basedir?: string): string[];
    protected findPossiblePath(): string | undefined;
    protected getConfigPath(options?: ConfigReaderOptions): string | null;
    protected getEnvName(options?: ConfigReaderOptions): EnvPossible;
    protected parseEnvName(value: string | undefined): EnvPossible | undefined;
    protected loadConfigs(): void;
    protected loadFile(name: string): void;
    protected loadProcessEnv(): void;
    protected readAndParse(fileName: string, extension: SUPPORTED_EXTENSTIONS_TYPE): NodeJS.ProcessEnv | null;
}
export default ConfigReader;
