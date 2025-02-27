import { type TablesSchema, type CellSchema, CellOrUndefined } from "tinybase";

// Type definitions
type TinyBaseType = "string" | "number" | "boolean";

type GenieCellInterface = {
  type: TinyBaseType;
  customKey?: string;
};

type GenieCellSchema =
  | ({ type: "string"; default?: string | (() => string) } & GenieCellInterface)
  | ({ type: "number"; default?: number | (() => number) } & GenieCellInterface)
  | ({
      type: "boolean";
      default?: boolean | (() => boolean);
    } & GenieCellInterface);

/**
 * Column definition class for defining schema columns with type safety
 * @template T The TinyBase data type
 * @template CustomType The custom TypeScript type (optional)
 */
class ColumnDef<T extends TinyBaseType> {
  private config: GenieCellSchema;

  /**
   * Create a new column definition
   * @param type The TinyBase data type
   * @param key Optional custom key to use in the TinyBase schema
   */
  constructor(type: T, key?: string) {
    this.config = { type, customKey: key };
  }

  /**
   * Set a default value for this column
   * @param value The default value or a function that returns the default value
   * @returns The column definition instance for chaining
   */
  default(value: GenieCellSchema["default"]) {
    this.config.default = value;
    return this;
  }

  /**
   * Specify a more specific TypeScript type for this column
   * @template NewType The new TypeScript type
   * @returns The column definition with the new type
   */
  $type<NewType extends CellOrUndefined>(): ColumnDef<T> {
    return this as unknown as ColumnDef<T>;
  }

  getDefault(): CellOrUndefined {
    return typeof this.config.default === "function"
      ? (this.config.default as () => CellOrUndefined)()
      : this.config.default;
  }

  /**
   * Get the TinyBase cell schema configuration
   * @returns The cell schema configuration
   */
  getConfig(): CellSchema {
    return {
      type: this.config.type,
      default: this.getDefault(),
    } as CellSchema;
  }

  /**
   * Get the custom key for this column
   * @returns The custom key if specified
   */
  getKey(): string | undefined {
    return this.config.customKey;
  }
}

/**
 * Create a text (string) column definition
 * @param key Optional custom key to use in the TinyBase schema
 * @returns A new text column definition
 */
export const text = (key?: string) => new ColumnDef<"string">("string", key);

/**
 * Create a number column definition
 * @param key Optional custom key to use in the TinyBase schema
 * @returns A new number column definition
 */
export const number = (key?: string) => new ColumnDef<"number">("number", key);

/**
 * Create a boolean column definition
 * @param key Optional custom key to use in the TinyBase schema
 * @returns A new boolean column definition
 */
export const boolean = (key?: string) =>
  new ColumnDef<"boolean">("boolean", key);

// Type for table definition
type TableDefinition = Record<string, ColumnDef<TinyBaseType>>;

/**
 * Create a TinyBase schema from table definitions
 * @param tables The table definitions
 * @returns A TinyBase schema
 */
export function createSchema(
  tables: Record<string, TableDefinition>
): TablesSchema {
  const schema: TablesSchema = {};

  for (const [tableName, definition] of Object.entries(tables)) {
    const tableSchema: Record<string, CellSchema> = {};

    for (const [columnName, columnDef] of Object.entries(definition)) {
      const config = columnDef.getConfig();
      const key = columnDef.getKey() || columnName;

      tableSchema[key] = config;
    }

    schema[tableName] = tableSchema;
  }

  return schema;
}

// Example usage:
export const userDefinition = {
  id: number(),
  firstName: text("first-name"),
  lastName: text("last-name"),
  email: text(),
  role: text().$type<"admin" | "user">(),
  active: boolean().default(true),
};

export const postDefinition = {
  id: number(),
  title: text(),
  content: text(),
  authorId: number(),
  published: boolean().default(false),
};

// Create the complete schema
export const tables = {
  users: userDefinition,
  posts: postDefinition,
};
