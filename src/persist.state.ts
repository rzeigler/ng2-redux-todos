import * as R from "ramda";
import {Store} from "@ngrx/store";
import {AppState} from "./app.state";
import {set, deepGet} from "./reducer.state";

export function persist(store: Store<any>, prefix: string, path: string) {
    // Load this first because in many cases we will get the default state immediately upon the subscribe below
    const initialValue = JSON.parse(window.localStorage.getItem(path));
    // Store forever
    store.select(prefix)
        .map(v => deepGet(path, v))
        .distinctUntilChanged()
        .subscribe(v =>
            window.localStorage.setItem(path, JSON.stringify(v)));
    // Load initial value
    store.dispatch(
        set(path, initialValue)
    );
}
