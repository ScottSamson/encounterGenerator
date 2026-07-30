import { useCallback, useReducer } from "react";
import type { EncounterGroup } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; encounters: EncounterGroup[]; activeDifficulty: string | null };

type Action =
  | { type: "submit" }
  | { type: "success"; encounters: EncounterGroup[] }
  | { type: "error"; message: string }
  | { type: "selectDifficulty"; difficulty: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "submit":
      return { status: "loading" };
    case "success":
      return {
        status: "success",
        encounters: action.encounters,
        activeDifficulty: action.encounters[0]?.difficulty ?? null,
      };
    case "error":
      return { status: "error", message: action.message };
    case "selectDifficulty":
      return state.status === "success" ? { ...state, activeDifficulty: action.difficulty } : state;
  }
}

export function useEncounterRequest() {
  const [state, dispatch] = useReducer(reducer, { status: "idle" });

  const submit = useCallback(async (params: URLSearchParams) => {
    dispatch({ type: "submit" });
    try {
      const res = await fetch(`${API_BASE}/api/encounters/generate?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Request failed with status ${res.status}`);
      }
      const data: EncounterGroup[] = await res.json();
      dispatch({ type: "success", encounters: data });
    } catch (err) {
      dispatch({ type: "error", message: err instanceof Error ? err.message : "Failed to generate encounters" });
    }
  }, []);

  const selectDifficulty = useCallback((difficulty: string) => {
    dispatch({ type: "selectDifficulty", difficulty });
  }, []);

  return { state, submit, selectDifficulty };
}
