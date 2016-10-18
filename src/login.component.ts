import * as R from "ramda";
import {Observable} from "rxjs";
import {Component, Inject} from "@angular/core";
import {FormBuilder, FormGroup, Validators} from "@angular/forms";
import {Store} from "@ngrx/store";
import {ReactiveComponent, LifeCycleNotificationEvent, ReactiveSource, second, bindStore} from "ng2-reactor";
import {ReducerState, appState, user, loginInProgress} from "./app.state";
import {Action, proxyReducer} from "./reducer.state";
import {SessionManager} from "./session.service";

@Component({
    selector: "login",
    template: require<string>("./login.component.html"),
})
export class LoginComponent extends ReactiveComponent {
    private loginForm: FormGroup;

    @ReactiveSource() public submit$: Observable<void>;
    public notInProgress: Observable<boolean>;

    constructor(fb: FormBuilder, store: Store<ReducerState>, session: SessionManager) {
        super();

        this.loginForm = fb.group({
            "username": ["", Validators.required]
        });

        this.notInProgress = store.map(appState).map(s => R.view(loginInProgress, s)).map(R.not);

        this.loginEvents$(session)
            .takeUntil(this.onDestroy$)
            .subscribe(bindStore(store));
    }

    private loginEvents$(session: SessionManager): Observable<Action> {
        return this.submit$.withLatestFrom(this.loginForm.controls["username"].valueChanges, second)
            .exhaustMap(user => Observable.of(proxyReducer(R.set(loginInProgress, true)))
                .concat(session.login(user).delay(1000))
                .concat(Observable.of(proxyReducer(R.set(loginInProgress, false)))));
    }
}
