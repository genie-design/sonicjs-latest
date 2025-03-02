import React, { useEffect, useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type SortingState,
  type ColumnDef,
} from '@tanstack/react-table';
import type { TablesSchema, MergeableStore } from 'tinybase';
import type { SQLiteColumnBuilderBase } from 'drizzle-orm/sqlite-core';
import { allSchemas, setupStore } from '@/stores/tinybaseSchemas';
import { useStore } from '@nanostores/react';
import { useSonicSchemas } from '@/react/hooks/useSonicSchemas';
interface DataTableProps<TData> {
  schemaId: string;
  onRowClick?: (row: TData) => void;
}

export function TinybaseTable<TData extends Record<string, unknown>>({
  schemaId,
  onRowClick,
}: DataTableProps<TData>) {
  const allSonicSchemas = useStore(allSchemas);
  const [store, setStore] = useState<MergeableStore>();

  useEffect(() => {
    if (allSonicSchemas?.[schemaId]?.store) {
      setStore(allSonicSchemas[schemaId].store);
    }
  }, [allSonicSchemas]);

  const { schemas } = useSonicSchemas();
  const [schema, setSchema] = useState<(typeof schemas)[number]>();
  const schemaDefinition = useMemo<TablesSchema | null>(() => {
    if (schema) {
      return JSON.parse(schema.tinybaseSchema)?.[schemaId];
    }
    return null;
  }, [schema]);
  useEffect(() => {
    if (schemas) {
      setSchema(schemas.find((schema) => schema.schemaId === schemaId));
    }
  }, [schemas]);

  useEffect(() => {
    if (schema) {
      setupStore(schemaId);
    }
  }, [schema]);

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

  const table = useReactTable({
    data: [],
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
    <div className="w-full overflow-x-auto">
      <table className="table-zebra table w-full">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  onClick={header.column.getToggleSortingHandler()}
                  className="hover:bg-base-200 cursor-pointer"
                  role="columnheader"
                  aria-sort={
                    header.column.getIsSorted()
                      ? header.column.getIsSorted() === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : 'none'
                  }
                >
                  <div className="flex items-center gap-2">
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
                    <span className="text-xs">
                      {{
                        asc: '↑',
                        desc: '↓',
                      }[header.column.getIsSorted() as string] ?? null}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              onClick={() => onRowClick?.(row.original)}
              className={onRowClick ? 'hover:bg-base-200 cursor-pointer' : ''}
              role="row"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
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
            {'<<'}
          </button>
          <button
            className="join-item btn btn-sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            aria-label="Previous page"
          >
            {'<'}
          </button>
          <button
            className="join-item btn btn-sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            aria-label="Next page"
          >
            {'>'}
          </button>
          <button
            className="join-item btn btn-sm"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
            aria-label="Last page"
          >
            {'>>'}
          </button>
        </div>

        <span className="text-sm">
          Page {table.getState().pagination.pageIndex + 1} of{' '}
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
