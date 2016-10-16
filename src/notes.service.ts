import {Observable} from "rxjs";
import * as R from "ramda";
import {Injectable} from "@angular/core";
import Dexie from "dexie";
import {TodoList, Todo} from "./app.state";

@Injectable()
export class NotesService {
    constructor() {

    }

    close(db: Dexie): Observable<void> {
        return Observable.of(db.close());
    }

    open(): Observable<Dexie> {
        const database = new Dexie("todos");
        database.version(1).stores({
            "lists": "++id, owner, name",
            "todos": "++id, parent_id, list_id"
        });
        return Observable.fromPromise(Promise.resolve<Dexie>(database.open()));
    }

    insertList(db: Dexie, owner: string, name: string): Observable<any> {
        return Observable.fromPromise(Promise.resolve<any>(db.table("lists").add({
            owner,
            name
        })));
    }

    dropList(db: Dexie, id: number): Observable<void> {
        return Observable.fromPromise(Promise.resolve<void>(db.table("lists").delete(id)));
    }

    lists(db: Dexie, owner: number): Observable<TodoList[]> {
        return Observable.fromPromise(Promise.resolve<TodoList[]>(db.table("lists")
            .where("owner")
            .equals(owner)
            .toArray())
        );
    }

    primaryTodos(db: Dexie, listId: number): Observable<Todo[]> {
        return Observable.fromPromise(Promise.resolve<Todo[]>(db.table("todos")
            .where("list_id")
            .equals(listId)
            .toArray()));
    }

    insertTodo(db: Dexie, listId: number, name: string, completed: boolean): Observable<Todo> {
        const template = {parent_id: null, list_id: listId, name, completed};
        return Observable.fromPromise(Promise.resolve<number>(db.table("todos").add(template)))
            .map(id => R.merge({id}, template));
    }

    deleteTodo(db: Dexie, id: number): Observable<void> {
        return Observable.fromPromise(Promise.resolve<void>(db.table("todos").delete(id)));
    }

    setTodoCompleteState(db: Dexie, id: number, state: boolean): Observable<number> {
        return Observable.fromPromise(Promise.resolve<number>(db.table("todos").update(id, {completed: state})));
    }
}
