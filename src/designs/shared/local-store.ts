// Kept free of React and Next imports so that the sign-out rules run in a plain test.

// Storage is per account: another person signing in on this browser must not see the memo or
// pick up the running job.
export const DRAFT_PREFIX = "memo-draft";
export const PENDING_PREFIX = "diagnosis-pending";

// Sign-out stamps this key before it asks the server. A flow that was on screen before the stamp, in
// this tab or another, writes nothing afterwards, so a draft effect or a diagnosis request that finishes
// late cannot put the memo back.
export const SIGNED_OUT_KEY = "signed-out-at";

// Written once the server has ended the session. Other tabs leave for the login page on this key, not on
// the stamp: while the session is still alive the login page would send them straight back in.
export const SESSION_ENDED_KEY = "session-ended-at";

export function announceSessionEnd() {
  try {
    localStorage.setItem(SESSION_ENDED_KEY, String(Date.now()));
  } catch {
    // Storage full or blocked: other tabs stay where they are.
  }
}

export function signedOutAt(): string | null {
  try {
    return localStorage.getItem(SIGNED_OUT_KEY);
  } catch {
    return null;
  }
}

function stamp(): boolean {
  try {
    localStorage.setItem(SIGNED_OUT_KEY, String(Date.now()));
    return true;
  } catch {
    return false;
  }
}

/** Removes every draft and running job from this browser, including keys saved before they were per account. */
export function clearLocalDiagnosis() {
  // Stamp first: a write that races with the removal below is already refused.
  const stamped = stamp();
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(DRAFT_PREFIX) || key.startsWith(PENDING_PREFIX)) localStorage.removeItem(key);
    }
  } catch {
    // Storage blocked: nothing to remove.
  }
  // A full storage refuses the stamp. The removal has made room, so try once more.
  if (!stamped) stamp();
}
