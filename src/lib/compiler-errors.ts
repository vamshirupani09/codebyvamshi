export type FriendlyError = {
  title: string;
  hint: string;
  retryable: boolean;
};

/**
 * Map a Judge0 status id (plus raw output) to a clear, human explanation.
 * Judge0 status ids: 1 in queue, 2 processing, 3 accepted, 4 wrong answer,
 * 5 time limit exceeded, 6 compilation error, 7-12 runtime errors, 13 internal
 * error, 14 exec format error.
 */
export function explainRunFailure(args: {
  statusId: number;
  status?: string;
  compileOutput?: string;
  stderr?: string;
  message?: string;
  runnerError?: string;
}): FriendlyError | null {
  const { statusId, status = "", compileOutput = "", stderr = "", message = "", runnerError } = args;

  if (runnerError) {
    return {
      title: "The code runner is unavailable",
      hint: "This is a temporary problem with the execution service, not your code. Try running again in a few seconds.",
      retryable: true,
    };
  }

  if (statusId === 3) return null;

  const raw = `${compileOutput}\n${stderr}\n${message}`.toLowerCase();

  if (statusId === 6) {
    return {
      title: "Your code did not compile",
      hint: raw.includes("expected") || raw.includes("';'")
        ? "Look for a missing semicolon, bracket or type in the line shown below."
        : "Check the compiler message below — it points at the first line that could not be understood.",
      retryable: false,
    };
  }

  if (statusId === 5) {
    return {
      title: "Your program ran out of time",
      hint: "It exceeded the time limit — usually an infinite loop, a missing exit condition, or waiting for input that was never provided in the Input box.",
      retryable: false,
    };
  }

  if (statusId === 11 || raw.includes("out of memory") || raw.includes("memory limit")) {
    return {
      title: "Your program used too much memory",
      hint: "Reduce the size of arrays or recursion depth, or free data you no longer need.",
      retryable: false,
    };
  }

  if (statusId >= 7 && statusId <= 12) {
    if (raw.includes("segmentation fault") || raw.includes("sigsegv")) {
      return {
        title: "Your program crashed while running",
        hint: "This is usually an out-of-range index, a null or dangling pointer, or runaway recursion.",
        retryable: false,
      };
    }
    if (raw.includes("dividebyzero") || raw.includes("division by zero") || raw.includes("sigfpe")) {
      return { title: "Division by zero", hint: "Guard the divisor before dividing.", retryable: false };
    }
    if (raw.includes("eoferror") || raw.includes("no line found") || raw.includes("nosuchelement")) {
      return {
        title: "Your program expected input that was not given",
        hint: "Add the values your program reads to the Input / test case box, then run again.",
        retryable: false,
      };
    }
    return {
      title: "Your program stopped with an error",
      hint: "The full error message is below — it names the line and the reason the program stopped.",
      retryable: false,
    };
  }

  if (statusId === 13 || statusId === 14) {
    return {
      title: "The runner could not execute your program",
      hint: "This is a problem on the execution service. Try running again in a moment.",
      retryable: true,
    };
  }

  if (statusId === 0) {
    return {
      title: status || "Execution failed",
      hint: "The run did not complete. Please try again.",
      retryable: true,
    };
  }

  return null;
}

export function explainNetworkFailure(error: unknown): FriendlyError {
  const msg = error instanceof Error ? error.message : "";
  if (/abort|timeout|timed out/i.test(msg)) {
    return {
      title: "The run took too long to respond",
      hint: "The runner did not answer in time. Check your connection and try again.",
      retryable: true,
    };
  }
  if (/network|fetch|failed to fetch|offline/i.test(msg)) {
    return {
      title: "You appear to be offline",
      hint: "Your code is saved locally. Reconnect and run again.",
      retryable: true,
    };
  }
  if (/unauthor|401|403/i.test(msg)) {
    return {
      title: "You need to be signed in to run code",
      hint: "Your session may have expired. Sign in again, then run your code.",
      retryable: false,
    };
  }
  return {
    title: "Your code could not be run right now",
    hint: "Something went wrong on the way to the runner. Please try again.",
    retryable: true,
  };
}
