import * as R from "ramda";
import {Injectable} from "@angular/core";
import {Observable} from "rxjs";
import { go } from "@ngrx/router-store";
import {Action, lensing} from "./reducer.state";
import {user, lists, activeListTodos, db} from "./app.state";

@Injectable()
export class SessionManager {
    login(username): Observable<Action> {
        return Observable.of(lensing(R.set(user, username)))
            .concat(Observable.of(go(["todos"])));
    }

    logout(): Observable<Action> {
        return Observable.of(lensing(
            R.compose(
                R.set(user, null),
                R.set(lists, null),
                R.set(activeListTodos, null)
            )
        )).concat(Observable.of(go(["login"])));
    }
}
