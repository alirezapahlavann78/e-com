/**
 * Minimal Prisma-schema -> PostgreSQL DDL generator.
 *
 * Why this exists: `prisma migrate` requires Prisma's native schema engine
 * binary, which is downloaded from binaries.prisma.sh at install time. In
 * network-restricted/sandboxed environments that download is unavailable, so
 * this script derives a deterministic baseline DDL straight from
 * `prisma/schema.prisma` using only Node.js.
 *
 * Where the Prisma CLI is available (`pnpm prisma migrate dev`), you can use
 * regular migrations instead; the output of this script is equivalent for the
 * constructs used by this schema (enums, models, relations, indexes, defaults).
 */
import { readFileSync } from "node:fs";

const SCALARS = {
  String: "TEXT",
  Int: "INTEGER",
  BigInt: "BIGINT",
  Float: "DOUBLE PRECISION",
  Decimal: (args) => (args ? `DECIMAL(${args.replace(/\s+/g, "")})` : "DECIMAL(65,30)"),
  Boolean: "BOOLEAN",
  DateTime: "TIMESTAMP(3)",
  Json: "JSONB",
  Bytes: "BYTEA",
};

function stripComments(src) {
  return src
    .split("\n")
    .filter((line) => !line.trim().startsWith("//"))
    .join("\n");
}

function splitBlocks(src, keyword) {
  const blocks = [];
  const re = new RegExp(`^${keyword}\\s+(\\w+)\\s*\\{([\\s\\S]*?)^\\}`, "gm");
  let m;
  while ((m = re.exec(src))) blocks.push({ name: m[1], body: m[2] });
  return blocks;
}

function parseAttributes(input) {
  const out = [];
  let i = 0;
  while ((i = input.indexOf("@", i)) !== -1) {
    let j = i + 1;
    let name = "";
    while (j < input.length && /[A-Za-z0-9_.]/.test(input[j])) {
      name += input[j];
      j += 1;
    }
    let args = null;
    if (input[j] === "(") {
      let depth = 0;
      let k = j;
      for (; k < input.length; k += 1) {
        if (input[k] === "(") depth += 1;
        else if (input[k] === ")") {
          depth -= 1;
          if (depth === 0) break;
        }
      }
      args = input.slice(j + 1, k);
      j = k + 1;
    }
    out.push({ name, args });
    i = j;
  }
  return out;
}

const listFrom = (args, key) => {
  if (!args) return [];
  const m =
    args.match(new RegExp(`${key}\\s*:\\s*\\[([^\\]]*)\\]`)) ?? args.match(/^\s*\[([^\]]*)\]/);
  if (!m) return [];
  return m[1]
    .split(",")
    .map((v) => v.trim().replace(/\s*\(.*$/, ""))
    .filter(Boolean);
};

const optionFrom = (args, key) => {
  if (!args) return null;
  const m = args.match(new RegExp(`\\b${key}\\s*:\\s*([A-Za-z_]+)`));
  return m ? m[1] : null;
};

function quoteIdent(name) {
  return `"${name}"`;
}

function mapDefault(value, type, enumValues) {
  if (value === "now()") return "CURRENT_TIMESTAMP";
  if (value === "true" || value === "false") return value.toUpperCase();
  if (/^-?\d+(\.\d+)?$/.test(value)) return value;
  if (value === "[]") return type === "TEXT[]" ? "ARRAY[]::TEXT[]" : null;
  const str = value.match(/^"(.*)"$/);
  if (str) return `'${str[1].replace(/'/g, "''")}'`;
  if (enumValues?.includes(value)) return `'${value}'`;
  // cuid() / uuid() / nanoid() are generated client-side by Prisma.
  return null;
}

export function parseSchema(schemaSource) {
  const src = stripComments(schemaSource);
  const enums = splitBlocks(src, "enum").map(({ name, body }) => ({
    name,
    values: body
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean),
  }));
  const enumMap = new Map(enums.map((e) => [e.name, e.values]));
  const models = splitBlocks(src, "model").map(({ name, body }) => {
    const fields = [];
    const blockAttributes = [];
    for (const rawLine of body.split("\n")) {
      const line = rawLine.trim();
      if (!line) continue;
      if (line.startsWith("@@")) {
        blockAttributes.push(...parseAttributes(line.replace(/^@@/, "@")));
        continue;
      }
      if (line.startsWith("@")) continue;
      const m = line.match(/^(\w+)\s+([A-Za-z0-9_]+)(\[\])?(\?)?\s*([\s\S]*)$/);
      if (!m) continue;
      fields.push({
        name: m[1],
        type: m[2],
        list: Boolean(m[3]),
        optional: Boolean(m[4]),
        attrs: parseAttributes(m[5] ?? ""),
      });
    }
    return { name, fields, blockAttributes };
  });

  return { enums, enumMap, models };
}

function columnTypeOf(field, enumMap) {
  const isEnum = enumMap.has(field.type);
  let type;
  if (isEnum) type = quoteIdent(field.type);
  else {
    const dbType = field.attrs.find((a) => a.name === "db.Decimal");
    type = typeof SCALARS[field.type] === "function" ? SCALARS[field.type](dbType?.args) : SCALARS[field.type];
  }
  if (field.list) type += "[]";
  const defaultAttr = field.attrs.find((a) => a.name === "default");
  const defaultValue = defaultAttr
    ? mapDefault(defaultAttr.args ?? "", type, isEnum ? enumMap.get(field.type) : undefined)
    : null;
  return { type, defaultValue };
}

/**
 * Flat list of every physical column the Prisma schema expects, used to repair
 * schema drift (e.g. a column added to the schema after the database was first
 * created) without dropping data.
 */
