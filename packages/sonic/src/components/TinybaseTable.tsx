"use client";
import React, { useEffect, useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type SortingState,
  type ColumnDef,
} from "@tanstack/react-table";
import { type TablesSchema, createMergeableStore } from "tinybase";
import { useSonicSchemas } from "@/hooks/useSonicSchemas";
import ReconnectingWebSocket from "reconnecting-websocket";
import { createLocalPersister } from "tinybase/persisters/persister-browser";
import { createWsSynchronizer } from "tinybase/synchronizers/synchronizer-ws-client";
import {
  useCreateMergeableStore,
  useCreatePersister,
  useCreateSynchronizer,
} from "tinybase/ui-react";
import { cn } from "@/lib/utils";
interface DataTableProps<TData> {
  schemaId: string;
  onRowClick?: (row: TData) => void;
}

const SERVER_SCHEME = "ws://";
const SERVER = "localhost:8787";
export function TinybaseTable<TData extends Record<string, unknown>>({
  schemaId,
  onRowClick,
}: DataTableProps<TData>) {
  const { schemas } = useSonicSchemas();
  const [schema, setSchema] = useState<(typeof schemas)[number]>();

  useEffect(() => {
    if (schemas) {
      setSchema(schemas.find((schema) => schema.schemaId === schemaId));
    }
  }, [schemas]);

  const schemaDefinition = useMemo<TablesSchema | null>(() => {
    if (schema) {
      return JSON.parse(schema.tinybaseSchema)?.[schemaId];
    }
    return null;
  }, [schema]);

  const store = useCreateMergeableStore(() => createMergeableStore());
  useCreatePersister(
    store,
    (store) => {
      return createLocalPersister(store, schemaId);
    },
    [],
    async (persister) => {
      await persister.startAutoLoad();
      await persister.startAutoSave();
    },
  );
  useCreateSynchronizer(store, async (store) => {
    const ws = new ReconnectingWebSocket(
      `${SERVER_SCHEME}${SERVER}/${schemaId}`,
    );
    const synchronizer = await createWsSynchronizer(store, ws);
    await synchronizer.startSync();
    // If the websocket reconnects in the future, do another explicit sync.
    synchronizer.getWebSocket().addEventListener("open", () => {
      synchronizer.load().then(() => synchronizer.save());
    });
    return synchronizer;
  });

  const [sorting, setSorting] = React.useState<SortingState>([]);

  const columns = useMemo(() => {
    const cols: ColumnDef<TData>[] = [];

    // Generate columns based on the table definition
    if (schemaDefinition) {
      Object.entries(schemaDefinition).forEach(([key]) => {
        cols.push({
          id: key,
          accessorKey: key,
          header: () => (
            <span className="text-base font-semibold">
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </span>
          ),
          cell: (info) => (
            <span className="text-sm">{String(info.getValue())}</span>
          ),
        });
      });
    }

    return cols;
  }, [schemaDefinition]);

  const data = useMemo(() => {
    if (!schemaDefinition) return [];

    // Create mock data based on schema
    const mockData: TData[] = [];

    for (let i = 0; i < 20; i++) {
      const row: Record<string, unknown> = {};

      Object.entries(schemaDefinition).forEach(([key, definition]) => {
        const def = definition as any;

        switch (def.type) {
          case "number":
            if (key === "id") {
              row[key] = i + 1;
            } else {
              row[key] = Math.floor(Math.random() * 1000);
            }
            break;
          case "string":
            if (key === "first-name" || key === "firstName") {
              row[key] = [
                "John",
                "Jane",
                "Alex",
                "Sarah",
                "Michael",
                "Emma",
                "David",
                "Olivia",
              ][i % 8];
            } else if (key === "last-name" || key === "lastName") {
              row[key] = [
                "Smith",
                "Johnson",
                "Williams",
                "Brown",
                "Jones",
                "Miller",
                "Davis",
                "Garcia",
              ][i % 8];
            } else if (key === "email") {
              const firstName = [
                "john",
                "jane",
                "alex",
                "sarah",
                "michael",
                "emma",
                "david",
                "olivia",
              ][i % 8];
              const lastName = [
                "smith",
                "johnson",
                "williams",
                "brown",
                "jones",
                "miller",
                "davis",
                "garcia",
              ][i % 8];
              row[key] = `${firstName}.${lastName}@example.com`;
            } else if (key === "role") {
              row[key] = i % 5 === 0 ? "admin" : "user";
            } else if (key === "createdAt" || key === "updatedAt") {
              // Generate a date within the last year
              const date = new Date();
              date.setDate(date.getDate() - Math.floor(Math.random() * 365));
              row[key] = date.toISOString();
            } else {
              // Generic string value
              row[key] = `Sample ${key} ${i + 1}`;
            }
            break;
          case "boolean":
            row[key] = i % 3 === 0 ? false : true;
            break;
          default:
            // For any other types, create a sensible default
            if (typeof def.default !== "undefined") {
              row[key] = def.default;
            } else {
              row[key] = `${key}-${i + 1}`;
            }
        }
      });

      mockData.push(row as TData);
    }

    return mockData;
  }, [schemaDefinition]);
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="bg-base-100 w-full overflow-x-auto rounded-2xl p-4">
      <table className="table w-full rounded-2xl">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr
              className="bg-base-300 rounded-2xl text-white"
              key={headerGroup.id}
            >
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  onClick={header.column.getToggleSortingHandler()}
                  className="hover:bg-secondary/10 cursor-pointer"
                  role="columnheader"
                  aria-sort={
                    header.column.getIsSorted()
                      ? header.column.getIsSorted() === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                >
                  <div className="flex items-center gap-2">
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
                    <span className="text-xs">
                      {{
                        asc: "↑",
                        desc: "↓",
                      }[header.column.getIsSorted() as string] ?? null}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row, i) => (
            <tr
              key={row.id}
              onClick={() => onRowClick?.(row.original)}
              className={cn(
                onRowClick && "hover:bg-accent cursor-pointer",
                i % 2 === 1 && "bg-secondary/10",
              )}
              role="row"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onRowClick?.(row.original);
                }
              }}
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} role="cell">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 flex items-center justify-between gap-2">
        <div className="join">
          <button
            className="join-item btn btn-sm"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            aria-label="First page"
          >
            {"<<"}
          </button>
          <button
            className="join-item btn btn-sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            aria-label="Previous page"
          >
            {"<"}
          </button>
          <button
            className="join-item btn btn-sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            aria-label="Next page"
          >
            {">"}
          </button>
          <button
            className="join-item btn btn-sm"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
            aria-label="Last page"
          >
            {">>"}
          </button>
        </div>

        <span className="text-sm">
          Page {table.getState().pagination.pageIndex + 1} of{" "}
          {table.getPageCount()}
        </span>

        <select
          className="select select-sm select-bordered w-20"
          value={table.getState().pagination.pageSize}
          onChange={(e) => {
            table.setPageSize(Number(e.target.value));
          }}
          aria-label="Rows per page"
        >
          {[10, 20, 30, 40, 50].map((pageSize) => (
            <option key={pageSize} value={pageSize}>
              {pageSize}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
