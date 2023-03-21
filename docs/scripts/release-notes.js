
const fs = require('hexo-fs');
const concatMd = require('concat-md');

hexo.extend.filter.register('after_init', async function(){

  const markdownFiles = await concatMd.default("source/guide/release_notes/onprem", { sorter: (a, b) => (a > b ? -1 : 1) });

const frontmatter = `---
NOTE: Don't user release_notes.md, it's automatically built from onprem/*.md files on hexo server run!   

title: On-Premise Release Notes for Label Studio Enterprise
short: On-Premise Release Notes
type: guide
tier: enterprise
order: 221
order_enterprise: 142
section: "Reference"
meta_title: On-premise Release notes for Label Studio Enterprise
meta_description: Discover what's new and improved, and review bug fixes, in the release notes and changelog for Label Studio Enterprise.
---

!!! info 
    The release notes for Label Studio Community Edition is available on the <a href="https://github.com/heartexlabs/label-studio/releases"> Label Studio GitHub repository</a>.

!!! info 
    The release notes for Label Studio Enterprise Cloud (SaaS) is available <a href="https://heartex.com/changelog">here</a>.
`

  const finalString = frontmatter + markdownFiles;

  //writing to file
  fs.writeFile("source/guide/release_notes.md", finalString, (err) => {
    console.log(err);
  });

});