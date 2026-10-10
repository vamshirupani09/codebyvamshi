import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";


type RunInput = {
  language_id: number;
  source_code: string;
  stdin?: string;
};

type Judge0Response = {
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  message: string | null;
  status: { id: number; description: string } | null;
  time: string | null;
  memory: number | null;
};

type RunCodeResult = {
  ok: boolean;
  stdout: string;
  stderr: string;
  compile_output: string;
  message: string;
  status: string;
  statusId: number;
  time: string;
  memory: string;
  error?: string;
};

const PROVIDER_TIMEOUT_MS = 8_000;
const TOTAL_RUN_TIMEOUT_MS = 12_000;
const RUN_CACHE_TTL_MS = 15_000;
const RUN_CACHE_MAX_ENTRIES = 100;

const runCache = new Map<string, { expiresAt: number; result: RunCodeResult }>();

const b64 = (s: string) => Buffer.from(s, "utf-8").toString("base64");
const unb64 = (s: string | null | undefined) =>
  s ? Buffer.from(s, "base64").toString("utf-8") : "";

const runnerError = (error: string): RunCodeResult => ({
  ok: false,
  stdout: "",
  stderr: "",
  compile_output: "",
  message: "",
  status: "Runner unavailable",
  statusId: 0,
  time: "",
  memory: "",
  error,
});

const formatJudge0 = (j: Judge0Response): RunCodeResult => ({
  ok: true,
  stdout: unb64(j.stdout),
  stderr: unb64(j.stderr),
  compile_output: unb64(j.compile_output),
  message: j.message ?? "",
  status: j.status?.description ?? "Unknown",
  statusId: j.status?.id ?? 0,
  time: j.time ? `${j.time}s` : "",
  memory: j.memory ? `${(j.memory / 1024).toFixed(1)} MB` : "",
});

type Provider = {
  name: string;
  url: string;
  headers: Record<string, string>;
};

/**
 * Try a Judge0-compatible provider. Returns:
 *  - RunCodeResult on success
 *  - { retry: true, reason } when the caller should try the next provider
 *  - RunCodeResult (ok:false) for terminal errors
 */
async function tryProvider(
  p: Provider,
  body: object,
  timeoutMs: number,
): Promise<RunCodeResult | { retry: true; reason: string }> {
  let res: Response;
  let timedOut = false;
  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => {
      timedOut = true;
      ctrl.abort();
    }, timeoutMs);
    try {
      res = await fetch(p.url, {
        method: "POST",
        headers: { "content-type": "application/json", ...p.headers },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    return { retry: true, reason: timedOut ? `${p.name} timed out` : `${p.name} unreachable` };
  }

  if (!res.ok) {
    if (res.status === 401 || res.status === 403 || res.status === 429 || res.status >= 500) {
      return { retry: true, reason: `${p.name} ${res.status}` };
    }
    const text = await res.text().catch(() => "");
    return runnerError(`Runner error ${res.status}: ${text.slice(0, 200)}`);
  }

  try {
    const j = (await res.json()) as Judge0Response;
    return formatJudge0(j);
  } catch {
    return { retry: true, reason: `${p.name} bad response` };
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));


export const runCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const i = input as RunInput;
    if (!i || typeof i.language_id !== "number" || typeof i.source_code !== "string") {
      throw new Error("Invalid input");
    }
    if (i.source_code.length > 100_000) throw new Error("Code too long");
    return {
      language_id: i.language_id,
      source_code: i.source_code,
      stdin: typeof i.stdin === "string" ? i.stdin : "",
    };
  })
  .handler(async ({ data, context }) => {
    const inputKey = JSON.stringify([context.userId, data.language_id, data.source_code, data.stdin]);
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(inputKey));
    const cacheKey = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
    const now = Date.now();
    for (const [key, entry] of runCache) {
      if (entry.expiresAt <= now) runCache.delete(key);
    }
    const cached = runCache.get(cacheKey);
    if (cached && cached.expiresAt > now) return { ...cached.result };

    const key = process.env.RAPIDAPI_JUDGE0_KEY;

    const providers: Provider[] = [];
    // 1) Preferred: RapidAPI Judge0 CE (when a key is configured)
    if (key) {
      providers.push({
        name: "rapidapi",
        url: "https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=true&wait=true&fields=*",
        headers: {
          "x-rapidapi-key": key,
          "x-rapidapi-host": "judge0-ce.p.rapidapi.com",
        },
      });
    }
    // 2) Fallback: public Judge0 CE instance (no key required, best-effort)
    providers.push({
      name: "ce.judge0",
      url: "https://ce.judge0.com/submissions?base64_encoded=true&wait=true&fields=*",
      headers: {},
    });

    const body = {
      language_id: data.language_id,
      source_code: b64(data.source_code),
      stdin: b64(data.stdin),
    };

    const reasons: string[] = [];
    const runStartedAt = Date.now();
    for (const p of providers) {
      const remainingMs = TOTAL_RUN_TIMEOUT_MS - (Date.now() - runStartedAt);
      if (remainingMs <= 0) {
        reasons.push(`${p.name} skipped (time budget exhausted)`);
        break;
      }
      const r = await tryProvider(p, body, Math.min(PROVIDER_TIMEOUT_MS, remainingMs));
      if ("retry" in r) {
        reasons.push(r.reason);
        continue;
      }
      if (r.ok && r.statusId !== 1 && r.statusId !== 2) {
        if (runCache.size >= RUN_CACHE_MAX_ENTRIES) {
          const oldestKey = runCache.keys().next().value;
          if (oldestKey) runCache.delete(oldestKey);
        }
        runCache.set(cacheKey, { expiresAt: Date.now() + RUN_CACHE_TTL_MS, result: r });
      }
      return r;
    }

    if (reasons.length > 0 && reasons.every((reason) => /timed out|time budget exhausted/i.test(reason))) {
      return {
        ...runnerError("Execution timed out. The runner did not respond within the time limit. Please try again."),
        status: "Execution timed out",
      };
    }

    return runnerError(
      `Code runners are temporarily unavailable (${reasons.join(", ")}). Please retry in a moment.`,
    );
  });
