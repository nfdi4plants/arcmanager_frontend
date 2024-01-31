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
var backend = appProperties.backend + "projects/";

// list with all arcs
var list: any[] = [];

// list with errors
var errors: any;

// show only arcs with writing permission
var owned = ref(false);

// enable git lfs
var lfs = ref(false);

// list of all the content of the specific arc
var arcList: any[] = [];
// gitlab id of the arc
var arcId: number;
// name of the main branch of the arc
var arcBranch: string;

//list to safe every entry of the isa file
var isaList: any[] = [];

// here we save the paths, so we can return to the last page visited in the arc
var pathHistory: string[] = [];

// here we get the target git from App.vue
var git = defineProps(["site"]);

var username = "";

// set to true if loading something
var loading = false;

// set to true if the uploader is active
var uploading = false;
var progress = 0;

// displays isa creation input field
var showInput = false;

// displays input field for folder creation
var showFolderInput = false;

// displays the sync input selection field
var assaySync = false;
var studySync = false;

// displays the user select addition screen
var user = false;
// list containing all users
var userList = [];
// the slected user
var userSelect = ref(null);

// the different permissions you can select when you add a new member to a project
const userPermissions = [
  {
    label: "Guest",
    value: 10,
  },
  {
    label: "Reporter",
    value: 20,
  },
  {
    label: "Developer",
    value: 30,
  },
  {
    label: "Maintainer",
    value: 40,
  },
  {
    label: "Owner",
    value: 50,
  },
];
// the permission level for the new user
var permission = ref(null);

// the selected study and assay
var studySelect = ref("");
var assaySelect = ref("");

// field for identifier
var ident = ref("");

// field for folder name
var identFolder = ref("");

// field for searchbar
var search = ref("");

// the filtered list, that will be displayed
var searchList: any[] = [];

// namespace of the arc
var namespace = ref("");

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

