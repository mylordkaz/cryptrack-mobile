import * as Crypto from "expo-crypto";

export async function uuid(): Promise<string> {
  return Crypto.randomUUID();
}
