<script lang="ts" setup>
import { onMounted, onUnmounted, reactive, ref, nextTick } from "vue";

import isaProperties from "../IsaProperties.ts";
import fileProperties from "../FileProperties";
import ViewItem from "../components/ViewItem.vue";

import { useQuasar } from "quasar";
import arcProperties from "@/ArcProperties";
import appProperties from "@/AppProperties";

const $q = useQuasar();

// Address of the backend
let backend = "http://localhost:8000/arcmanager/api/v1/projects/";
//let backend = "https://nfdi4plants.de/arcmanager/api/v1/projects/";

// list with all arcs
var list: any[] = [];

// list with errors
var errors: any;

var owned = ref(false);

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
let git = defineProps({
  site: {
    type: String,
    required: true,
  },
});

let username = "";

// set to true if loading something
let loading = false;

// displays arc creation input field
let showInput = false;

// field for identifier
let ident = ref("");

// field for searchbar
let search = ref("");

// the filtered list, that will be displayed
let searchList = [];

// here we trick vue js to reload the component
const arclist = ref(0);
const forcereload = () => {
  // when the key value is changed, vue is automatically reloading the page
  arclist.value += 1;
};

let fileInput = ref();
// get a list of all arcs in the gitlab
async function fetchArcs() {
  loading = true;
  if (!appProperties.loggedIn) {
    errors = "Not logged in! Listing only public ARCs";

    const response = await fetch(
      backend + "public_arcs?target=" + git.site.toLowerCase(),
      {
        cache: "force-cache",
      }
    );
    const data = await response.json();
    list = [];
    data.projects.forEach((element: any) => {
      list.push(element);
    });
    searchList = list;
    loading = false;
    forcereload();
  } else {
    arcList = [];
    arcProperties.identifier = "";
    // reset Properties and histories
    isaProperties.entries = [];
    isaProperties.entry = [];
    isaProperties.entryOld = [];
    isaProperties.entryId = 0;
    fileProperties.name = "";
    fileProperties.content = "";
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
      // fill searchList with the full list and clear the search bar
      searchList = list;
      search.value = "";

      if (window.sessionStorage.getItem("username") != null)
        username = window.sessionStorage.getItem("username");
    } catch (error) {
      errors = error;
    }
    loading = false;
    forcereload();
  }
}

const openArc = (url: string) => {
  window.open(url);
};
// get a tree view of the front page of the arc
async function inspectArc(id: number) {
  loading = true;
  arcId = id;
  errors = null;
  search.value = "";
  searchList = list;
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
  } catch (error) {
    errors = error;
  }
  loading = false;
  forcereload();
}
// get a tree view of the selected path of the arc
async function inspectTree(id: number, path: string, expand?: boolean) {
  loading = true;
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
    isaProperties.entries = [];
    isaProperties.entry = [];
  } catch (error) {
    errors = error;
  }
  loading = false;
  forcereload();
}
// gets the file on the arc
async function getFile(id: number, path: string, branch: string) {
  loading = true;
  forcereload();
  let response;
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
      fileProperties.content = decodeURIComponent(
        atob(data.content)
          .split("")
          .map(function (c) {
            return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
          })
          .join("")
      );

      // reset entries array
      isaProperties.entries = [];

      // if there is no typical content, its an isa file, because then we have a list of entries
    } else {
      fileProperties.content = "";
      isaList = [];
      data.forEach((element: any) => {
        // TODO: currently only works with isa files, non isa files will create errors
        // reads out the file and saves the content to isaProperties
        isaList.push(element);
      });
      // write the new data to isaProperties
      isaProperties.entries = isaList;
      isaProperties.repoId = id;
      isaProperties.path = path;
      isaProperties.repoTarget = git.site.toLowerCase();
    }
    isaProperties.entry = [];

    // catch any error and display it
  } catch (error) {
    fileProperties.content = error;
    fileProperties.name = response?.status.toString();
  }
  loading = false;
  forcereload();
}

//currently only prints the content of the arc in the console
const importArc = (id: number) => {
  arcList = [];
  fetch(backend + "arc_tree?id=" + id, {
    credentials: "include",
  })
    .then((response) => response.json())
    .then((data) => console.log(data.Arc));
};

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
      inspectTree(id, type);
    });
  loading = false;
  forcereload();
}

