<script lang="ts" setup>
import { ref } from "vue";

import Keycloak from "keycloak-js";

import { loginUrl } from "../login.ts";
import appProperties from "@/AppProperties";

let login = defineProps(["site"]);

let backend = appProperties.backend;

// here we trick vue js to reload the component
const refresher = ref(0);
const forcereload = () => {
  // when the key value is changed, vue is automatically reloading the page
  refresher.value += 1;
};

/*
// change to actual keycloak address
const keycloak = new Keycloak({
  url: `http://localhost:8080`,
  realm: "arcmanager",
  clientId: "arcmanager",
});
const kcLogin = keycloak.login;

keycloak.login = (options) => {
  options.idpHint = loginUrl(login.site);
  kcLogin(options);
};

async function Login() {
  await keycloak.init({
    onLoad: "login-required",
  });
  console.log("KEYCLOAK INIT");
  if (!keycloak.authenticated) {
    // if not authenticated, we just call the function again, TODO the double login problem
    Login();
  } else {
    console.log("Authenticated!");
  }
  if (keycloak.token) {
    fetch(backend + "auth_alt/login", {
      method: "POST",
      // body for the backend containing all necessary data
      body: JSON.stringify({
        token: keycloak.token,
        target: login.site.toLowerCase(),
      }),
      credentials: "include",
    })
      .then((response) => response.json())
      .then((data) => console.log(data));
    window.sessionStorage.setItem(
      "username",
      keycloak.idTokenParsed ? keycloak.idTokenParsed["name"] : ""
    );
    appProperties.loggedIn = true;
  }

  forcereload();
}
*/
async function Login() {
  // clear any error cookie
  document.cookie = "error=; expires=Thu, 01 Jan 1970 00:00:00 UTC";
  if (login.site == "") {
    window.alert("Please select a Datahub first!");
  } else {
    window.location.assign(backend + "auth/login?datahub=" + login.site.value);
  }
}

async function logout() {
  //await keycloak.logout({
  //redirectUri: "https://git.nfdi4plants.org/explore",
  //});
  await fetch(backend + "auth/logout", {
    credentials: "include",
  });
  window.location.reload();
}
</script>

<template>
  <q-item
    v-if="!appProperties.loggedIn"
    clickable
    v-ripple
    @click="
      Login();
      forcereload();
    "
    :key="refresher"
    style="background-color: lightcyan">
    <q-item-section avatar>
      <q-icon color="grey-7" name="login"></q-icon>
    </q-item-section>
    <q-item-section style="margin-left: -1.2em">Login</q-item-section>
  </q-item>
  <q-item
    v-if="appProperties.loggedIn"
    clickable
    v-ripple
    @click="
      logout();
      forcereload();
    "
    :key="refresher"
    style="background-color: lightpink">
    <q-item-section avatar>
      <q-icon color="grey-7" name="logout"></q-icon>
    </q-item-section>
    <q-item-section style="margin-left: -1.2em">Logout</q-item-section>
  </q-item>
</template>

<style></style>
