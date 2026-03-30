import path from "node:path";
import { fileURLToPath } from "node:url";
import configure from "@humansignal/frontend-test/configure";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default configure(undefined, undefined, { rootDir: __dirname });
