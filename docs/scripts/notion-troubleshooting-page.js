const { Client } = require("@notionhq/client")
const { NotionToMarkdown } = require("notion-to-md");
const fs = require('hexo-fs');
require('dotenv').config()

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
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
hide_menu: true
order: 99
section: "Get started"
layout: "notion"
---`

  const finalString = frontmatter + formatted;

  //writing to file
  fs.writeFile("source/guide/notion-faq.md", finalString, (err) => {
    console.log(err);
  });

});