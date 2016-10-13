import * as R from "ramda";
import {RouterState} from "@ngrx/router-store";
import Dexie from "dexie";

export interface TodoList {
    id: string;
    owner: string;
    name: string;
}

export interface Todo {
    id: string;
    parent_id: string;
    list_id: string;
    name: string;
    notes: string;
}

export interface AddListView {
    addListName: string;
}

export interface AppState {
    user: string;
    lists: TodoList[];
    activeListId: string;
    activeListTodos: Todo[];
    addListView: AddListView;
    db: Dexie;
}

export interface ReducerState {
    router: RouterState;
    app: AppState;
}

export const defaultAppState: ReducerState = {
    router: null,
    app: {
        user: null,
        lists: [],
        activeListId: null,
        activeListTodos: null,
        addListView: { addListName: "" },
        db: null
    }
};

export function router(state: ReducerState): RouterState {
    return state.router;
}

export function appState(state: ReducerState): AppState {
    return state.app;
}

// Lenses for the app state can assume the root because of the directory layout
export const lists: R.Lens = R.lensProp("lists");

export const activeListId = R.lensProp("activeListId");

export const activeListTodos = R.lensProp("activeListTodos");

export const user: R.Lens = R.lensProp("user");

export const db: R.Lens = R.lensProp("db");

export const addListView: R.Lens = R.lensProp("addListView");

export const addListName: R.Lens = R.lensProp("addListName");
