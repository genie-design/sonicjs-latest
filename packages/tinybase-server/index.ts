import { verify } from "@tsndr/cloudflare-worker-jwt";
import {
  createMergeableStore,
  Id,
  IdAddedOrRemoved,
  MergeableStore,
} from "tinybase";
import { createDurableObjectStoragePersister } from "tinybase/persisters/persister-durable-object-storage";
import {
  getWsServerDurableObjectFetch,
  WsServerDurableObject,
} from "tinybase/synchronizers/synchronizer-ws-server-durable-object";

// Whether to persist data in the Durable Object between client sessions.
//
// If false, the Durable Object only provides synchronization between clients
// (which are assumed to persist their own data).
const PERSIST_TO_DURABLE_OBJECT = false;

export class TinyBaseDurableObject extends WsServerDurableObject {
  store: MergeableStore | undefined;
  async fetch(request: Request) {
    // const allEntries = await this.ctx.storage.list();
    // console.log(allEntries);
    console.log("Durable Object Fetch", {
      // path: this.getPathId(),
      clients: this.getClientIds(),
    });
    if (this.getClientIds().length > 0) {
      console.log("path", this.getPathId());
    }
    if (this.store) {
      // console.log("SCHEMA");
      // console.log(this.store.getTablesSchemaJson());
      console.log("CONTENT");
      console.log("--------------------------------");
      console.log(JSON.stringify(this.store.getContent()));
      console.log("--------------------------------");
      // console.log("TABLES");
      // this.store.forEachTable((tableId, forEachRow) => {
      //   console.log(tableId);
      //   forEachRow((rowId) => console.log(`- ${rowId}`));
      // });
      // console.log("TABLE CELLS");
      // this.store.forEachTableCell("pets", (cellId, count) => {
      //   console.log(`${cellId}: ${count}`);
      // });
      // console.log("ROWS");
      // this.store.forEachRow("pets", (rowId, forEachCell) => {
      //   console.log(rowId);
      //   forEachCell((cellId) => console.log(`- ${cellId}`));
      // });
      // console.log("CELLS");
      // this.store.forEachCell("pets", "1", (cellId, cell) => {
      //   console.log(`${cellId}: ${cell}`);
      // });
      // console.log("VALUES");
      // this.store.forEachValue((valueId, value) => {
      //   console.log(`${valueId}: ${value}`);
      // });
    }
    return super.fetch?.(request) || new Response("Not found", { status: 404 });
  }

  onMessage(fromClientId: Id, toClientId: Id, remainder: string): void {
    // console.log("MESSAGE:", { fromClientId, toClientId, remainder });
  }

  onPathId(pathId: Id, addedOrRemoved: IdAddedOrRemoved) {
    console.info(
      (addedOrRemoved > 0 ? "Added" : "Removed") + ` path ${pathId}`
    );
  }

  onClientId(pathId: Id, clientId: Id, addedOrRemoved: IdAddedOrRemoved) {
    console.info(
      (addedOrRemoved > 0 ? "Added" : "Removed") +
        ` client ${clientId} on path ${pathId}`
    );
  }

  createPersister() {
    if (PERSIST_TO_DURABLE_OBJECT) {
      console.log("STORAGE CREATED");
      this.store = this.store ?? createMergeableStore();
      return createDurableObjectStoragePersister(this.store, this.ctx.storage);
    }
  }
}

const tinybaseFetch = getWsServerDurableObjectFetch("TinyBaseDurableObject");
export default {
  fetch: async (
    request: Request,
    env: {
      TinyBaseDurableObject: DurableObjectNamespace<
        WsServerDurableObject<unknown>
      >;
      JWT_SECRET: string;
    }
  ) => {
    console.log("URL:", request.url);
    const token = new URL(request.url).searchParams.get("token");
    if (token) {
      const decoded = await verifyToken(token, env.JWT_SECRET);
      console.log(decoded);
    }
    return tinybaseFetch(request, env);
  },
};

async function verifyToken(token: string, secret: string) {
  const decoded = verify<JWTPayload>(token, secret);
  if (!decoded) throw new Error("Invalid token");
  return decoded;
}
interface JWTPayload {
  userid: string;
  email: string | null;
  exp: number;
}
