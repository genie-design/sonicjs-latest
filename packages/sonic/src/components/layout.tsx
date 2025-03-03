"use client";
import { useSonicSchemas } from "@/hooks/useSonicSchemas";
import Link from "next/link";
export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { schemas } = useSonicSchemas();
  return (
    <div className="grid min-h-screen gap-4 p-4 lg:grid-cols-[200px_1fr] 2xl:grid-cols-[300px_1fr]">
      <div className="flex flex-col gap-4">
        <nav className="hidden space-y-4 lg:block">
          <ul className="menu bg-base-200/50 w-full rounded-2xl">
            <li className="menu-title">Sonic Tinybase</li>

            {schemas?.map((schema) => (
              <li key={schema.id}>
                <Link href={`/admin/data/${schema.schemaId}`}>
                  {schema.schemaName}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="bg-base-200/50 rounded-2xl p-6 backdrop-blur-sm">
          <h2 className="mb-4 text-xl font-bold">Featured</h2>
          <p className="text-base-content/80">
            Discover our latest innovations in local first Content Management
            System technology.
          </p>
        </div>
      </div>

      <main className="bg-secondary flex min-h-[80vh] flex-col gap-8 rounded-3xl p-8 backdrop-blur-sm">
        {children}
      </main>
    </div>
  );
}
