/**
 * Resolve project soft Data Manager column defaults (FIT-2846 / FIT-2808).
 *
 * Precedence for newly created tabs only:
 *   explicit customization > project dm_column_defaults > catalog visibility_defaults
 *
 * Existing saved / URL / browser tabs are never rewritten by these helpers.
 */

export const DM_COLUMN_ROLE_CODES = ["OW", "AD", "MA", "AN", "RE"];

/** SDK / AuthProvider may pass enum names (`OWNER`) or API codes (`OW`). */
const ROLE_NAME_TO_CODE = {
  OWNER: "OW",
  ADMIN: "AD",
  ADMINISTRATOR: "AD",
  MANAGER: "MA",
  ANNOTATOR: "AN",
  REVIEWER: "RE",
};

/**
 * @param {string | null | undefined} role
 * @returns {string | null} OW|AD|MA|AN|RE
 */
export function resolveRoleCode(role) {
  if (!role || typeof role !== "string") return null;
  if (DM_COLUMN_ROLE_CODES.includes(role)) return role;
  return ROLE_NAME_TO_CODE[role] ?? null;
}

/**
 * Strip the DM target prefix (`tasks:`) to match Settings/API catalog aliases (`id`, `data.text`).
 * @param {string} runtimeId
 */
export function runtimeIdToAlias(runtimeId) {
  if (!runtimeId || typeof runtimeId !== "string") return runtimeId;
  const idx = runtimeId.indexOf(":");
  return idx === -1 ? runtimeId : runtimeId.slice(idx + 1);
}

/**
 * @param {string} alias
 * @param {string} [target="tasks"]
 */
export function aliasToRuntimeId(alias, target = "tasks") {
  if (!alias || typeof alias !== "string") return alias;
  if (alias.includes(":")) return alias;
  return `${target}:${alias}`;
}

/**
 * Leaf columns the grid can show (excludes group parents and filter-only `hidden` columns).
 * @param {Array<{ id: string, children?: string[], hidden?: boolean, target?: string }>} columns
 */
export function eligibleLeafColumns(columns = []) {
  return (columns ?? []).filter((column) => {
    if (!column?.id) return false;
    if (Array.isArray(column.children) && column.children.length > 0) return false;
    if (column.hidden === true) return false;
    return true;
  });
}

/**
 * @param {{ order?: string[], visible?: Record<string, string[]> } | null | undefined} surface
 * @returns {boolean}
 */
export function surfaceHasProjectDefaults(surface) {
  if (!surface || typeof surface !== "object") return false;
  if (Array.isArray(surface.order) && surface.order.length > 0) return true;
  const visible = surface.visible ?? {};
  // An empty visible list is still an intentional soft default (hide everything eligible).
  return DM_COLUMN_ROLE_CODES.some((code) => Array.isArray(visible[code]));
}

/**
 * Pick the visible-alias list for a role. FIT-2845 writes the same list to every public role,
 * so if the exact role key is missing we fall back to the first populated role list.
 *
 * @param {{ visible?: Record<string, string[]> } | null | undefined} surface
 * @param {string | null} roleCode
 * @returns {string[] | null} null when no project visibility list exists
 */
export function pickVisibleAliases(surface, roleCode) {
  const visible = surface?.visible ?? {};
  if (roleCode && Array.isArray(visible[roleCode])) {
    return visible[roleCode];
  }
  for (const code of DM_COLUMN_ROLE_CODES) {
    if (Array.isArray(visible[code])) return visible[code];
  }
  return null;
}

/**
 * Build hidden-column lists for explore/labeling from project soft defaults.
 * Stale aliases are ignored. Columns named in the saved visible/order sets follow that set;
 * brand-new eligible columns (not mentioned in saved defaults) keep catalog visibility so we
 * never silently hide newly introduced data columns, and never force-show role-gated ones.
 *
 * @returns {{ explore: string[], labeling: string[] } | null} null → caller should keep catalog defaults
 */
