"use client";

import { createContext, useContext } from "react";

/**
 * True while something full screen (the story viewer) covers the feed, so feed videos must not play.
 * The page provides it; feed videos read it. Outside a provider nothing is suspended.
 */
const MediaSuspendContext = createContext(false);

export const MediaSuspendProvider = MediaSuspendContext.Provider;

export function useMediaSuspended(): boolean {
  return useContext(MediaSuspendContext);
}
