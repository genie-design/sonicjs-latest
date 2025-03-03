import { useState, useEffect } from "react";
import {
  useCreateMergeableStore,
  useCreatePersister,
  useCreateSynchronizer,
  useTable,
} from "tinybase/ui-react";
import { createMergeableStore } from "tinybase";
import { createLocalPersister } from "tinybase/persisters/persister-browser";
import ReconnectingWebSocket from "reconnecting-websocket";
import { createWsSynchronizer } from "tinybase/synchronizers/synchronizer-ws-client";

const SERVER_SCHEME = "ws://";
const SERVER = "localhost:8787";
export const useSonicSchemas = () => {
  const store = useCreateMergeableStore(() => createMergeableStore());
  const persister = useCreatePersister(
    store,
    (store) => {
      return createLocalPersister(store, "sonicSchemas");
    },
    [],
    async (persister) => {
      await persister.startAutoLoad();
      await persister.startAutoSave();
    },
  );
  const synchronizer = useCreateSynchronizer(store, async (store) => {
    const ws = new ReconnectingWebSocket(
      `${SERVER_SCHEME}${SERVER}/sonicSchemas`,
    );
    const synchronizer = await createWsSynchronizer(store, ws);
    await synchronizer.startSync();
    // If the websocket reconnects in the future, do another explicit sync.
    synchronizer.getWebSocket().addEventListener("open", () => {
      synchronizer.load().then(() => synchronizer.save());
    });
    return synchronizer;
  });
  const [schemas, setSchemas] = useState<
    {
      id: number;
      schemaId: string;
      schemaName: string;
      tinybaseSchema: string;
    }[]
  >([]);
  const table = useTable("sonicSchemas", store);

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
  return { store, persister, synchronizer, schemas };
};
