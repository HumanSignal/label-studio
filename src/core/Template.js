/**
 * Convert JavaScript string in dot notation into an object reference
 * @param {Object} obj
 * @param {*} is
 * @param {*} value
 */
function _index(obj, is, value) {
  if (typeof is === "string") return _index(obj, is.split("."), value);
  else if (is.length === 1 && value !== undefined) return (obj[is[0]] = value);
  else if (is.length === 0) return obj;
  else return _index(obj[is[0]], is.slice(1), value);
}

/**
 *
 * @param {*} variable
 * @param {*} obj
 */
function variableNotation(variable, obj) {
  if (variable.charAt(0) === "$") {
    const n = variable.substring(1);
    return _index(obj, n);
  } else {
    return variable;
  }
}

/**
 * A small templating engine for processing HTML with given data.
 *
 * @see TemplateEngine via MIT Licensed https://github.com/krasimir/absurd/
 *
 * @param {string} html
 * @param {Object} options
 * @returns {*}
 */
function runTemplate(html, options) {
  if (!options) options = {};

  var re = /[$](.+)/g,
    reExp = /(^( )?(var|if|for|else|switch|case|break|{|}|;))(.*)?/g,
    code = "with(obj) { var r=[];\n",
    cursor = 0,
    result,
    match;

  var add = function(line, js) {
    js
      ? (code += line.match(reExp) ? line + "\n" : "r.push(" + line + ");\n")
      : (code += line !== "" ? 'r.push("' + line.replace(/"/g, '\\"') + '");\n' : "");
    return add;
  };

  while ((match = re.exec(html))) {
    add(html.slice(cursor, match.index))(match[1], true);
    cursor = match.index + match[0].length;
  }

  if (!html) return "";

  add(html.substr(cursor, html.length - cursor));
  code = (code + 'return r.join(""); }').replace(/[\r\t\n]/g, " ");

  try {
    result = new Function("obj", code).apply(options, [options]);
  } catch (err) {
    console.error("'" + err.message + "'", " in \n\nCode:\n", code, "\n");
  }

  return result;
}

export { variableNotation, runTemplate, _index };
