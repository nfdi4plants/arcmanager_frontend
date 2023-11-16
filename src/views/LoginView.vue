<script lang="ts" setup>
import { ref } from "vue";

import appProperties from "@/AppProperties";

let login = defineProps(["site"]);

let backend = appProperties.backend;

// here we trick vue js to reload the component
const refresher = ref(0);
const forcereload = () => {
  // when the key value is changed, vue is automatically reloading the page
  refresher.value += 1;
};


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
