<script setup lang="ts">
import { setCssVar, useQuasar } from "quasar";
setCssVar("primary", "#2d3e50");
import { ref, reactive } from "vue";

import isaProperties from "./IsaProperties";

import IsaView from "./views/IsaView.vue";
import LoginView from "./views/LoginView.vue";

import SwateView from "./views/SwateView.vue";

import DataHubView from "./views/DataHubView.vue";

import TemplateEditView from "./views/TemplateEditView.vue";

import logoURL from "./assets/dpLogo2_w.png";
import IsaEditView from "./views/IsaEditView.vue";
import { templateProperties } from "./TemplateProperties";
import appProperties from "./AppProperties";
import arcProperties from "./ArcProperties";
import fileProperties from "./FileProperties";
import sheetProperties from "./SheetProperties";
import { termProperties } from "./TermProperties";
import ArcSearchView from "./views/ArcSearchView.vue";

const $q = useQuasar();

class Banner {
  id: number;
  message: string;
  starts_at: string;
  ends_at: string;
  color: string;
  font: string;
  target_access_levels: Array<string>;
  target_path: string;
  broadcast_type: string;
  dismissable: boolean;
  active: boolean;

  constructor(
    id: number,
    message: string,
    starts_at: string,
    ends_at: string,
    color: string,
    font: string,
    target_access_levels: Array<string>,
    target_path: string,
    broadcast_type: string,
    dismissable: boolean,
    active: boolean
  ) {
    this.id = id;
    this.message = message;
    this.starts_at = starts_at;
    this.ends_at = ends_at;
    this.color = color;
    this.font = font;
    this.target_access_levels = target_access_levels;
    this.target_path = target_path;
    this.broadcast_type = broadcast_type;
    this.dismissable = dismissable;
    this.active = active;
  }
}

const layoutProperties = reactive({
  showLeft: true,
});

$q.dark.set(appProperties.dark);

var backend = appProperties.backend + "projects/";

var target = ref("");

var showPwd = ref(false);

var pat = ref("");

var patSet = ref(false);

var groups: Array<{ name: string; id: number }> = [];

var group = ref({ name: "", id: 0 });

var groupEnable = ref(false);

// -1 - normal mode; 0 - arc creation; 1 - template editing; 2 - Arc search; 3 - Personal Access Token
var mode: -1 | 0 | 1 | 2 | 3 = -1;

// Name of the new arc
var arcName = ref("");
// Description of the new arc
var arcDesc = ref("");
// Identifier for the Investigation file
var invId = ref("");

var loading = false;

// countdown to show time left for the current session
var countDown = { hour: 2, minute: 0, second: 0 };
// key number for countdown
var timer = ref(10);

// when there is something to announce, it will be displayed in the header area
var announcement = ref("");

// string containing info about a current error
var errors: string;

var drawerWidth = ref(1000);

var windowWidth = window.innerWidth;

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
const loginOptions: ReadonlyArray<{
  label: string;
  value: string;
  description: string;
}> = [
  {
    label: "DataHUB (federated)",
    value: "tuebingen",
    description:
      "nfdi4plants high-availability DataHUB hosted at the University of Tuebingen",
  },
  {
    label: "DataHUB (reference)",
    value: "freiburg",
    description:
      "nfdi4plants reference DataHUB hosted at the University of Freiburg",
  },
  {
    label: "TRR356 PlantMicrobe",
    value: "plantmicrobe",
    description: "DataHUB for the transregio project TRR356",
  },
  {
    label: "DataHUB (federated) test environment",
    value: "tuebingen_testenv",
    description: "Development server for federated DataHUB",
  },
];

const manualLink =
  "https://nfdi4plants.github.io/nfdi4plants.knowledgebase/arc-manager/";

if ($q.cookies.get("logged_in") != null) {
  appProperties.loggedIn = true;

  let userName = $q.cookies.get("username");
  if (userName == null) userName = "User";

  // set username
  try {
    window.sessionStorage.setItem("username", decodeURI(userName));
  } catch (error) {
    window.sessionStorage.setItem(
      "username",
      decodeURI(userName.split('"')[0])
    );
  }
}

// here we trick vue js to reload the component
const refresher = ref(0);
const forcereload = () => {
  // when the key value is changed, vue is automatically reloading the page
  refresher.value += 1;
  $q.dark.set(appProperties.dark);
};

/** send the createArc request to the backend with all necessary identifiers
 *
 */
