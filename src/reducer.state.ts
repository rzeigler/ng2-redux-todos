import * as R from "ramda";
import {Observable} from "rxjs";
import {Store} from "@ngrx/store";
import {AppState} from "./app.state";

export interface Action {
    type: string;
}

export interface Payload {
    path: string[];
}

export interface SetPayload extends Payload {
    value: any;
}

export interface SetAction extends Action {
    type: "set";
    payload: SetPayload
}

export interface AdjustPayload extends Payload {
    adjuster: (any) => any;
}

export interface AdjustAction extends Action {
    type: "adjust";
    payload: AdjustPayload
}

export interface BatchAction extends Action {
    type: "batch";
    payload: Action[];
}

export type ReducerAction = SetAction | AdjustAction | BatchAction;

export function set(path: string, value: any): SetAction {
    return {
        type: "set",
        payload: {
            path: path.split("."),
            value
        }
    };
}

export function adjust(path: string, adjuster: (any) => any): AdjustAction {
    return {
        type: "adjust",
        payload: {
            path: path.split("."),
            adjuster
        }
    };
}

export function batch(...actions: Action[]): BatchAction {
    return {
        type: "batch",
        payload: actions
    }
}

export const deepGet = R.curry((p: string[] | string, source: any): any => {
    const path = R.is(String, p) ? (<string>p).split(".") : <string[]>p;
    if (path.length === 0) {
        throw new Error("deepGet requires a non empty path");
    }
    const key = R.head(path);
    if (path.length === 1) {
        return source[key];
    } else {
        return source[key] ? deepGet(R.tail(path), source[key]) : null;
    }
})

function isNaN(x) {
    return x !== x;
}

export const deepSet = R.curry((p: string[] | string, value: any, source: any): any => {
    const path = R.is(String, p) ? (<string>p).split(".") : <string[]>p;
    if (path.length === 0) {
        throw new Error("deepSet requires a non empty path");
    }
    const key = R.head(path);
    const idx = parseInt(key, 10);
    if (!isNaN(idx) && R.is(Array, source)) {
        if (path.length === 1) {
            return source.slice(0, idx).concat([value]).concat(source.slice(idx + 1, source.length));
        }
        return source.slice(0, idx).concat([deepSet(R.tail(path), value, source[idx])]).concat(source.slice(idx + 1, source.length));
    }
    if (path.length === 1) {
        return R.merge(source, {[key]: value});
    }
    return R.merge(source, {[key]: deepSet(R.tail(path), value, source[key])})
})

export const deepAdjust = R.curry((path: string[] | string, adjuster: (any) => any, source: any): any => {
    const start = deepGet(path, source);
    const value = adjuster(start);
    const result = deepSet(path, value, source);
    console.log(result);
    return result;
})

export function reducer(state: AppState, action: ReducerAction): AppState {
    if (action.type === "set") {
        return deepSet(action.payload.path, action.payload.value, state);
    }
    if (action.type === "adjust") {
        return deepAdjust(action.payload.path, action.payload.adjuster, state);
    }
    if (action.type === "batch") {
        return R.reduce(reducer, state, action.payload);
    }
    return state;
}

export function dispatch(store: Store<any>) {
    return function (v: any) {
        store.dispatch(v);
    };
}

export function logErrorRecovery(e: any): Observable<Action> {
    console.error(e);
    return Observable.empty<Action>();
}
