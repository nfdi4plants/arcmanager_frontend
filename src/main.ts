//import './assets/main.css'

import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";

const app = createApp(App);

import { Quasar, Dialog, Loading, Dark, Notify, Cookies } from "quasar";
import "@quasar/extras/material-icons/material-icons.css";
import "quasar/src/css/index.sass";
app.use(Quasar, {
  plugins: { Dialog, Loading, Dark, Notify, Cookies }, // import Quasar plugins and add here
});
// clear all the tokens and data
window.sessionStorage.clear();

app.use(router);

app.mount("#app");
