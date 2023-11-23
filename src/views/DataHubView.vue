<script lang="ts" setup>
import { ref } from "vue";

import isaProperties from "../IsaProperties.ts";
import fileProperties from "../FileProperties";

import { useQuasar } from "quasar";
import arcProperties from "@/ArcProperties";
import appProperties from "@/AppProperties";
import templateProperties from "@/TemplateProperties";
import termProperties from "@/TermProperties";
import sheetProperties from "@/SheetProperties";

const $q = useQuasar();

// Address of the backend
let backend = appProperties.backend + "projects/";

// list with all arcs
var list: any[] = [];

// list with errors
var errors: any;

// show only arcs with writing permission
var owned = ref(false);

// show experimental features
var experimental = ref(true);

// list of all the content of the specific arc
var arcList: any[] = [];
// gitlab id of the arc
var arcId: number;
// name of the main branch of the arc
var arcBranch: string;

// list of all the entries of the isa file
isaProperties.entries = [];
//list to safe every entry of the isa file
var isaList: any[] = [];

// here we save the paths, so we can return to the last page visited in the arc
var pathHistory: string[] = [];

// here we get the target git from App.vue
let git = defineProps(["site"]);

let username = "";

// set to true if loading something
let loading = false;

// displays arc creation input field
let showInput = false;

// displays the sync input selection field
let assaySync = false;
let studySync = false;

// the selected study and assay
let studySelect = ref("");
let assaySelect = ref("");

// field for identifier
let ident = ref("");

// field for searchbar
let search = ref("");

// the filtered list, that will be displayed
let searchList: any[] = [];

// here we trick vue js to reload the component
const refresher = ref(0);
const forcereload = () => {
  // when the key value is changed, vue is automatically reloading the page
  refresher.value += 1;
};
if (document.cookie.includes("logged_in=true")) {
  appProperties.loggedIn = true;

  // set username
  window.sessionStorage.setItem(
    "username",
    document.cookie.split('username="')[1].split('"')[0]
  );
}

let fileInput = ref();

