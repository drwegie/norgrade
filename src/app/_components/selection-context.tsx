"use client";

/**
 * The slice choices that survive moving from one lens to another.
 *
 * ADR-002 put "which question" in the route segment and "which slice" in
 * client state. That left every slice resetting on navigation, so "girls,
 * parents with basic school only" had to be re-picked on each lens. This
 * provider is mounted in the root layout, which Next keeps mounted across
 * client-side navigation between routes, so the two dimensions the tables
 * genuinely share (see `shared-dimensions.ts`) outlive the page that set
 * them.
 *
 * It is still `useState`, not the URL: `useSearchParams` in a prerendered
 * route pushes everything up to the nearest `<Suspense>` boundary into the
 * browser and would take the charts out of the static HTML, which is the
 * property ADR-002 exists to keep. The consequence is the one ADR-002
 * already accepted -- a specific slice is not a shareable link -- and the
 * initial state here is a constant, so the prerendered markup of every
 * route is the same "Both sexes / all levels" page it was before.
 *
 * Nothing is persisted to `sessionStorage`: prerendered HTML cannot read it,
 * so restoring it would have to happen in an effect after hydration, and a
 * wrong first paint is a worse trade than re-picking after a reload. The
 * selection survives navigation, not reload.
 */

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import {
  DEFAULT_EDUCATION,
  DEFAULT_SEX,
  type SharedEducationCode,
  type SharedSexCode,
} from "./shared-dimensions";

export interface SharedSelection {
  sex: SharedSexCode;
  /**
   * Label of the lens the current sex was chosen on, or `null` while it is
   * still the default. A lens shows a "carried over" note when this names
   * some *other* lens, so a value the reader did not pick here is never
   * presented as if they had.
   */
  sexChosenOn: string | null;
  chooseSex: (code: SharedSexCode, lens: string) => void;
  education: SharedEducationCode;
  /** As `sexChosenOn`, for parents' education. */
  educationChosenOn: string | null;
  chooseEducation: (code: SharedEducationCode, lens: string) => void;
}

const SelectionContext = createContext<SharedSelection | null>(null);

export function SelectionProvider({ children }: { children: ReactNode }) {
  const [sex, setSex] = useState<SharedSexCode>(DEFAULT_SEX);
  const [sexChosenOn, setSexChosenOn] = useState<string | null>(null);
  const [education, setEducation] = useState<SharedEducationCode>(DEFAULT_EDUCATION);
  const [educationChosenOn, setEducationChosenOn] = useState<string | null>(null);

  const chooseSex = useCallback((code: SharedSexCode, lens: string) => {
    setSex(code);
    setSexChosenOn(lens);
  }, []);

  const chooseEducation = useCallback((code: SharedEducationCode, lens: string) => {
    setEducation(code);
    setEducationChosenOn(lens);
  }, []);

  const value = useMemo<SharedSelection>(
    () => ({ sex, sexChosenOn, chooseSex, education, educationChosenOn, chooseEducation }),
    [sex, sexChosenOn, chooseSex, education, educationChosenOn, chooseEducation],
  );

  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>;
}

/**
 * Throws outside the provider rather than falling back to defaults: a lens
 * silently keeping its own private copy of the selection is exactly the bug
 * this module exists to remove, and it would only show up as "the choice
 * stopped following me".
 */
export function useSharedSelection(): SharedSelection {
  const selection = useContext(SelectionContext);
  if (!selection) {
    throw new Error("useSharedSelection must be used inside <SelectionProvider>");
  }
  return selection;
}
