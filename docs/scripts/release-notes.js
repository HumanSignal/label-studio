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

!!! note 
    The release notes for Label Studio Community Edition are available from the <a href="https://github.com/HumanSignal/label-studio/releases">Label Studio GitHub repository</a>.

!!! note 
    Before upgrading, review the steps outlined in [Upgrade Label Studio Enterprise](upgrade_enterprise) and ensure that you complete the recommended tests after each upgrade. 

`;

  const finalString = frontmatter + wrappedPages;

  //writing to file
  fs.writeFile("source/guide/release_notes.md", finalString, (err) => {
    console.log(err);
  });
});
