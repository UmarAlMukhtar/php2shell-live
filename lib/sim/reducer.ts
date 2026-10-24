import { applyDefenderAction } from "./defense";
import { applyVisualStep, initialState, tick, type SimAction } from "./engine";
import { runVerification } from "./verify";
import type { SimState } from "./types";

export function reduce(state: SimState, action: SimAction | { type: "VERIFY" }): SimState {
  switch (action.type) {
    case "TICK":
      return tick(state);
    case "VISUAL_STEP":
      return applyVisualStep(state, action.index, action.step);
    case "DEFEND":
      return applyDefenderAction(state, action.action);
    case "SET_PHASE":
      return { ...state, phase: action.phase };
    case "VERIFY":
      return runVerification(state).state;
    case "RESET":
      return initialState();
    case "HYDRATE":
      return action.state;
    default:
      return state;
  }
}
