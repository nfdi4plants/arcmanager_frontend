<script lang="ts" setup>
import { ref } from "vue";

import isaProperties from "../IsaProperties.ts";
import fileProperties from "../FileProperties";

import { useQuasar } from "quasar";
import arcProperties from "@/ArcProperties";
import appProperties from "@/AppProperties";
import { templateProperties, Template, Table } from "@/TemplateProperties";
import { termProperties } from "@/TermProperties";
import sheetProperties from "@/SheetProperties";

const $q = useQuasar();

// Address of the backend
var backend = appProperties.backend + "projects/";

class namespace {
  avatar_url: string;
  full_path: string;
  id: number;
  kind: string;
  name: string;
  parent_id?: string;
  path: string;
  web_url: string;

  constructor(
    avatar_url: string,
    full_path: string,
    id: number,
    kind: string,
    name: string,
    parent_id = "",
    path: string,
    web_url: string
  ) {
    this.avatar_url = avatar_url;
    this.full_path = full_path;
    this.id = id;
    this.kind = kind;
    this.name = name;
    this.parent_id = parent_id;
    this.path = path;
    this.web_url = web_url;
  }
}

class Arc {
  avatar_url?: string;
  created_at: string;
  default_branch: string;
  description: string;
  forks_count: number;
  http_url_to_repo: string;
  id: number;
  last_activity_at: string;
  name: string;
  name_with_namespace: string;
  namespace: namespace;
  path: string;
  path_with_namespace: string;
  readme_url: string;
  ssh_url_to_repo: string;
  star_count: number;
  tag_list: Array<string>;
  topics: Array<string>;
  web_url: string;

  constructor(
    avatar_url = "",
    created_at: string,
    default_branch = "main",
    description: string,
    forks_count = 0,
    http_url_to_repo: string,
    id: number,
    last_activity_at = "",
    name: string,
    name_with_namespace = "",
    namespace: namespace,
    path: string,
    path_with_namespace = "",
    readme_url: string,
    ssh_url_to_repo: string,
    star_count: number,
    tag_list: Array<string>,
    topics: Array<string>,
    web_url: string
  ) {
    this.avatar_url = avatar_url;
    this.created_at = created_at;
    this.default_branch = default_branch;
    this.description = description;
    this.forks_count = forks_count;
    this.http_url_to_repo = http_url_to_repo;
    this.id = id;
    this.last_activity_at = last_activity_at;
    this.name = name;
    this.name_with_namespace = name_with_namespace;
    this.namespace = namespace;
    this.path = path;
    this.path_with_namespace = path_with_namespace;
    this.readme_url = readme_url;
    this.ssh_url_to_repo = ssh_url_to_repo;
    this.star_count = star_count;
    this.tag_list = tag_list;
    this.topics = topics;
    this.web_url = web_url;
  }
}

class ArcTree {
  id: string;
  mode: string;
  name: string;
  path: string;
  type: string;

  constructor(
    id: string,
    mode = "040000",
    name: string,
    path: string,
    type: string
  ) {
    this.id = id;
    this.mode = mode;
    this.name = name;
    this.path = path;
    this.type = type;
  }
}

class User {
  id: number;
  username: string;
  name: string;
  state: string;
  avatar_url?: string;
  web_url: string;

  constructor(
    id: number,
    username: string,
    name: string,
    state: string,
    avatar_url = "",
    web_url: string
  ) {
    this.id = id;
    this.username = username;
    this.name = name;
    this.state = state;
    this.avatar_url = avatar_url;
    this.web_url = web_url;
  }
}

const emptyTemplate = new Template(
  "Empty",
  [{ firstName: "", lastName: "", email: "" }],
  "Start with a empty Template",
  [],
  "-",
  "Empty Template",
  "Custom",
  new Table(
    "",
    [
      { headertype: "Input", values: ["Source Name"] },
      { headertype: "Output", values: ["Sample Name"] },
    ],
    [
      [[0, 0], { celltype: "FreeText", values: [""] }],
      [[1, 0], { celltype: "FreeText", values: [""] }],
    ]
  ),
  [],
  "1.0.0"
);

// list with all arcs
var list: Array<Arc> = [];

// string detailing an error
var errors: string | null;

// show only arcs with writing permission
var owned = ref(false);

// enable git lfs
var lfs = ref(false);

// current page for the arc tree view (if there are more than 50 files/folders inside of an folder)
var treePage = ref(1);

var treePageMax = 1;

// current page for the list of arcs (if its more than 20)
var arcsPage = ref(1);

var arcsPageMax = 1;

