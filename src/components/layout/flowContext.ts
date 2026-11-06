import { createContext, useContext } from 'react';

export interface Flow {
  /** Plays the closing animation, then calls `leave` (going back). */
  close: (leave: () => void) => void;
}

export const FlowContext = createContext<Flow>({ close: (leave) => leave() });

/** The adding flow the page is shown in. */
export function useFlow() {
  return useContext(FlowContext);
}
