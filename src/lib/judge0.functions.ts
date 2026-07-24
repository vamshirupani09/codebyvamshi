import { createServerFn } from "@tanstack/react-start";

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
): Promise<RunCodeResult | { retry: true; reason: string }> {
  let res: Response;
  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 25_000);
    res = await fetch(p.url, {
      method: "POST",
      headers: { "content-type": "application/json", ...p.headers },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    clearTimeout(timeout);
  } catch {
    return { retry: true, reason: `${p.name} unreachable` };
  }

  if (!res.ok) {
    if (res.status === 401 || res.status === 403 || res.status === 429) {
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

export const runCode = createServerFn({ method: "POST" })
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
  .handler(async ({ data }) => {
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
    for (const p of providers) {
      const r = await tryProvider(p, body);
      if ("retry" in r) {
        reasons.push(r.reason);
        continue;
      }
      return r;
    }

    return runnerError(
      `Code runners are temporarily unavailable (${reasons.join(", ")}). Please retry in a moment.`,
    );
  });
