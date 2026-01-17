import { describe, it, expect, vi } from "vitest";
import { uuid } from "./uuid";
import * as Crypto from "expo-crypto";

// expo-crypto is already mocked in vitest.setup.ts

describe("uuid", () => {
  it("calls expo-crypto randomUUID and returns result", async () => {
    const mockUuid = "550e8400-e29b-41d4-a716-446655440000";
    vi.mocked(Crypto.randomUUID).mockResolvedValue(mockUuid);

    const result = await uuid();

    expect(Crypto.randomUUID).toHaveBeenCalled();
    expect(result).toBe(mockUuid);
  });

  it("returns different UUIDs on successive calls", async () => {
    vi.mocked(Crypto.randomUUID)
      .mockResolvedValueOnce("uuid-1")
      .mockResolvedValueOnce("uuid-2");

    const result1 = await uuid();
    const result2 = await uuid();

    expect(result1).toBe("uuid-1");
    expect(result2).toBe("uuid-2");
    expect(result1).not.toBe(result2);
  });

  it("handles async behavior correctly", async () => {
    const mockUuid = "async-uuid-test";
    vi.mocked(Crypto.randomUUID).mockResolvedValue(mockUuid);

    const promise = uuid();
    expect(promise).toBeInstanceOf(Promise);

    const result = await promise;
    expect(result).toBe(mockUuid);
  });
});
