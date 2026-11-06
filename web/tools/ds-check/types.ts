/** One design-system violation, located by its path relative to the web root (`services/<lso|lse>/web`). */
export type Finding = {
  file: string;
  line: number;
  rule: string;
  message: string;
};

/** `{ "<file>": { "<rule>": count } }`, keys sorted. */
export type Counts = Record<string, Record<string, number>>;

/** The slice of `libs/ui/components.manifest.json` the checks read. */
export type ManifestSlice = {
  components: Record<
    string,
    {
      name: string;
      exports: string[];
      replaces: string[];
      deprecated?: { replaced_by: string; reason: string };
    }
  >;
};
