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

export const App = () => {
  const serverPathId = '/tinybase/path';

  const store = useCreateMergeableStore(createMergeableStore);

  useCreatePersister(
    store,
    (store) => createLocalPersister(store, 'local://' + SERVER + serverPathId),
    [],
    async (persister) => {
      await persister.startAutoLoad([
        {
          pets: { '0': { name: 'fido', species: 'dog' } },
          species: {
            dog: { price: 5 },
            cat: { price: 4 },
            fish: { price: 2 },
            worm: { price: 1 },
            parrot: { price: 3 },
          },
        },
        { counter: 0 },
      ]);
      await persister.startAutoSave();
    },
  );

  const websocket = new ReconnectingWebSocket(
    SERVER_SCHEME + SERVER + serverPathId,
  );
  // useCreateSynchronizer(store, async (store: MergeableStore) => {
  //   // ['Authorization', 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyaWQiOiIzMjlhOTlkYy00YjllLTQwOTQtYmJkMC0wZTE4MjcyNzE1ZmEiLCJlbWFpbCI6ImNAYy5jb20iLCJleHAiOjE3NDE5OTczNjI5MTEsImlhdCI6MTc0MDE3MDc5Mn0.eGI0m1cv71vuKL18EceZsDwhyV1CIlIIy2fJ49mYHBc']
  //   const synchronizer = await createWsSynchronizer(
  //     store,
  //     new ReconnectingWebSocket(SERVER_SCHEME + SERVER + serverPathId),
  //     1,
  //   );
  //   await synchronizer.startSync();

  //   // If the websocket reconnects in the future, do another explicit sync.
  //   synchronizer.getWebSocket().addEventListener('open', () => {
  //     synchronizer.load().then(() => synchronizer.save());
  //   });

  //   return synchronizer;
  // });

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
