import React, { StrictMode } from 'react';
import ReconnectingWebSocket from 'reconnecting-websocket';
import { createMergeableStore, type MergeableStore } from 'tinybase';
import { createLocalPersister } from 'tinybase/persisters/persister-browser';
import { createWsSynchronizer } from 'tinybase/synchronizers/synchronizer-ws-client';
import {
  Provider,
  useCreateMergeableStore,
  useCreatePersister,
  useCreateSynchronizer,
} from 'tinybase/ui-react';
import {
  SortedTableInHtmlTable,
  ValuesInHtmlTable,
} from 'tinybase/ui-react-dom';
import { Inspector } from 'tinybase/ui-react-inspector';
import { Buttons } from './Buttons';
const SERVER_SCHEME = 'ws://';
const SERVER = 'localhost:8787';
const serverPathId = '/tinybase/path';
const debug = false;
const getSessionToken = async () => {
  const res = await fetch('/api/auth/single-use-ws-token');
  const data = await res.json<{ success: boolean; token: string }>();
  return data?.token;
};
const urlProvider = async () => {
  const token = await getSessionToken();
  return `${SERVER_SCHEME}${SERVER}${serverPathId}?token=${token}`;
};
export const TinybaseApp = () => {
  const store = useCreateMergeableStore(createMergeableStore);
  window.store = store;
  // useCreatePersister(
  //   store,
  //   (store) => createLocalPersister(store, 'local://' + SERVER + serverPathId),
  //   [],
  //   async (persister) => {
  //     await persister.startAutoLoad([
  //       {
  //         pets: { '0': { name: 'fido', species: 'dog' } },
  //         species: {
  //           dog: { price: 5 },
  //           cat: { price: 4 },
  //           fish: { price: 2 },
  //           worm: { price: 1 },
  //           parrot: { price: 3 },
  //         },
  //       },
  //       { counter: 0 },
  //     ]);
  //     await persister.startAutoSave();
  //   },
  // );

  useCreateSynchronizer(store, async (store: MergeableStore) => {
    const ws = new ReconnectingWebSocket(urlProvider, undefined, {
      debug,
    });
    const synchronizer = await createWsSynchronizer(store, ws, 1);
    await synchronizer.startSync();

    // If the websocket reconnects in the future, do another explicit sync.
    synchronizer.getWebSocket().addEventListener('open', () => {
      synchronizer.load().then(() => synchronizer.save());
    });

    return synchronizer;
  });

  return (
    <StrictMode>
      <Provider store={store}>
        <header>
          <h1>TinyBase & Synchronization</h1>
          To demonstrate synchronization,{' '}
          <a href={serverPathId}>open this exact URL</a> in multiple incognito
          browser windows, or even other browsers altogether.
        </header>
        <Buttons />
        <div>
          <h2>Values</h2>
          <ValuesInHtmlTable />
        </div>
        <div>
          <h2>Pets Table</h2>
          <SortedTableInHtmlTable
            tableId="pets"
            cellId="name"
            limit={5}
            sortOnClick={true}
            className="sortedTable"
            paginator={true}
          />
        </div>
        <Inspector />
      </Provider>
    </StrictMode>
  );
};
