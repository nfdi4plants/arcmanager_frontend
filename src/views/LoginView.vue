<script lang="ts" setup>
import { ref } from "vue";

import appProperties from "@/AppProperties";

var login = defineProps(["site"]);

var backend = appProperties.backend;

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
    class="login"
    v-if="!appProperties.loggedIn"
    clickable
    v-ripple
    @click="
      Login();
      forcereload();
    ">
    <q-item-section avatar>
      <q-icon name="login"></q-icon>
    </q-item-section>
    <q-item-section style="margin-left: -1.2em">Login</q-item-section>
  </q-item>
  <q-item
    id="logout"
    v-if="appProperties.loggedIn"
    clickable
    v-ripple
    @click="
      logout();
      forcereload();
    "
    :key="refresher">
    <q-item-section avatar>
      <q-icon name="logout"></q-icon>
    </q-item-section>
    <q-item-section style="margin-left: -1.2em">Logout</q-item-section>
  </q-item>
</template>

<style>
.body--light #logout {
  background-color: lightpink;
}
.body--dark #logout {
  background-color: maroon;
}

.body--light .login {
  background-color: lavender;
}
.body--dark .login {
  background-color: teal;
}
</style>
