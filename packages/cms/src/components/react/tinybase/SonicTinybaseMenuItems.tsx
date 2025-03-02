import { StrictMode } from 'react';
import { useSonicSchemas } from '@/react/hooks/useSonicSchemas';
export default function SonicTinybaseMenuItems() {
  const { schemas } = useSonicSchemas();

  return (
    <StrictMode>
      {schemas?.map((schema) => (
        <li key={schema.id}>
          <a href={`/admin/data/${schema.schemaId}`}>{schema.schemaName}</a>
        </li>
      ))}
    </StrictMode>
  );
}
