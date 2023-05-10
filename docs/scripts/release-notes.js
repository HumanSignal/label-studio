
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


## New helm chart

A common chart for LS and LSE has been released and is available since LSE version 2.3.x. The chart can be accessed at the following repository: https://github.com/heartexlabs/charts/tree/master/heartex/label-studio.

### Migration Process

The migration process can be performed without any downtime. The steps required to carry out the migration are documented in the migration guide, available at: https://github.com/heartexlabs/charts/blob/master/heartex/label-studio/FAQs.md#label-studio-enterprise-upgrade-from-decommissioned-label-studio-enterprise-helm-chart.

### Deprecation of the Old Chart

The old chart \`heartex/label-studio-enterprise\` **has been deprecated**. Support for as many releases as possible will be provided. A notification will be posted in the Release Notes section when this changes. We hope that this revised chart will meet your technical needs. If you have any questions or concerns, please don't hesitate to reach out to us.

`

  const finalString = frontmatter + markdownFiles;

  //writing to file
  fs.writeFile("source/guide/release_notes.md", finalString, (err) => {
    console.log(err);
  });

});