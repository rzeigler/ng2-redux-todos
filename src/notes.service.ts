import {Observable} from "rxjs";
import * as R from "ramda";
import {Injectable} from "@angular/core";
import Dexie from "dexie";
import {TodoList} from "./app.state";

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

    dropList(db: Dexie, id: string): Observable<void> {
        return Observable.fromPromise(Promise.resolve<void>(db.table("lists").delete(id)));
    }

    lists(db: Dexie, owner: string): Observable<TodoList[]> {
        return Observable.fromPromise(Promise.resolve<TodoList[]>(db.table("lists")
            .where("owner")
            .equals(owner)
            .toArray())
        )
    }
}
