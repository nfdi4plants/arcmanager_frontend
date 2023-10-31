<script setup lang="ts">
import { RouterLink, RouterView } from "vue-router";
import { setCssVar } from "quasar";
setCssVar("primary", "#2d3e50");
import { onMounted, ref, reactive } from "vue";
import ToolbarButton from "./components/ToolbarButton.vue";

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
  showToolbar: true,
  toolbarMinimized: false,
  showHelp: true,
  splitterModel: 300,
});

//let backend = "http://localhost:8000/arcmanager/api/v1/projects/";
let backend = "https://nfdi4plants.de/arcmanager/api/v1/projects/";

let target = ref("Dev");
let showInput = false;
// Name of the new arc
let arcName = ref("");
// Description of the new arc
let arcDesc = ref("");
// Identifier for the Investigation file
let invId = ref("");

let loading = false;

let drawerWidth = ref(600);

let windowWidth = window.innerWidth;

window.addEventListener("resize", () => {
  windowWidth = window.innerWidth;
  checkMini(windowWidth);
});

function checkMini(width: number) {
  if (width < 1800) drawerWidth.value = 300;
  else drawerWidth.value = 600;
}
checkMini(windowWidth);

let loginOptions = ["Dev", "Freiburg", "Tübingen", "PlantMicrobe"];

// here we trick vue js to reload the component
const arclist = ref(0);
const forcereload = () => {
  // when the key value is changed, vue is automatically reloading the page
  arclist.value += 1;
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
</script>

<template>
  <header></header>
  <q-layout view="hHh LpR fFf" class="no-selection">
    <!-- LEFT SIDE: LOGO, SELECT HUB, LOGIN, CREATE ARC -->
    <q-drawer
      v-model="layoutProperties.showToolbar"
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
                :key="arclist"></q-icon>
            </q-item-section>
            <q-item-section style="margin: 0.6em 0 0 -1.2em">
              <q-item-label
                ><b style="font-size: 1.4em">ARCitect Web</b></q-item-label
              >
            </q-item-section>
          </q-item>
          <q-select
            standout
            v-model="target"
            v-if="!appProperties.loggedIn"
            :options="loginOptions"
            label="DataHub" />
          <q-separator></q-separator>

          <LoginView :site="target" />

          <q-separator />

          <ToolbarButton
            text="New ARC"
            icon="add_circle"
            @clicked="
              showInput = true;
              cleanIsaView();
              forcereload();
            "
            :key="arclist"></ToolbarButton>
        </q-list>
        <q-spinner-gears
          color="primary"
          size="5em"
          style="margin-left: 1cm"
          v-show="loading"
          :key="arclist"></q-spinner-gears>
      </q-scroll-area>
    </q-drawer>

    <!-- RIGHT SIDE: ISA VIEW/FILE CONTENT VIEW-->
    <q-drawer
      show-if-above
      v-model="layoutProperties.showHelp"
      side="right"
      bordered
      :breakpoint="0"
      class="bg-grey-3"
      :width="drawerWidth">
      <q-scroll-area class="fit" style="height: 95%; width: 95%">
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
            label="An identifier of your ARC for the isa file (e.g. hhu_talinum_fruticosum)" />
          <q-separator></q-separator>

          <q-btn
            icon="send"
            style="background-color: lightcyan"
            @click="
              createArc();
              showInput = false;
              arcDesc = arcName = invId = '';
              forcereload();
            "
            :key="arclist"></q-btn>
        </template>
        <DataHubView :site="target" v-else :key="arclist">dataview</DataHubView>

        <IsaEditView v-if="isaProperties.entry.length > 0"></IsaEditView>

        <SwateView v-if="templateProperties.template.length > 1"></SwateView>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<style>
* {
  font-size: large;
}
</style>
