const fs = require("hexo-fs");
const concatMd = require("concat-md");

hexo.extend.filter.register("after_init", async function () {
  const compareVersions = (a, b) => {
    const versionRegExp =
      /(?<x>\d+)?\.(?<y>\d+)?\.(?<z>\d+)?(?<t>\.dev|dev-|-|\.post)?(?<n>\d+)?/;
    const aMatch = a.match(versionRegExp);
    const bMatch = b.match(versionRegExp);
    const toInt = (a, d) => (a.groups[d] ? a.groups[d] * 1 : 0);
    for (let d of ["x", "y", "z", "n"]) {
      const aMatchInt = toInt(aMatch, d);
      const bMatchInt = toInt(bMatch, d);
      if (aMatchInt === bMatchInt) continue;
      return bMatchInt - aMatchInt;
    }
    return 0;
  };

  const markdownFiles = await concatMd.default(
    "source/guide/release_notes/onprem",
    { sorter: compareVersions, joinString: "\n\n\n\n\n\n-----newfile-----" }
  );

  const wrappedPages = markdownFiles
    .split("\n-----newfile-----")
    .map(
      (page) =>
        `<div class="release-note"><button class="release-note-toggle"></button>${page}</div>`
    )
    .join("");

  const frontmatter = `---
NOTE: Don't change release_notes.md manually, it's automatically built from onprem/*.md files on hexo server run!   

title: On-Premises Release Notes for Label Studio Enterprise
short: On-Prem Release Notes
type: guide
tier: enterprise
order: 0
order_enterprise: 451
section: "What's New"
meta_title: On-premises release notes for Label Studio Enterprise
meta_description: Review new features, enhancements, and bug fixes for on-premises Label Studio Enterprise installations. 
---

Before upgrading, review the steps outlined in [Upgrade Label Studio Enterprise](upgrade_enterprise) and ensure that you complete the recommended tests after each upgrade.

!!! warning "Upgrading from 2.36.0"
    Do not upgrade directly from 2.36.0 to 2.37.0 or 2.37.1. Those versions do not include the database migration repair added in [2.36.1](#2361md), and the upgrade fails with \`django.db.migrations.exceptions.InconsistentMigrationHistory: Migration lse_projects.0049_ensure_custom_interface_columns is applied before its dependency\`. Upgrade to 2.36.1 or a later 2.36.x release, or to [2.37.2](#2372md) or later. If you already upgraded from 2.36.0 to 2.37.0 or 2.37.1 and see this error, deploy 2.37.2 or later to repair your instance.

!!! attention "Release support lifecycle"
    All releases from the last 12 months are supported: you can report bugs against them, and we fix those bugs in the current or an upcoming release, so you might need to upgrade to get a fix. Security patches are released only for the current minor release and the previous minor release. To keep receiving security fixes, stay on one of the two most recent minor releases. For help planning an upgrade, contact your HumanSignal representative.

!!! note
    The release notes for Label Studio Community Edition are available from the <a href="https://github.com/HumanSignal/label-studio/releases">Label Studio GitHub repository</a>.

`;

  const finalString = frontmatter + wrappedPages;

  //writing to file
  fs.writeFile("source/guide/release_notes.md", finalString, (err) => {
    console.log(err);
  });
});
