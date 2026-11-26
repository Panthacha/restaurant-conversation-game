import { useSyncExternalStore } from "react";

const noop = () => () => {};

// False during the server render and the first client render, true afterwards. Pages that show
// progress saved in this browser wait for it, so the server HTML and the first client render match.
export function useHydrated() {
  return useSyncExternalStore(noop, () => true, () => false);
}
