import { delay as sleep } from "@std/async/delay";

import { pyChars, pyLen, pySlice, ValueError } from "./_compat.ts";
import { MarkovTyper } from "./typer.ts";

function mean(values: number[]): number {
  return values.reduce((acc, value) => acc + value, 0) / values.length;
}

function std(values: number[]): number {
  const mean_time = mean(values);
  const variance = values.reduce(
    (acc, value) => acc + (value - mean_time) ** 2,
    0,
  ) / values.length;
  return Math.sqrt(variance);
}

export function _demo_replay_text(
  current_output: string,
  text: string,
): string {
  if (text.startsWith(current_output)) {
    // We added characters (Normal typing or swap)
    return pySlice(text, pyLen(current_output));
  } else if (current_output.startsWith(text)) {
    // We removed characters (Backspacing)
    const removed_part = pySlice(current_output, pyLen(text));
    let output = "";
    for (const char of pyChars(removed_part).reverse()) {
      if (char === "\n") {
        // Move cursor up one line
        output += "\x1b[A";
        // Find the length of the line we are moving up to
        const lines = text.split("\n");
        const last_line_len = lines.length ? pyLen(lines[lines.length - 1]) : 0;
        // Move cursor to the end of that line (1-based column)
        output += `\x1b[${last_line_len + 1}G`;
      } else {
        output += "\b \b";
      }
    }
    return output;
  } else {
    // Divergence (e.g. middle-string correction)
    // Fallback: Clear block and redraw
    const prev_lines = Array.from(current_output.matchAll(/\n/g)).length;
    return `${prev_lines > 0 ? `\x1b[${prev_lines}A` : ""}\r\x1b[J${text}`;
  }
}

/**
 * Runs `n_simulations` to estimate typing time distribution.
 */
export function run_monte_carlo(
  target_text: string,
  wpm: number,
  n_simulations = 100,
): number[] {
  const times: number[] = [];
  console.log(
    `Running ${n_simulations} simulations for text: '${target_text}' (Target WPM: ${wpm})`,
  );

  const start_global = performance.now() / 1000;

  for (let i = 0; i < n_simulations; i++) {
    const typer = new MarkovTyper(target_text, wpm);
    const [total_time] = typer.run();
    times.push(total_time);
  }

  const end_global = performance.now() / 1000;

  const mean_time = mean(times);
  const std_time = std(times);
  if (times.length === 0) {
    throw new ValueError(
      "zero-size array to reduction operation minimum which has no identity",
    );
  }
  const min_time = Math.min(...times);
  const max_time = Math.max(...times);

  console.log("\n--- Monte Carlo Results ---");
  console.log(`Estimated Mean Time : ${mean_time.toFixed(4)} s`);
  console.log(`Standard Deviation  : ${std_time.toFixed(4)} s`);
  console.log(
    `Min / Max           : ${min_time.toFixed(4)} s / ${max_time.toFixed(4)} s`,
  );
  console.log(
    `Computation Time    : ${(end_global - start_global).toFixed(4)} s`,
  );

  return times;
}

/**
 * Displays a detailed real-time simulation.
 */
export async function demo_single_run(
  target_text: string,
  wpm: number,
): Promise<void> {
  const has_newlines = target_text.includes("\n");
  if (has_newlines) {
    console.log(
      `\n--- Real-Time Simulation Demo:\n${target_text}\n(Target WPM: ${wpm}) ---`,
    );
  } else {
    console.log(
      `\n--- Real-Time Simulation Demo: '${target_text}' (Target WPM: ${wpm}) ---`,
    );
  }
  console.log("Preparing simulation...\n");

  // 1. Calculate trajectory instantly
  const typer = new MarkovTyper(target_text, wpm);
  const [total_time, history] = typer.run();

  // 2. Replay history
  console.log("START TYPING:");
  console.log("-".repeat(40));

  let last_time = 0.0;
  let current_output = "";

  for (const [t, _action, text] of history) {
    // Calculate delay
    const delay = t - last_time;
    if (delay > 0) {
      await sleep(delay * 1000);
    }
    last_time = t;

    await Deno.stdout.write(
      new TextEncoder().encode(_demo_replay_text(current_output, text)),
    );

    current_output = text;
  }

  console.log("\n" + "-".repeat(40));
  console.log(`Total Simulated Time: ${total_time.toFixed(4)}s`);

  // Show errors
  const errors = history.filter((h) =>
    h[1].includes("ERROR") || h[1].includes("SWAP")
  );
  if (errors.length) {
    console.log(`Errors made and corrected: ${errors.length}`);
  }
}