// opens the explore page of the selected git in a new tab (only when you're not logged in currently)
function openGit(target: string) {
  errors = "";
  forcereload();
  switch (target) {
    case "freiburg":
      window.open("https://git.nfdi4plants.org/explore");
      break;
    case "tuebingen":
      window.open("https://gitlab.nfdi4plants.de/explore");
      break;
    case "dev":
      window.open("https://gitdev.nfdi4plants.org/explore");
      break;
    case "plantmicrobe":
      window.open("https://gitlab.plantmicrobe.de/explore");
      break;
    default:
      errors = "Please select a DataHub first!";
      forcereload();
  }
}
// get a list of all arcs in the gitlab
async function fetchArcs() {
  loading = true;
  searchList = [];
  // if not logged in, show only public arcs
  if (!appProperties.loggedIn) {
    if (git.site == "") {
      errors = "Please select a DataHub first!";
      loading = false;
    } else {
      errors = "Not logged in! Listing only public ARCs";
      searchList = [];
      try {
        const response = await fetch(
          backend + "public_arcs?target=" + git.site.value
        );
        const data = await response.json();
        if (!response.ok) {
          throw new Error(response.statusText + ", " + data["detail"]);
        }

        list = [];
        data.projects.forEach((element: any) => {
          list.push(element);
        });
        searchList = list;
      } catch (error) {
        errors = error;
      }

      loading = false;
      forcereload();
    }
    // if logged in, reset the properties and views and fetch the arc list from the backend
  } else {
    arcList = [];
    arcProperties.identifier = "";
    assaySync = studySync = false;

    cleanIsaView();
    // reset Properties and histories
    isaProperties.entryOld = [];
    isaProperties.rowId = 0;
    fileProperties.name = "";
    arcProperties.changes = "";
    pathHistory = [];
    try {
      const response = await fetch(backend + "arc_list?owned=" + owned.value, {
        credentials: "include",
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(response.statusText + ", " + data["detail"]);

      errors = null;
      list = [];
      data.projects.forEach((element: any) => {
        list.push(element);
      });
      if (list.length == 0) throw new Error("No arcs found for you!");
      // fill searchList with the full list and clear the search bar
      searchList = list;
      search.value = "";

      // set the username in sessionStorage and display it
      if (window.sessionStorage.getItem("username") != null)
        username = window.sessionStorage.getItem("username");
    } catch (error) {
      errors = error;
    }
    loading = false;
    forcereload();
  }
}

// opens the url of the arc in a new tab
const openArc = (url: string) => {
  window.open(url);
};

// cleans the right side
function cleanIsaView() {
  // reset the templates, terms, isa, file and sheet properties to cleanup "IsaView"
  templateProperties.templates = templateProperties.template = [];
  termProperties.terms = [];
  termProperties.buildingBlocks = termProperties.unitTerms = [];
  isaProperties.entries = [];
  isaProperties.entry = [];
  fileProperties.content = "";
  sheetProperties.names = sheetProperties.sheets = [];
  sheetProperties.name = "";
  errors = "";
  forcereload();
}

// get a tree view of the front page of the arc
async function inspectArc(id: number) {
  loading = true;
  arcId = id;
  errors = null;
  search.value = "";
  searchList = list;
  cleanIsaView();
  arcProperties.studies = arcProperties.assays = [];
  forcereload();
  try {
    const response = await fetch(backend + "arc_tree?id=" + id, {
      credentials: "include",
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(response.statusText + ", " + data["detail"]);

    arcList = [];
    data.Arc.forEach((element: any) => {
      arcList.push(element);
    });
    console.log(arcList);

    pathHistory = [];
    pathHistory.push("");

    // get the changes
    await getChanges(id);
  } catch (error) {
    errors = error;
  }
  loading = false;
  forcereload();
}

// get the list of changes
async function getChanges(id: number) {
  try {
    await fetch(backend + "getChanges?id=" + id, {
      credentials: "include",
    })
      .then((response) => {
        if (response.ok) {
          return response.text();
        }
      })
      .then((text) => {
        // include html line breaks
        if (text) arcProperties.changes = text.replace(/\n/g, "<br />");
      });
  } catch (error) {
    errors = error;
  }
}
// get a tree view of the selected path of the arc
async function inspectTree(id: number, path: string, expand?: boolean) {
  loading = true;
  assaySync = studySync = false;
  forcereload();
  try {
    const response = await fetch(
      backend + "arc_path?path=" + path + "&id=" + id,
      {
        credentials: "include",
      }
    );

    const data = await response.json();
    if (!response.ok)
      throw new Error(response.statusText + ", " + data["detail"]);

    arcList = [];
    data.Arc.forEach((element: any) => {
      arcList.push(element);
    });
    forcereload();
    if (expand) pathHistory.push(path);
    else if (expand == undefined) console.log("skip");
    else pathHistory.pop();
    cleanIsaView();
  } catch (error) {
    errors = error;
  }
  loading = false;
  forcereload();
}
// gets the file on the arc
async function getFile(id: number, path: string, branch: string) {
  loading = true;

  // cleanup views
  assaySync = studySync = false;
  forcereload();

  cleanIsaView();
  let response;

  // get the file from the backend
  try {
    response = await fetch(
      backend + "arc_file?path=" + path + "&id=" + id + "&branch=" + branch,
      {
        credentials: "include",
      }
    );
    let data = await response.json();
    if (!response.ok)
      throw new Error(response.statusText + ", " + data["detail"]);

    // if the file has no content, display "Empty File"
    if (data.size == 0) {
      fileProperties.name = data.file_name;
      data.content = btoa("Empty File");
    }
    // if there is content, it cant be an isa file
    if (data.content) {
      let size;
      // check the size of the file (display either in kb or mb)
      if (data.size > 1000000) size = data.size / 1000000 + " MB";
      else size = data.size / 1000 + " KB";

      // display name of the file
      fileProperties.name = data.file_name + " (" + size + ")";
      fileProperties.id = id;
      fileProperties.path = path;

      // display the decoded content
      try {
        fileProperties.content = decodeURIComponent(
          atob(data.content)
            .split("")
            .map(function (c) {
              return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
            })
            .join("")
        );
      } catch (error) {
        fileProperties.content = data.content;
      }

      // if there is no typical content, its an isa file, because then we have a list of entries
    } else {
      isaProperties.date = "";

      isaList = [];
      data.forEach((element: any) => {
        // TODO: currently only works with isa files, non isa files will create errors
        // reads out the file and saves the content to isaProperties
        if (isaProperties.date == "") {
          switch (element[0]) {
            case "Investigation Identifier":
            case "Study Identifier":
            case "Measurement Type":
              isaProperties.date = element[2];
          }
        }
        isaList.push(element);
      });
      // write the new data to isaProperties
      isaProperties.entries = isaList;
      isaProperties.repoId = id;
      isaProperties.path = path;
      isaProperties.repoTarget = git.site.value;
    }

    // catch any error and display it
  } catch (error: any) {
    fileProperties.content = error.toString();
    fileProperties.name = response?.status.toString();
  }
  loading = false;
  forcereload();
}

// create a new isa structure with a given identifier
async function addIsa(
  id: number,
  identifier: string,
  type: string,
  branch: string
) {
  loading = true;
  forcereload();
  await fetch(
    backend +
      "createISA?identifier=" +
      identifier +
      "&id=" +
      id +
      "&type=" +
      type +
      "&branch=" +
      branch,
    { credentials: "include" }
  )
    .then((response) => response.json())
    .then((data) => {
      console.log(data);
      // get the updated tree
      inspectTree(id, type);
    });

  // get the updated changes, assays and studies
  await getChanges(id);

  loading = false;
  forcereload();
}

// sort the arcList to include only the arcs containing the searchTerm
function sortArcs(searchTerm: string) {
  searchList = [];
  list.forEach((element) => {
    // craft the string to search in including the name of the arc, the creators name, the id and the topics of the arc
    let searchString =
      element["name_with_namespace"].toLowerCase() +
      " " +
      element["id"] +
      " " +
      element["topics"].toString().toLowerCase();
    if (searchString.includes(searchTerm)) {
      searchList.push(element);
    }
  });
}

// uploads the file to the hub
async function fileUpload() {
  loading = true;
  forcereload();
  let resultContent = "";

  // read out the given file input
  let reader = new FileReader();
  reader.readAsDataURL(fileInput.value);

  reader.onload = async function () {
    let result = reader.result?.toString();
    resultContent = result?.split(",")[1];

    // save the file on the most recent path
    let filePath = pathHistory[pathHistory.length - 1];

    if (filePath == "") {
      filePath += fileInput.value.name;
    } else {
      filePath += "/" + fileInput.value.name;
    }
    // send the file to the backend to upload it
    const response = await fetch(backend + "uploadFile", {
      method: "POST",
      // body for the backend containing all necessary data
      body: JSON.stringify({
        name: fileInput.value.name,
        content: resultContent,
        id: arcId,
        branch: arcBranch,
        path: filePath,
      }),
      credentials: "include",
    });
    if (!(await response).ok) {
      let data = await response.json();
      errors = "ERROR: " + data["detail"];
      refresher.value += 1;
    } else {
      // if successful, reset the fileProperties and input value
      fileInput.value = "";
      fileProperties.name = fileProperties.path = fileProperties.content = "";
      fileProperties.id = 0;
      errors = "";
      // get the updated view of the arc
      await inspectArc(arcId);
    }
  };
  loading = false;
  forcereload();
}

// if you click the 'create new sheet' button, you will get a list containing all the current templates
async function getTemplates() {
  cleanIsaView();
  loading = true;
  assaySync = studySync = false;
  forcereload();

  // retrieve the templates
  await fetch(backend + "getTemplates")
    .then((response) => response.json())
    .then((templates) => {
      if (templates.templates.length == 0) {
        errors = "ERROR: No templates found!";
        forcereload();
      }
      // save the templates
      templateProperties.templates = templates.templates;
    });

  loading = false;
  forcereload();
}

// get a list of all the swate sheets
async function getSheets(path: string, id: number, branch: string) {
  cleanIsaView();
  assaySync = studySync = false;
  loading = true;
  forcereload();

  isaProperties.path = path;
  isaProperties.repoId = id;
  arcProperties.branch = branch;
  // retrieve the sheets
  await fetch(
    backend + "getSheets?path=" + path + "&id=" + id + "&branch=" + branch,
    { credentials: "include" }
  )
    .then((response) => response.json())
    .then((sheets) => {
      if (sheets[0].length == 0) {
        errors = "ERROR: No sheets found!";
        forcereload();
      }
      // save the sheets
      sheetProperties.sheets = sheets[0];
      sheetProperties.names = sheets[1];
    });

  loading = false;
  forcereload();
}

// get a list of all assays and studies
async function getAssaysAndStudies(id: number) {
  loading = true;
  forcereload();
  try {
    // get names of the assays and studies
    let assays = await fetch(backend + "getAssays?id=" + id, {
      credentials: "include",
    });
    let studies = await fetch(backend + "getStudies?id=" + id, {
      credentials: "include",
    });
    arcProperties.assays = await assays.json();
    arcProperties.studies = await studies.json();
  } catch (error) {
    errors = error;
  }

  // if either no assay or no study is found, return error
  if (arcProperties.assays.length == 0) errors = "ERROR: No Assays found!";
  if (arcProperties.studies.length == 0) errors = "ERROR: No Studies found!";

  loading = false;
  forcereload();
}

// sync an assay to a study
async function syncAssay(
  id: number,
  assay: string,
  study: string,
  branch: string
) {
  loading = true;
  assaySync = false;
  forcereload();

  let studyPath = "studies/" + study + "/isa.study.xlsx";
  let assayPath = "assays/" + assay + "/isa.assay.xlsx";

  // send sync request to the backend with the given paths
  try {
    const response = await fetch(
      backend +
        "syncAssay?id=" +
        id +
        "&pathToStudy=" +
        studyPath +
        "&pathToAssay=" +
        assayPath +
        "&assayName=" +
        assay +
        "&branch=" +
        branch,
      { credentials: "include" }
    );
    const data = await response.json();
    if (!response.ok)
      throw new Error(response.statusText + ", " + data["detail"]);
  } catch (error) {
    errors = error;
  }

  loading = false;
  forcereload();
}

// sync a study to the investigation file
async function syncStudy(id: number, study: string, branch: string) {
  loading = true;
  studySync = false;
  forcereload();

  let studyPath = "studies/" + study + "/isa.study.xlsx";

  // send the sync request with the given study path
  try {
    const response = await fetch(
      backend +
        "syncStudy?id=" +
        id +
        "&pathToStudy=" +
        studyPath +
        "&studyName=" +
        study +
        "&branch=" +
        branch,
      { credentials: "include" }
    );
    const data = await response.json();
    if (!response.ok)
      throw new Error(response.statusText + ", " + data["detail"]);
  } catch (error) {
    errors = error;
  }

  loading = false;
  forcereload();
}

// checks weather the file should be editable or not
function checkName(name: string) {
  let includes = false;
  let formats = [
    ".pdf",
    ".xml",
    ".zip",
    ".gz",
    ".html",
    ".css",
    ".mp4",
    ".raw",
    ".docx",
    ".db",
    ".dll",
    ".pdb",
    ".pptx",
  ];
  formats.forEach((element) => {
    if (name.toLowerCase().includes(element)) {
      includes = true;
    }
  });
  if (name.includes(".xlsx") && !name.includes("isa")) includes = true;
  return includes;
}
</script>

<template>
  <!-- FETCH ARC/FILE UPLOAD BUTTON/OPEN ARC/SYNC ASSAYS/STUDIES RELOAD-->
  <div class="q-pa-xs row q-gutter-sm">
    <q-btn
      @click="fetchArcs(), forcereload()"
      icon="downloading"
      style="background-color: aquamarine; max-width: 200px"
      dense
      >Load the Arcs</q-btn
    ><q-btn
      icon="open_in_new"
      dense
      style="background-color: lightskyblue"
      v-if="arcList.length == 0 && !appProperties.loggedIn"
      @click="openGit(git.site.value)"
      >Explore Git</q-btn
    >
    <q-checkbox
      style="padding-left: 10px"
      left-label
      v-model="owned"
      label="Your Arcs:"
      v-show="arcList.length == 0 && appProperties.loggedIn"
      @update:model-value="fetchArcs" />
    <template v-if="arcList.length != 0">
      <!-- File Upload with a limit of 100 mb-->
      <q-file
        style="max-width: 200px; background-color: lightgoldenrodyellow"
        v-model="fileInput"
        outlined
        label="Upload File (<100 mb)"
        max-file-size="104857600"
        @update:model-value="
          fileUpload();
          loading = true;
        "
        @rejected="
          errors = 'ERROR: File too big!';
          forcereload();
        "
        :key="refresher"></q-file>
      <q-btn
        @click="openArc(arcProperties.url)"
        icon="open_in_new"
        style="background-color: lightskyblue; max-width: 200px"
        :key="refresher"
        >Open</q-btn
      >
      <q-btn
        style="background-color: orange"
        icon="sync_alt"
        @click="
          assaySync = !assaySync;
          studySync = false;
          forcereload();
          getAssaysAndStudies(arcId);
        "
        :key="refresher"
        >Sync Assay/Study</q-btn
      >
      <q-btn
        style="background-color: gainsboro"
        icon="sync"
        @click="
          studySync = !studySync;
          assaySync = false;
          forcereload();
          getAssaysAndStudies(arcId);
        "
        :key="refresher"
        >Sync Study/Invest</q-btn
      >
      <!-- Reloads the arc -->
      <q-btn icon="refresh" @click="inspectArc(arcId)">Reload</q-btn>

      <!-- activates swate and annotation sheets-->
      <q-checkbox v-model="experimental">Experimental</q-checkbox></template
    >

    <!-- LOADING SPINNER --><q-spinner
      id="loader"
      color="primary"
      size="3em"
      v-show="loading"
      :key="refresher"></q-spinner>
  </div>

  <q-list bordered dense class="rounded-borders">
    <!-- USERNAME -->
    <q-item v-if="username.length > 1"
      >User: {{ username }} / ARC: {{ arcProperties.identifier }}</q-item
    >
    <!-- LIST WITH ALL ARCS AND ARC TREE VIEW-->
    <q-expansion-item
      :key="refresher"
      expand-separator
      icon="cloud_download"
      label="List ARCs"
      caption="List ARCs from the DataHUB"
      header-class="bg-grey-33"
      default-opened>
      <div style="display: block; margin: 0 auto; max-width: 80%">
        <!-- ERRORS -->
        <q-item-section v-if="errors != null">{{ errors }}</q-item-section>
        <q-separator />
        <!-- CREATE ISA -->
        <template v-if="showInput"
          ><q-btn
            icon="arrow_back"
            style="background-color: antiquewhite"
            @click="
              showInput = false;
              forcereload();
            "></q-btn>
          <q-input
            outlined
            v-model="ident"
            label="An identifier for the isa file (e.g. GelBasedProteomicsWT)" />
          <q-separator></q-separator>

          <q-btn
            icon="send"
            style="background-color: lightcyan"
            @click="
              addIsa(
                arcId,
                ident,
                pathHistory[pathHistory.length - 1],
                arcBranch
              );
              showInput = false;
              ident = '';
              forcereload();
            "
            :disable="ident.length == 0"
            :key="refresher"></q-btn
          ><span style="margin-left: 1em" v-if="ident.length == 0"
            >Please provide an identifier!</span
          >
        </template>
        <!-- SEARCH BAR -->
        <q-input
          v-model="search"
          label="Search"
          v-if="arcList.length == 0"
          value="name"
          @update:model-value="(newValue:string) => sortArcs(newValue)"
          ><template v-slot:append> <q-icon name="search"></q-icon></template
        ></q-input>
        <!-- PATH; RETURN ARROW; CREATE ISA -->
        <q-item-section
          style="padding-bottom: 2em"
          v-if="pathHistory.length > 1"
          :key="refresher"
          ><q-breadcrumbs
            ><span>Path:</span>
            <q-breadcrumbs-el
              v-for="item in pathHistory[pathHistory.length - 1].split('/')"
              >{{ item }}</q-breadcrumbs-el
            >
          </q-breadcrumbs>
          <q-btn
            icon="arrow_back"
            @click="
              inspectTree(arcId, pathHistory[pathHistory.length - 2], false);
              showInput = false;
              forcereload();
            "
            v-if="pathHistory.length > 1"
            style="background-color: antiquewhite">
            Return
          </q-btn>
          <q-btn
            icon="add"
            v-if="pathHistory[pathHistory.length - 1] == 'studies'"
            style="background-color: aliceblue"
            @click="
              showInput = true;
              forcereload();
            "
            >Add Study</q-btn
          >
          <q-btn
            icon="add"
            v-if="pathHistory[pathHistory.length - 1] == 'assays'"
            style="background-color: aliceblue"
            @click="
              showInput = true;
              forcereload();
            "
            >Add Assay</q-btn
          ></q-item-section
        >
        <!-- TREE VIEW OF ARC -->
        <q-item-section
          v-if="arcList.length != 0"
          v-for="(item, i) in arcList"
          :style="i % 2 === 1 ? 'background-color:#fafafa;' : ''">
          <q-item-section>
            <q-item-section
              ><q-btn
                icon="folder_open"
                v-if="item.type == 'tree'"
                @click="inspectTree(arcId, item.path, true)"
                >{{ item.name }}</q-btn
              >
              <!-- if its an study or assay file, there will be an extra option to use swate -->
              <q-list
                bordered
                v-else-if="
                  experimental &&
                  (item.name == 'isa.study.xlsx' ||
                    item.name == 'isa.assay.xlsx')
                "
                icon="expand_more"
                ><q-item style="text-align: center"
                  ><q-item-section avatar
                    ><q-icon name="expand_more"></q-icon></q-item-section
                  ><q-item-section
                    ><q-item-label>{{
                      item.name.toUpperCase()
                    }}</q-item-label></q-item-section
                  ></q-item
                >
                <q-item
                  ><q-item-section
                    ><q-btn
                      icon="table_chart"
                      @click="
                        getTemplates();
                        isaProperties.repoId = arcId;
                        isaProperties.path = item.path;
                        isaProperties.repoTarget = git.site.value;
                      "
                      >Create new Sheet</q-btn
                    ><q-btn
                      icon="edit"
                      @click="getSheets(item.path, arcId, arcBranch)"
                      >Edit Sheet</q-btn
                    ><q-btn
                      icon="edit"
                      @click="getFile(arcId, item.path, arcBranch)"
                      >Edit Metadata</q-btn
                    ></q-item-section
                  ></q-item
                >
              </q-list>
              <q-btn
                v-else-if="
                  item.name.includes('LICENSE') || item.name.includes('LICENCE')
                "
                disabled
                >{{ item.name }}</q-btn
              >
              <q-btn v-else-if="item.name == '.gitkeep'" disabled>{{
                item.name
              }}</q-btn>
              <q-btn v-else-if="checkName(item.name)" disabled>{{
                item.name
              }}</q-btn>
              <q-btn
                v-else
                icon="edit"
                @click="getFile(arcId, item.path, arcBranch)">
                <template v-if="item.name.length > 60"
                  >{{ item.name.slice(0, 60) }}...</template
                >
                <template v-else>{{ item.name }}</template>
              </q-btn>
            </q-item-section>
          </q-item-section>
        </q-item-section>

        <!-- LIST OF ARCS -->
        <q-list style="padding: 1em" separator v-if="arcList.length == 0">
          <!-- the user arc gets highlighted with a yellow background-->
          <q-item
            v-for="(item, i) in searchList"
            :style="
              item.namespace.name === username
                ? 'background-color: lightyellow;'
                : i % 2 === 1
                ? 'background-color:#fafafa;'
                : ''
            "
            :clickable="appProperties.loggedIn"
            @click="
              arcBranch = item.default_branch;
              arcProperties.branch = arcBranch;
              arcProperties.identifier = item.name;
              arcProperties.url = item.http_url_to_repo;
              inspectArc(item.id);
            ">
            <!-- load the avatar if there is one -->
            <q-item-section avatar>
              <q-avatar v-if="item.avatar_url != null">
                <img :src="item.avatar_url" />
              </q-avatar>
              <q-avatar
                :color="item.isOwner ? 'primary' : 'secondary'"
                text-color="white"
                v-else
                >{{ item.namespace.name[0] }}</q-avatar
              >
            </q-item-section>
            <!-- Arcs are displayed with name, id; then creation date and description; on the bottom is the name of the creator -->
            <q-item-section>
              <q-item-label style="font-weight: bold"
                >{{ item.name }}, ID: {{ item.id }}</q-item-label
              >
              <div class="q-pa-xs q-gutter-md" v-if="item.topics.length > 0">
                <q-badge outline v-for="i in item.topics" color="brown">{{
                  i
                }}</q-badge>
              </div>
              <q-item-label style="color: #666"
                >[{{ item.created_at }}]</q-item-label
              >
              <q-item-label v-if="item.description != null">
                <template v-if="item.description.length > 200"
                  >{{ item.description.slice(0, 200) }}...</template
                >
                <template v-else>{{ item.description }}</template>
              </q-item-label>

              <q-item-label
                :style="
                  'color:#666;' + (item.isOwner ? 'font-weight:bold;' : '')
                "
                >{{ item.namespace.name }}</q-item-label
              >
            </q-item-section>
            <q-item-section avatar>
              <q-btn
                unelevated
                color="secondary"
                v-on:click="openArc(item.http_url_to_repo)"
                icon="search"
                ><q-tooltip>Open in new Tab</q-tooltip></q-btn
              >
            </q-item-section>
            <q-item-section avatar>
              <q-btn
                unelevated
                color="secondary"
                v-on:click="
                  arcBranch = item.default_branch;
                  arcProperties.branch = arcBranch;
                  arcProperties.identifier = item.name;
                  arcProperties.url = item.http_url_to_repo;
                  inspectArc(item.id);
                "
                icon="expand_more"
                :disable="!appProperties.loggedIn"
                ><q-tooltip>Expand</q-tooltip></q-btn
              >
            </q-item-section>
          </q-item>
        </q-list>
      </div>
    </q-expansion-item>
    <!-- SYNC ASSAY TO STUDY-->
    <template v-if="assaySync"
      ><div
        class="q-pa-md"
        v-show="
          arcProperties.assays.length > 0 && arcProperties.studies.length > 0
        ">
        <q-btn
          icon="arrow_back"
          @click="
            assaySync = false;
            forcereload();
          "
          style="background-color: antiquewhite">
          Return
        </q-btn>
        <div class="q-gutter-md row">
          <q-select
            v-model="assaySelect"
            :options="arcProperties.assays"
            label="Assay"
            style="width: 200px" />
          <q-icon name="arrow_forward" size="48px"></q-icon>
          <q-select
            v-model="studySelect"
            :options="arcProperties.studies"
            label="Study"
            style="width: 200px" />
          <q-btn
            @click="
              assaySync = false;
              syncAssay(arcId, assaySelect, studySelect, arcBranch);
              studySelect = assaySelect = '';
              forcereload();
            "
            :disable="studySelect == '' || assaySelect == ''"
            >Sync</q-btn
          >
        </div>
      </div>
    </template>
    <!-- SYNC STUDY TO INVESTIGATION-->
    <template v-if="studySync"
      ><div class="q-pa-md" v-show="arcProperties.studies.length > 0">
        <q-btn
          icon="arrow_back"
          @click="
            studySync = false;
            forcereload();
          "
          style="background-color: antiquewhite">
          Return
        </q-btn>
        <div class="q-gutter-md row">
          <q-select
            v-model="studySelect"
            :options="arcProperties.studies"
            label="Study"
            style="width: 200px" />
          <q-btn
            @click="
              studySync = false;
              syncStudy(arcId, studySelect, arcBranch);
              studySelect = assaySelect = '';
              forcereload();
            "
            :disable="studySelect == ''"
            >Sync</q-btn
          >
        </div>
      </div>
    </template>
  </q-list>
</template>
