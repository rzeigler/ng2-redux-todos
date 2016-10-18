import * as R from "ramda";
import {Observable} from "rxjs";
import {Component} from "@angular/core";
import {FormGroup, FormBuilder, Validators} from "@angular/forms";
import {Store} from "@ngrx/store";
import Dexie from "dexie";
import {ReducerState, AppState, TodoList, appState, lists, addListView, addListName, db, user, deleting} from "./app.state";
import {Action, lensing, logErrorRecovery} from "./reducer.state";
import {NotesService} from "./notes.service";
import {SessionManager} from "./session.service";
import {ReactiveComponent, ReactiveSource, second, bindStore, bindProperty, bindProjection, bindFormValues} from "ng2-reactor";

const addListViewName: R.Lens = <any>R.compose(addListView, addListName);

@Component({
    selector: "todos",
    template: require<string>("./todos.component.html")
})
export class TodosComponent extends ReactiveComponent {
    private addListForm: FormGroup;

    @ReactiveSource() private addList$: Observable<void>;
    @ReactiveSource() private deleteList$: Observable<number>;
    @ReactiveSource() private deleteListComplete$: Observable<number>
    @ReactiveSource() private logout$: Observable<void>;

    constructor(fb: FormBuilder, notes: NotesService, store: Store<ReducerState>, session: SessionManager) {
        super();

        this.addListForm = fb.group({
            addListName: ["", Validators.required]
        });

        const appState$ = store.map(appState);

        appState$.map(s => R.view(lists, s))
            .takeUntil(this.onDestroy$)
            .subscribe(bindProperty("todoLists", this));

        appState$.map(s => R.view(addListView, s))
            .takeUntil(this.onDestroy$)
            .subscribe(bindFormValues(["addListName"], <any>this.addListForm));

        this.deleteListComplete$.subscribe(v => console.log(v));

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
            .subscribe(bindStore(store));
    }

    private databaseOpen$(appState$: Observable<AppState>, notes: NotesService): Observable<Action> {
        return <any>this.onInit$
            .withLatestFrom(appState$, second)
            // Only open the database if it already exists
            .exhaustMap(appState => {
                if (!R.view(db, appState)) {
                    return notes.open()
                    .map(handle => lensing(R.set(db, handle)))
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
        const appStateReady$ = appState$.filter(v => Boolean(R.view(db, v)));
        // The first time we have a database after initialization load the lists
        return this.onInit$
            .combineLatest(appStateReady$, second)
            .take(1)
            .exhaustMap(appState => {
                const handle = R.view<any, Dexie>(db, appState);
                const owner = R.view<any, number>(user, appState);
                return notes.lists(handle, owner);
            })
            .map(ls => lensing(
                R.set(lists, ls)
            ));
    }

    private addListEdits$(): Observable<Action> {
        return this.addListForm.controls["addListName"].valueChanges
            .map(v => lensing(R.set(addListViewName, v)));
    }

    private addListSubmits$(appState$: Observable<AppState>, notes: NotesService): Observable<Action> {
        const name$ = appState$.map(v => R.view(addListViewName, v));
        const db$ = appState$.map(v => R.view(db, v));
        return this.addList$
            .withLatestFrom(appState$, second)
            .switchMap(appState => {
                const handle = R.view<any, Dexie>(db, appState);
                const owner = R.view<any, string>(user, appState);
                const name = R.view<any, string>(addListViewName, appState);
                return notes.insertList(handle, owner, name)
                    .map(id => lensing(
                        R.compose(
                            // Reset the addListName to empty
                            R.set(addListViewName, ""),
                            // Append the list to the set
                            R.over(lists, R.append({id, owner, name}))
                        )
                    ))
                    .catch(logErrorRecovery);
            });
    }

    private deleteListSubmit$(appState$: Observable<AppState>, notes: NotesService): Observable<Action> {
        return this.deleteList$
            .withLatestFrom(appState$.map(s => R.view(lists, s)))
            .exhaustMap(([id, ls]) => {
                const listIdx = R.findIndex((l: TodoList) => l.id === id, <TodoList[]>ls);
                if (listIdx >= 0) {
                    return Observable.of(lensing(R.set(<R.Lens>R.compose(lists, R.lensIndex(listIdx), deleting), true)))
                } else {
                    // Should never happen
                    return Observable.empty<Action>();
                }
            });
    }

    private deleteListFinalize$(appState$: Observable<AppState>, notes: NotesService): Observable<Action> {
        const db$: Observable<Dexie> = appState$.map(v => R.view(db, v));
        return this.deleteListComplete$
            .withLatestFrom(db$, (id: number, handle: Dexie) => ({ id, handle }))
            .switchMap(data => notes.dropList(data.handle, data.id)
                .map(R.always(lensing(
                    R.over(lists, R.filter((list: TodoList) => list.id !== data.id))
                )))
            )
            .catch(logErrorRecovery);
    }

    private logoutSubmit$(session: SessionManager): Observable<Action> {
        return this.logout$.concatMap(R.always(session.logout()));
    }
}
