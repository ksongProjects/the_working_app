export function getUserId(session: unknown): string | undefined {
  const s = session as { user?: { id?: string } } | null;
  const id = s?.user?.id;
  return typeof id === 'string' ? id : undefined;
}


