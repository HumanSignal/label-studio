const fs = require("hexo-fs");
const concatMd = require("concat-md");

hexo.extend.filter.register("after_init", async function () {
    const compareVersions = (a, b) => {
        const versionRegExp = /(?<x>\d+)\.(?<y>\d+)\.(?<z>\d+)(\.dev|dev-|-)?(?<n>\d+)?/;
        const aMatch = a.match(versionRegExp);
        const bMatch = b.match(versionRegExp);
        for (let d of ['x', 'y', 'z', 'n']) {
            const aMatchInt = aMatch.groups[d]? aMatch.groups[d] * 1 : -1;
            const bMatchInt = bMatch.groups[d]? bMatch.groups[d] * 1 : -1;
            if (aMatchInt === bMatchInt)
                continue;
            if (aMatchInt < 0)
                return 1;
            if (bMatchInt < 0)
                return -1;
            return aMatchInt - bMatchInt;
        }
        return 0
    };

    const markdownFiles = await concatMd.default(
        "source/guide/release_notes/onprem", {sorter: compareVersions}
    );

    const frontmatter = `---
NOTE: Don't change release_notes.md manually, it's automatically built from onprem/*.md files on hexo server run!   

title: On-Premises Release Notes for Label Studio Enterprise
short: On-Prem Release Notes
type: guide
tier: enterprise
order: 0
order_enterprise: 999
section: "Reference"
meta_title: On-premises release notes for Label Studio Enterprise
meta_description: Review new features, enhancements, and bug fixes for on-premises Label Studio Enterprise installations. 
---

!!! note 
    The release notes for Label Studio Community Edition are available from the <a href="https://github.com/HumanSignal/label-studio/releases">Label Studio GitHub repository</a>.

!!! note 
    Before upgrading, review the steps outlined in [Upgrade Label Studio Enterprise](upgrade_enterprise) and ensure that you complete the recommended tests after each upgrade. 

## New helm chart

A common chart for LS and LSE has been released and is available as of LSE version 2.3.x. The chart can be accessed at the following repository: https://github.com/HumanSignal/charts/tree/master/heartex/label-studio.

### Migration Process

The migration process can be performed without any downtime. The steps required to carry out the migration are documented in the migration guide, available at: https://github.com/HumanSignal/charts/blob/master/heartex/label-studio/FAQs.md#label-studio-enterprise-upgrade-from-decommissioned-label-studio-enterprise-helm-chart.

`;

    const finalString = frontmatter + markdownFiles;

    //writing to file
    fs.writeFile("source/guide/release_notes.md", finalString, (err) => {
        console.log(err);
    });
});
