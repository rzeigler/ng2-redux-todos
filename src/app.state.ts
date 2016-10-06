import * as R from "ramda";
import {RouterState} from "@ngrx/router-store";

export interface AppState {
    user: string;
}

export interface ReducerState {
    router: RouterState;
    app: AppState;
}

export const defaultAppState: ReducerState = {
    router: null,
    app: {
        user: null
    }
};

export function router(state: ReducerState): RouterState {
    return state.router;
}

export function appState(state: ReducerState): AppState {
    return state.app;
}

// Lenses for the app state can assume the root because of the directory layout
export const user = R.lensProp("user");
