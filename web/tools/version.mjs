import path from 'node:path';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';

const git = async (command, options) => {
  // create a promise based git wrapper around a spawned process
  return new Promise((resolve, reject) => {
    const currentPwd = process.cwd();
    const child = spawn('git', [command, ...options], {
      cwd: currentPwd,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data;
    });

    child.stderr.on('data', (data) => {
      stderr += data;
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(stderr);
      }
    });
  });
}

/**
 * Get the git log for the current project
 * @param options
 * @returns {Promise<string>}
 */
const gitLog = async (options = []) => {
  const log = await git('log', options);
  return log.trim();
}

/**
 * Get the git rev-parse for the current project
 * @param options
 * @returns {Promise<string>}
 */
const gitRevParse = async (options = []) => {
  const revParse = await git('rev-parse', options);
  return revParse.trim();
}


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
  const latestCommitInfo = await gitLog(['--all', '--first-parent', '--remotes', '--reflog', '--author-date-order', '-n 1', '--', '.']);
  let [commit, _author, date, ...message] = latestCommitInfo.split('\n');
  commit = commit.replace('commit', '').trim();
  date = date.replace('Date:', '').trim();
  message = message.find((line) => line.trim().length > 0)?.trim() ?? '';
  // Get the current branch of the latest commit
  const branch = await gitRevParse(['--abbrev-ref', 'HEAD']);

  return {
    message,
    commit,
    date: new Date(date).toISOString(),
    branch,
  };
}

const versionLib = async () => {
  const currentPwd = process.cwd();
  const [workspaceRoot, currentProjectPath] = currentPwd.split('web')
  console.log({
    workspaceRoot,
    currentProjectPath,
  })
  const distPath = path.join(workspaceRoot, 'web', 'dist', currentProjectPath)

  try {
    await fs.mkdir(distPath, { recursive: true })
  } catch { /* ignore */ }

  const versionData = await getVersionData();
  const versionJson = JSON.stringify(versionData, null, 2);
  const versionFile = path.join(distPath, 'version.json');
  await fs.writeFile(versionFile, versionJson);
}

versionLib().then(() => {
  console.log('Versioning complete');
});
