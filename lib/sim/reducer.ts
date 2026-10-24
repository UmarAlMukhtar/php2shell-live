import { applyDefenderAction } from "./defense";
import { applyVisualStep, initialState, tick, type SimAction } from "./engine";
import { VISUAL_TIMELINE } from "./scenario";
import { runVerification } from "./verify";
import type { SimState } from "./types";

export type GameAction =
  | SimAction
  | { type: "VERIFY" };

export function reduce(state: SimState, action: GameAction): SimState {
  switch (action.type) {
    case "TICK":
      return tick(state);
    case "VISUAL_STEP":
      return applyVisualStep(state, action.index, action.step);
    case "VISUAL_NEXT": {
      const i = state.visualStepIndex + 1;
      const step = VISUAL_TIMELINE[i];
      return step ? applyVisualStep(state, i, step) : state;
    }
    case "VISUAL_GOTO": {
      let next = initialState();
      for (let i = 0; i <= action.index; i++) {
        next = applyVisualStep(next, i, VISUAL_TIMELINE[i]!);
      }
      return next;
    }
    case "VISUAL_RESTART": {
      const step = VISUAL_TIMELINE[0];
      return step ? applyVisualStep(initialState(), 0, step) : initialState();
    }
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
