import {Observable} from "rxjs";
import {Store} from "@ngrx/store";
import {AppState} from "./app.state";

export interface Action {
    type: string;
}

export interface FnAction extends Action {
    type: "fn";
    fn: Function;
}

export function proxyReducer(fn: Function): FnAction {
    return {
        type: "fn",
        fn
    };
}

export function reducer(state: AppState, action: Action): AppState {
    if (action.type === "fn") {
        return (<FnAction>action).fn(state);
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
