/* Install: npm install node-fetch
 * Run: node get-build.js [REPO] [BRANCH]
 * This script automatically takes the latest build from given repo and branch
 * and places it to label_studio/static/<REPO>
*/
const fetch = require('node-fetch');

const fs = require('fs');
const { spawn, execSync } = require('child_process');
const path = require('path');

const dir = path.resolve(__dirname, 'build-tmp');
const TOKEN = process.env.GITHUB_TOKEN;

// coloring for console output
const GREEN = "\033[0;32m";
const RED = "\033[0;31m";
const NC = "\033[0m"; // NO COLOR to reset coloring

const PROJECTS = {
  'editor': 'heartexlabs/label-studio-frontend',
  'dm': 'heartexlabs/dm2',
}

/**
 * @param {string} ref commit or branch
 */
async function get(projectName, ref = 'master') {
  let res, json, sha, branch = '';

  const REPO = PROJECTS[projectName || 'lsf'];

  if (!REPO) {
    const repos = Object.entries(PROJECTS).map(a => "\t" + a.join("\t")).join("\n");
    console.error(`\n${RED}Cannot fetch from repo ${REPO}.${NC}\nOnly available:\n${repos}`);
    return;
  }

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }

  if (ref.length < 30) {
    const commitUrl = `https://api.github.com/repos/${REPO}/git/ref/heads/${ref}`;
    console.info(`Fetching ${commitUrl}`);
    res = await fetch(commitUrl, { headers: { Authorization: `token ${TOKEN}` }});
    json = await res.json();

    if (!json || !json.object) {
      console.log(`\n${RED}Wrong response from GitHub. Check that you use correct GITHUB_TOKEN.${NC}`);
      console.log(json);
      return;
    }

    sha = json.object.sha;
    console.info(`Last commit in ${ref}:`, sha);
    branch = ref;
  } else {
    sha = ref;
  }

  const artifactsUrl = `https://api.github.com/repos/${REPO}/actions/artifacts`;
  res = await fetch(artifactsUrl, { headers: { Authorization: `token ${TOKEN}` }});
  json = await res.json();
  const artifact = json.artifacts.find(art => art.name === `build ${sha}`);
  if (!artifact) throw new Error(`Artifact for commit ${sha} was not found. Build failed?`);
  const buildUrl = artifact.archive_download_url;
  console.info('Found an artifact:', buildUrl);

  res = await fetch(buildUrl, { headers: { Authorization: `token ${TOKEN}` }});

  const filename = `${dir}/${sha}.zip`;
  console.info('Create write stream:', filename);
  const fileStream = fs.createWriteStream(filename);
  await new Promise((resolve, reject) => {
    res.body.pipe(fileStream);
    fileStream.on('error', reject);
    fileStream.on('finish', () => {
      console.info('Downloaded:', filename);
      const unzip = spawn('unzip', ['-d', dir, '-o', filename]);
      unzip.stderr.on('data', reject);
      unzip.on('close', resolve);
    });
  }).then(() => console.log('Build unpacked'));

  const commitInfoUrl = `https://api.github.com/repos/${REPO}/git/commits/${sha}`;
  res = await fetch(commitInfoUrl, { headers: { Authorization: `token ${TOKEN}` }});
  json = await res.json();
  const info = {
    message: json.message,
    commit: json.sha,
    branch,
    date: (json.author && json.author.date) || (json.committer && json.committer.date),
  };
  fs.writeFileSync(`${dir}/static/version.json`, JSON.stringify(info, null, 2));
  console.info('Version info written to static/version.json');


  // move build to target folder
  var oldPath = path.join(dir, 'static');
  var newPath = path.join(dir, '..', '..', 'label_studio', 'static', projectName);
  fs.rmdirSync(newPath, {recursive: true});
  fs.rename(oldPath, newPath, function (err) {
    if (err) throw err;
    console.log(`Successfully renamed - AKA moved into ${newPath}`);
    fs.rmdirSync(dir, {recursive: true});
    console.log(`Cleaned up tmp directory [${dir}]`);
    execSync('npx webpack', {stdio: 'inherit'});
  });
}

// repo name and branch name
get(process.argv[2], process.argv[3]);
