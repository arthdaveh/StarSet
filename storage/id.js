import * as Crypto from "expo-crypto";

export function newId() {
  return Crypto.randomUUID();
}
