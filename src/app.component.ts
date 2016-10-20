import {Component} from "@angular/core";
import {Store} from "@ngrx/store";
import {persist} from "./persist.state";

@Component({
    selector: "app",
    template: require<string>("./app.component.html")
})
export class AppComponent {
    constructor(store: Store<any>) {
        persist(store, 'app', 'user');
    }
}
