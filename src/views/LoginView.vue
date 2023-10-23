<script lang="ts" setup>
import { ref, createApp, onMounted } from "vue";
import { RouterLink, RouterView } from "vue-router";

import Keycloak from "keycloak-js";

import { loginUrl } from "../login.ts";
import appProperties from "@/AppProperties";

let login = defineProps(["site"]);

let backend = "http://localhost:8000/arcmanager/api/v1/";
//let backend = "https://nfdi4plants.de/arcmanager/api/v1/";

// here we trick vue js to reload the component
const arclist = ref(0);
const forcereload = () => {
  // when the key value is changed, vue is automatically reloading the page
  arclist.value += 1;
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
  window.location.assign(
    backend + "auth/login?datahub=" + login.site.toLowerCase()
  );
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
// current fix of the double login problem; new problem is the instant forced login (which we probably want anyway later when we spread the logins to different keycloaks)
//if (!keycloak.authenticated) Login();
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
    :key="arclist"
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
    :key="arclist"
    style="background-color: lightpink">
    <q-item-section avatar>
      <q-icon color="grey-7" name="logout"></q-icon>
    </q-item-section>
    <q-item-section style="margin-left: -1.2em">Logout</q-item-section>
  </q-item>
</template>

<style></style>
