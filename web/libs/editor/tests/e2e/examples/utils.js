const xml2js = require('xml2js');
const builder = require('xmlbuilder');
const OPTIONS = {
  headless: true,
  explicitChildren: true,
  preserveChildrenOrder: true,
  charsAsChildren: true,
};

function parseXml(doc) {
  let document;
  const parser = new xml2js.Parser(OPTIONS);

  parser.parseString(doc, function(err, result) {
    document = result;
  });
  return document;
}
function renderXml(doc) {
  const rootName = Object.keys(doc)[0];
  const xml = builder.create(rootName, null, null, { headless: true });
  const renderChildren = function(nodes, xml) {
    nodes.forEach(node => {
      const elem = xml.ele(node['#name']);

      if (node.$) Object.keys(node.$).forEach(key => elem.att(key, node.$[key]));
      if (node.$$) renderChildren(node.$$, elem);
    });
  };

  renderChildren(doc[rootName].$$, xml);
  return xml.end({ pretty: true });
}

function countRegionsInResult(result) {
  return result.reduce(
    (res, r) => {
      if ((!res.ids[r.id] && Object.keys(r.value).length > 1) || !!r.value.points) {
        res.count++;
        res.ids[r.id] = true;
      }
      return res;
    },
    { count: 0, ids: {} },
  ).count;
}

function xmlForEachNode(tree, cb) {
  function forEachNode(node) {
    cb(node);
    if (node.$$) {
      node.$$.forEach(childNode => forEachNode(childNode));
    }
  }
  forEachNode(Object.values(tree)[0]);
}

function xmlFilterNodes(tree, cb) {
  function filterChildren(node) {
    cb(node);
    if (node.$$) {
      node.$$ = node.$$.filter(childNode => {
        if (!cb(childNode)) return false;
        filterChildren(childNode);
        return true;
      });
    }
  }
  const rootNode = Object.values(tree)[0];

  if (cb(rootNode)) {
    filterChildren(rootNode);
  }
  return {};
}

function xmlTreeHasTag(tree, tagName) {
  return xmlFindBy(tree, node => node['#name'] === tagName);
}

function xmlFindBy(tree, cb) {
  function findBy(node) {
    if (cb(node)) return node;
    return !!node.$$ && node.$$.find(childNode => findBy(childNode));
  }
  const rootNode = Object.values(tree)[0];

  return findBy(rootNode);
}

module.exports = {
  parseXml,
  renderXml,
  xmlForEachNode,
  xmlFindBy,
  xmlTreeHasTag,
  xmlFilterNodes,
  countRegionsInResult,
};