// array containing all the files to upload
var fileInput = ref([]);

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
  appProperties.showIsaView = false;
  lfs.value = false;
  searchList = [];
  // if not logged in, show only public arcs
  if (!appProperties.loggedIn) {
    // if no datahub is selected, show an error
    if (git.site == "") {
      errors = "Please select a DataHub first!";
      loading = false;
    } else {
      errors = "Not logged in! Listing only public ARCs";
      searchList = [];
      try {
        const response = await fetch(
          `${backend}public_arcs?target=${git.site.value}`
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
    assaySync = studySync = user = false;

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
  appProperties.showIsaView = false;
  arcProperties.studies = arcProperties.assays = [];
  user = showInput = assaySync = studySync = false;
  arcProperties.changes = "";
  forcereload();
  try {
    const response = await fetch(backend + "arc_tree?id=" + id, {
      credentials: "include",
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(
        response.statusText + ", " + data["detail"].toString().slice(0, 110)
      );

    arcList = [];
    data.Arc.forEach((element: any) => {
      arcList.push(element);
    });

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
          return response.json();
        }
      })
      .then((changes) => {
        if (changes) {
          changes.forEach((element) => {
            arcProperties.changes += element.toString() + "<br />";
          });
        }
      });
  } catch (error) {
    errors = error;
  }
}

// get a tree view of the selected path of the arc
async function inspectTree(id: number, path: string, expand?: boolean) {
  loading = true;
  assaySync = studySync = user = false;
  errors = "";
  showInput = false;
  showFolderInput = false;
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
  appProperties.showIsaView = true;

  // cleanup views
  assaySync = studySync = user = false;
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
  await fetch(backend + "createISA", {
    credentials: "include",
    method: "POST",
    body: JSON.stringify({
      identifier: identifier,
      id: id,
      type: type,
      branch: branch,
    }),
  })
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

// uploads the file(s) to the hub
async function fileUpload() {
  uploading = true;

  errors = "";
  const chunkSize = 100 * 1024 * 1024;
  // index of the largest file (default is the last file)
  let largestFile = fileInput.value.length - 1;

  forcereload();
  // loop for the amount of selected files
  for (let i = 0; i < fileInput.value.length; i++) {
    // save the file on the most recent path
    let filePath = pathHistory[pathHistory.length - 1];
    $q.loading.show({
      message: "Uploading the file(s)...",
    });

    // if the file is in a subfolder, include an "/"
    if (filePath == "") {
      filePath += fileInput.value[i].name;
    } else {
      filePath += "/" + fileInput.value[i].name;
    }

    // amount of chunks for the largest file
    let largestFileChunks = Math.ceil(
      fileInput.value[largestFile].size / chunkSize
    );

    // amount of chunks for the current file
    const totalChunks = Math.ceil(fileInput.value[i].size / chunkSize);
    const chunkProgress = 1 / totalChunks;
    progress = chunkProgress;
    let fileSize = fileInput.value[i].size;
    const selectedFile = fileInput.value[i];

    // find out which i value will have the most chunks (skip if amount of chunks is 1)
    if (largestFileChunks < totalChunks && totalChunks != 1) largestFile = i;

    let chunkNumber = 0;
    let start = 0;
    let end = start + chunkSize;

    const uploadNextChunk = async () => {
      end = Math.min(start + chunkSize, fileSize);
      // set the progress to 99% for the last chunk
      if (chunkNumber + 1 == totalChunks) {
        progress = 0.99;
      }

      if (chunkNumber < totalChunks) {
        const chunk = selectedFile.slice(start, end);
        const formData = new FormData();

        // body for the backend containing all necessary data
        formData.append("file", chunk);
        formData.append("chunkNumber", chunkNumber);
        formData.append("totalChunks", totalChunks);
        formData.append("name", fileInput.value[i].name);
        formData.append("id", arcId);
        formData.append("branch", arcBranch);
        formData.append("path", filePath);
        formData.append("namespace", namespace.value);
        formData.append("lfs", lfs.value);

        try {
          let response = await fetch(backend + "uploadFile", {
            method: "POST",
            body: formData,
            credentials: "include",
          });
          let data = await response.json();
          if (!response.ok) {
            errors = response.statusText + ", " + data["detail"];
            progress = 1;
            $q.loading.hide();
            uploading = false;
          } else {
            const temp = `Chunk ${
              chunkNumber + 1
            }/${totalChunks} uploaded successfully`;

            // update progress if its not the last chunk
            if (progress != 0.99)
              progress = Number((chunkNumber + 1) * chunkProgress);

            console.log(temp);
            chunkNumber++;
            start = end;
            end = start + chunkSize;
            uploadNextChunk();
          }
          forcereload();
        } catch (error) {
          console.error("ERROR: ", error);
        }
      } else {
        progress = 1;
        console.log("Upload complete");
        // when every file is uploaded, complete the process and clear the input
        if (i == largestFile) {
          fileInput.value = [];
          $q.loading.hide();
          fileProperties.path = fileProperties.content = "";
          fileProperties.id = 0;
          errors = "";
          uploading = false;
          // get the updated view of the arc
          await inspectTree(arcId, pathHistory[pathHistory.length - 1]);
          forcereload();
        }
      }
    };
    await uploadNextChunk();
  }
}

// if you click the 'create new sheet' button, you will get a list containing all the current templates
async function getTemplates() {
  cleanIsaView();
  loading = true;
  appProperties.showIsaView = true;
  assaySync = studySync = user = false;
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
      templateProperties.filtered = templates.templates;
    });

  loading = false;
  forcereload();
}

// get a list of all the swate sheets
async function getSheets(path: string, id: number, branch: string) {
  cleanIsaView();
  assaySync = studySync = user = false;
  loading = true;
  appProperties.showIsaView = true;
  forcereload();

  isaProperties.path = path;
  isaProperties.repoId = id;
  arcProperties.branch = branch;
  // retrieve the sheets
  await fetch(`${backend}getSheets?path=${path}&id=${id}&branch=${branch}`, {
    credentials: "include",
  })
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
    const response = await fetch(backend + "syncAssay", {
      credentials: "include",
      method: "PATCH",
      body: JSON.stringify({
        id: id,
        pathToStudy: studyPath,
        pathToAssay: assayPath,
        assayName: assay,
        branch: branch,
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(response.statusText + ", " + data["detail"]);
    }
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
    const response = await fetch(backend + "syncStudy", {
      credentials: "include",
      method: "PATCH",
      body: JSON.stringify({
        id: id,
        pathToStudy: studyPath,
        studyName: study,
        branch: branch,
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(response.statusText + ", " + data["detail"]);
    }
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
    ".sqlite",
    ".dll",
    ".pdb",
    ".pptx",
    ".bt2",
  ];
  formats.forEach((element) => {
    if (name.toLowerCase().includes(element)) {
      includes = true;
    }
  });
  if (name.includes(".xlsx") && !name.includes("isa")) includes = true;
  return includes;
}

async function getArchive(id: number) {
  loading = true;
  forcereload();
  try {
    const downloadLink = document.createElement("a");
    downloadLink.href = `${
      arcProperties.url.split(".git")[0]
    }/-/archive/${arcBranch}/${arcProperties.identifier}-${arcBranch}.zip`;
    downloadLink.click();
  } catch (error) {
    errors = error;
  }
  loading = false;
  forcereload();
}

// checks weather the file should be deletable or not
function checkForDeletion(name: string) {
  return (
    name.includes("isa.investigation") ||
    name.startsWith(".git") ||
    name.includes("readme") ||
    name.includes("license") ||
    name.startsWith("assays") ||
    name.startsWith("runs") ||
    name.startsWith("studies") ||
    name.startsWith("workflows") ||
    name.startsWith(".arc") ||
    name.includes("arc.cwl") ||
    name.startsWith("dataset") ||
    name.startsWith("protocols") ||
    name.startsWith("resources")
  );
}

// deletes the file on the given path
async function deleteFile(
  id: number,
  path: string,
  branch: string,
  name: string
) {
  $q.dialog({
    dark: appProperties.dark,
    title: "Delete " + name,
    message: "Are you sure you want to delete '" + name + "'?",
    cancel: true,
  }).onOk(async () => {
    console.log("Deleting " + name + "...");
    // send delete request to backend
    let response = await fetch(
      backend + "deleteFile?path=" + path + "&id=" + id + "&branch=" + branch,
      {
        method: "DELETE",
        credentials: "include",
      }
    );
    let data = await response.json();
    if (!response.ok) errors = response.statusText + ", " + data["detail"];
    else {
      $q.notify(data);
      await inspectTree(arcId, pathHistory[pathHistory.length - 1]);
    }
    forcereload();
  });
}

// deletes the entire folder on the given path
async function deleteFolder(
  id: number,
  path: string,
  branch: string,
  name: string
) {
  $q.dialog({
    dark: appProperties.dark,
    title: "Delete " + name,
    message: "Are you sure you want to delete the entirety of '" + name + "'?",
    cancel: true,
  }).onOk(async () => {
    console.log("Deleting " + name + "...");
    // send delete request to backend
    let response = await fetch(
      backend + "deleteFolder?path=" + path + "&id=" + id + "&branch=" + branch,
      {
        method: "DELETE",
        credentials: "include",
      }
    );
    let data = await response.json();
    if (!response.ok) errors = response.statusText + ", " + data["detail"];
    else {
      $q.notify(data);
      await inspectTree(arcId, pathHistory[pathHistory.length - 2]);
    }
    forcereload();
  });
}

// create a new folder with the given identifier
async function createFolder(
  id: number,
  identifier: string,
  path: string,
  branch: string
) {
  loading = true;
  forcereload();
  let response = await fetch(backend + "createFolder", {
    credentials: "include",
    method: "POST",
    body: JSON.stringify({
      identifier: identifier,
      id: id,
      path: path,
      branch: branch,
    }),
  });
  let data = await response.json();
  if (!response.ok) {
    errors = response.statusText + ", " + data["detail"];
  } else {
    // get the updated tree
    inspectTree(id, path);

    // get the updated changes, assays and studies
    await getChanges(id);
  }

  loading = false;
  forcereload();
}

// get a list of user
async function getUser() {
  loading = true;
  forcereload();
  userList = [];
  userSelect.value = null;
  permission.value = null;
  try {
    // get all users
    let user = await fetch(backend + "getUser", {
      credentials: "include",
    });
    let users = await user.json();
    users.forEach((user) => {
      userList.push({
        label: user["username"],
        value: user["id"],
      });
    });
  } catch (error) {
    errors = error;
  }
  // if there are no user found, return error
  if (userList.length == 0) errors = "ERROR: No Assays found!";
  // sort users alphabetically
  userList.sort(function (a, b) {
    let x = a.label.toLowerCase();
    let y = b.label.toLowerCase();
    if (x < y) {
      return -1;
    }
    if (x > y) {
      return 1;
    }
    return 0;
  });
  loading = false;
  forcereload();
}

// add user as member to the project
async function addUser(id: number, user: any, role: any) {
  loading = true;
  forcereload();
  let response = await fetch(backend + "addUser", {
    credentials: "include",
    method: "POST",
    body: JSON.stringify({
      userId: user.value,
      username: user.label,
      id: id,
      role: role.value,
    }),
  });
  let data = await response.json();
  if (!response.ok) errors = response.statusText + ", " + data["detail"];
  else $q.notify(data);

  loading = false;
  forcereload();
}
</script>

<template>
  <!-- FETCH ARC/FILE UPLOAD BUTTON/OPEN ARC/SYNC ASSAYS/STUDIES RELOAD-->
  <div class="q-pa-xs row q-gutter-sm">
    <q-btn
      id="arcFetch"
      @click="fetchArcs(), forcereload()"
      icon="downloading"
      dense
      ><template v-if="!appProperties.showIsaView">Load Arcs</template></q-btn
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
      <q-btn-group>
        <!-- File Upload -->
        <q-file
          :style="
            $q.dark.isActive
              ? 'background-color: midnightblue'
              : 'background-color: lightgoldenrodyellow'
          "
          style="max-width: 150px"
          v-model="fileInput"
          dense
          borderless
          label="Upload File"
          multiple
          @update:model-value="
            fileUpload();
            uploading = true;
          "
          @rejected="
            errors = 'ERROR: File too big or too many selected!';
            forcereload();
          "
          :key="refresher"
          :loading="uploading"
          :disable="progress > 0 && progress != 1 && progress != null" />
        <q-btn
          id="open"
          @click="openArc(arcProperties.url)"
          icon="open_in_new"
          glossy
          :key="refresher + 1"
          ><template v-if="!appProperties.showIsaView">Open</template></q-btn
        >
        <q-btn icon="download" @click="getArchive(arcId)" glossy color="teal-10"
          ><template v-if="!appProperties.showIsaView">zip</template></q-btn
        >
        <q-btn
          id="assay"
          icon="sync_alt"
          glossy
          @click="
            assaySync = !assaySync;
            studySync = false;
            user = false;
            forcereload();
            getAssaysAndStudies(arcId);
          "
          :key="refresher + 2"
          ><template v-if="!appProperties.showIsaView"
            >Sync Assay/Study</template
          ></q-btn
        >
        <q-btn
          id="study"
          icon="sync"
          glossy
          @click="
            studySync = !studySync;
            assaySync = false;
            user = false;
            forcereload();
            getAssaysAndStudies(arcId);
          "
          :key="refresher + 3"
          ><template v-if="!appProperties.showIsaView"
            >Sync Study/Invest</template
          ></q-btn
        >
        <!-- Reloads the arc -->
        <q-btn icon="refresh" @click="inspectArc(arcId)" glossy
          ><template v-if="!appProperties.showIsaView">Reload</template></q-btn
        >
        <q-btn
          icon="add"
          glossy
          id="userAdd"
          @click="
            user = !user;
            assaySync = studySync = false;
            forcereload();
            getUser();
          "
          ><template v-if="!appProperties.showIsaView"
            >Add User</template
          ></q-btn
        >
      </q-btn-group>
      <!-- activates swate and annotation sheets-->
      <q-checkbox v-model="lfs">LFS</q-checkbox></template
    >

    <!-- LOADING SPINNER --><q-spinner
      id="loader"
      size="2em"
      v-show="loading"
      :key="refresher + 4"></q-spinner>
  </div>
  <template v-if="progress > 0 && progress != 1 && progress != null">
    <q-linear-progress
      style="margin-top: 1em"
      :value="progress"
      :key="refresher + 5"
      color="red"
      :indeterminate="progress == 0.99"></q-linear-progress>
    <p v-if="progress < 0.99">Uploading File...</p>
    <p v-else>Processing data... This may take a moment!</p>
  </template>
  <p v-if="lfs">Note: Large file uploads may take a while!</p>
  <q-list bordered dense class="rounded-borders">
    <!-- USERNAME -->
    <q-item v-if="username.length > 1"
      >User: {{ username }} / ARC: {{ arcProperties.identifier }}</q-item
    >
    <!-- LIST WITH ALL ARCS AND ARC TREE VIEW-->
    <q-expansion-item
      :key="refresher + 5"
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
            class="return"
            @click="
              showInput = false;
              forcereload();
            "></q-btn>
          <span style="margin-left: 1em">Add Isa:</span>
          <q-input
            outlined
            v-model="ident"
            :rules="[(val) => !val.includes(' ') || 'No whitespace allowed!']"
            label="An identifier for the isa file (e.g. GelBasedProteomicsWT)" />
          <q-separator></q-separator>

          <q-btn
            icon="send"
            class="send"
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
            :key="refresher + 6"></q-btn
          ><span style="margin-left: 1em" v-if="ident.length == 0"
            >Please provide an identifier!</span
          >
        </template>
        <!-- CREATE FOLDER -->
        <template v-if="showFolderInput"
          ><q-btn
            icon="arrow_back"
            class="return"
            @click="
              showFolderInput = false;
              forcereload();
            "></q-btn>
          <span style="margin-left: 1em">Add Folder:</span>
          <q-input
            outlined
            v-model="identFolder"
            :rules="[(val) => !val.includes(' ') || 'No whitespace allowed!']"
            label="A name for the folder" />
          <q-separator></q-separator>

          <q-btn
            icon="send"
            class="send"
            @click="
              createFolder(
                arcId,
                identFolder,
                pathHistory[pathHistory.length - 1],
                arcBranch
              );
              showFolderInput = false;
              identFolder = '';
              forcereload();
            "
            :disable="identFolder.length == 0"
            :key="refresher + 10"></q-btn
          ><span style="margin-left: 1em" v-if="identFolder.length == 0"
            >Please provide a name!</span
          >
        </template>
        <!-- SEARCH BAR -->
        <q-input
          v-model="search"
          label="Search"
          v-if="arcList.length == 0"
          value="name"
          @update:model-value="(newValue:string) => sortArcs(newValue)"
          :disable="list.length == 0"
          ><template v-slot:append> <q-icon name="search"></q-icon></template
        ></q-input>
        <!-- PATH; RETURN ARROW; CREATE ISA -->
        <q-item-section
          style="padding-bottom: 2em"
          v-if="pathHistory.length > 1"
          :key="refresher + 7"
          ><q-breadcrumbs
            ><span>Path:</span>
            <q-breadcrumbs-el
              v-for="item in pathHistory[pathHistory.length - 1].split('/')"
              >{{ item }}</q-breadcrumbs-el
            >
          </q-breadcrumbs>
          <q-item
            dense
            clickable
            @click="
              inspectTree(arcId, pathHistory[pathHistory.length - 2], false);
              showInput = showFolderInput = false;
              forcereload();
            "
            v-if="pathHistory.length > 1"
            id="path"
            ><q-item-section avatar
              ><q-icon name="arrow_back"></q-icon
            ></q-item-section>
            <q-item-section>Return</q-item-section>
            <q-item-section
              side
              v-if="
                pathHistory[pathHistory.length - 1] == 'assays' ||
                pathHistory[pathHistory.length - 1] == 'studies'
              ">
              <div class="q-gutter-xs">
                <q-btn
                  id="add"
                  dense
                  flat
                  size="12px"
                  icon="add"
                  @click="
                    showInput = true;
                    showFolderInput = false;
                    forcereload();
                  "
                  >Add</q-btn
                >
              </div></q-item-section
            >
          </q-item></q-item-section
        >
        <!-- TREE VIEW OF ARC -->
        <q-item
          v-if="arcList.length != 0"
          v-for="(item, i) in arcList"
          :class="i % 2 === 1 ? 'alt' : ''"
          clickable
          @click="
            if (item.type == 'tree') {
              inspectTree(arcId, item.path, true);
            } else {
              getFile(arcId, item.path, arcBranch);
            }
          "
          :disable="checkName(item.name)">
          <template v-if="item.type == 'tree'">
            <q-item-section avatar top
              ><q-avatar icon="folder"></q-avatar
            ></q-item-section>
            <q-item-section
              ><q-item-label>{{ item.name }}</q-item-label></q-item-section
            >
            <q-item-section side v-if="!checkForDeletion(item.name)"
              ><q-btn
                icon="close"
                color="red"
                round
                dense
                flat
                @click="
                  deleteFolder(arcId, item.path, arcBranch, item.name)
                "></q-btn>
            </q-item-section>
          </template>
          <template
            v-else-if="
              item.name == 'isa.study.xlsx' || item.name == 'isa.assay.xlsx'
            "
            ><q-item-section avatar
              ><q-icon name="description"></q-icon></q-item-section
            ><q-item-section
              ><q-item-label>{{ item.name }}</q-item-label></q-item-section
            ><q-item-section side top
              ><div class="text-grey-8 q-gutter-xs">
                <q-btn
                  icon="add_box"
                  class="gt-xs"
                  size="12px"
                  flat
                  dense
                  @click="
                    getTemplates();
                    isaProperties.repoId = arcId;
                    isaProperties.path = item.path;
                    isaProperties.repoTarget = git.site.value;
                  "
                  >Add Sheet</q-btn
                ><q-btn
                  icon="edit"
                  class="gt-xs"
                  size="12px"
                  flat
                  dense
                  @click="getSheets(item.path, arcId, arcBranch)"
                  >Edit Sheet</q-btn
                >
              </div></q-item-section
            ></template
          >
          <template v-else>
            <q-item-section avatar top
              ><q-avatar icon="description"></q-avatar
            ></q-item-section>
            <q-item-section
              ><q-item-label
                ><template v-if="item.name.length > 60"
                  >{{ item.name.slice(0, 60) }}...</template
                >
                <template v-else>{{ item.name }}</template></q-item-label
              ></q-item-section
            >
            <q-item-section
              side
              v-if="!checkForDeletion(item.name.toLowerCase())">
              <q-btn
                icon="cancel"
                color="red"
                flat
                dense
                round
                @click="
                  deleteFile(arcId, item.path, arcBranch, item.name)
                "></q-btn
            ></q-item-section>
          </template>
        </q-item>
        <!-- CREATE FOLDER BUTTON -->
        <q-btn
          icon="add"
          v-if="arcList.length != 0"
          @click="
            showFolderInput = true;
            showInput = false;
            forcereload();
          "
          >New Folder</q-btn
        >

        <!-- LIST OF ARCS -->
        <q-list style="padding: 1em" separator v-if="arcList.length == 0">
          <!-- the user arc gets highlighted with a yellow/blue background-->
          <q-item
            v-for="(item, i) in searchList"
            :class="
              item.namespace.name === username
                ? 'own'
                : i % 2 === 1
                ? 'alt'
                : 'clean'
            "
            :clickable="appProperties.loggedIn && item.id != 1"
            @click="
              arcBranch = item.default_branch;
              arcProperties.branch = arcBranch;
              arcProperties.identifier = item.name;
              arcProperties.url = item.http_url_to_repo;
              namespace = item.path_with_namespace;
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
                <q-badge
                  outline
                  v-for="i in item.topics"
                  :color="$q.dark.isActive ? 'orange' : 'brown'"
                  >{{ i }}</q-badge
                >
              </div>
              <q-item-label class="text">[{{ item.created_at }}]</q-item-label>
              <q-item-label v-if="item.description != null">
                <template v-if="item.description.length > 200"
                  >{{ item.description.slice(0, 200) }}...</template
                >
                <template v-else>{{ item.description }}</template>
              </q-item-label>

              <q-item-label
                class="text"
                :style="
                  item.namespace.name === username ? 'font-weight:bold;' : ''
                "
                >{{ item.namespace.name }}</q-item-label
              >
            </q-item-section>
            <q-item-section avatar>
              <q-btn
                unelevated
                color="secondary"
                :href="item.http_url_to_repo"
                target="_blank"
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
                :disable="!appProperties.loggedIn || item.id == 1"
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
          class="return">
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
          class="return">
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
    <!-- ADD USER TO PROJECT -->
    <template v-if="user"
      ><div class="q-pa-md" v-show="userList.length > 0">
        <q-btn
          icon="arrow_back"
          @click="
            user = false;
            forcereload();
          "
          class="return">
          Return
        </q-btn>
        <div class="q-gutter-md row">
          <q-select
            v-model="userSelect"
            :options="userList"
            label="Users"
            style="width: 200px"
            :key="refresher + 11" />
          <q-select
            v-model="permission"
            :options="userPermissions"
            label="Role"
            style="width: 200px"
            :key="refresher + 12" />
          <q-btn
            @click="
              user = false;
              addUser(arcId, userSelect, permission);
              userSelect = permission = null;
              forcereload();
            "
            :disable="userSelect == null || permission == null"
            glossy
            >Add</q-btn
          >
        </div>
        <br />
        <span>
          <a
            href="https://gitlab.nfdi4plants.de/help/user/permissions"
            target="_blank"
            >Learn more</a
          >
          about role permissions
        </span>
      </div>
    </template>
  </q-list>
</template>
<style>
/* LIGHT MODE */
.body--light #arcFetch {
  background-color: aquamarine;
  max-width: 200px;
}

.body--light .own {
  background-color: lightyellow;
}

.body--light .text {
  color: #666;
}

.body--light #path {
  background-color: hsl(0, 0%, 95%);
}

.body--light #add {
  background-color: lightgreen;
}

/* Light mode button group*/
.body--light #open {
  background-color: lightskyblue;
  max-width: 200px;
}

.body--light #assay {
  background-color: orange;
}

.body--light #study {
  background-color: gainsboro;
}

.body--light #userAdd {
  background-color: wheat;
}

/* DARK MODE */
.body--dark #arcFetch {
  background-color: dodgerblue;
  max-width: 200px;
}

.body--dark .own {
  background-color: #000031;
}

.body--dark .text {
  color: #999;
}

.body--dark #path {
  background-color: hsl(0, 0%, 5%);
}

.body--dark #add {
  background-color: green;
}

/* Dark mode button group */
.body--dark #open {
  background-color: dodgerblue;
  max-width: 200px;
}

.body--dark #assay {
  background-color: peru;
}

.body--dark #study {
  background-color: gray;
}

.body--dark #userAdd {
  background-color: darkslateblue;
}
</style>
