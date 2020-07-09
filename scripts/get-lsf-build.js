/* Install: npm install node-fetch
 * Run: node get-lsf-build.js
 * This script automatically takes the latest Label Studio Frontend build from master branch of LSF repo
 * and places it to label_studio/static/js/editor
*/
const fetch = require('node-fetch');

const fs = require('fs');
const { spawn } = require('child_process');
const path = require('path');

const REPO = 'heartexlabs/label-studio-frontend';
const dir = path.resolve(__dirname, 'lsf_tmp');
const TOKEN = process.env.GITHUB_TOKEN;

/**
 * @param {string} ref commit or branch
 */
async function get(ref = 'master') {
  let res, json, sha, branch = '';

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }

  if (ref.length < 30) {
    const commitUrl = `https://api.github.com/repos/${REPO}/git/ref/heads/${ref}`;
    console.info(`Fetching ${commitUrl}`);
    res = await fetch(commitUrl, { headers: { Authorization: `token ${TOKEN}` }});
    json = await res.json();
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
  var newPath = path.join(dir, '..', '..', 'label_studio', 'static', 'editor');
  fs.rmdirSync(newPath, {recursive: true});
  fs.rename(oldPath, newPath, function (err) {
    if (err) throw err;
    console.log('Successfully renamed - AKA moved!')
  });
}

// branch name as the first parameter, optional
get(process.argv[2]);
