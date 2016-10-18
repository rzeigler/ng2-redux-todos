import {NgModule} from "@angular/core";
import {LocationStrategy, HashLocationStrategy} from "@angular/common";
import {BrowserModule} from "@angular/platform-browser";
import {ReactiveFormsModule, FormsModule} from "@angular/forms";
import {RouterModule} from "@angular/router";
import {StoreModule} from "@ngrx/store";
import {StoreDevtoolsModule} from "@ngrx/store-devtools";
import {StoreLogMonitorModule, useLogMonitor } from "@ngrx/store-log-monitor";
import { routerReducer, RouterStoreModule } from "@ngrx/router-store";
import {AppComponent} from "./app.component";
import {LoginComponent} from "./login.component";
import {TodosComponent} from "./todos.component";
import {ListComponent, EmptyListComponent} from "./list.component";
import {AppState, defaultAppState} from "./app.state";
import {reducer} from "./reducer.state";
import {SessionManager} from "./session.service";
import {NotesService} from "./notes.service";

@NgModule({
    imports: [
        BrowserModule,
        ReactiveFormsModule,
        FormsModule,
        RouterModule.forRoot([
            { path: "", redirectTo: "/login", pathMatch: "full"},
            { path: "login", component: LoginComponent },
            {
                path: "todos",
                component: TodosComponent,
                children: [
                    { path: "", component: EmptyListComponent },
                    { path: ":list", component: ListComponent }
                ]
            }
        ]),
        StoreModule.provideStore({router: routerReducer, app: reducer}, defaultAppState),
        StoreDevtoolsModule.instrumentStore({
            maxAge: 5,
            monitor:  useLogMonitor({
                visible: false,
                position: "right"
            })
        }),
        StoreLogMonitorModule,
        RouterStoreModule.connectRouter()
    ],
    declarations: [AppComponent, LoginComponent, TodosComponent, ListComponent, EmptyListComponent],
    bootstrap: [AppComponent],
    providers: [
        {provide: LocationStrategy, useClass: HashLocationStrategy},
        {provide: SessionManager, useClass: SessionManager},
        {provide: NotesService, useClass: NotesService}
    ]
})
export class AppModule { }
