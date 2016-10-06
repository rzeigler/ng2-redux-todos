import * as R from "ramda";
import {Injectable} from "@angular/core";
import {Observable} from "rxjs";
import { go } from "@ngrx/router-store";
import {Action, lensing} from "./reducer.state";
import {user} from "./app.state";

@Injectable()
export class SessionManager {
    login(username): Observable<Action> {
        return Observable.of(lensing(R.set(user, username)))
            .concat(Observable.of(go(["todos"])));
    }
}
