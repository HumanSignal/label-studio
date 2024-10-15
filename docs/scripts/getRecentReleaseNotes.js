var HTMLParser = require("node-html-parser");

hexo.extend.helper.register('getRecentReleaseNotes', function() {

  const compareVersions = (a, b) => {
    const versionRegExp = /(?<x>\d+)?\.(?<y>\d+)?\.(?<z>\d+)?(?<t>\.dev|dev-|-|\.post)?(?<n>\d+)?/;
    const aMatch = a.fileName.match(versionRegExp);
    const bMatch = b.fileName.match(versionRegExp);
    const toInt = (a, d) => a.groups[d]? a.groups[d] * 1 : 0;
    for (let d of ['x', 'y', 'z', 'n']) {
        const aMatchInt = toInt(aMatch, d);
        const bMatchInt = toInt(bMatch, d);
        if (aMatchInt === bMatchInt)
            continue;
        return bMatchInt - aMatchInt;
    }
    return 0
};

  const data = this.site.pages.filter(page => page.source.includes('release_notes') && !page.source.includes('index.md'));

  const releaseNotes = data.map((note) => {

    const fileName = note.source.split("/")[3];
    if(!fileName) return;
  
    const template = HTMLParser.parse(note.content);

    const h2 = template.querySelector("h2")
    const title = h2.text;
    const id = h2.id;

    return {
      fileName,
      title,
      id
    }
  })

  releaseNotes.sort(compareVersions);

  const recentReleaseNotes = releaseNotes.slice(0, 3);

  return recentReleaseNotes;
});