export function schemaColumns(schemaSource) {
  const { models, enumMap } = parseSchema(schemaSource);
  const columns = [];
  for (const model of models) {
    for (const field of model.fields) {
      const isEnum = enumMap.has(field.type);
      const isScalar = Object.prototype.hasOwnProperty.call(SCALARS, field.type);
      if (!isEnum && !isScalar) continue; // relation field: no column of its own
      const { type, defaultValue } = columnTypeOf(field, enumMap);
      const isId = field.attrs.some((a) => a.name === "id");
      columns.push({
        table: model.name,
        column: field.name,
        type,
        defaultValue,
        notNull: isId || !field.optional,
        isId,
      });
    }
  }
  return columns;
}

export function schemaToSql(schemaSource) {
  const { enums, enumMap, models } = parseSchema(schemaSource);

  const statements = [];
  for (const e of enums) {
    statements.push(`CREATE TYPE ${quoteIdent(e.name)} AS ENUM (${e.values.map((v) => `'${v}'`).join(", ")});`);
  }

  const foreignKeys = [];
  const indexes = [];

  for (const model of models) {
    const columns = [];
    const pk = [];
    for (const field of model.fields) {
      const rel = field.attrs.find((a) => a.name === "relation");
      const relFields = rel ? listFrom(rel.args, "fields") : [];
      const isEnum = enumMap.has(field.type);
      const isScalar = Object.prototype.hasOwnProperty.call(SCALARS, field.type);
      if (!isEnum && !isScalar) {
        // Relation field: emit the foreign key, no column of its own.
        if (!rel || !relFields.length) continue;
        const refs = listFrom(rel.args, "references");
        if (relFields.length !== refs.length) throw new Error(`Relation mismatch on ${model.name}.${field.name}`);
        const targetModel = models.find((x) => x.name === field.type);
        if (!targetModel) throw new Error(`Unknown relation target ${field.type} on ${model.name}.${field.name}`);
        const onDelete = optionFrom(rel.args, "onDelete") ?? (field.optional ? "SetNull" : "Restrict");
        const onUpdate = optionFrom(rel.args, "onUpdate") ?? "Cascade";
        foreignKeys.push(
          `ALTER TABLE ${quoteIdent(model.name)} ADD CONSTRAINT ${quoteIdent(
            `${model.name}_${relFields.join("_")}_fkey`,
          )} FOREIGN KEY (${relFields.map(quoteIdent).join(", ")}) REFERENCES ${quoteIdent(field.type)}( ${refs
            .map(quoteIdent)
            .join(", ")} ) ON DELETE ${cpAction(onDelete)} ON UPDATE ${cpAction(onUpdate)};`,
        );
        continue;
      }

      let columnType;
      if (isEnum) columnType = quoteIdent(field.type);
      else {
        const dbType = field.attrs.find((a) => a.name === "db.Decimal");
        columnType = typeof SCALARS[field.type] === "function" ? SCALARS[field.type](dbType?.args) : SCALARS[field.type];
      }
      if (field.list) columnType += "[]";

      const defaultAttr = field.attrs.find((a) => a.name === "default");
      const defaultValue = defaultAttr ? mapDefault(defaultAttr.args ?? "", columnType, isEnum ? enumMap.get(field.type) : undefined) : null;
      const isId = field.attrs.some((a) => a.name === "id");

      const parts = [quoteIdent(field.name), columnType];
      if (isId) {
        parts.push("NOT NULL");
        pk.push(field.name);
      } else if (!field.optional) {
        parts.push("NOT NULL");
      }
      if (defaultValue) parts.push(`DEFAULT ${defaultValue}`);
      columns.push(parts.join(" "));

      const unique = field.attrs.find((a) => a.name === "unique");
      if (unique) {
        indexes.push(
          `CREATE UNIQUE INDEX ${quoteIdent(`${model.name}_${field.name}_key`)} ON ${quoteIdent(model.name)}(${quoteIdent(field.name)});`,
        );
      }

    }

    for (const attr of model.blockAttributes) {
      if (attr.name === "id") {
        pk.push(...listFrom(attr.args, "id"));
      }
      if (attr.name === "unique") {
        const cols = listFrom(attr.args, "unique");
        indexes.push(
          `CREATE UNIQUE INDEX ${quoteIdent(`${model.name}_${cols.join("_")}_key`)} ON ${quoteIdent(model.name)}(${cols
            .map(quoteIdent)
            .join(", ")});`,
        );
      }
      if (attr.name === "index") {
        const cols = listFrom(attr.args, "index");
        const mapName = optionFrom(attr.args, "map");
        indexes.push(
          `CREATE INDEX ${quoteIdent(mapName ?? `${model.name}_${cols.join("_")}_idx`)} ON ${quoteIdent(model.name)}(${cols
            .map(quoteIdent)
            .join(", ")});`,
        );
      }
    }

    const pkClause = pk.length ? `,\n  CONSTRAINT ${quoteIdent(`${model.name}_pkey`)} PRIMARY KEY (${pk.map(quoteIdent).join(", ")})` : "";
    statements.push(`CREATE TABLE ${quoteIdent(model.name)} (\n  ${columns.join(",\n  ")}${pkClause}\n);`);
  }

  return [...statements, ...foreignKeys, ...indexes].join("\n");
}

function cpAction(action) {
  switch (action) {
    case "Cascade":
      return "CASCADE";
    case "SetNull":
      return "SET NULL";
    case "SetDefault":
      return "SET DEFAULT";
    case "NoAction":
      return "NO ACTION";
    default:
      return "RESTRICT";
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const schemaPath = process.argv[2] ?? new URL("../prisma/schema.prisma", import.meta.url).pathname;
  process.stdout.write(schemaToSql(readFileSync(schemaPath, "utf8")));
}
