import * as R from "ramda";
import {Observable} from "rxjs";
import {Component, Inject} from "@angular/core";
import {FormBuilder, FormGroup, Validators} from "@angular/forms";
import {Store} from "@ngrx/store";
import {ReactiveComponent, LifeCycleNotificationEvent, ReactiveSource, second, bindStore} from "ng2-reactor";
import {ReducerState, user} from "./app.state";
import {Action, lensing} from "./reducer.state";
import {SessionManager} from "./session.service";

@Component({
    selector: "login",
    template: require<string>("./login.component.html"),
})
export class LoginComponent extends ReactiveComponent {
    private loginForm: FormGroup;

    @ReactiveSource() private submit$: Observable<void>;

    constructor(fb: FormBuilder, store: Store<ReducerState>, session: SessionManager) {
        super();

        this.loginForm = fb.group({
            "username": ["", Validators.required]
        });

        this.loginEvents$(session)
            .takeUntil(<any>this.onDestroy$)
            .subscribe(bindStore(store));
    }

    private loginEvents$(session: SessionManager): Observable<Action> {
        return this.submit$.withLatestFrom(this.loginForm.controls["username"].valueChanges, second)
            .exhaustMap(session.login);
    }
}
