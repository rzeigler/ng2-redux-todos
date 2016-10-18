import * as R from "ramda";
import {RouterState} from "@ngrx/router-store";
import Dexie from "dexie";

export interface TodoList {
    id: number;
    owner: number;
    name: string;

    deleting: boolean; // To perform less refactoring this is packed in here. Ideally, we would nest a view model + model
}

export interface Todo {
    id: number;
    parent_id: number | null;
    list_id: number;
    name: string;
    notes: string;
    completed: boolean;

    deleting: boolean; // To perform less refactoring this is packed in here. Ideally, we would nest a view model + model
}

export interface AddListView {
    addListName: string;
}

export interface AddTodoView {
    addTodoName: string;
}

export interface ListTitleView {
    listTitle: string;
}

export interface AppState {
    user: string;
    lists: TodoList[];
    listTodos: Todo[];
    listTitleView: ListTitleView;
    addTodoView: AddTodoView;
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
        lists: null,
        listTodos: null,
        listTitleView: { listTitle: "" },
        addListView: { addListName: "" },
        addTodoView: { addTodoName: "" },
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

export const activeListTodos = R.lensProp("listTodos");

export const user: R.Lens = R.lensProp("user");

export const db: R.Lens = R.lensProp("db");

export const addListView: R.Lens = R.lensProp("addListView");

export const addListName: R.Lens = R.lensProp("addListName");

export const addTodoView: R.Lens = R.lensProp("addTodoView");

export const addTodoName: R.Lens = R.lensProp("addTodoName");

export const listTitleView = <R.Lens>R.compose(R.lensProp("listTitleView"), R.lensProp("listTitle"));

export const deleting = R.lensProp("deleting");
