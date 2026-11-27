// Emits the .d.ts tree for dist/design-sync/ui (tsconfig.dts.json).
//
// libs/ui has pre-existing type errors; those don't block declaration emit.
// Declaration-emit errors (TS4xxx) DO: tsc silently skips that file's .d.ts,
// which drops the component from the sync. PATCHES fixes those in memory only
// (source files on disk are never touched) - each entry must still match, or
// the build fails so the patch gets revisited.
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const here = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(here, "../..");

const PATCHES = {
  // TS4023: Dropdown's static `Trigger` uses the non-exported DropdownTriggerProps.
  "libs/ui/src/lib/dropdown/dropdown-trigger.tsx": [
    ["\ninterface DropdownTriggerProps ", "\nexport interface DropdownTriggerProps "],
  ],
};

const parsed = ts.getParsedCommandLineOfConfigFile(
  path.join(here, "tsconfig.dts.json"),
  {},
  {
    ...ts.sys,
    onUnRecoverableConfigFileDiagnostic: (d) => {
      throw new Error(ts.flattenDiagnosticMessageText(d.messageText, "\n"));
    },
  },
);

const host = ts.createCompilerHost(parsed.options);
const patchByFile = new Map(Object.entries(PATCHES).map(([rel, edits]) => [path.join(webRoot, rel), edits]));
const readFile = host.readFile.bind(host);
let stale = 0;
host.readFile = (file) => {
  let text = readFile(file);
  const edits = patchByFile.get(path.resolve(file));
  if (edits && text != null) {
    for (const [from, to] of edits) {
      if (!text.includes(from)) {
        console.error(`! dts patch no longer applies: ${path.relative(webRoot, file)}: ${JSON.stringify(from.trim())}`);
        stale++;
      }
      text = text.replace(from, to);
    }
  }
  return text;
};

const program = ts.createProgram({ rootNames: parsed.fileNames, options: parsed.options, host });
const emitted = [];
const result = program.emit(
  undefined,
  (file, data) => {
    ts.sys.writeFile(file, data);
    emitted.push(file);
  },
  undefined,
  true,
);

const all = [...ts.getPreEmitDiagnostics(program), ...result.diagnostics];
const declErrors = all.filter((d) => d.code >= 4000 && d.code < 5000);
for (const d of declErrors) {
  const where = d.file ? `${path.relative(webRoot, d.file.fileName)}: ` : "";
  console.error(`! declaration emit error TS${d.code}: ${where}${ts.flattenDiagnosticMessageText(d.messageText, " ")}`);
}
console.error(`dts: ${emitted.length} files emitted, ${all.length} pre-existing type diagnostics (non-blocking)`);
if (stale || declErrors.length) process.exit(1);
