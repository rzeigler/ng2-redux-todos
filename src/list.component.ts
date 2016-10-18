import * as R from "ramda";
import {Component} from "@angular/core";
import {FormGroup, FormBuilder, Validators} from "@angular/forms";
import {ActivatedRoute} from "@angular/router";
import {Store} from "@ngrx/store";
import {Observable} from "rxjs";
import {ReactiveComponent, ReactiveSource, bindStore, bindProperty, bindFormValues, second} from "ng2-reactor";
import {go} from "@ngrx/router-store";
import Dexie from "dexie";
import {Action, lensing, logErrorRecovery} from "./reducer.state";
import {ReducerState, AppState, Todo, TodoList, appState, db, lists, activeListTodos, addTodoView, addTodoName, listTitleView, deleting} from "./app.state";
import {NotesService} from "./notes.service";

const addTodoNameView = <R.Lens>R.compose(addTodoView, addTodoName);

@Component({
    selector: "list",
    template: require<string>("./list.component.html")
})
export class ListComponent extends ReactiveComponent {
    private addTodoForm: FormGroup;

    @ReactiveSource() private addTodo$: Observable<void>;
    @ReactiveSource() private deleteTodo$: Observable<number>;
    @ReactiveSource() private deleteTodoComplete$: Observable<number>;
    @ReactiveSource() private toggleTodo$: Observable<number>;

    constructor(fb: FormBuilder, store: Store<ReducerState>, route: ActivatedRoute, notes: NotesService) {
        super();

        this.addTodoForm = fb.group({
            addTodoName: ["", Validators.required]
        });

        const appState$ = store.map(appState);
        const db$ = appState$.map(v => R.view(db, v)).filter(R.identity).distinctUntilChanged();

        appState$.map(state => R.view(addTodoView, state))
            .distinctUntilChanged()
            .takeUntil(this.onDestroy$)
            .subscribe(bindFormValues(["addTodoName"], this.addTodoForm));

        appState$.map(state => R.view(activeListTodos, state))
            .distinctUntilChanged()
            .takeUntil(this.onDestroy$)
            .subscribe(bindProperty("todos", this));

        appState$.map(state => R.view(listTitleView, state))
            .distinctUntilChanged()
            .takeUntil(this.onDestroy$)
            .subscribe(bindProperty("listTitle", this));

        const actions$ = this.loadListTodos$(db$, notes, route)
            .merge(this.editAddTodoName$(this.addTodoForm))
            .merge(this.insertListTodo$(db$, notes, route, this.addTodoForm, this.addTodo$))
            .merge(this.deleteListTodo$(appState$, this.deleteTodo$))
            .merge(this.deleteListTodoFinalize$(db$, notes, this.deleteTodoComplete$))
            .merge(this.toggleListTodo$(db$, appState$, notes, this.toggleTodo$))
            .merge(this.updateListTitle$(appState$, route))
            .merge(this.navigateOnListDelete$(appState$, route));

        actions$
            .takeUntil(this.onDestroy$)
            .subscribe(bindStore(store));
    }

    private loadListTodos$(db$: Observable<Dexie>, notes: NotesService, route: ActivatedRoute): Observable<Action> {
        // Wait for the onInit$ then load todos in that context
        return this.onInit$
            .switchMap(_ =>
                db$.combineLatest(route.params.map(params => +params["list"]))
                    .switchMap(([handle, listId]) => notes.primaryTodos(<Dexie>handle, listId).catch(logErrorRecovery))
                    .map(todos => lensing(
                        R.set(activeListTodos, todos)
                    ))
            );
    }

    private editAddTodoName$(form: FormGroup): Observable<Action> {
        return form.controls["addTodoName"].valueChanges
            .map(value => lensing(R.set(addTodoNameView, value)));
    }

    private insertListTodo$(db$: Observable<Dexie>,
                            notes: NotesService,
                            route: ActivatedRoute,
                            form: FormGroup,
                            addTodo$: Observable<void>): Observable<Action> {
        // In order to insert a todo, we want a db, a list, and a name, so collect all of them here
        // We can assume that a db is in the state or we woulnd't reach this point.
        const data$ = db$.combineLatest(route.params.map(params => +params["list"]))
            .combineLatest(form.controls["addTodoName"].valueChanges, R.flip(R.append));
        return addTodo$
            .withLatestFrom(data$, second)
            .switchMap(([db, listId, name]) => notes.insertTodo(db, listId, name, false)
                .catch(logErrorRecovery))
            .map(todo => lensing(R.compose(
                R.over(activeListTodos, R.append(todo)),
                R.set(addTodoNameView, "")
            )));
    }

