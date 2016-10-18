require("skeleton-css/css/normalize.css");
require("skeleton-css/css/skeleton.css");
require("./font-awesome-4.6.3/css/font-awesome.css");
require("./theme.css");

import "core-js";
import "zone.js";

import {platformBrowserDynamic} from "@angular/platform-browser-dynamic";
import {AppModule} from "./app.module";

platformBrowserDynamic().bootstrapModule(AppModule);