async function createArc() {
  loading = true;
  forcereload();

  let payload: {
    name: string;
    description: string;
    investIdentifier: string;
    groupId?: number;
  } = {
    name: arcName.value,
    description: arcDesc.value,
    investIdentifier: invId.value,
  };

  if (group.value && group.value.id > 0) payload.groupId = group.value.id;

  const response = await fetch(backend + "createArc", {
    credentials: "include",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  let data = await response.json();
  if (!response.ok) {
    $q.notify("ERROR: " + data["detail"]);
    forcereload();
  } else {
    console.log(data);
  }

  isaProperties.entries = [];

  loading = false;
  forcereload();
}

/** clean right side view
 *
 */
function cleanIsaView() {
  // reset the templates, terms, isa, file and sheet properties to cleanup "IsaView"
  templateProperties.templates = [];
  templateProperties.template = [];
  termProperties.terms = [];
  isaProperties.entries = [];
  isaProperties.entry = [];
  fileProperties.content = "";
  fileProperties.pdfContent = "";
  sheetProperties.names = sheetProperties.sheets = [];
  sheetProperties.name = "";
  arcProperties.changes = "";
  forcereload();
}

// if you tried to login and there is an error, the error will be stored in the cookies
if (document.cookie.includes("error")) {
  window.alert(document.cookie.split("error=")[1]);
}

/** get the list of branches
 *
 * @param id - the id of the arc
 */
async function getGroups() {
  groups = [];
  group.value = { name: "", id: 0 };
  try {
    let request = await fetch(appProperties.backend + "user/getGroups", {
      credentials: "include",
    });
    if (request.ok) {
      let groupsJson = await request.json();

      groupsJson.forEach((element: { name: string; id: number }) => {
        groups.push({
          name: element.name,
          id: element.id,
        });
      });
    } else {
      errors = "Error retrieving your groups! Try to login again!";
      $q.notify({
        type: "negative",
        message: errors,
      });
    }
  } catch (error: any) {
    errors = error.toString();
    $q.notify({
      type: "negative",
      message: errors,
    });
  }
  forcereload();
}

/** get the list of branches
 *
 * @param id - the id of the arc
 */
async function getBanner() {
  try {
    let request = await fetch(appProperties.backend + "projects/getBanner", {
      credentials: "include",
    });
    if (request.ok) {
      let bannerJson: Banner | null = await request.json();
      if (bannerJson != null) announcement.value = bannerJson.message;
    }
  } catch (error: any) {
    errors = error.toString();
    $q.notify({
      type: "negative",
      message: errors,
    });
  }
  forcereload();
}

/** refreshes your session using the refresh token
 *
 *
 */
async function refreshSession() {
  try {
    let request = await fetch(appProperties.backend + "auth/refresh", {
      credentials: "include",
    });
    if (request.ok) {
      $q.notify({ message: await request.text(), type: "positive" });

      try {
        let time = Number($q.cookies.get("timer")) + 7200;
        let timeLeft = time - Math.floor(new Date().getTime() / 1000);

        // if session ran out, the countdown was stopped. Therefore start a new cycle
        if (
          countDown.hour == 0 &&
          countDown.minute == 0 &&
          countDown.second == 0
        ) {
          countDown.hour = Math.floor(timeLeft / 3600);
          countDown.minute = Math.floor(timeLeft / 60) % 60;
          countDown.second = Math.floor(timeLeft % 60);
          let interval = setInterval(() => {
            if (countDown.minute == 0) {
              countDown.hour -= 1;
              countDown.minute = 59;
              countDown.second = 59;
            }
            if (countDown.second == 0) {
              countDown.minute -= 1;
              countDown.second = 59;
            } else {
              countDown.second -= 1;
            }
            // reset counter
            if (countDown.hour < 0) {
              countDown.hour = 0;
              countDown.minute = 0;
              countDown.second = 0;
              clearInterval(interval);
            }

            // refresh time left to accommodate to rounding errors after one hour or 5 minutes left
            if (timeLeft == 3600 || timeLeft == 300)
              timeLeft = time - Math.floor(new Date().getTime() / 1000);

            timer.value += 1;
          }, 970);
          // else just set the timer back to the newest state
        } else {
          countDown.hour = Math.floor(timeLeft / 3600);
          countDown.minute = Math.floor(timeLeft / 60) % 60;
          countDown.second = Math.floor(timeLeft % 60);
        }
      } catch (error: any) {
        $q.notify({ type: "negative", message: error.toString() });
      }
    } else {
      errors = "Error refreshing your Session! Try to login again!";
      $q.notify({
        type: "negative",
        message: errors,
      });
    }
  } catch (error: any) {
    errors = error.toString();
    $q.notify({
      type: "negative",
      message: errors,
    });
  }
}

/** Adds your personal access token allowing much longer session
 *
 *
 */
async function addPAT() {
  try {
    let request = await fetch(appProperties.backend + "auth/addPAT", {
      credentials: "include",
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pat: pat.value }),
    });
    if (request.ok) {
      $q.notify({ message: await request.text(), type: "positive" });

      try {
        let patCookie = $q.cookies.get("pat");

        if (patCookie && patCookie == "true") {
          patSet.value = true;
        }
      } catch (error: any) {
        $q.notify({ type: "negative", message: error.toString() });
      }
    } else {
      errors = "Error adding your PAT! Try to login again!";
      $q.notify({
        type: "negative",
        message: errors,
      });
    }
  } catch (error: any) {
    errors = error.toString();
    $q.notify({
      type: "negative",
      message: errors,
    });
  }
}

