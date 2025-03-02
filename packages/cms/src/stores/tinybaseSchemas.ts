import ReconnectingWebSocket from 'reconnecting-websocket';
import { createMergeableStore, type MergeableStore } from 'tinybase';
import {
  createLocalPersister,
  type LocalPersister,
} from 'tinybase/persisters/persister-browser';
import {
  createWsSynchronizer,
  type WsSynchronizer,
} from 'tinybase/synchronizers/synchronizer-ws-client';
import { deepMap } from 'nanostores';
export type SonicSchema = {
  store?: MergeableStore;
  persister?: LocalPersister;
  ws?: ReconnectingWebSocket;
  synchronizer?: WsSynchronizer<ReconnectingWebSocket>;
};
export const allSchemas = deepMap<Record<string, SonicSchema>>({});
const SERVER_SCHEME = 'ws://';
const SERVER = 'localhost:8787';

export const setupStore = (key: 'sonicSchemas' | string) => {
  const schemas = allSchemas.get();

  if (!schemas[key]) {
    const store = createMergeableStore();
    const persister = createLocalPersister(store, `local://${key}`);
    persister.startAutoLoad([{ schemas: {} }, {}]);
    persister.startAutoSave();
    const ws = new ReconnectingWebSocket(`${SERVER_SCHEME}${SERVER}/${key}`);

    allSchemas.setKey(key, {
      store,
      persister,
      ws,
    });
    const setupSynchronizer = async () => {
      const synchronizer = await createWsSynchronizer(store, ws, 1);
      ws.onopen = () => {
        synchronizer.load().then(() => synchronizer.save());
      };
      allSchemas.setKey(key, {
        ...allSchemas.get()[key],
        synchronizer,
      });
    };
    setupSynchronizer();
  }
};

setupStore('sonicSchemas');