// list of all the content of the specific arc
var arcList: Array<ArcTree> = [];
// gitlab id of the arc
var arcId: number;
// name of the main branch of the arc
var arcBranch: string;

//list to safe every entry of the isa file
var isaList: Array<Array<string>> = [];

// here we save the paths, so we can return to the last page visited in the arc
var pathHistory: string[] = [];

// here we get the target git from App.vue
var git = defineProps(["site"]);

var username: string | null = "";

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

// displays the user management screen (-1 for disabled, 0 for add, 1 for remove, 2 for edit)
var user = -1;
// list containing all users
var userList: Array<{ label: string; value: number }> = [];
// the selected user
var userSelect = ref({ label: "", value: 0 });

// the different permissions you can select when you add a new member to a project
const userPermissions: ReadonlyArray<{ label: string; value: number }> = [
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
var permission = ref({ label: "Developer", value: 30 });

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
var searchList: Array<Arc> = [];

// namespace of the arc
var arcNamespace = ref("");

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
var fileInput = ref([] as Array<File>);

/** opens the explore page of the selected git in a new tab (only when you're not logged in currently)
 *
 * @param target - the name of the target git (freiburg, tübingen, ...)
 */
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

/** get a list of all arcs in the gitlab
 *
 */
async function fetchArcs(page = 1) {
  loading = true;
  appProperties.showIsaView = false;
  appProperties.arcList = true;
  lfs.value = false;
  arcsPage.value = page;
  treePage.value = treePageMax = 1;
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
          `${backend}public_arcs?target=${git.site.value}&page=${page}`
        );
        const data = await response.json();
        if (!response.ok) {
          throw new Error(response.statusText + ", " + data["detail"]);
        }
        // get the number of total pages
        let pages = response.headers.get("total-pages");
        if (pages) arcsPageMax = parseInt(pages);

        list = [];
        data.projects.forEach((element: Arc) => {
          list.push(element);
        });
        searchList = list;
      } catch (error: any) {
        errors = error.toString();
      }

      loading = false;
      forcereload();
    }
    // if logged in, reset the properties and views and fetch the arc list from the backend
  } else {
    arcList = [];
    arcProperties.identifier = "";
    assaySync = studySync = false;
    user = -1;
    cleanIsaView();
    // reset Properties and histories
    isaProperties.rowId = 0;
    fileProperties.name = "";
    arcProperties.changes = "";
    pathHistory = [];
    try {
      const response = await fetch(
        backend + "arc_list?owned=" + owned.value + "&page=" + page,
        {
          credentials: "include",
        }
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(response.statusText + ", " + data["detail"]);

      // get the number of total pages
      let pages = response.headers.get("total-pages");
      if (pages) arcsPageMax = parseInt(pages);

      errors = null;
      list = [];
      data.projects.forEach((element: Arc) => {
        list.push(element);
      });
      if (list.length == 0) throw new Error("No arcs found for you!");
      // fill searchList with the full list and clear the search bar
      searchList = list;
      search.value = "";

      // set the username in sessionStorage and display it
      if (window.sessionStorage.getItem("username") != null)
        username = window.sessionStorage.getItem("username");
    } catch (error: any) {
      errors = error.toString();
    }
    loading = false;
    forcereload();
  }
}

/** opens the url of the arc in a new tab
 *
 * @param url - the full url of the arc
 */
const openArc = (url: string) => {
  window.open(url);
};

/** cleans the right side
 *
 */
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

/** get a tree view of the front page of the arc
 *
 * @param id - the id of the arc
 */
async function inspectArc(id: number) {
  loading = true;
  arcId = id;
  errors = null;
  search.value = "";
  searchList = list;
  cleanIsaView();
  appProperties.showIsaView = false;
  appProperties.arcList = true;
  arcProperties.studies = arcProperties.assays = [];
  showInput = assaySync = studySync = false;
  fileInput.value = [];
  user = -1;
  arcProperties.changes = "";
  treePage.value = treePageMax = 1;
  forcereload();
  try {
    const response = await fetch(backend + "arc_tree?id=" + id, {
      credentials: "include",
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(
        response.statusText + ", " + data["detail"].toString().slice(0, 150)
      );

    arcList = [];
    data.Arc.forEach((element: ArcTree) => {
      arcList.push(element);
    });

    pathHistory = [];
    pathHistory.push("");

    // get the changes
    getChanges(id);
  } catch (error: any) {
    errors = error.toString();
  }
  loading = false;
  forcereload();
}

/** get the list of changes
 *
 * @param id - the id of the arc
 */
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
          changes.forEach((element: string) => {
            arcProperties.changes += element + "<br />";
          });
        }
      });
  } catch (error: any) {
    errors = error.toString();
  }
}

