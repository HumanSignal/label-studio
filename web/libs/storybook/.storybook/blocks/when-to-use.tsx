import { XCircleIcon } from "@humansignal/icons";
import { Badge, Message, SimpleCard, Typography } from "@humansignal/ui";
import { Unstyled, useOf } from "@storybook/addon-docs/blocks";
import type { ReactNode } from "react";
import registry from "../../../ui/components.manifest.json";
import type { Manifest, RegistryComponent } from "../../../ui/src/ds-manifest/types";

const manifest = registry as unknown as Manifest;
const components = Object.values(manifest.components);
const norm = (s: string) => s.replace(/[^a-z0-9]/gi, "").toLowerCase();

/** The registry entry for a docs page: `parameters.ds.component`, then the story title segments, then the component name. */
function resolveEntry(title: string | undefined, component: unknown, explicit?: string): RegistryComponent | undefined {
  const candidates: string[] = [];
  if (explicit) candidates.push(explicit);
  for (const segment of (title ?? "").split("/").slice(1).reverse()) candidates.push(segment);
  const fn = component as { displayName?: string; name?: string } | undefined;
  if (fn?.displayName) candidates.push(fn.displayName);
  if (fn?.name) candidates.push(fn.name);
  for (const candidate of candidates.map(norm).filter(Boolean)) {
    const hit =
      components.find((c) => norm(c.name) === candidate) ??
      components.find((c) => c.exports.some((e) => norm(e) === candidate));
    if (hit) return hit;
  }
  return undefined;
}

const labelColor = {
  intent: "text-primary-content",
  use: "text-positive-content",
  never: "text-negative-content",
  props: "text-accent-plum-bold",
  replaces: "text-warning-content",
} as const;

const Row = ({
  label,
  tone,
  extra,
  children,
}: {
  label: string;
  tone: keyof typeof labelColor;
  extra?: ReactNode;
  children: ReactNode;
}) => (
  <div className="flex border-b border-neutral-border-bold last:border-b-0">
    <div className="flex w-1/4 shrink-0 flex-col items-start gap-tight bg-neutral-surface px-base py-tight">
      <Typography variant="label" size="smaller" className={`uppercase ${labelColor[tone]}`}>
        {label}
      </Typography>
      {extra}
    </div>
    <div className="min-w-0 flex-1 bg-neutral-background px-base py-tight">{children}</div>
  </div>
);

const TwoColumns = ({ children }: { children: ReactNode[] }) => (
  <div className={children.length > 1 ? "grid grid-cols-2 gap-base" : "flex flex-col"}>{children}</div>
);

/** "anything clickable (use Button look=string or Toggle)" → the rule plus the replacement in bold. */
const NeverItem = ({ text }: { text: string }) => {
  const match = text.match(/^(.*?)\s*\(use ([^)]+)\)\s*$/);
  return (
    <div className="flex items-start gap-tight">
      <XCircleIcon size={16} weight="bold" className="mt-tightest shrink-0 text-negative-icon" aria-hidden="true" />
      <Typography variant="body" size="small">
        {match ? (
          <>
            {match[1]} → <strong>{match[2]}</strong>
          </>
        ) : (
          text
        )}
      </Typography>
    </div>
  );
};

/** "shape=rounded for states" / "size via the size prop" → the prop name as a badge when the rule starts with one. */
const PropRule = ({ text }: { text: string }) => {
  const match = text.match(/^([a-z][A-Za-z]*)(=|\s+is\b|\s+via\b|\s+only\b|:)(.*)$/);
  if (!match) {
    return (
      <Typography variant="body" size="small">
        {text}
      </Typography>
    );
  }
  return (
    <div className="flex items-start gap-tight">
      <Badge variant="plum" size="small">
        {match[1]}
      </Badge>
      <Typography variant="body" size="small">
        {`${match[2]}${match[3]}`.replace(/^=/, "= ").trim()}
      </Typography>
    </div>
  );
};

const shortPath = (p: string) => {
  if (p.startsWith("jsx:") || p.startsWith("css:")) return p;
  const tree = p.match(/^services\/(lso|lse)\/web\//)?.[1] ?? "";
  const tail = p.split("/").slice(-2).join("/");
  return tree ? `${tree}/…/${tail}` : tail;
};

export const WhenToUse = () => {
  const resolved = useOf("meta") as {
    preparedMeta?: { title?: string; component?: unknown; parameters?: { ds?: { component?: string } } };
  };
  const meta = resolved.preparedMeta;
  const entry = resolveEntry(meta?.title, meta?.component, meta?.parameters?.ds?.component);
  if (!entry) return null;
  const replacedBy = entry.deprecated ? manifest.components[entry.deprecated.replaced_by] : undefined;

  return (
    <Unstyled>
      <div className="ds-manifest flex flex-col gap-tight py-tight text-neutral-content">
        {entry.deprecated ? (
          <Message
            variant="negative"
            title={`Deprecated. Use ${replacedBy?.name ?? entry.deprecated.replaced_by} instead.`}
          >
            {entry.deprecated.reason} Lint bans new imports.
          </Message>
        ) : null}
        <SimpleCard
          title={
            <div className="flex w-full flex-wrap items-center gap-tight px-base py-base">
              <Badge variant="primary" size="small">
                Tier {entry.tier}
                {entry.tier === 1 ? " · canonical" : " · pattern"}
              </Badge>
              <Typography variant="label" size="smaller" className="text-neutral-content-subtle">
                exports
              </Typography>
              {entry.exports.map((e) => (
                <Badge key={e} variant="neutral" size="small">
                  {e}
                </Badge>
              ))}
              <span className="flex-1" />
              <Typography variant="body" size="smallest" className="text-neutral-content-subtle">
                {entry.dir.split("/").pop()}.manifest.ts
              </Typography>
            </div>
          }
          headerClassName="bg-primary-background border-b border-neutral-border-bold"
          flushHeader
          flushContent
          className="overflow-hidden border-neutral-border-bold"
        >
          {entry.intent.length ? (
            <Row label="Intent" tone="intent">
              <div className="flex flex-wrap gap-tight">
                {entry.intent.map((i) => (
                  <Badge key={i} variant="primary" size="small">
                    {i}
                  </Badge>
                ))}
              </div>
            </Row>
          ) : null}
          {entry.use_when ? (
            <Row label="Use when" tone="use">
              <Typography variant="body" size="small">
                {entry.use_when}
              </Typography>
            </Row>
          ) : null}
          {entry.never_when.length ? (
            <Row label="Never" tone="never">
              <TwoColumns>
                {entry.never_when.map((n) => (
                  <NeverItem key={n} text={n} />
                ))}
              </TwoColumns>
            </Row>
          ) : null}
          {entry.props_rules?.length ? (
            <Row label="Props" tone="props">
              <TwoColumns>
                {entry.props_rules.map((r) => (
                  <PropRule key={r} text={r} />
                ))}
              </TwoColumns>
            </Row>
          ) : null}
          {entry.replaces.length ? (
            <Row
              label="Replaces"
              tone="replaces"
              extra={
                <Badge variant="warning" size="small">
                  {entry.replaces.length} to migrate
                </Badge>
              }
            >
              <TwoColumns>
                {entry.replaces.map((r) => (
                  <Typography key={r} variant="body" size="small" className="text-neutral-content-subtle" title={r}>
                    {shortPath(r)}
                  </Typography>
                ))}
              </TwoColumns>
            </Row>
          ) : null}
        </SimpleCard>
      </div>
    </Unstyled>
  );
};
