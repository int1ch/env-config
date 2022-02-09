import ConfigReader from "../src/env-config";
import path from "path";
import process from "process";
import { isRegExp } from "util/types";

describe("parsers", () => {
  const dir = path.join(__dirname, "conf");
  test.each([
    ["yaml", 1],
    ["env", 2],
    ["json", 7],
  ])("%s", (extension, value) => {
    const path = dir + "." + extension;
    const config = new ConfigReader({ debug: false, path });
    const confValue = config.get("VALUE").asString();
    expect(confValue).toBe(String(value));
  });
});

describe("priority", () => {
  const dir = path.join(__dirname, "conf.priority");
  process.env["ENV"] = "20";
  const config = new ConfigReader({ path: dir });
  test.each([
    ["DEFAULT", 1],
    ["DEVELOPMENT", 1], //from default file,
    ["TESTING", 5],
    ["SECRET", 10],
    ["ENV", 20], //
  ])("check %s", (name, value) => {
    const confValue = config.get(name).default(100).asInt();
    if (value) {
      expect(confValue).toBe(value);
    } else {
      expect(confValue).toBe(100);
    }
  });
});

describe("possible directory", () => {
  const config = new ConfigReader({ debug: true });
  it("node modules", () => {
    //@ts-ignore
    const paths = config.getPossiblePaths(
      "/x/y/node_modules/x/node_modiles/config"
    );
    expect(paths).toHaveLength(2);
    expect(paths[1]).toBe("/x/y/config");
  });
});

describe("environment detection", () => {
  const config = new ConfigReader({ debug: true });
  it("env as param", () => {
    //@ts-ignore
    const env = config.getEnvName({ env: "testing" });
    expect(env).toBe("testing");
  });
  it("env from NODE_ENV", () => {
    process.env["NODE_ENV"] = "production";
    //@ts-ignore
    const env = config.getEnvName();
    expect(env).toBe("production");
  });
  it("env from ENVIRONMENT", () => {
    process.env["ENVIRONMENT"] = "development";
    //@ts-ignore
    const env = config.getEnvName();
    expect(env).toBe("development");
  });
});
