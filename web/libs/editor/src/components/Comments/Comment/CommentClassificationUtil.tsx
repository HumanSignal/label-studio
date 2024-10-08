import type { TaxonomyItem, SelectedItem, TaxonomyPath } from "../../../components/NewTaxonomy/NewTaxonomy";

export const parseCommentClassificationConfig = (xmlString: string): TaxonomyItem[] => {
  // Assume that there is a single root Taxonomy element for now, which may have multiple
  // TaxonomyItem children.
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, "application/xml");
  const taxonomyItems: TaxonomyItem[] = [];

  const parseItems = (node: Element, depth = 0, path: string[] = []): TaxonomyItem => {
    const value = node.getAttribute("value") || "";
    const newPath = [...path, value];
    const children: TaxonomyItem[] = [];

    node.querySelectorAll(":scope > TaxonomyItem").forEach((childNode) => {
      children.push(parseItems(childNode, depth + 1, newPath));
    });

    return { label: value, children: children.length ? children : undefined, depth, path: newPath };
  };

  const taxonomyRoot = xmlDoc.querySelector("Taxonomy");
  if (taxonomyRoot) {
    taxonomyRoot.querySelectorAll(":scope > TaxonomyItem").forEach((node) => {
      taxonomyItems.push(parseItems(node));
    });
  }
  return taxonomyItems;
};

export const taxonomyPathsToSelectedItems = (paths: TaxonomyPath[] | null): SelectedItem[] =>
  paths
    ? paths.map((path) =>
        path.map((pathElt) => ({
          label: pathElt,
          value: pathElt,
        })),
      )
    : [];
