import { verify } from "@tsndr/cloudflare-worker-jwt";
import {
  createMergeableStore,
  Id,
  IdAddedOrRemoved,
  MergeableStore,
} from "tinybase";
import { createDurableObjectStoragePersister } from "tinybase/persisters/persister-durable-object-storage";
import { WsServerDurableObject } from "tinybase/synchronizers/synchronizer-ws-server-durable-object";
import { handleApiRequest } from "./api";
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
    console.log("Durable Object Fetch", {
      clients: this.getClientIds(),
    });
    if (this.getClientIds().length > 0) {
      console.log("path", this.getPathId());
    }
    if (request.url.includes("storage-keys")) {
      return new Response(JSON.stringify(await this.ctx.storage.list()));
    } else if (request.url.includes("__api__")) {
      return handleApiRequest(request, { store: this.store });
    }
    return super.fetch?.(request) || new Response("Not found", { status: 404 });
  }

  onMessage(fromClientId: Id, toClientId: Id, remainder: string): void {
    console.log("MESSAGE:", { fromClientId, toClientId, remainder });
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
      console.log("id", id);
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
    console.log("URL:", request.url);
    const token = new URL(request.url).searchParams.get("token");
    if (token) {
      // const decoded = await verifyToken(token, env.JWT_SECRET, env.DB);
      // console.log(decoded);
    }
    return getWsServerDurableObjectFetch("TinyBaseDurableObject")(request, env);
  },
};

async function verifyToken(token: string, secret: string, DB: D1Database) {
  try {
    const decoded = await verify<JWTPayload>(token, secret);
    // console.log("decoded", decoded);
    if (!decoded?.payload) throw new Error("Invalid token");
    const sessions = await DB.prepare("SELECT * FROM user_keys").all();
    // console.log("sessions", sessions);
    const key = await DB.prepare(
      "SELECT * FROM user_keys WHERE provider = ? AND provider_user_id = ?"
    )
      .bind("SINGLE_WS", token)
      .first();
    // console.log("key", key);
    if (!key) throw new Error("Invalid token");

    await DB.prepare(
      "DELETE FROM user_keys WHERE provider = ? AND provider_user_id = ?"
    )
      .bind("SINGLE_WS", token)
      .run();

    console.log("key.user_id", key.user_id);
    if (key.user_id !== decoded.payload.userid)
      throw new Error("Invalid token");

    const user = await DB.prepare("SELECT * FROM users WHERE id = ?")
      .bind(key.user_id)
      .first();
    return user;
  } catch (error) {
    console.error("Error verifying token", error);
  }
}
interface JWTPayload {
  userid: string;
  email: string | null;
  exp: number;
}
