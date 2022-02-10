"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigReader = exports.EnvDEVELOPMENT = exports.EnvTESTING = exports.EnvPRODUCTION = exports.EnvironmentType = void 0;
const fs_1 = require("fs");
const path = __importStar(require("path"));
const env_var_1 = require("env-var");
//import { STATUS_CODES } from "http";
/*
  Module provide support for ENV frist config;
  so YAML .env and may JSON or INI files must be plain;
*/
const SUPPORTED_EXTENSTIONS = ["yaml", "env", "json"];
const parsers = {};
const parserRequireLibrary = {
    yaml: "yaml",
    env: "dotenv",
};
try {
    const dotenv = require("dotenv");
    parsers["env"] = dotenv.parse;
    console.log("dotenv OK");
}
catch (e) {
    console.error(e);
}
try {
    const yaml = require("yaml");
    console.log("yaml OK", yaml.parser);
    parsers["yaml"] = yaml.parse;
}
catch (e) {
    console.error(e);
}
parsers["json"] = JSON.parse;
console.log("parsers:", parsers);
//default debug
const DEBUG = false;
var EnvironmentType;
(function (EnvironmentType) {
    EnvironmentType["Production"] = "production";
    EnvironmentType["Testing"] = "testing";
    EnvironmentType["Development"] = "development";
})(EnvironmentType = exports.EnvironmentType || (exports.EnvironmentType = {}));
class ConfigParseError extends Error {
    constructor() {
        super(...arguments);
        this.code = "PARSEF";
    }
}
exports.EnvPRODUCTION = "production";
exports.EnvTESTING = "testing";
exports.EnvDEVELOPMENT = "development";
class ConfigReader {
    constructor(options) {
        this.debug = DEBUG;
        this.path = this.getConfigPath(options);
        this.logger = this.initLogger(options);
        this.envName = this.getEnvName(options);
        this.envContainer = {};
        this.loadConfigs();
        this.loadProcessEnv();
        this.envReader = (0, env_var_1.from)(this.envContainer);
    }
    get(name) {
        //@ts-ignore
        return this.envReader.get(name);
    }
    initLogger(options) {
        let inDebug = options === null || options === void 0 ? void 0 : options.debug;
        if (inDebug === undefined) {
            inDebug = DEBUG;
        }
        if (!inDebug) {
            return undefined;
        }
        const logger = options === null || options === void 0 ? void 0 : options.logger;
        if (!logger) {
            console.info("ConfigReader logger not specified, use console");
            return console;
        }
        return logger;
    }
    checkDir(path) {
        const stat = (0, fs_1.statSync)(path, { throwIfNoEntry: false });
        if (stat && stat.isDirectory()) {
            return true;
        }
        return false;
    }
    checkFile(path) {
        const stat = (0, fs_1.statSync)(path, { throwIfNoEntry: false });
        if (stat && stat.isFile()) {
            return true;
        }
        return false;
    }
    getPossiblePaths(basedir) {
        const toSearch = [];
        const cwdPath = path.resolve(process.cwd(), "config");
        toSearch.push(cwdPath);
        const thisFileDir = basedir || __dirname;
        if (thisFileDir.match("/node_modules/")) {
            const possible = thisFileDir.replace(new RegExp("(.*)/node_modules/.*"), "$1/config");
            toSearch.push(possible);
        }
        return toSearch;
    }
    findPossiblePath() {
        const possiblePaths = this.getPossiblePaths();
        for (const path of possiblePaths) {
            if (this.checkDir(path)) {
                return path;
            }
        }
        if (this.logger) {
            this.logger.info(`Not found config dir, searched in ${possiblePaths.join(", ")}`);
        }
        return undefined;
    }
    getConfigPath(options) {
        let configPath = options
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
    getEnvName(options) {
        let env = options ? options.env : undefined;
        if (env) {
            return env;
        }
        return (this.parseEnvName(process.env.ENVIRONMENT) ||
            this.parseEnvName(process.env.ENV) ||
            this.parseEnvName(process.env.NODE_ENV) ||
            exports.EnvDEVELOPMENT);
    }
    parseEnvName(value) {
        if (!value) {
            return undefined;
        }
        const lcv = value.toLowerCase();
        switch (lcv) {
            case "production":
            case "prod":
                return exports.EnvPRODUCTION;
            case "testing":
            case "test":
                return exports.EnvTESTING;
            case "development":
            case "dev":
                return exports.EnvDEVELOPMENT;
            default:
                return undefined;
        }
    }
    loadConfigs() {
        if (!this.path) {
            return;
        }
        const files = ["default", this.envName, "secret"];
        for (const configFile of files) {
            this.loadFile(configFile);
        }
    }
    loadFile(name) {
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
    loadProcessEnv() {
        //finally the most important env
        for (const key in process.env) {
            this.envContainer[key] = process.env[key];
        }
    }
    readAndParse(fileName, extension) {
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
            throw new Error(`Cannot parse file ${fullPath} parser for ${extension} not loaded, yarn add ${parserRequireLibrary[extension]}`);
        }
        const data = (0, fs_1.readFileSync)(fullPath, { encoding });
        //may trow error;
        return parser(data);
    }
}
exports.ConfigReader = ConfigReader;
exports.default = ConfigReader;
