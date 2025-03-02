import { useEffect } from 'react';
import { allSchemas, type SonicSchema } from '@/stores/tinybaseSchemas';
import { useStore } from '@nanostores/react';
import { useState } from 'react';
import { useTable } from 'tinybase/ui-react';

export const useSonicSchemas = () => {
  const allSchemasStore = useStore(allSchemas);
  const [sonicSchemas, setSonicSchemas] = useState<SonicSchema>();
  const [schemas, setSchemas] = useState<
    {
      id: number;
      schemaId: string;
      schemaName: string;
      tinybaseSchema: string;
    }[]
  >([]);
  const table = useTable('sonicSchemas', sonicSchemas?.store);

  useEffect(() => {
    if (allSchemasStore.sonicSchemas.store) {
      setSonicSchemas(allSchemasStore.sonicSchemas);
    }
  }, [allSchemasStore]);
  useEffect(() => {
    if (table) {
      setSchemas(
        Object.values(table) as {
          id: number;
          schemaId: string;
          schemaName: string;
          tinybaseSchema: string;
        }[],
      );
    }
  }, [table]);
  return { schemas };
};
