/**
 * Minimal Server-Sent Events accumulator for streaming AI responses.
 * Pure (no React Native imports) so it can be unit-tested with plain Node.
 */

export function createSSEPump(onData: (data: string) => void): {
  push: (chunk: string) => void;
  flush: () => void;
} {
  let buffer = '';

  const emitEvent = (rawEvent: string) => {
    const dataLines: string[] = [];
    for (const line of rawEvent.split('\n')) {
      if (line.startsWith('data:')) {
        // Per SSE spec, strip one leading space after the colon.
        dataLines.push(line.slice(5).replace(/^ /, ''));
      }
    }
    if (dataLines.length > 0) {
      onData(dataLines.join('\n'));
    }
  };

  return {
    push(chunk: string) {
      buffer += chunk.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      let idx: number;
      while ((idx = buffer.indexOf('\n\n')) >= 0) {
        const rawEvent = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        emitEvent(rawEvent);
      }
    },
    flush() {
      if (buffer.trim().length > 0) {
        emitEvent(buffer);
      }
      buffer = '';
    },
  };
}
