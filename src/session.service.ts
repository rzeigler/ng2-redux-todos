import * as R from "ramda";
import {Injectable} from "@angular/core";
import {Observable} from "rxjs";
import { go } from "@ngrx/router-store";
import {Action, set, batch} from "./reducer.state";
import {userPath, listsPath, listTodosPath, dbPath} from "./app.state";

@Injectable()
export class SessionManager {
    login(username): Observable<Action> {
        return Observable.of(set(userPath, username))
            .concat(Observable.of(go(["todos"])));
    }

    logout(): Observable<Action> {
        return Observable.of(batch(
                set(userPath, null),
                set(listsPath, null),
                set(listTodosPath, null)
        )).concat(Observable.of(go(["login"])));
    }
}
