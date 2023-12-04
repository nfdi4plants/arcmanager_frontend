<script setup lang="ts">
import { setCssVar } from "quasar";
setCssVar("primary", "#2d3e50");
import { ref, reactive } from "vue";

import isaProperties from "./IsaProperties";

import IsaView from "./views/IsaView.vue";
import LoginView from "./views/LoginView.vue";

import SwateView from "./views/SwateView.vue";

import DataHubView from "./views/DataHubView.vue";

import logoURL from "./assets/dpLogo2_w.png";
import IsaEditView from "./views/IsaEditView.vue";
import templateProperties from "./TemplateProperties";
import appProperties from "./AppProperties";
import arcProperties from "./ArcProperties";
import fileProperties from "./FileProperties";
import sheetProperties from "./SheetProperties";
import termProperties from "./TermProperties";

let fontSize = "large";

const layoutProperties = reactive({
  showLeft: true,
  toolbarMinimized: false,
});

let backend = appProperties.backend + "projects/";

let target = ref("");
let showInput = false;
// Name of the new arc
let arcName = ref("");
// Description of the new arc
let arcDesc = ref("");
// Identifier for the Investigation file
let invId = ref("");

let loading = false;

let drawerWidth = ref(1000);

let windowWidth = window.innerWidth;

window.addEventListener("resize", () => {
  windowWidth = window.innerWidth;
  checkMini(windowWidth);
});

function checkMini(width: number) {
  if (width < 1800) drawerWidth.value = 600;
  else drawerWidth.value = 1000;
}
checkMini(windowWidth);

// the different login options with name and description
let loginOptions = [
  {
    label: "nfdi4plants.ORG",
    value: "freiburg",
    description:
      "nfdi4plants reference DataHUB hosted at the University of Freiburg",
  },
  {
    label: "nfdi4plants.DE",
    value: "tuebingen",
    description:
      "nfdi4plants high-availability DataHUB hosted at the University of Tuebingen",
  },
  {
    label: "PlantMicrobe",
    value: "plantmicrobe",
    description: "DataHUB for the transregio project TRR356",
  },
  {
    label: "Dev",
    value: "dev",
    description: "Development server for testing purposes",
  },
];

// here we trick vue js to reload the component
const refresher = ref(0);
const forcereload = () => {
  // when the key value is changed, vue is automatically reloading the page
  refresher.value += 1;
};
async function createArc() {
  loading = true;
  forcereload();
  await fetch(
    backend +
      "createArc?name=" +
      arcName.value +
      "&description=" +
      arcDesc.value +
      "&investIdentifier=" +
      invId.value,
    { credentials: "include" }
  )
    .then((response) => response.json())
    .then((data) => {
      console.log(data);
      isaProperties.entries = [];
    });
  loading = false;
  forcereload();
}
// clean right side view
function cleanIsaView() {
  // reset the templates, terms, isa, file and sheet properties to cleanup "IsaView"
  templateProperties.templates = templateProperties.template = [];
  termProperties.terms = [];
  isaProperties.entries = [];
  isaProperties.entry = [];
  fileProperties.content = "";
  sheetProperties.names = sheetProperties.sheets = [];
  sheetProperties.name = "";
  arcProperties.changes = "";
  forcereload();
}

// if you tried to login and there is an error, the error will be stored in the cookies
if (document.cookie.includes("error")) {
  window.alert(document.cookie.split("error=")[1]);
}
</script>

