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
    loginInProgress: boolean;
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
        loginInProgress: false,
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

export const userPath = "user";
export const loginInProgressPath = "loginInProgress";
export const listsPath = "lists";
export const listTodosPath = "listTodos";
export const listTitleTextPath = "listTitleView.listTitle";
export const addListViewPath = "addListView";
export const addListNamePath = "addListView.addListName";
export const addTodoViewPath = "addTodoView";
export const addTodoNamePath = "addTodoView.addTodoName";
export const dbPath = "db";