    private deleteListTodo$(appState$: Observable<AppState>, deleteTodo$: Observable<number>): Observable<Action> {
        const todos$ = appState$.map(s => R.view(activeListTodos, s));
        return deleteTodo$
            .withLatestFrom(todos$)
            .switchMap(([id, todos]) => {
                const todoIndex = R.findIndex((t: Todo) => t.id === id, <Todo[]>todos);
                if (todoIndex >= 0) {
                    return Observable.of(lensing(R.set(<R.Lens>R.compose(activeListTodos, R.lensIndex(todoIndex), deleting), true)));
                } else {
                    return Observable.empty<Action>();
                }
            });
    }

    private deleteListTodoFinalize$(db$: Observable<Dexie>,
                            notes: NotesService,
                            deleteTodoFinalize$: Observable<number>): Observable<Action> {
        return deleteTodoFinalize$
            .withLatestFrom(db$)
            .switchMap(([id, db]) =>
                notes.deleteTodo(db, id).catch(logErrorRecovery)
                    .map(R.always(lensing(R.over(activeListTodos, R.filter((todo: Todo) => todo.id !== id)))))
            );
    }

    private toggleListTodo$(db$: Observable<Dexie>,
                            appState$: Observable<AppState>,
                            notes: NotesService,
                            toggleTodo$: Observable<number>): Observable<Action> {
        return toggleTodo$
            .withLatestFrom(db$)
            .withLatestFrom(appState$, (array, item) => R.append(item, array))
            .switchMap(([id, db, appState]) => {
                const todoIdx = R.findIndex((todo: Todo) => todo.id === id, R.view<AppState, Todo[]>(activeListTodos, appState));
                const todo = R.view(activeListTodos, appState)[todoIdx];
                const completedLens = <R.Lens>R.compose(activeListTodos, R.lensIndex(todoIdx), R.lensProp("completed"));
                return notes.setTodoCompleteState(<Dexie>db, todo.id, !todo.completed)
                    .map(R.always(lensing(R.over(completedLens, R.not))))
                    .catch(logErrorRecovery);
            });
    }

    private updateListTitle$(appState$: Observable<AppState>, route: ActivatedRoute): Observable<Action> {
        const lists$ = appState$.map(s => R.view(lists, s))
            .filter(R.identity)
            .distinctUntilChanged();
        return this.onInit$.switchMap(() =>
            route.params.map(params => +params["list"])
                .combineLatest(lists$, (listId: number, lists: TodoList[]) => {
                    const list = R.find(list => list.id === listId, lists);
                    return lensing(
                        list ? R.set(listTitleView, list.name) : R.over(listTitleView, R.identity)
                    );
                })
        );
    }

    private navigateOnListDelete$(appState$, route: ActivatedRoute): Observable<Action> {
        const lists$ = appState$.map(s => R.view(lists, s))
            .filter(R.identity)
            .distinctUntilChanged();
        return this.onInit$.switchMap(() =>
            route.params.map(params => +params["list"])
                .combineLatest(lists$, (listId: number, lists: TodoList[]) => {
                    const list = R.find(list => list.id === listId, lists);
                    if (!list) {
                        return lists.length > 0 ? go(["todos", lists[0].id]) : go(["todos"]);
                    } else {
                        return null;
                    }
                })
                .filter(R.identity) // Lazy flatmapping :-)
        );
    }
}


@Component({
    selector: "emptylist",
    template: require<string>("./emptylist.component.html")
})
export class EmptyListComponent extends ReactiveComponent {
    constructor(store: Store<ReducerState>) {
        super();
        (<any>window).empty = this;
        const appState$ = store.map(appState);
        appState$.map(s => R.view(lists, s))
            .map((lists: TodoList[]) => lists ? lists.length : 0)
            .map(R.lt(0))
            .takeUntil(this.onDestroy$)
            .subscribe(bindProperty("hasLists", this));
    }
}