/** get a tree view of the selected path of the arc
 *
 * @param id - the id of the arc
 * @param path - the selected path (eg. assays/...)
 * @param expand - weather the pathHistory is expanded (going deeper into the folder) or not (removing the last entry in the history)
 */
async function inspectTree(
  id: number,
  path: string,
  expand?: boolean,
  page = 1
) {
  loading = true;
  assaySync = studySync = false;
  appProperties.showIsaView = false;
  user = -1;
  errors = "";
  showInput = false;
  showFolderInput = false;
  treePage.value = page;
  forcereload();
  try {
    const response = await fetch(
      backend + `arc_path?path=${path}&id=${id}&page=${page} `,
      {
        credentials: "include",
      }
    );

    const data = await response.json();
    if (!response.ok)
      throw new Error(response.statusText + ", " + data["detail"]);

    arcList = [];
    let pages = response.headers.get("total-pages");
    if (pages) treePageMax = parseInt(pages);

    data.Arc.forEach((element: ArcTree) => {
      arcList.push(element);
    });
    forcereload();
    if (expand) pathHistory.push(path);
    else if (expand == undefined) console.log("skip");
    else pathHistory.pop();
    cleanIsaView();
  } catch (error: any) {
    errors = error.toString();
  }
  if (page > 1) window.scrollTo(0, 0);
  loading = false;
  forcereload();
}

/** gets the file on the arc
 *
 * @param id - the id of the arc
 * @param path - the file path
 * @param branch - the main branch name of the arc
 */
async function getFile(id: number, path: string, branch: string) {
  loading = true;
  appProperties.showIsaView = true;

  // cleanup views
  assaySync = studySync = false;
  user = -1;
  forcereload();

  cleanIsaView();
  let response;
  let status = 500;
  // get the file from the backend
  try {
    response = await fetch(
      backend + "arc_file?path=" + path + "&id=" + id + "&branch=" + branch,
      {
        credentials: "include",
      }
    );
    status = response.status;
    let data = await response.json();
    if (!response.ok)
      throw new Error(response.statusText + ", " + data["detail"]);

    // if the file has no content, display "Empty File"
    if (data.size == 0) {
      fileProperties.name = data.file_name;
      data.content = btoa("Empty File");
    }
    // if there is content, it cant be an isa file/regular excel file
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
      // if its a non isa xlsx file
    } else if (data.columns != null) {
      fileProperties.name = "XLSX";
      fileProperties.content = data.data.toString();

      // its an isa file
    } else {
      isaList = [];
      isaProperties.identification = [];
      isaProperties.contacts = [];
      isaProperties.publications = [];
      data.forEach((element: string[], i: number) => {
        // reads out the file and saves the content to isaProperties

        switch (element[0]) {
          case "Study Identifier":
            if (isaProperties.identification.length < 5) {
              for (let j = 0; j < 5; j++) {
                let entry: string[] = data[i + j];
                isaProperties.identification.push([entry[0], entry[1]]);
              }
            }
            break;

          case "Measurement Type":
          case "Assay Measurement Type":
            for (let j = 0; j < 8; j++) {
              isaProperties.identification.push([data[j][0], data[j][1]]);
            }
            break;
          case "INVESTIGATION":
            if (isaProperties.identification.length < 5) {
              for (let j = 0; j < 5; j++) {
                let entry = data[i + j + 1];
                isaProperties.identification.push([entry[0], entry[1]]);
              }
            }
            break;

          // contact information
          case "STUDY CONTACTS":
          case "INVESTIGATION CONTACTS":
          case "ASSAY PERFORMERS":
            if (isaProperties.contacts.length < 11) {
              for (let j = 0; j < 11; j++) {
                let entry = data[i + j + 1];
                let cache: string[] = [];
                entry.forEach((element: string | null) => {
                  if (element) cache.push(element);
                  else cache.push("");
                });
                isaProperties.contacts.push(cache);
              }
            }
            break;

          // publications
          case "INVESTIGATION PUBLICATIONS":
          case "STUDY PUBLICATIONS":
            if (isaProperties.publications.length < 7) {
              for (let j = 0; j < 7; j++) {
                let entry = data[i + j + 1];
                let cache: Array<string> = [];
                entry.forEach((element: string | null) => {
                  if (element) cache.push(element);
                  else cache.push("");
                });
                isaProperties.publications.push(cache);
              }
            }
            break;
        }
        isaList.push(element);
      });
      // write the new data to isaProperties
      isaProperties.entries = isaList;
      isaProperties.repoId = id;
      isaProperties.path = path;
      isaProperties.repoTarget = git.site.value;
      isaProperties.contact = "contact 1";
      isaProperties.publication = "publication 1";
    }

    // catch any error and display it
  } catch (error: any) {
    fileProperties.content = error.toString();
    fileProperties.name = status.toString();
  }
  loading = false;
  forcereload();
}

