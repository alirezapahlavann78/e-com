/**
 * Generates the Prisma 7 client without the Prisma CLI.
 *
 * The Prisma CLI needs a native `schema-engine` binary that is downloaded from
 * binaries.prisma.sh. Sandboxed/offline environments cannot reach that host, so
 * this script:
 *   1. parses the schema with Prisma's WASM schema parser (`getInternalDMMF`),
 *   2. runs Prisma's official TypeScript client generator,
 *   3. applies a small CommonJS compatibility patch (`import.meta` -> `__dirname`)
 *      because the API is compiled to CommonJS.
 *
 * On a machine with normal network access `pnpm prisma generate` produces the
 * same output; both are safe to use.
 */
import { createRequire } from "node:module";
import { readFileSync, writeFileSync, rmSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(here, "..");

const schemaPath = join(packageRoot, "prisma", "schema.prisma");
const outputDir = join(packageRoot, "generated");

const { getDMMF } = require("@prisma/internals");
const { generateClient } = require("@prisma/client-generator-ts");

const datamodel = readFileSync(schemaPath, "utf8");

function main() {
  rmSync(outputDir, { recursive: true, force: true });
  mkdirSync(outputDir, { recursive: true });

  return getDMMF({ datamodel }).then((dmmf) =>
    generateClient({
      datamodel,
      schemaPath,
      runtimeBase: "@prisma/client/runtime",
      outputDir,
      generator: {
        name: "client",
        provider: { value: "prisma-client", fromEnvVar: null },
        output: { value: outputDir, fromEnvVar: null },
        config: {},
        binaryTargets: [],
        previewFeatures: [],
        sourceFilePath: schemaPath,
      },
      dmmf,
      datasources: [{ name: "db", provider: "postgresql", activeProvider: "postgresql", url: null }],
      binaryPaths: {},
      engineVersion: "0.0.0",
      clientVersion: "7.10.1",
      activeProvider: "postgresql",
      target: "nodejs",
      generatedFileExtension: "ts",
      importFileExtension: "",
      moduleFormat: "esm",
      tsNoCheckPreamble: false,
      compilerBuild: "fast",
    }),
  );
}

function patchForCommonJs() {
  const clientFile = join(outputDir, "client.ts");
  if (!existsSync(clientFile)) throw new Error("generated client.ts missing");
  let source = readFileSync(clientFile, "utf8");
  source = source.replace(
    /import \* as process from 'node:process'\nimport \* as path from 'node:path'\nimport \{ fileURLToPath \} from 'node:url'\nglobalThis\['__dirname'\] = path\.dirname\(fileURLToPath\(import\.meta\.url\)\)\n/,
    "/* CommonJS build: `__dirname` is provided natively by Node. */\n",
  );
  writeFileSync(clientFile, source);
}

await main();
patchForCommonJs();
console.log("✔ Prisma client generated at packages/db/generated");