// sort the arcList to include only the arcs containing the searchTerm
function sortArcs(searchTerm: string) {
  searchList = [];
  list.forEach((element) => {
    let searchString =
      element["name_with_namespace"].toLowerCase() + " " + element["id"];
    if (searchString.includes(searchTerm)) {
      searchList.push(element);
    }
  });
}

// uploads the file to the hub
async function fileUpload() {
  loading = true;
  let resultContent = "";
  let reader = new FileReader();
  reader.readAsDataURL(fileInput.value);

  reader.onload = async function () {
    let result = reader.result?.toString();
    resultContent = result?.split(",")[1];

    let filePath = pathHistory[pathHistory.length - 1];

    if (filePath == "") {
      filePath += fileInput.value.name;
    } else {
      filePath += "/" + fileInput.value.name;
    }
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
      arclist.value += 1;
    } else {
      (fileInput.value = ""),
        (fileProperties.name =
          fileProperties.path =
          fileProperties.content =
            ""),
        (fileProperties.id = 0);
      errors = "";
      await inspectArc(arcId);
    }
  };
  loading = false;
  arclist.value += 1;
  forcereload();
}
</script>

<template>
  <!-- FETCH ARC/FILE UPLOAD BUTTON -->
  <div class="q-pa-xs row">
    <q-btn
      @click="fetchArcs(), forcereload()"
      icon="refresh"
      style="background-color: aquamarine; max-width: 200px"
      dense
      >Load the Arcs</q-btn
    ><q-checkbox
      style="padding-left: 10px"
      left-label
      v-model="owned"
      label="Your Arcs:"
      v-show="arcList.length == 0"
      @update:model-value="fetchArcs" />

    <q-file
      v-show="arcList.length != 0"
      style="max-width: 200px; background-color: lightgoldenrodyellow"
      v-model="fileInput"
      outlined
      label="Upload File (<10 mb)"
      max-file-size="10000000"
      @update:model-value="fileUpload"
      @rejected="
        errors = 'ERROR: File too big!';
        forcereload();
      "
      :key="arclist"></q-file>
    <q-btn
      v-show="arcList.length != 0"
      @click="openArc(arcProperties.url)"
      icon="open_in_new"
      style="background-color: lightskyblue; max-width: 200px"
      :key="arclist"
      >Open</q-btn
    >

    <!-- LOADING SPINNER --><q-spinner
      id="loader"
      color="primary"
      size="3em"
      v-show="loading"
      :key="arclist"></q-spinner>
  </div>

  <q-list bordered dense class="rounded-borders">
    <!-- USERNAME -->
    <q-item v-if="username.length > 1"
      >User: {{ username }} / ARC: {{ arcProperties.identifier }}</q-item
    >
    <ViewItem
      :key="arclist"
      icon="cloud_download"
      label="List ARCs"
      caption="List ARCs from the DataHUB"
      default-opened>
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
          :key="arclist"></q-btn>
      </template>
      <!-- SEARCH BAR -->
      <q-input
        v-model="search"
        label="Search"
        v-if="arcList.length == 0"
        value="name"
        @update:model-value="(newValue) => sortArcs(newValue)"
        ><template v-slot:append> <q-icon name="search"></q-icon></template
      ></q-input>
      <!-- PATH; RETURN ARROW; CREATE ISA -->
      <q-item-section
        style="padding-bottom: 2em"
        v-if="pathHistory.length > 1"
        :key="arclist"
        ><q-breadcrumbs>
          <q-breadcrumbs-el
            v-for="item in pathHistory[pathHistory.length - 1].split('/')"
            >{{ item }}</q-breadcrumbs-el
          >
        </q-breadcrumbs>
        <q-btn
          icon="arrow_back"
          @click="
            inspectTree(arcId, pathHistory[pathHistory.length - 2], false)
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

            <q-btn
              v-else
              icon="edit"
              @click="getFile(arcId, item.path, arcBranch)">
              {{ item.name }}
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
            <q-item-label style="color: #666"
              >[{{ item.created_at }}]</q-item-label
            >
            <q-item-label v-if="item.description != ''">
              {{ item.description }}
            </q-item-label>
            <q-item-label
              :style="'color:#666;' + (item.isOwner ? 'font-weight:bold;' : '')"
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
              v-on:click="importArc(item.id)"
              icon="file_download"
              disable></q-btn>
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
    </ViewItem>
  </q-list>
</template>