// check if user settings prefer dark mode
if (
  window.matchMedia &&
  window.matchMedia("(prefers-color-scheme: dark)").matches
) {
  appProperties.dark = true;
  forcereload();
}

if (appProperties.loggedIn && $q.cookies.get("timer") != null) {
  if ($q.cookies.get("pat")) {
    if ($q.cookies.get("pat") == "true") patSet.value = true;
  }

  getBanner();
  let time = Number($q.cookies.get("timer")) + 7200;
  let timeLeft = time - Math.floor(new Date().getTime() / 1000);

  if (timeLeft > 0 && !patSet.value) {
    countDown.hour = Math.floor(timeLeft / 3600);
    countDown.minute = Math.floor(timeLeft / 60) % 60;
    countDown.second = Math.floor(timeLeft % 60);

    let interval = setInterval(() => {
      if (countDown.minute == 0) {
        countDown.hour -= 1;
        countDown.minute = 59;
        countDown.second = 59;
      }
      if (countDown.second == 0) {
        countDown.minute -= 1;
        countDown.second = 59;
      } else {
        countDown.second -= 1;
      }
      // reset counter
      if (countDown.hour < 0) {
        countDown.hour = 0;
        countDown.minute = 0;
        countDown.second = 0;
        clearInterval(interval);
      }

      // refresh time left to accommodate to rounding errors after one hour or 5 minutes left
      if (timeLeft == 3600 || timeLeft == 300)
        timeLeft = time - Math.floor(new Date().getTime() / 1000);

      timer.value += 1;
    }, 970);
  } else {
    countDown.hour = 0;
  }
}
</script>

