import * as R from "ramda";
import {Observable} from "rxjs";
import {Component, Inject} from "@angular/core";
import {FormBuilder, FormGroup, Validators} from "@angular/forms";
import {Store} from "@ngrx/store";
import {ReactiveComponent, LifeCycleNotificationEvent, ReactiveSource, second, bindStore} from "ng2-reactor";
import {AppState, user} from "./app.state";
import {Action, lensing, dispatch} from "./reducer.state";
import {SessionManager} from "./session.state";

@Component({
    selector: "login",
    template: require<string>("./login.component.html"),
})
export class LoginComponent extends ReactiveComponent {
    private loginForm: FormGroup;

    @ReactiveSource() private loginGo: Observable<void>;

    constructor(fb: FormBuilder, store: Store<AppState>, session: SessionManager) {
        super();

        this.loginForm = fb.group({
            "username": ["", Validators.required]
        });

        this.lifeCycle$.subscribe(console.log.bind(console));
        this.loginEvents(session)
            // TODO: Why is cast necessary?
            .takeUntil(<any>this.onDestroy$)
            .subscribe(bindStore(store), R.always(null), () => console.log("login ended"));
    }

    private loginEvents(session: SessionManager): Observable<Action> {
        return this.loginGo.withLatestFrom(this.loginForm.controls["username"].valueChanges, second)
            .exhaustMap(session.login);
    }
}
