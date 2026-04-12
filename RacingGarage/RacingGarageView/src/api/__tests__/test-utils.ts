jest.mock("@/api/client/client");

import { api } from "@/api/client/client";

export const mockApi = api as jest.MockedFunction<typeof api>;

/**
 * Helper to reset and setup API mock for a test
 */
export function setupApiMock() {
  mockApi.mockReset();
  type ApiReturn = Awaited<ReturnType<typeof api>>;
  mockApi.mockResolvedValue(undefined as unknown as ApiReturn);
}

/**
 * Helper to mock a successful API response
 */
export function mockApiSuccess<T>(data: T) {
  mockApi.mockResolvedValueOnce(data);
}

/**
 * Helper to mock an API error
 */
export function mockApiError(status: number, message: string) {
  const error = Object.assign(new Error(message), { status, message });
  mockApi.mockRejectedValueOnce(error);
}