<template>
  <header></header>
  <q-layout view="hHh LpR fFf" class="no-selection">
    <!-- LEFT SIDE: LOGO, SELECT HUB, LOGIN, CREATE ARC -->
    <q-drawer
      v-model="layoutProperties.showLeft"
      show-if-above
      :mini="layoutProperties.toolbarMinimized"
      :width="190"
      :breakpoint="500"
      bordered
      class="bg-grey-3">
      <q-scroll-area
        class="fit"
        :horizontal-thumb-style="{ opacity: String(0) }">
        <q-list>
          <q-item
            v-ripple
            clickable
            class="bg-primary text-white"
            @click="
              showInput = false;
              forcereload();
            "
            style="padding-top: 1em; padding-bottom: 1em">
            <q-item-section avatar>
              <q-icon
                size="2.5rem"
                style="margin: 0 -0.2em"
                :name="'img:' + logoURL"
                @click="
                  showInput = false;
                  forcereload();
                "
                :key="refresher + 1"></q-icon>
            </q-item-section>
            <q-item-section style="margin: 0.6em 0 0 -1.2em">
              <q-item-label
                ><b style="font-size: 1.4em">ARCitect Web</b>
                <q-badge outline align="middle" color="teal">
                  v 0.3.3
                </q-badge></q-item-label
              >
            </q-item-section>
          </q-item>
          <q-select
            standout
            v-model="target"
            v-if="!appProperties.loggedIn"
            :options="loginOptions"
            label="DataHUB">
            <template v-slot:option="scope">
              <q-item v-bind="scope.itemProps">
                <q-item-section>
                  <q-item-label>{{ scope.opt.label }}</q-item-label>
                  <q-item-label caption>{{
                    scope.opt.description
                  }}</q-item-label>
                </q-item-section>
              </q-item>
            </template></q-select
          >
          <q-separator></q-separator>

          <LoginView :site="target" />

          <q-separator />
          <!-- New Arc Button-->
          <q-item
            v-ripple
            clickable
            v-on:click="
              showInput = true;
              cleanIsaView();
              forcereload();
            "
            :disable="!appProperties.loggedIn">
            <q-item-section avatar>
              <q-icon color="grey-7" name="add_circle"></q-icon>
            </q-item-section>
            <q-item-section style="margin-left: -1.2em">New ARC</q-item-section>
          </q-item>
        </q-list>
        <q-spinner-gears
          color="primary"
          size="5em"
          style="margin-left: 1cm"
          v-show="loading"
          :key="refresher + 2"></q-spinner-gears>
      </q-scroll-area>
    </q-drawer>

    <!-- RIGHT SIDE: ISA VIEW/FILE CONTENT VIEW-->
    <q-drawer
      v-model="appProperties.showIsaView"
      side="right"
      bordered
      :breakpoint="0"
      class="bg-grey-3"
      :width="drawerWidth">
      <q-scroll-area class="fit" style="height: 95%; width: 95%">
        <q-btn
          flat
          size="xs"
          icon="keyboard_double_arrow_right"
          @click="appProperties.showIsaView = false"></q-btn>
        <IsaView></IsaView>
      </q-scroll-area>
    </q-drawer>

    <q-page-container>
      <q-page padding>
        <template v-if="showInput"
          ><q-btn
            icon="arrow_back"
            style="background-color: antiquewhite"
            @click="
              showInput = false;
              forcereload();
            "></q-btn>
          <p>Please fill out the form below to create the new ARC:</p>
          <q-input outlined v-model="arcName" label="Name of the ARC" />
          <q-input outlined v-model="arcDesc" label="Description of the ARC" />
          <q-input
            outlined
            v-model="invId"
            label="An identifier of your ARC for the isa file (e.g. hhu_talinum_fruticosum)"
            :rules="[
              (val) => !val.includes(' ') || 'No whitespace allowed!',
            ]" />
          <q-separator
            style="margin-top: 1em; margin-bottom: 1em"></q-separator>

          <q-btn
            icon="send"
            style="background-color: lightcyan"
            @click="
              createArc();
              showInput = false;
              arcDesc = arcName = invId = '';
              forcereload();
            "
            :disable="
              arcName.length == 0 || arcDesc.length == 0 || invId.length == 0
            "
            :key="refresher + 3"></q-btn>
          <!-- Hints to fill out the empty input fields -->
          <span style="margin-left: 1em" v-if="arcName.length == 0"
            >Please provide a name for the ARC!</span
          ><span style="margin-left: 1em" v-else-if="arcDesc.length == 0"
            >Please provide a description for the ARC!</span
          ><span style="margin-left: 1em" v-else-if="invId.length == 0"
            >Please provide an identifier for the ARC!</span
          >
        </template>
        <template v-else>
          <q-btn
            flat
            class="float-right"
            icon="keyboard_double_arrow_left"
            v-show="!appProperties.showIsaView"
            @click="appProperties.showIsaView = true"></q-btn>
          <DataHubView :site="target" :key="refresher"></DataHubView>

          <IsaEditView v-if="isaProperties.entry.length > 0"></IsaEditView>

          <SwateView v-if="templateProperties.template.length > 1"></SwateView
        ></template>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<style>
* {
  font-size: large;
}
</style>
