export function withLighthouseTimeout(promise, timeoutMs, label) {
  let timeout;
  const timedOut = new Promise((_, reject) => {
    timeout = setTimeout(() => {
      reject(new Error(`Lighthouse timed out after ${timeoutMs}ms for ${label}.`));
    }, timeoutMs);
  });
  return Promise.race([promise, timedOut]).finally(() => clearTimeout(timeout));
}
