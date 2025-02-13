type UserSchema = import("@/db/schema/users").UserSelectSchema;
type Auth = import("./auth/auth").Auth;
type Logger = import("pino").Logger;
// use a default runtime configuration (advanced mode).
type Runtime = import("@astrojs/cloudflare").Runtime<Env>;
type KVNamespace = import("@cloudflare/workers-types").KVNamespace;
type ENV = {
  DB: D1Namespace;
};

declare namespace App {
  interface Locals extends Runtime {
    user: UserSchema | null;
    auth: Auth;
    logger: Logger;
  }
}
