import type { Cell, CellOrUndefined, CellSchema, TablesSchema } from "tinybase";
import type { Relationships } from "tinybase/relationships";

// Types for our schema builders
export type SchemaBuilderBase<T extends Cell> = {
  default: (
    value: CellOrUndefined | (() => CellOrUndefined)
  ) => SchemaBuilderBase<T>;
  $type: <U extends Cell>() => SchemaBuilderBase<U>;
  schemaType: T;
  defaultValue?: CellOrUndefined;
  id?: string; // For alternative column ID
  _type: T;
};

// Type for remote row ID getter function
export type RemoteRowIdGetter = (
  getCell: (cellId: string) => CellOrUndefined,
  localRowId: string
) => string;

// Relationship builder type
export type RelationBuilderBase<
  LocalT extends Cell = Cell,
  RemoteT extends Cell = Cell,
> = {
  relationshipId: string;
  localTableId: string;
  remoteTableId: string;
  getRemoteRowId: string | RemoteRowIdGetter;
  localSchema: SchemaBuilderBase<LocalT>;
  remoteSchema: SchemaBuilderBase<RemoteT>;
  // Method to use a custom function for deriving the remote row ID
  withCustomMapping: (
    fn: RemoteRowIdGetter
  ) => RelationBuilderBase<LocalT, RemoteT>;
};

// Base builder factory
const createBuilder = <T extends Cell>(
  type: T,
  id?: string
): SchemaBuilderBase<T> => {
  const builder: SchemaBuilderBase<T> = {
    default: (value) => {
      builder.defaultValue = typeof value === "function" ? value() : value;
      return builder;
    },
    $type: <U extends Cell>() => builder as unknown as SchemaBuilderBase<U>,
    schemaType: "any" as T,
    _type: type,
    ...(id ? { id } : {}),
  };

  return builder;
};

// Schema builder functions
export const text = (id?: string) => createBuilder("string", id);

export const number = (id?: string) => createBuilder("number", id);

export const boolean = (id?: string) => createBuilder("boolean", id);

// Function to convert our schema to TinyBase schema
export function createSchema<T extends Record<string, SchemaBuilderBase<any>>>(
  tableName: string,
  schema: T
): TablesSchema {
  const rowSchema: TablesSchema[string] = {};

  // Convert each field to TinyBase schema format
  for (const [key, builder] of Object.entries(schema)) {
    const columnId = builder.id || key;

    rowSchema[columnId] = {
      type: builder._type,
      default: builder.defaultValue,
    };
  }

  return {
    [tableName]: rowSchema,
  };
}

// Convenience function to create and apply schema to a store
export function applySchemas<T extends Record<string, SchemaBuilderBase<any>>>(
  store: {
    setTablesSchema: (schema: TablesSchema) => void;
  },
  schemas: Record<string, T>
): void {
  let tinybaseSchemas: TablesSchema = {};
  for (const [tableName, schema] of Object.entries(schemas)) {
    tinybaseSchemas = {
      ...tinybaseSchemas,
      ...createSchema(tableName, schema),
    };
  }

  store.setTablesSchema(tinybaseSchemas);
}
