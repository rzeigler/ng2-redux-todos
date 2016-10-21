import * as R from "ramda";
import {Observable} from "rxjs";
import {Component} from "@angular/core";
import {FormGroup, FormBuilder, Validators} from "@angular/forms";
import {Store} from "@ngrx/store";
import Dexie from "dexie";
import {ReactiveComponent, ReactiveSource, second, bindFormValues} from "ng2-reactor";
import {
    ReducerState,
    AppState,
    TodoList,
    appState,
    listsPath,
    addListNamePath,
    addListViewPath,
    dbPath,
    userPath
} from "./app.state";
import {Action, set, adjust, batch, logErrorRecovery, deepGet, dispatch} from "./reducer.state";
import {NotesService} from "./notes.service";
import {SessionManager} from "./session.service";

@Component({
    selector: "todos",
    template: require<string>("./todos.component.html")
})
export class TodosComponent extends ReactiveComponent {
    private addListForm: FormGroup;

    @ReactiveSource() public addList$: Observable<void>;
    @ReactiveSource() public deleteList$: Observable<number>;
    @ReactiveSource() public deleteListComplete$: Observable<number>
    @ReactiveSource() public logout$: Observable<void>;

    public todoLists: Observable<TodoList[]>;

    constructor(fb: FormBuilder, notes: NotesService, store: Store<ReducerState>, session: SessionManager) {
        super();

        this.addListForm = fb.group({
            addListName: ["", Validators.required]
        });

        const appState$ = store.map(appState);

        this.todoLists = appState$.map(deepGet(listsPath));

        appState$.map(v =>
                deepGet(addListViewPath, v))
            .takeUntil(this.onDestroy$)
            .subscribe(bindFormValues(this.addListForm));

        const actions$ = this.databaseOpen$(appState$, notes)
            .merge(this.databaseClose$(notes))
            .merge(this.listLoad$(appState$, notes))
            .merge(this.addListEdits$())
            .merge(this.addListSubmits$(appState$, notes))
            .merge(this.deleteListSubmit$(appState$, notes))
            .merge(this.deleteListFinalize$(appState$, notes))
            .merge(this.logoutSubmit$(session));

        actions$
            .takeUntil(this.onDestroy$)
            .subscribe(dispatch(store));
    }

    private databaseOpen$(appState$: Observable<AppState>, notes: NotesService): Observable<Action> {
        return this.onInit$
            .withLatestFrom(appState$, second)
            // Only open the database if it already exists
            .exhaustMap(appState => {
                if (!deepGet(dbPath, appState)) {
                    return notes.open()
                    .map(handle => set(dbPath, handle))
                    .catch(e => Observable.empty());
                } else {
                    return Observable.empty();
                }
            });
    }

    private databaseClose$(notes: NotesService): Observable<Action> {
        return Observable.empty<Action>();
    }

    private listLoad$(appState$: Observable<AppState>, notes: NotesService): Observable<Action> {
        const appStateReady$ = appState$.filter(v => Boolean(deepGet(dbPath, v)));
        // The first time we have a database after initialization load the lists
        return this.onInit$
            .combineLatest(appStateReady$, second)
            .take(1)
            .exhaustMap(appState => {
                const handle = deepGet(dbPath, appState);
                const owner = deepGet(userPath, appState);
                return notes.lists(handle, owner);
            })
            .map(ls => set(listsPath, ls));
    }

    private addListEdits$(): Observable<Action> {
        return this.addListForm.controls["addListName"].valueChanges
            .map(v => set(addListNamePath, v));
    }

    private addListSubmits$(appState$: Observable<AppState>, notes: NotesService): Observable<Action> {
        const name$ = appState$.map(deepGet(addListNamePath));
        const db$ = appState$.map(deepGet(dbPath));
        return this.addList$
            .withLatestFrom(appState$, second)
            .switchMap(appState => {
                const handle = deepGet(dbPath, appState);
                const owner = deepGet(userPath, appState);
                const name = deepGet(addListNamePath, appState);
                return notes.insertList(handle, owner, name)
                    .map(id => batch(
                        set(addListNamePath, ""),
                        adjust(listsPath, R.append({id, owner, name}))
                    ))
                    .catch(logErrorRecovery);
            });
    }

    private deleteListSubmit$(appState$: Observable<AppState>, notes: NotesService): Observable<Action> {
        return this.deleteList$
            .withLatestFrom(appState$.map(deepGet(listsPath)))
            .exhaustMap(([id, ls]) => {
                const listIdx = R.findIndex((l: TodoList) => l.id === id, <TodoList[]>ls);
                if (listIdx >= 0) {
                    return Observable.of(set(`${listsPath}.${listIdx}.deleting`, true) )
                } else {
                    // Should never happen
                    return Observable.empty<Action>();
                }
            });
    }

    private deleteListFinalize$(appState$: Observable<AppState>, notes: NotesService): Observable<Action> {
        const db$: Observable<Dexie> = appState$.map(deepGet(dbPath));
        return this.deleteListComplete$
            .withLatestFrom(db$, (id: number, handle: Dexie) => ({ id, handle }))
            .switchMap(data => notes.dropList(data.handle, data.id)
                .map(R.always(adjust(listsPath, R.filter((list: TodoList) => list.id !== data.id))))
            )
            .catch(logErrorRecovery);
    }

    private logoutSubmit$(session: SessionManager): Observable<Action> {
        return this.logout$.concatMap(R.always(session.logout()));
    }
}
