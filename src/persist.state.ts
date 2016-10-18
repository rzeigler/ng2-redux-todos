import * as R from "ramda";
import {Store} from "@ngrx/store";
import {AppState} from "./app.state";
import {proxyReducer} from "./reducer.state";

export function persist(store: Store<any>, prefix: string, path: string[]) {
    // Load this first because in many cases we will get the default state immediately upon the subscribe below
    const initialValue = JSON.parse(window.localStorage.getItem(path.join('.')));
    // Store forever
    store.select(prefix)
        .map(v => R.path(path, v))
        .distinctUntilChanged()
        .subscribe(v =>
            window.localStorage.setItem(path.join('.'), JSON.stringify(v)));
    // Load initial value
    store.dispatch(
        proxyReducer(R.assocPath(path, initialValue))
    );

}
