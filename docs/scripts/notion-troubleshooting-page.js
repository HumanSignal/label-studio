const { Client } = require("@notionhq/client")
const { NotionToMarkdown } = require("notion-to-md");
const fs = require('hexo-fs');

const notion = new Client({
  auth: "secret_SeBGJj4SOW2aTiRg3S8n80d0y6VcHiMJSXypXbx7zLy",
})

hexo.extend.filter.register('after_init', async function(){
  console.log("Load notion page");
  const n2m = new NotionToMarkdown({ notionClient: notion });

  const mdblocks = await n2m.pageToMarkdown("63747447eb084eb9a4da18753b43cc39");
  const mdString = n2m.toMarkdownString(mdblocks);

  const formatted = mdString.replaceAll("---", "");

const frontmatter = `---
title: Notion FAQ
short: Notion FAQ
type: guide
tier: enterprise
order: 99
section: "Get started"
---`

  const finalString = frontmatter + formatted;

  //writing to file
  fs.writeFile("source/guide/notion-faq.md", finalString, (err) => {
    console.log(err);
  });

});