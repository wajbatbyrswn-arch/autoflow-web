export interface Ctx {
  userId: string;
}

type Handler = (ctx: Ctx, payload: any) => Promise<any> | any;

const handlers = new Map<string, Handler>();

export function register(channel: string, fn: Handler) {
  handlers.set(channel, fn);
}

export function registerAll(map: Record<string, Handler>) {
  for (const [channel, fn] of Object.entries(map)) handlers.set(channel, fn);
}

export async function dispatch(channel: string, ctx: Ctx, payload: any) {
  const fn = handlers.get(channel);
  if (!fn) throw new Error(`Unknown channel: ${channel}`);
  return fn(ctx, payload);
}
