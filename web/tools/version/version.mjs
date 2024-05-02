import path from "node:path";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";

const git = async (command, options) => {
  // create a promise based git wrapper around a spawned process
  return new Promise((resolve, reject) => {
    const currentPwd = process.cwd();
    const child = spawn("git", [command, ...options], {
      cwd: currentPwd,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      stdout += data;
    });

    child.stderr.on("data", (data) => {
      stderr += data;
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(stderr);
      }
    });
  });
};

/**
 * Get the commits affecting the current project
 * @param options
 * @returns {Promise<string>}
 */
const gitLog = async (options = []) => {
  const log = await git("log", options);
  return log.trim();
};

/**
 * Get the branch info of the current project
 * @param options
 * @returns {Promise<string>}
 */
const gitBranch = async (options = []) => {
  const branch = await git("branch", options);
  return branch.trim();
};

/**
 * @typedef {Object} CommitVersion
 * @property {string} message - The commit message of the latest commit to affect the current project
 * @property {string} commit - The commit hash of the latest commit to affect the current project
 * @property {string} date - The date of the latest commit to affect the current project
 * @property {string} branch - The current branch
 */

/**
 * Get the last commit data to have affected the current project
 * @returns {Promise<CommitVersion>}
 */
const getVersionData = async () => {
  const latestCommitInfo = await gitLog(["-n 1", "-p", "src/*"]);
  const commitInfo = latestCommitInfo.split("\n");
  const commit =
    commitInfo
      .find((line) => line.startsWith("commit"))
      ?.trim()
      .replace("commit", "")
      .trim() ?? "";
  let date = commitInfo.find((line) => line.startsWith("Date:")) ?? "";
  // First non-empty line after the Date: line is the commit message
  const message =
    commitInfo
      .slice(commitInfo.indexOf(date) + 1)
      .find((line) => line.trim().length > 0)
      ?.trim() ?? "";
  // Remove the Date: prefix from the date
  date = date.replace("Date:", "").trim();

  // Get the current branch of the latest commit
  const contains = (await gitBranch(["--contains", commit])).split("\n");
  let branch = (contains.find((line) => line.startsWith("develop") || line.startsWith("*")) ?? "")
    .replace("*", "")
    .trim();

  if (branch === "" || branch.includes("HEAD")) {
    branch = "develop";
  }

  return {
    message,
    commit,
    date: new Date(date).toISOString(),
    branch,
  };
};

const versionLib = async () => {
  const currentPwd = process.cwd();
  // if the currentPwd includes 'node_modules', we are running from within the monorepo package itself
  // and we have to account for the difference
  let workspaceRoot;
  let currentProjectPath;
  if (currentPwd.includes("node_modules")) {
    const [_workspaceRoot, nodeModulesPath, _currentProjectPath] = currentPwd.split("web");
    workspaceRoot = path.join(_workspaceRoot, "web", nodeModulesPath);
    currentProjectPath = _currentProjectPath;
  } else {
    const [_workspaceRoot, _currentProjectPath] = currentPwd.split("web");
    workspaceRoot = _workspaceRoot;
    currentProjectPath = _currentProjectPath;
  }
  const distPath = path.join(workspaceRoot, "web", "dist", currentProjectPath);

  try {
    await fs.mkdir(distPath, { recursive: true });
  } catch {
    /* ignore */
  }

  const versionData = await getVersionData();
  const versionJson = JSON.stringify(versionData, null, 2);
  const versionFile = path.join(distPath, "version.json");
  await fs.writeFile(versionFile, versionJson);
};

versionLib().then(() => {
  console.log("Versioning complete");
});
