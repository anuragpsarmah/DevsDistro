export async function tryCatch<T, E = Error>(
  input: Promise<T> | (() => T) | (() => Promise<T>)
): Promise<[T, null] | [null, E]> {
  try {
    let result: T;

    if (input && typeof input === "object" && "then" in input) {
      result = await input;
    } else if (typeof input === "function") {
      const output = input();

      if (output && typeof output === "object" && "then" in output) {
        result = await output;
      } else {
        result = output;
      }
    } else {
      throw new Error("tryCatch expects a Promise or function");
    }

    return [result, null];
  } catch (error) {
    return [null, error as E];
  }
}
