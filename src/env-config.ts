import { existsSync, statSync, readFileSync } from "fs";
import * as path from "path";
import { parse as yamlParse } from "yaml";

import { from } from "env-var";

//import { STATUS_CODES } from "http";

/*
  Module provide support for ENV frist config;
  so YAML .env and may JSON or INI files must be plain;
*/
const SUPPORTED_EXTENSTIONS = ["yaml", "env", "json"] as const;
type SUPPORTED_EXTENSTIONS_TYPE = typeof SUPPORTED_EXTENSTIONS[number];

const parsers: { [P in SUPPORTED_EXTENSTIONS_TYPE]?: (data: string) => any } =
  {};
const parserRequireLibrary: Record<string, string> = {
  yaml: "yaml",
  env: "dotenv",
};

try {
  const dotenv = require("dotenv");
  parsers["env"] = dotenv.parse;
  console.log("dotenv OK");
} catch (e) {
  console.error(e);
}

try {
  const yaml = require("yaml");
  console.log("yaml OK", yaml.parser);
  parsers["yaml"] = yaml.parse;
} catch (e) {
  console.error(e);
}

parsers["json"] = JSON.parse;

console.log("parsers:", parsers);
//default debug
const DEBUG = false;

export enum EnvironmentType {
  Production = "production",
  Testing = "testing",
  Development = "development",
}

class ConfigParseError extends Error {
  code = "PARSEF";
}

interface XOptions {
  path?: string | null;
  debug?: boolean;
  logger: any;
  env?: "production" | "testing" | "development";
}

export const EnvPRODUCTION = "production";
export const EnvTESTING = "testing";
export const EnvDEVELOPMENT = "development";
export type EnvPossible =
  | typeof EnvPRODUCTION
  | typeof EnvTESTING
  | typeof EnvDEVELOPMENT;

interface ConfigReaderOptions {
  path?: string | null;
  debug?: boolean;
  logger?: any;
  env?: EnvPossible;
}

export class ConfigReader {
  protected logger: any;
  protected path: string | null;
  protected debug = DEBUG;
  protected envName: EnvPossible;
  protected envContainer: NodeJS.ProcessEnv;
  protected envReader: ReturnType<typeof from>;

  constructor(options?: ConfigReaderOptions) {
    this.path = this.getConfigPath(options);
    this.logger = this.initLogger(options);
    this.envName = this.getEnvName(options);
    this.envContainer = {};
    this.loadConfigs();
    this.loadProcessEnv();

    this.envReader = from(this.envContainer);
  }

  public get(name: string) {
    //@ts-ignore
    return this.envReader.get(name);
  }

  protected initLogger(options?: ConfigReaderOptions) {
    let inDebug = options?.debug;
    if (inDebug === undefined) {
      inDebug = DEBUG;
    }
    if (!inDebug) {
      return undefined;
    }

    const logger = options?.logger;
    if (!logger) {
      console.info("ConfigReader logger not specified, use console");
      return console;
    }
    return logger;
  }

  protected checkDir(path: string) {
    const stat = statSync(path, { throwIfNoEntry: false });
    if (stat && stat.isDirectory()) {
      return true;
    }
    return false;
  }
  protected checkFile(path: string) {
    const stat = statSync(path, { throwIfNoEntry: false });
    if (stat && stat.isFile()) {
      return true;
    }
    return false;
  }
  protected getPossiblePaths(basedir?: string) {
    const toSearch: string[] = [];
    const cwdPath = path.resolve(process.cwd(), "config");
    toSearch.push(cwdPath);
    const thisFileDir = basedir || __dirname;
    if (thisFileDir.match("/node_modules/")) {
      const possible = thisFileDir.replace(
        new RegExp("(.*)/node_modules/.*"),
        "$1/config"
      );
      toSearch.push(possible);
    }
    return toSearch;
  }
  protected findPossiblePath() {
    const possiblePaths = this.getPossiblePaths();
    for (const path of possiblePaths) {
      if (this.checkDir(path)) {
        return path;
      }
    }

    if (this.logger) {
      this.logger.info(
        `Not found config dir, searched in ${possiblePaths.join(", ")}`
      );
    }
    return undefined;
  }
  protected getConfigPath(options?: ConfigReaderOptions): string | null {
    let configPath: string | null | undefined = options
      ? options.path
      : undefined;
    if (configPath === null) {
      return null;
    }

    //TODO scan fo directory exsitance
    if (configPath === undefined) {
      configPath = this.findPossiblePath();
    }
    if (!configPath) {
      return null;
    }
    if (this.logger) {
      this.logger.info(`Config will be read from:${configPath}`);
    }
    return configPath;
  }
  protected getEnvName(options?: ConfigReaderOptions): EnvPossible {
    let env = options ? options.env : undefined;
    if (env) {
      return env;
    }

    return (
      this.parseEnvName(process.env.ENVIRONMENT) ||
      this.parseEnvName(process.env.ENV) ||
      this.parseEnvName(process.env.NODE_ENV) ||
      EnvDEVELOPMENT
    );
  }
  protected parseEnvName(value: string | undefined): EnvPossible | undefined {
    if (!value) {
      return undefined;
    }
    const lcv = value.toLowerCase();
    switch (lcv) {
      case "production":
      case "prod":
        return EnvPRODUCTION;
      case "testing":
      case "test":
        return EnvTESTING;
      case "development":
      case "dev":
        return EnvDEVELOPMENT;
      default:
        return undefined;
    }
  }

  protected loadConfigs() {
    if (!this.path) {
      return;
    }

    const files: string[] = ["default", this.envName, "secret"];
    for (const configFile of files) {
      this.loadFile(configFile);
    }
  }
  protected loadFile(name: string) {
    if (!this.path) {
      return;
    }
    // type: 'yaml' | 'env'
    for (const extentions of SUPPORTED_EXTENSTIONS) {
      const fileContainer = this.readAndParse(name, extentions);

      if (!fileContainer) {
        continue;
      }
      for (const key in fileContainer) {
        this.envContainer[key] = String(fileContainer[key]);
      }
      break;
    }
  }
  protected loadProcessEnv() {
    //finally the most important env
    for (const key in process.env) {
      this.envContainer[key] = process.env[key];
    }
  }

  protected readAndParse(
    fileName: string,
    extension: SUPPORTED_EXTENSTIONS_TYPE
  ): NodeJS.ProcessEnv | null {
    if (!this.path) {
      return null;
    }
    const encoding = "utf8";
    const configFile = fileName + "." + extension;
    const fullPath = path.resolve(this.path, configFile);
    const checkFile = this.checkFile(fullPath);

    if (!checkFile) {
      return null;
    }
    const parser = parsers[extension];
    if (!parser) {
      throw new Error(
        `Cannot parse file ${fullPath} parser for ${extension} not loaded, yarn add ${parserRequireLibrary[extension]}`
      );
    }

    const data = readFileSync(fullPath, { encoding });
    //may trow error;
    return parser(data);
  }
}

export default ConfigReader;
