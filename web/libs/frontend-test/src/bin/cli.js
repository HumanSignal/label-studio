#!/usr/bin/env node

import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";
import cp from "child_process";
import path from "path";
import fs from "fs";
import { stdout } from "process";

const packageDir = "./node_modules/@heartexlabs/ls-test";
const assetsDir = path.resolve(packageDir, "bin/assets");
const workspaceDir = path.resolve();
const relativePath = (p) => path.resolve(assetsDir, p);

const CREATE_DIRS = ["./cypress/support", "./specs"];

const CREATE_FILES = ["./cypress/support/e2e.ts", "./specs/example.cy.ts", "./cypress.config.js", "./tsconfig.json"];

const COPY_CONTENTS = [
  [relativePath("spec.cy.ts"), "./specs/example.cy.ts"],
  [relativePath("cypress.config.js"), "./cypress.config.js"],
  [relativePath("tsconfig.json"), "tsconfig.json"],
  [relativePath("e2e.ts"), "./cypress/support/e2e.ts"],
];

const runCommand = async (cmd, args, message) => {
  return new Promise((resolve) => {
    console.log(message);

    const command = cp.spawn(cmd, args, { shell: true });
    const err = [];

    command.stdout.on("data", (data) => {
      stdout.write(data);
    });

    command.stderr.on("data", (data) => {
      err.push(data.toString());
    });

    command.on("close", (code) => {
      if (code !== 0) return resolve(new Error(err.join("\n")));
      resolve();
    });
  });
};

yargs(hideBin(process.argv))
  .command(
    "init",
    "Initialize framework",
    () => {},
    async (args) => {
      console.log("Preparing environment");

      await Promise.all(CREATE_DIRS.map((dir) => runCommand("mkdir", ["-p", dir], `Creating ${dir}`)));

      await Promise.all(CREATE_FILES.map((file) => runCommand("touch", [file], `Creating ${file}`)));

      await Promise.all(
        COPY_CONTENTS.map(([source, dest]) =>
          runCommand(`/bin/cat ${source} >> ${dest}`, [], `Copying ${path.basename(dest)}`),
        ),
      );

      console.log("Adding test commands");
      const sourcePkg = JSON.parse(fs.readFileSync(path.resolve(assetsDir, "package.json")).toString());
      const destPkg = JSON.parse(fs.readFileSync(path.resolve(workspaceDir, "package.json")).toString());

      destPkg.type = "module";
      destPkg.scripts = {
        ...(destPkg.scripts ?? {}),
        ...sourcePkg.scripts,
      };

      fs.writeFileSync("./package.json", JSON.stringify(destPkg, null, "  "));

      await runCommand(
        "yarn",
        ["add", "--dev", "webpack@5", "webpack-cli@5", "typescript@5", "ts-loader@9.4"],
        "Installing packages",
      );
    },
  )
  .help(false)
  .parse();