/** create a new isa structure with a given identifier
 *
 * @param id - the id of the arc
 * @param identifier - the identifier (the name) of the isa file
 * @param type - the type of isa (study or assay)
 * @param branch - the main branch of the arc
 */
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
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identifier: identifier,
      id: id,
      type: type,
      branch: branch,
    }),
  })
    .then((response) => response.json())
    .then((data) => {
      // get the updated tree
      inspectTree(id, type);
    });

  // get the updated changes, assays and studies
  await getChanges(id);

  loading = false;
  forcereload();
}

/** sort the arcList to include only the arcs containing the searchTerm
 *
 * @param searchTerm - the term to search the arcs for (id, name, tags, ...)
 */
function sortArcs(searchTerm: string) {
  searchList = [];
  list.forEach((element) => {
    // craft the string to search in including the name of the arc, the creators name, the id and the topics of the arc
    let searchString =
      element.name_with_namespace.toLowerCase() +
      " " +
      element.id +
      " " +
      element.topics.toString().toLowerCase();
    if (searchString.includes(searchTerm)) {
      searchList.push(element);
    }
  });
}

/** uploads the file(s) to the hub
 *
 */
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

    // function that builds the next chunk and uploads it
    const uploadNextChunk = async () => {
      end = Math.min(start + chunkSize, fileSize);
      // set the progress to 99% for the last chunk
      if (chunkNumber + 1 == totalChunks) {
        progress = 0.99;
      }

      // if there are chunks left, upload them
      if (chunkNumber < totalChunks) {
        const chunk = selectedFile.slice(start, end);
        const formData = new FormData();

        // body for the backend containing all necessary data
        formData.append("file", chunk);
        formData.append("chunkNumber", chunkNumber.toString());
        formData.append("totalChunks", totalChunks.toString());
        formData.append("name", fileInput.value[i].name);
        formData.append("id", arcId.toString());
        formData.append("branch", arcBranch);
        formData.append("path", filePath);
        formData.append("namespace", arcNamespace.value);
        formData.append("lfs", lfs.value.toString());

        try {
          let response = await fetch(backend + "uploadFile", {
            method: "POST",
            body: formData,
            credentials: "include",
          });
          let data = await response.json();
          if (!response.ok) {
            errors = response.statusText + ", " + data["detail"].slice(0, 200);
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
        // when every chunk is uploaded, set the progress to 1
      } else {
        progress = 1;
        console.log("Upload complete");
        // when the largest file (which in return is the last file to finish) was uploaded, finish the process and clear the input
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

/** if you click the 'create new sheet' button, you will get a list containing all the current templates
 *
 */
async function getTemplates() {
  cleanIsaView();
  loading = true;
  appProperties.showIsaView = true;
  assaySync = studySync = false;
  templateProperties.rowId = 1;
  user = -1;
  forcereload();

  // retrieve the templates
  let response = await fetch(appProperties.backend + "tnt/getTemplates");

  let templates = await response.json();

  if (!response.ok) {
    errors = "ERROR: No templates found!";
    templateProperties.templates = [emptyTemplate];
    templateProperties.filtered = [emptyTemplate];
    forcereload();
  } else {
    // save the templates
    templateProperties.templates = [emptyTemplate];
    templateProperties.filtered = [emptyTemplate];
    templateProperties.templates = templateProperties.templates.concat(
      templates.templates
    );
    templateProperties.filtered = templateProperties.filtered.concat(
      templates.templates
    );
  }
  loading = false;
  forcereload();
}

/** get a list of all the swate sheets
 *
 * @param path - the path to the isa file
 * @param id - the id of the arc
 * @param branch - the main branch of the arc
 */
async function getSheets(path: string, id: number, branch: string) {
  cleanIsaView();
  assaySync = studySync = false;
  user = -1;
  loading = true;
  appProperties.showIsaView = true;
  forcereload();

  isaProperties.path = path;
  isaProperties.repoId = id;
  arcProperties.branch = branch;
  // retrieve the sheets
  let request = await fetch(
    `${appProperties.backend}tnt/getSheets?path=${path}&id=${id}&branch=${branch}`,
    {
      credentials: "include",
    }
  );
  let sheets = await request.json();
  if (!request.ok) {
    errors = "ERROR: " + sheets["detail"];
  } else {
    if (sheets[0].length == 0) {
      errors = "ERROR: No sheets found!";
      forcereload();
    }
    // save the sheets
    sheetProperties.sheets = sheets[0];
    sheetProperties.names = sheets[1];
  }
  loading = false;
  forcereload();
}

/** get a list of all assays and studies
 *
 * @param id - the id of the arc
 */
async function getAssaysAndStudies(id: number) {
  loading = true;
  forcereload();
  try {
    // get names of the assays and studies
    let assays = await fetch(backend + "getAssays?id=" + id, {
      credentials: "include",
    });
    if (!assays.ok) {
      const data = await assays.json();
      throw new Error(assays.statusText + ", " + data["detail"]);
    }

    let studies = await fetch(backend + "getStudies?id=" + id, {
      credentials: "include",
    });
    if (!studies.ok) {
      const data = await studies.json();
      throw new Error(studies.statusText + ", " + data["detail"]);
    }

    arcProperties.assays = await assays.json();
    arcProperties.studies = await studies.json();
  } catch (error: any) {
    errors = error.toString();
  }

  // if either no assay or no study is found, return error
  if (arcProperties.assays.length == 0) errors = "ERROR: No Assays found!";
  if (arcProperties.studies.length == 0) errors = "ERROR: No Studies found!";

  loading = false;
  forcereload();
}

/** sync an assay to a study
 *
 * @param id - the id of the arc
 * @param assay - the name of the assay
 * @param study - the name of the study
 * @param branch - the main branch of the arc
 */
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
      headers: { "Content-Type": "application/json" },
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
  } catch (error: any) {
    errors = error.toString();
  }

  loading = false;
  forcereload();
}

/** sync a study to the investigation file
 *
 * @param id - the id of the arc
 * @param study - the name of the study
 * @param branch - the main branch of the arc
 */
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
      headers: { "Content-Type": "application/json" },
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
  } catch (error: any) {
    errors = error.toString();
  }

  loading = false;
  forcereload();
}

