export function formatDate(s: string): string {
  try {
    return new Date(s).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  } catch {
    return s;
  }
}

export function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max);
}

export function toApiHistory(messages: { role: string; content: string; isError?: boolean }[]) {
  return messages
    .filter(m => m.content && !m.isError)
    .map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.content }));
}
