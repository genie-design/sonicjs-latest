import {
  createMergeableStore,
  Id,
  IdAddedOrRemoved,
  MergeableStore,
} from "tinybase";
import { createDurableObjectStoragePersister } from "tinybase/persisters/persister-durable-object-storage";
import { WsServerDurableObject } from "tinybase/synchronizers/synchronizer-ws-server-durable-object";
import { handleApiRequest } from "./api";
import { defaultSonicSchemas, sonicSchema } from "./sonicSchema";
// Whether to persist data in the Durable Object between client sessions.
//
// If false, the Durable Object only provides synchronization between clients
// (which are assumed to persist their own data).
const PERSIST_TO_DURABLE_OBJECT = true;

export class TinyBaseDurableObject extends WsServerDurableObject {
  store: MergeableStore | undefined;
  async fetch(request: Request) {
    // const allEntries = await this.ctx.storage.list();
    // console.log(allEntries);
    // console.log("Durable Object Fetch", {
    //   clients: this.getClientIds(),
    // });
    // if (this.getClientIds().length > 0) {
    //   console.log("path", this.getPathId());
    // }
    if (request.url.includes("storage-keys")) {
      return new Response(JSON.stringify(await this.ctx.storage.list()));
    } else if (request.url.includes("__api__")) {
      return handleApiRequest(request, { store: this.store });
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
    if (this.store && pathId === "sonicSchemas") {
      console.log("SET SCHEMA");
      console.log(this.store.getContent());
      const schema = sonicSchema();
      this.store.setTablesSchema(schema);

      if (!this.store.hasTable("sonicSchemas")) {
        console.log("SET DEFAULT SCHEMA");
        const schemas = defaultSonicSchemas();
        this.store.setTable("sonicSchemas", {
          "0": {
            id: 0,
            schemaId: "users",
            schemaName: "Users",
            tinybaseSchema: JSON.stringify(schemas.users),
          },
          "1": {
            id: 1,
            schemaId: "tabletopGames",
            schemaName: "Tabletop Games",
            tinybaseSchema: JSON.stringify(schemas.tabletopGames),
          },
        });
        console.log("SET DEFAULT SCHEMA", this.store.getContent());
      }
    }
  }

  onClientId(pathId: Id, clientId: Id, addedOrRemoved: IdAddedOrRemoved) {
    console.info(
      (addedOrRemoved > 0 ? "Added" : "Removed") +
        ` client ${clientId} on path ${pathId}`
    );
  }

  createPersister() {
    if (PERSIST_TO_DURABLE_OBJECT) {
      this.store = this.store ?? createMergeableStore();

      return createDurableObjectStoragePersister(this.store, this.ctx.storage);
    }
  }
}

const getClientId = (request: Request): Id | null =>
  request.headers.get("upgrade")?.toLowerCase() == "websocket"
    ? request.headers.get("sec-websocket-key")
    : null;

const PATH_REGEX = /\/([^?]*)/;
const getPathId = (request: Request): Id => {
  let pathname = new URL(request.url).pathname;
  if (request.url.includes("__api__")) {
    const pathParts = pathname.split("/");
    const apiIndex = pathParts.indexOf("__api__");
    pathname = pathParts.slice(0, apiIndex).join("/");
  }
  const pathId = pathname.match(PATH_REGEX)?.[1] ?? "";
  console.log("pathId", { pathname, pathId });
  return pathId;
};
const getWsServerDurableObjectFetch =
  <Namespace extends string>(namespace: Namespace) =>
  (
    request: Request,
    env: {
      [namespace in Namespace]: DurableObjectNamespace<WsServerDurableObject>;
    }
  ) => {
    const DO = env[namespace];
    if (!DO) {
      return new Response(`Durable Object ${namespace} not found`, {
        status: 404,
      });
    }
    if (getClientId(request) || request.url.includes("__api__")) {
      const id = DO.idFromName(getPathId(request));
      return DO.get(id).fetch(request);
    } else {
      return new Response("Upgrade required", { status: 426 });
    }
  };

export default {
  fetch: async (
    request: Request,
    env: {
      TinyBaseDurableObject: DurableObjectNamespace<
        WsServerDurableObject<unknown>
      >;
      JWT_SECRET: string;
      DB: D1Database;
    }
  ) => {
    return getWsServerDurableObjectFetch("TinyBaseDurableObject")(request, env);
  },
};
