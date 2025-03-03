import { TinybaseTable } from "@/components/TinybaseTable";
import { use } from "react";

export default async function Page(context: {
  params: Promise<{ table: string }>;
}) {
  const { table } = await context.params;
  return (
    <>
      {table && (
        <div>
          <h1 className="text-primary mb-4 text-3xl font-bold">
            {table.charAt(0).toUpperCase() + table.slice(1)}
          </h1>
          <TinybaseTable schemaId={table} />
        </div>
      )}
    </>
  );
}