/** checks weather the file should be editable or not
 *
 * @param name - the name of the file (eg. test.pdf, pic1.png, ...)
 */
function checkName(name: string) {
  let includes = false;
  // list of file formats that shouldn't be selectable
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

/** builds the download link for the zip file containing your arc
 *
 * @param id - the id of the arc
 */
async function getArchive(id: number) {
  loading = true;
  forcereload();
  try {
    // create a html "a" element
    const downloadLink = document.createElement("a");

    // build the link based around the download link used in gitlab to download a zip
    downloadLink.href = `${
      arcProperties.url.split(".git")[0]
    }/-/archive/${arcBranch}/${arcProperties.identifier}-${arcBranch}.zip`;

    // start the download
    downloadLink.click();
  } catch (error: any) {
    errors = error.toString();
  }
  loading = false;
  forcereload();
}

/** checks weather the file/folder should be deletable or not
 *
 * @param name - the name of the file/folder
 */
function checkForDeletion(name: string) {
  // return true if its a file/folder that is mandatory and therefore shall not be deletable
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

/** deletes the file on the given path
 *
 * @param id - the id of the arc
 * @param path - the file path
 * @param branch - the main branch of the arc
 * @param name - the name of the file
 */
async function deleteFile(
  id: number,
  path: string,
  branch: string,
  name: string
) {
  // open a message window asking the user for confirmation
  $q.dialog({
    dark: appProperties.dark,
    title: "Delete " + name,
    message: "Are you sure you want to delete '" + name + "'?",
    cancel: true,
  }).onOk(async () => {
    // user confirmed the deletion
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
    // if the deletion was successful
    else {
      $q.notify(data);
      await inspectTree(arcId, pathHistory[pathHistory.length - 1]);
    }
    forcereload();
  });
}

/** deletes the entire folder on the given path
 *
 * @param id - the id of the arc
 * @param path - the folder path
 * @param branch - the main branch of the arc
 * @param name - the name of the folder
 */
async function deleteFolder(
  id: number,
  path: string,
  branch: string,
  name: string
) {
  // ask the user for confirmation
  $q.dialog({
    dark: appProperties.dark,
    title: "Delete " + name,
    message: "Are you sure you want to delete the entirety of '" + name + "'?",
    cancel: true,
  }).onOk(async () => {
    // user confirmed the deletion
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
      await inspectTree(arcId, pathHistory[pathHistory.length - 2], false);
    }
    forcereload();
  });
}

/** create a new folder with the given identifier
 *
 * @param id - the id of the arc
 * @param identifier - the identifier (the name) of the new folder
 * @param path - the current path
 * @param branch - the main branch of the arc
 */
async function createFolder(
  id: number,
  identifier: string,
  path: string,
  branch: string
) {
  loading = true;
  forcereload();
  // send name and properties to the backend
  let response = await fetch(backend + "createFolder", {
    credentials: "include",
    method: "POST",
    headers: { "Content-Type": "application/json" },
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

/** get a list of all users
 *
 */
async function getUser() {
  loading = true;
  forcereload();
  userList = [];
  userSelect.value = { label: "", value: 0 };
  permission.value = { label: "Developer", value: 30 };
  try {
    // get all users
    let user = await fetch(appProperties.backend + "user/" + "getUser", {
      credentials: "include",
    });
    if (!user.ok) {
      const data = await user.json();
      throw new Error(user.statusText + ", " + data["detail"]);
    }

    let users = await user.json();
    // fill the list of users with the username and the id
    users["users"].forEach((user: User) => {
      userList.push({
        label: user.username,
        value: user.id,
      });
    });
    // if there are no user found, return error
    if (userList.length == 0) throw new Error("ERROR: " + users["detail"]);
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
  } catch (error: any) {
    errors = error.toString();
  }
  loading = false;
  forcereload();
}

/** get a list of all users for the Arc
 *
 * @param id - the id of the arc
 */
async function getArcUser(id: number) {
  loading = true;
  forcereload();
  userList = [];
  userSelect.value = { label: "", value: 0 };
  permission.value = { label: "Developer", value: 30 };
  try {
    // get all users that are part of the arc
    let user = await fetch(
      appProperties.backend + "user/" + "getArcUser?id=" + id,
      {
        credentials: "include",
      }
    );
    if (!user.ok) {
      const data = await user.json();
      throw new Error(user.statusText + ", " + data["detail"]);
    }

    let users = await user.json();
    // fill the list of users with the username and id
    users["users"].forEach((user: User) => {
      userList.push({
        label: user.username,
        value: user.id,
      });
    });

    // if there are no user found, return error
    if (userList.length == 0) throw new Error("ERROR: " + users["detail"]);
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
  } catch (error: any) {
    errors = error.toString();
  }
  loading = false;
  forcereload();
}

/** add user as member to the project
 *
 * @param id - the id of the arc
 *
 * @param {Object} user - the user
 * @param {string} user.label - the name of the user
 * @param {number} user.value - the id of the user
 *
 * @param {Object} role - the role of the user
 * @param {number} role.value - the role value of the user setting the access rights(30,40,...)
 */
async function addUser(
  id: number,
  user: { value: number; label: string },
  role: { label: string; value: number }
) {
  loading = true;
  forcereload();
  // send the necessary user info to the backend
  let response = await fetch(appProperties.backend + "user/" + "addUser", {
    credentials: "include",
    method: "POST",
    headers: { "Content-Type": "application/json" },
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

/** remove a user from the project
 *
 * @param id - the id of the arc
 *
 * @param {Object} user - the user
 * @param {string} user.label - the name of the user
 * @param {number} user.value - the id of the user
 */
async function removeUser(id: number, user: any) {
  loading = true;
  forcereload();
  // send DELETE request to the backend
  let response = await fetch(
    `${appProperties.backend}user/removeUser?id=${id}&userId=${user.value}&username=${user.label}`,
    {
      credentials: "include",
      method: "DELETE",
    }
  );
  let data = await response.json();
  if (!response.ok) errors = response.statusText + ", " + data["detail"];
  else $q.notify(data);

  loading = false;
  forcereload();
}

/** edit the role of a user of the project
 *
 * @param id - the id of the arc
 *
 * @param {Object} user - the user
 * @param {string} user.label - the name of the user
 * @param {number} user.value - the id of the user
 *
 * @param {Object} role - the role of the user
 * @param {number} role.value - the role value of the user setting the access rights(30,40,...)
 */
async function editUser(
  id: number,
  user: { label: string; value: number },
  role: { label: string; value: number }
) {
  loading = true;
  forcereload();
  // send PUT request to the backend updating the role of the user
  let response = await fetch(`${appProperties.backend}user/editUser`, {
    credentials: "include",
    method: "PUT",
    headers: { "Content-Type": "application/json" },
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

/** builds the download link for the file and downloads it
 *
 * @param path - the path to the file
 */
async function downloadFile(path: string) {
  loading = true;
  forcereload();
  try {
    // create a html "a" element
    const downloadLink = document.createElement("a");

    // build the link based around the download link used in gitlab to download a zip
    downloadLink.href = `${
      arcProperties.url.split(".git")[0]
    }/-/raw/${arcBranch}/${path}?ref_type=heads&inline=false`;

    // start the download
    downloadLink.click();
  } catch (error: any) {
    errors = error.toString();
  }
  loading = false;
  forcereload();
}
</script>

<template>
  <!-- FETCH ARC/FILE UPLOAD BUTTON/OPEN ARC/ZIP/SYNC ASSAYS/STUDIES RELOAD MEMBER-->
  <div class="q-pa-xs row q-gutter-sm">
    <q-btn
      id="arcFetch"
      @click="fetchArcs(), forcereload()"
      icon="downloading"
      dense
      ><template v-if="!appProperties.showIsaView && appProperties.arcList"
        >Load Arcs</template
      ></q-btn
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
      @update:model-value="
        arcsPage = 1;
        fetchArcs(arcsPage);
      " />
    <template v-if="arcList.length != 0">
      <q-btn-group style="max-height: 3em">
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
          label="Upload File(s)"
          multiple
          max-file-size="10737418240"
          @update:model-value="
            fileUpload();
            uploading = true;
          "
          @rejected="
            errors = 'ERROR: File too big (max. 10 GB) or too many selected!';
            forcereload();
          "
          :key="refresher"
          :loading="uploading"
          :disable="progress > 0 && progress != 1 && progress != null"
          ><template v-slot:before> <q-icon name="file_upload" /> </template
        ></q-file>
        <!-- OPEN -->
        <q-btn
          id="open"
          @click="openArc(arcProperties.url)"
          icon="open_in_new"
          glossy
          :key="refresher + 1"
          ><template v-if="!appProperties.showIsaView && appProperties.arcList"
            >Open</template
          ></q-btn
        >
        <!-- ZIP -->
        <q-btn icon="download" @click="getArchive(arcId)" glossy color="teal-10"
          ><template v-if="!appProperties.showIsaView && appProperties.arcList"
            >zip</template
          ></q-btn
        >
        <!-- SYNC ASSAY-->
        <q-btn
          id="assay"
          icon="sync_alt"
          glossy
          @click="
            assaySync = !assaySync;
            studySync = false;
            user = -1;
            forcereload();
            getAssaysAndStudies(arcId);
          "
          :key="refresher + 2"
          ><template v-if="!appProperties.showIsaView && appProperties.arcList"
            >Sync Assay/Study</template
          ></q-btn
        >
        <!-- SYNC STUDY-->
        <q-btn
          id="study"
          icon="sync"
          glossy
          @click="
            studySync = !studySync;
            assaySync = false;
            user = -1;
            forcereload();
            getAssaysAndStudies(arcId);
          "
          :key="refresher + 3"
          ><template v-if="!appProperties.showIsaView && appProperties.arcList"
            >Sync Study/Invest</template
          ></q-btn
        >
        <!-- Reloads the arc -->
        <q-btn icon="refresh" @click="inspectArc(arcId)" glossy
          ><template v-if="!appProperties.showIsaView && appProperties.arcList"
            >Reload</template
          ></q-btn
        >
        <!-- USER MANAGEMENT-->
        <q-btn icon="person" glossy id="user"
          ><template v-if="!appProperties.showIsaView && appProperties.arcList"
            >Members</template
          ><q-menu>
            <q-list style="min-width: 100px">
              <q-item
                clickable
                v-close-popup
                @click="
                  user = 0;
                  assaySync = studySync = false;
                  forcereload();
                  getUser();
                ">
                <q-item-section>Add User</q-item-section>
              </q-item>
              <q-separator />
              <q-item
                clickable
                v-close-popup
                @click="
                  user = 1;
                  assaySync = studySync = false;
                  forcereload();
                  getArcUser(arcId);
                ">
                <q-item-section>Remove User</q-item-section>
              </q-item>
              <q-separator />
              <q-item
                clickable
                v-close-popup
                @click="
                  user = 2;
                  assaySync = studySync = false;
                  forcereload();
                  getArcUser(arcId);
                ">
                <q-item-section>Edit User</q-item-section>
              </q-item>
            </q-list>
          </q-menu></q-btn
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
    <q-item v-if="username && username.length > 1"
      >User: {{ username }} / ARC: {{ arcProperties.identifier }}</q-item
    >
    <!-- LIST WITH ALL ARCS AND ARC TREE VIEW-->
    <q-expansion-item
      v-model="appProperties.arcList"
      :key="refresher + 5"
      expand-separator
      icon="cloud_download"
      label="List ARCs/Projects"
      caption="List of ARCs and other projects from the DataHUB"
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
              ><q-avatar
                v-if="
                  item.name.toLowerCase().includes('.jpg') ||
                  item.name.toLowerCase().includes('.png') ||
                  item.name.toLowerCase().includes('.jpeg')
                "
                icon="image"></q-avatar>
              <q-avatar
                v-else-if="item.name.toLowerCase().includes('.mp4')"
                icon="movie"></q-avatar>
              <q-avatar
                v-else-if="item.name.toLowerCase().includes('.html')"
                icon="html"></q-avatar
              ><q-avatar
                v-else-if="item.name.toLowerCase().includes('.css')"
                icon="css"></q-avatar>
              <q-avatar
                v-else-if="item.name.toLowerCase().includes('.js')"
                icon="javascript"></q-avatar>
              <q-avatar
                v-else-if="item.name.toLowerCase().includes('.zip')"
                icon="folder_zip"></q-avatar>
              <q-avatar
                v-else-if="
                  item.name.toLowerCase().includes('.py') ||
                  item.name.toLowerCase().endsWith('.r')
                "
                icon="code"></q-avatar>
              <q-avatar v-else icon="description"></q-avatar
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
                icon="download"
                color="green"
                flat
                dense
                @click="downloadFile(item.path)"
                >Download</q-btn
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
          icon="create_new_folder"
          id="folder"
          fab-mini
          v-if="arcList.length != 0"
          @click="
            showFolderInput = true;
            showInput = false;
            forcereload();
          "
          >New Folder</q-btn
        >
        <div
          class="q-pa-lg flex flex-center"
          v-if="arcList.length != 0"
          v-show="treePageMax > 1">
          <q-pagination
            v-model="treePage"
            :max="treePageMax"
            boundary-numbers
            :max-pages="10"
            @update:model-value="
              inspectTree(
                arcId,
                pathHistory[pathHistory.length - 1],
                undefined,
                treePage
              )
            " />
        </div>

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
              arcNamespace = item.path_with_namespace;
              inspectArc(item.id);
            ">
            <!-- load the avatar if there is one -->
            <q-item-section avatar>
              <q-avatar v-if="item.avatar_url != null">
                <img :src="item.avatar_url" />
              </q-avatar>
              <q-avatar color="secondary" text-color="white" v-else>{{
                item.namespace.name[0]
              }}</q-avatar>
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
        <div
          class="q-pa-lg flex flex-center"
          v-if="arcList.length == 0"
          v-show="arcsPageMax > 1">
          <q-pagination
            :max="arcsPageMax"
            v-model="arcsPage"
            boundary-numbers
            :max-pages="6"
            @update:model-value="fetchArcs(arcsPage)"></q-pagination>
        </div>
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
    <template v-if="user > -1"
      ><div class="q-pa-md" v-show="userList.length > 0">
        <q-btn
          icon="arrow_back"
          @click="
            user = -1;
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
            v-if="user != 1"
            v-model="permission"
            :options="userPermissions"
            label="Role"
            style="width: 200px" />
          <!-- ADD/REMOVE/EDIT USER -->
          <q-btn
            v-if="user == 0"
            @click="
              user = -1;
              addUser(arcId, userSelect, permission);
              userSelect = { label: '', value: 0 };
              permission = { label: 'Developer', value: 30 };
              forcereload();
            "
            :disable="userSelect.label == '' || permission.label == ''"
            glossy
            >Add</q-btn
          >
          <q-btn
            v-else-if="user == 1"
            @click="
              user = -1;
              removeUser(arcId, userSelect);
              userSelect = { label: '', value: 0 };
              permission = { label: 'Developer', value: 30 };
              forcereload();
            "
            :disable="userSelect.label == ''"
            glossy
            >Remove</q-btn
          >
          <q-btn
            v-else-if="user == 2"
            @click="
              user = -1;
              editUser(arcId, userSelect, permission);
              userSelect = { label: '', value: 0 };
              permission = { label: 'Developer', value: 30 };
              forcereload();
            "
            :disable="userSelect.label == '' || permission.label == ''"
            glossy
            >Edit</q-btn
          >
        </div>
        <br />
        <span v-if="user != 1">
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

.body--light #folder {
  background-color: aliceblue;
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

.body--light #user {
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

.body--dark #folder {
  background-color: darkslategray;
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

.body--dark #user {
  background-color: darkslateblue;
}
</style>
