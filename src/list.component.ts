import * as R from "ramda";
import {Component} from "@angular/core";
import {FormGroup, FormBuilder, Validators} from "@angular/forms";
import {ActivatedRoute} from "@angular/router";
import {Store} from "@ngrx/store";
import {Observable} from "rxjs";
import {ReactiveComponent, ReactiveSource, bindStore, bindProperty, bindFormValues, second} from "ng2-reactor";
import {go} from "@ngrx/router-store";
import Dexie from "dexie";
import {Action, set, adjust, batch, deepGet, logErrorRecovery} from "./reducer.state";
import {
    ReducerState,
    AppState,
    Todo,
    TodoList,
    appState,
    dbPath,
    listsPath,
    listTodosPath,
    addTodoNamePath,
    addTodoViewPath,
    listTitleTextPath
} from "./app.state";
import {NotesService} from "./notes.service";

@Component({
    selector: "list",
    template: require<string>("./list.component.html")
})
export class ListComponent extends ReactiveComponent {
    private addTodoForm: FormGroup;

    @ReactiveSource() public addTodo$: Observable<void>;
    @ReactiveSource() public deleteTodo$: Observable<number>;
    @ReactiveSource() public deleteTodoComplete$: Observable<number>;
    @ReactiveSource() public toggleTodo$: Observable<number>;

    public todos: Observable<Todo[]>;
    public listTitle: Observable<string>;

    constructor(fb: FormBuilder, store: Store<ReducerState>, route: ActivatedRoute, notes: NotesService) {
        super();

        this.addTodoForm = fb.group({
            addTodoName: ["", Validators.required]
        });

        const appState$ = store.map(appState);
        const db$ = appState$.map(deepGet(dbPath)).filter(R.identity).distinctUntilChanged();

        appState$.map(deepGet(addTodoViewPath))
            .distinctUntilChanged()
            .takeUntil(this.onDestroy$)
            .subscribe(bindFormValues(["addTodoName"], this.addTodoForm));


        this.todos = appState$.map(deepGet(listTodosPath))
            .distinctUntilChanged()
            .filter(R.identity)

        this.listTitle = appState$.map(deepGet(listTitleTextPath))
            .distinctUntilChanged();

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
                    .map(todos => set(listTodosPath, todos))
            );
    }

    private editAddTodoName$(form: FormGroup): Observable<Action> {
        return form.controls["addTodoName"].valueChanges
            .map(value => set(addTodoNamePath, value));
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
            .map(todo => batch(
                adjust(listTodosPath, R.append(todo)),
                set(addTodoNamePath, "")
            ));
    }

    private deleteListTodo$(appState$: Observable<AppState>, deleteTodo$: Observable<number>): Observable<Action> {
        const todos$ = appState$.map(deepGet(listTodosPath));
        return deleteTodo$
            .withLatestFrom(todos$)
            .switchMap(([id, todos]) => {
                const todoIndex = R.findIndex((t: Todo) => t.id === id, <Todo[]>todos);
                if (todoIndex >= 0) {
                    return Observable.of(set(`${listTodosPath}.${todoIndex}.deleting`, true));
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
                    .map(R.always(adjust(listTodosPath, R.filter((todo: Todo) => todo.id !== id))))
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
                const todoIdx = R.findIndex((todo: Todo) => todo.id === id, deepGet(listTodosPath, appState));
                const todo = deepGet(listTodosPath, appState)[todoIdx];
                const completedPath = `${listTodosPath}.${todoIdx}.completed`;
                return notes.setTodoCompleteState(<Dexie>db, todo.id, !todo.completed)
                    .map(R.always(adjust(completedPath, R.not)))
                    .catch(logErrorRecovery);
            });
    }

    private updateListTitle$(appState$: Observable<AppState>, route: ActivatedRoute): Observable<Action> {
        const lists$ = appState$.map(deepGet(listsPath))
            .filter(R.identity)
            .distinctUntilChanged();
        return this.onInit$.switchMap(() =>
            route.params.map(params => +params["list"])
                .combineLatest(lists$, (listId: number, lists: TodoList[]) => {
                    const list = R.find(list => list.id === listId, lists);
                    return list ? set(listTitleTextPath, list.name) : adjust(listTitleTextPath, v => v);
                })
        );
    }

    private navigateOnListDelete$(appState$, route: ActivatedRoute): Observable<Action> {
        const lists$ = appState$.map(deepGet(listsPath))
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
        appState$.map(deepGet(listsPath))
            .map((lists: TodoList[]) => lists ? lists.length : 0)
            .map(R.lt(0))
            .takeUntil(this.onDestroy$)
            .subscribe(bindProperty("hasLists", this));
    }
}