<template>
  <header></header>
  <q-layout view="hHh LpR fFr" class="no-selection">
    <!-- LEFT SIDE: LOGO, SELECT HUB, LOGIN, CREATE ARC -->
    <q-drawer
      v-model="layoutProperties.showLeft"
      show-if-above
      :mini="!appProperties.arcList"
      :width="190"
      :breakpoint="500"
      bordered>
      <q-scroll-area
        class="fit"
        :horizontal-thumb-style="{ opacity: String(0) }">
        <q-list>
          <q-item
            v-ripple
            clickable
            class="bg-primary text-white"
            @click="
              mode = -1;
              errors = '';
              forcereload();
            "
            style="padding-top: 1em; padding-bottom: 1em">
            <q-item-section avatar>
              <q-icon
                size="2.5rem"
                style="margin: 0 -0.2em"
                :name="'img:' + logoURL"
                @click="
                  mode = -1;
                  errors = '';
                  forcereload();
                "
                :key="refresher + 1"></q-icon>
            </q-item-section>
            <q-item-section style="margin: 0.6em 0 0 -1.2em">
              <q-item-label
                ><b style="font-size: 1.1em">ARCmanager</b>
                <q-badge outline align="middle" color="teal">
                  v {{ appProperties.version }}
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
              mode = 0;
              appProperties.showIsaView = false;
              errors = '';
              getGroups();
              cleanIsaView();
              forcereload();
            "
            v-show="appProperties.loggedIn">
            <q-item-section avatar>
              <q-icon color="grey-7" name="add_circle"></q-icon>
            </q-item-section>
            <q-item-section style="margin-left: -1.2em">New ARC</q-item-section
            ><q-tooltip>Create a new Arc</q-tooltip> </q-item
          ><q-separator />
          <!-- TEMPLATE EDITOR-->
          <q-item
            v-if="appProperties.experimental"
            v-ripple
            clickable
            v-on:click="
              errors = '';
              mode = 1;
              appProperties.showIsaView = false;
              appProperties.arcList = false;
              cleanIsaView();
              forcereload();
            ">
            <q-item-section avatar>
              <q-icon color="grey-7" name="table_chart"></q-icon>
            </q-item-section>
            <q-item-section style="margin-left: -1.2em"
              >Template Editor</q-item-section
            ><q-tooltip>Open the template editor</q-tooltip>
          </q-item>
          <!-- ARC SEARCH -->
          <q-item
            v-ripple
            clickable
            v-on:click="
              errors = '';
              mode = 2;
              appProperties.showIsaView = false;
              appProperties.arcList = false;
              cleanIsaView();
              forcereload();
            ">
            <q-item-section avatar>
              <q-icon color="grey-7" name="search"></q-icon>
            </q-item-section>
            <q-item-section style="margin-left: -1.2em"
              >ARC Search</q-item-section
            ><q-tooltip>Open the search area for public arcs</q-tooltip>
          </q-item>
          <!-- DARK MODE-->
          <q-item v-if="!appProperties.dark">
            <q-btn
              @click="
                appProperties.dark = !appProperties.dark;
                $q.dark.toggle();
              "
              round
              outline
              icon="dark_mode"
              ><q-tooltip>Switch to dark mode</q-tooltip></q-btn
            ></q-item
          >
          <q-item v-else>
            <q-btn
              @click="
                appProperties.dark = !appProperties.dark;
                $q.dark.toggle();
              "
              round
              outline
              color="yellow"
              icon="light_mode"
              ><q-tooltip>Switch to light mode</q-tooltip></q-btn
            >
          </q-item>
        </q-list>
        <!-- LOADING SPINNER-->
        <q-spinner-gears
          size="5em"
          style="margin-left: 1cm"
          v-show="loading"
          :key="refresher + 2"></q-spinner-gears>
        <q-separator
          inset
          style="margin-top: 1em; margin-bottom: 1em"
          v-if="!patSet" />
        <!-- SESSION TIMER-->
        <p class="text-center" v-if="appProperties.arcList && !patSet">
          Session time left:
        </p>

        <span
          style="margin-left: 25%"
          :key="timer"
          v-show="appProperties.arcList && !patSet"
          >{{ countDown.hour }} :
          <template v-if="countDown.minute < 10">0</template
          >{{ countDown.minute }} :
          <template v-if="countDown.second < 10">0</template
          >{{ countDown.second }}</span
        >

        <!-- REFRESH -->
        <p
          class="text-center"
          style="margin-top: 1em"
          v-if="appProperties.loggedIn && !patSet">
          <template v-if="appProperties.arcList">Refresh: </template>
          <q-btn icon="autorenew" round outline @click="refreshSession"
            ><q-tooltip>Refresh your session</q-tooltip></q-btn
          >
        </p>

        <q-separator v-if="appProperties.experimental" />
        <q-item
          v-if="appProperties.experimental"
          v-ripple
          clickable
          v-on:click="
            errors = '';
            mode = 3;
            appProperties.showIsaView = false;
            cleanIsaView();
            forcereload();
          ">
          <q-item-section avatar>
            <q-icon color="grey-7" name="add"></q-icon>
          </q-item-section>
          <q-item-section style="margin-left: -1.2em">Add PAT</q-item-section
          ><q-tooltip>Add your Personal Access Token (PAT)</q-tooltip>
        </q-item>
      </q-scroll-area>
    </q-drawer>

    <!-- RIGHT SIDE: ISA VIEW/FILE CONTENT VIEW-->
    <q-drawer
      v-model="appProperties.showIsaView"
      side="right"
      bordered
      :breakpoint="0"
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

    <!-- MAIN PART -->
    <q-page-container>
      <!-- FOOTER -->
      <q-footer bordered class="footer row">
        <a
          class="footer"
          :href="manualLink"
          target="_blank"
          style="margin-left: 45%"
          >Manual</a
        >
        <q-separator vertical style="margin-left: 1%" size="2px"></q-separator>
        <a
          class="footer"
          href="https://helpdesk.nfdi4plants.org/"
          target="_blank"
          style="margin-left: 1%"
          >Helpdesk</a
        >
        <!--<a style="margin-left: 10%;" href="mailto:arcmanager.support@nfdi4plants.de" class="footer">Support&#128231;</a>-->
      </q-footer>
      <!-- HEADER -->
      <q-header
        bordered
        class="footer"
        v-if="announcement != ''"
        style="text-align: center"
        :key="refresher + 7">
        <span>{{ announcement }}</span>
      </q-header>
      <q-page padding>
        <q-item-section v-if="errors != ''">{{ errors }}</q-item-section>
        <!-- MODE 0: ARC CREATION-->
        <template v-if="mode == 0"
          ><q-btn
            class="return"
            icon="arrow_back"
            @click="
              mode = -1;
              groupEnable = false;
              appProperties.arcList = true;
              forcereload();
            "
            :key="refresher + 3"></q-btn>
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
          <div v-show="groups.length > 0">
            <q-checkbox v-model="groupEnable"
              >Group?<q-tooltip
                >Create a new Arc for a Group</q-tooltip
              ></q-checkbox
            >
            <q-select
              v-if="groupEnable"
              clearable
              :options="groups"
              option-label="name"
              label="Group"
              v-model="group"
              :key="refresher + 6"
              style="width: 200px"></q-select>
          </div>
          <q-separator
            style="margin-top: 1em; margin-bottom: 1em"></q-separator>

          <q-btn
            class="send"
            icon="send"
            @click="
              createArc();
              mode = -1;
              arcDesc = arcName = invId = '';
              forcereload();
            "
            :disable="
              arcName.length == 0 || arcDesc.length == 0 || invId.length == 0
            "></q-btn>
          <!-- Hints to fill out the empty input fields -->
          <span style="margin-left: 1em" v-if="arcName.length == 0"
            >Please provide a name for the ARC!</span
          ><span style="margin-left: 1em" v-else-if="arcDesc.length == 0"
            >Please provide a description for the ARC!</span
          ><span style="margin-left: 1em" v-else-if="invId.length == 0"
            >Please provide an identifier for the ARC!</span
          >
        </template>
        <!-- MODE 1: TEMPLATE EDITOR-->
        <template v-else-if="mode == 1"
          ><q-btn
            class="return"
            icon="arrow_back"
            @click="
              mode = -1;
              appProperties.arcList = true;
              forcereload();
            "
            :key="refresher + 4"></q-btn>
          <TemplateEditView></TemplateEditView>
        </template>
        <!-- MODE 2: ARC SEARCH-->
        <template v-else-if="mode == 2">
          <q-btn
            class="return"
            icon="arrow_back"
            @click="
              mode = -1;
              appProperties.arcList = true;
              forcereload();
            "
            :key="refresher + 4"></q-btn>
          <ArcSearchView></ArcSearchView>
        </template>
        <!-- MODE 3: PERSONAL ACCESS TOKEN-->
        <template v-if="mode == 3"
          ><q-btn
            class="return"
            icon="arrow_back"
            @click="
              mode = -1;
              groupEnable = false;
              appProperties.arcList = true;
              forcereload();
            "
            :key="refresher + 3"></q-btn>
          <p>
            Please fill out the field below to add your Personal Access Token
            (PAT):
          </p>
          <q-input
            style="width: 30em"
            outlined
            v-model="pat"
            label="Your Personal Access Token"
            :type="showPwd ? 'test' : 'password'"
            ><template v-slot:append>
              <q-icon
                :name="showPwd ? 'visibility' : 'visibility_off'"
                class="cursor-pointer"
                @click="showPwd = !showPwd" /> </template
          ></q-input>

          <q-btn
            class="send"
            icon="send"
            @click="
              addPAT();
              mode = -1;
              pat = '';
              forcereload();
            "
            :disable="pat.length == 0"></q-btn>
        </template>
        <!-- MODE -1: NORMAL MODE-->
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

.text-gold {
  color: #ffd700 !important;
}

.body--light .return {
  background-color: antiquewhite;
}
.body--dark .return {
  background-color: peru;
}

.body--light .send {
  background-color: lightcyan;
}
.body--dark .send {
  background-color: steelblue;
}

.body--dark .alt {
  background-color: #050505;
}
.body--light .alt {
  background-color: #fafafa;
}

.body--light .footer {
  background-color: lightgray;
  color: blue;
}

.body--dark .footer {
  color: white;
}

.body--dark .active {
  background-color: darkgreen;
  color: white;
}

.body--dark .active {
  background-color: darkgreen;
  color: white;
}
</style>
