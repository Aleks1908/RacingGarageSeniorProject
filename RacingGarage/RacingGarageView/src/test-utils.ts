/**
 * Creates a mock JWT token with a name claim for testing purposes.
 * @param name - The full name to encode in the JWT (will be split into firstName/lastName by AuthProvider)
 * @param exp - Optional expiration timestamp (seconds since epoch). Defaults to 1 hour from now.
 * @returns A mock JWT token string
 */
export function createMockJwt(name: string, exp?: number): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(
    JSON.stringify({
      name,
      exp: exp || Math.floor(Date.now() / 1000) + 3600,
    }),
  );
  return `${header}.${payload}.mock-signature`;
}
