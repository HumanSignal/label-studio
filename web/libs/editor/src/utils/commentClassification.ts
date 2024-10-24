import type { TaxonomyItem, SelectedItem, TaxonomyPath } from "../components/NewTaxonomy/NewTaxonomy";

export const parseCommentClassificationConfig = (config: string | null): TaxonomyItem[] => {
  /**
   * Assume that there is a single root Taxonomy element for now, which may have multiple
   * TaxonomyItem children, as in this simple example below.
   * <Taxonomy name="default">
   *   <TaxonomyItem value="title">
   *     <TaxonomyItem value="spelling" />
   *     <TaxonomyItem value="grammar" />
   *   </TaxonomyItem>
   *   <TaxonomyItem value="subtitle">
   *     <TaxonomyItem value="spelling" />
   *     <TaxonomyItem value="grammar" />
   *   </TaxonomyItem>
   * </Taxonomy>
   */

  if (!config) {
    return [];
  }

  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(config, "application/xml");
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
        path.map((pathElt: any) => ({
          label: pathElt,
          value: pathElt,
        })),
      )
    : [];

export const COMMENT_TAXONOMY_OPTIONS = { pathSeparator: "/", showFullPath: true };
