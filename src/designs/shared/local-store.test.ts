import assert from "node:assert/strict";
import { test } from "node:test";

import { SIGNED_OUT_KEY, announceSessionEnd, clearLocalDiagnosis, signedOutAt } from "./local-store.ts";

// Items are own properties, as in a browser, so `Object.keys` lists them.
class FakeStorage {
  #maxKeys: number;

  constructor(maxKeys: number, items: Record<string, string> = {}) {
    this.#maxKeys = maxKeys;
    Object.assign(this, items);
  }

  getItem(key: string): string | null {
    return Object.hasOwn(this, key) ? (this as unknown as Record<string, string>)[key] : null;
  }

  setItem(key: string, value: string) {
    if (!Object.hasOwn(this, key) && Object.keys(this).length >= this.#maxKeys) throw new DOMException("full", "QuotaExceededError");
    (this as unknown as Record<string, string>)[key] = value;
  }

  removeItem(key: string) {
    delete (this as unknown as Record<string, string>)[key];
  }
}

function useStorage(storage: unknown) {
  Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true, writable: true });
}

const saved = {
  "memo-draft:writer@example.com": "{}",
  "memo-draft": "{}",
  "diagnosis-pending:writer@example.com": "{}",
  theme: "dark",
};

test("sign-out removes drafts and running jobs, keeps other keys, and leaves a stamp", () => {
  const storage = new FakeStorage(10, saved);
  useStorage(storage);
  assert.equal(signedOutAt(), null);

  clearLocalDiagnosis();

  assert.deepEqual(Object.keys(storage).sort(), [SIGNED_OUT_KEY, "theme"]);
  assert.notEqual(signedOutAt(), null);
});

test("a full storage still gets the stamp once the cleanup has made room", () => {
  const storage = new FakeStorage(Object.keys(saved).length, saved);
  useStorage(storage);
  assert.throws(() => storage.setItem("one-more", "x"), { name: "QuotaExceededError" });

  clearLocalDiagnosis();

  assert.deepEqual(Object.keys(storage).sort(), [SIGNED_OUT_KEY, "theme"]);
});

test("a blocked storage is left alone without throwing", () => {
  const blocked = new Proxy(
    {},
    {
      get() {
        throw new DOMException("blocked", "SecurityError");
      },
      ownKeys() {
        throw new DOMException("blocked", "SecurityError");
      },
    },
  );
  useStorage(blocked);

  assert.doesNotThrow(clearLocalDiagnosis);
  assert.doesNotThrow(announceSessionEnd);
  assert.equal(signedOutAt(), null);
});