export function resolveHiddenColumnsFromProjectDefaults({ surface, role, columns, catalogDefaultHidden } = {}) {
  const roleCode = resolveRoleCode(role);
  const visibleAliases = pickVisibleAliases(surface, roleCode);

  if (visibleAliases === null) {
    return catalogDefaultHidden
      ? {
          explore: [...(catalogDefaultHidden.explore ?? [])],
          labeling: [...(catalogDefaultHidden.labeling ?? [])],
        }
      : null;
  }

  const leaves = eligibleLeafColumns(columns);
  const orderAliases = Array.isArray(surface?.order) ? surface.order : [];
  const mentionedAliases = new Set([...orderAliases, ...visibleAliases]);
  const visibleRuntime = new Set(
    visibleAliases.map((alias) => aliasToRuntimeId(alias)).filter((id) => leaves.some((leaf) => leaf.id === id)),
  );
  // Unmentioned columns follow explore catalog only — labeling hides nearly everything by default,
  // and must not leak into explore (would silently hide newly introduced data columns).
  const catalogHiddenExplore = new Set(catalogDefaultHidden?.explore ?? []);

  const hidden = [];
  for (const leaf of leaves) {
    const alias = runtimeIdToAlias(leaf.id);
    if (visibleRuntime.has(leaf.id)) continue;
    if (mentionedAliases.has(alias)) {
      hidden.push(leaf.id);
      continue;
    }
    // New eligible column not covered by saved defaults → catalog soft default.
    if (catalogHiddenExplore.has(leaf.id)) hidden.push(leaf.id);
  }

  return {
    explore: hidden,
    // Explore soft defaults do not redefine labeling; keep the catalog's minimal labeling set.
    labeling: [...(catalogDefaultHidden?.labeling ?? [])],
  };
}

/**
 * Build a columnOrder map (runtime id → index) from project soft order.
 * Stale aliases ignored; new eligible columns appended after the ordered ones (catalog relative order).
 *
 * @returns {Record<string, number> | null}
 */
export function resolveColumnOrderFromProjectDefaults({ surface, columns } = {}) {
  const leaves = eligibleLeafColumns(columns);
  if (leaves.length === 0) return null;

  const savedOrder = Array.isArray(surface?.order) ? surface.order : [];
  const leafIds = leaves.map((leaf) => leaf.id);
  const leafSet = new Set(leafIds);

  const ordered = [];
  for (const alias of savedOrder) {
    const runtimeId = aliasToRuntimeId(alias);
    if (leafSet.has(runtimeId) && !ordered.includes(runtimeId)) {
      ordered.push(runtimeId);
    }
  }

  for (const id of leafIds) {
    if (!ordered.includes(id)) ordered.push(id);
  }

  if (ordered.length === 0) return null;

  /** @type {Record<string, number>} */
  const orderMap = { select: 0 };
  ordered.forEach((id, index) => {
    orderMap[id] = index + 1;
  });
  orderMap["show-source"] = ordered.length + 1;
  return orderMap;
}

/**
 * Snapshot fields for a newly created tab when project defaults apply.
 * Returns `{}` when the flag is off or there is nothing to apply (caller keeps catalog path).
 *
 * @param {{
 *   enabled?: boolean,
 *   defaults?: { explore?: object, labeling?: object } | null,
 *   surface?: "explore" | "labeling",
 *   role?: string | null,
 *   columns?: Array,
 *   catalogDefaultHidden?: { explore?: string[], labeling?: string[] } | null,
 *   hasCustomization?: boolean,
 * }} params
 */
export function projectDefaultsForNewTab({
  enabled = false,
  defaults = null,
  surface = "explore",
  role = null,
  columns = [],
  catalogDefaultHidden = null,
  hasCustomization = false,
} = {}) {
  if (!enabled || hasCustomization) return {};

  const surfaceDefaults = defaults?.[surface] ?? null;
  if (!surfaceHasProjectDefaults(surfaceDefaults)) return {};

  const hiddenColumns = resolveHiddenColumnsFromProjectDefaults({
    surface: surfaceDefaults,
    role,
    columns,
    catalogDefaultHidden,
  });

  const columnOrder = resolveColumnOrderFromProjectDefaults({
    surface: surfaceDefaults,
    columns,
  });

  const result = {};
  if (hiddenColumns) result.hiddenColumns = hiddenColumns;
  if (columnOrder) result.columnOrder = columnOrder;
  return result;
}
