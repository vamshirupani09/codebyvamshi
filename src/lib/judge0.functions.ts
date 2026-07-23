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
    if (!key) {
      return runnerError("Code runner is not configured. Add RAPIDAPI_JUDGE0_KEY in project secrets.");
    }

    const url =
      "https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=true&wait=true&fields=*";
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-rapidapi-key": key,
          "x-rapidapi-host": "judge0-ce.p.rapidapi.com",
        },
        body: JSON.stringify({
          language_id: data.language_id,
          source_code: b64(data.source_code),
          stdin: b64(data.stdin),
        }),
      });
    } catch {
      return runnerError("Could not reach the code runner. Please try again in a moment.");
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (res.status === 429) return runnerError("Rate limit hit on code runner. Try again shortly.");
      if (res.status === 401 || res.status === 403) {
        return runnerError("Code runner rejected the API key. Replace RAPIDAPI_JUDGE0_KEY with a valid Judge0 RapidAPI key.");
      }
      return runnerError(`Runner error ${res.status}: ${text.slice(0, 200)}`);
    }

    const j = (await res.json()) as Judge0Response;
    return {
      ok: true,
      stdout: unb64(j.stdout),
      stderr: unb64(j.stderr),
      compile_output: unb64(j.compile_output),
      message: j.message ?? "",
      status: j.status?.description ?? "Unknown",
      statusId: j.status?.id ?? 0,
      time: j.time ? `${j.time}s` : "",
      memory: j.memory ? `${(j.memory / 1024).toFixed(1)} MB` : "",
    };
  });
