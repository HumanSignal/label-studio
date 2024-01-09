/**
 * hexo-tag-details
 * https://github.com/hinastory/hexo-tag-details.git
 * Copyright (c) 2019, hinastory
 * Licensed under the MIT license.
 * Syntax:
 *   {% details [mode:open/close] summary text %}
 *   detail text
 *   {% enddetails %}
 **/

"use strict";
const util = require("hexo-util");
const config = hexo.config.tag_details;
const className = config && config.className ? config.className : false;
const openSetting = config && config.open ? config.open : false;

hexo.extend.tag.register("details", tagDetails, { ends: true });

function tagDetails(args, content) {
  let isOpen = (e) => e === "mode:open";
  let isClose = (e) => e === "mode:close";
  let isMode = (e) => isOpen(e) || isClose(e);

  let filtered = args.filter((e) => !isMode(e));
  let modeFlag = isOpen(args.find((e) => isMode(e)));

  let openMode = filtered.length < args.length ? modeFlag : openSetting;
  let summary = util.htmlTag("summary", {}, filtered.join(" "), false);
  let rendered = hexo.render.renderSync({ text: content, engine: "markdown" });
  let attrs = {};

  if (openMode) attrs.open = "open";
  if (className) attrs.class = className;

  return util.htmlTag("details", attrs, summary + rendered, false);
}
