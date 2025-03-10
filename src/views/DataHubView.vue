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

class TreeChildren {
  label: string;
  icon: string;
  key: string;
  disabled = false;
  children: Array<TreeChildren>;

  constructor(
    label: string,
    icon: string,
    key: string,
    children: Array<TreeChildren>,
    disabled = false
  ) {
    this.label = label;
    this.icon = icon;
    this.key = key;
    this.children = children;
    this.disabled = disabled;
  }
}

class ArcTreeList {
  label: string;
  key: string;
  children: Array<TreeChildren>;

  constructor(label: string, children: Array<TreeChildren>) {
    this.label = label;
    this.key = label;
    this.children = children;
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

var windowWidth = window.innerWidth;

window.addEventListener("resize", () => {
  windowWidth = window.innerWidth;
});

// string detailing an error
var errors: string | null;

// show only arcs with writing permission
var owned = ref(false);

// enable git lfs
var lfs = ref(false);

// current page for the arc tree view (if there are more than 20 files/folders inside of an folder)
var treePage = ref(1);

var treePageMax = 1;

// current page for the list of arcs (if its more than 20)
var arcsPage = ref(1);

var arcsPageMax = 1;

// list of all the content of the specific arc
var arcList: Array<ArcTree> = [];
// gitlab id of the arc
var arcId: number;

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

// show validation of the arc
var validate = ref(false);
var slide = ref("structure");
var validateData = {
  Assays: [] as Array<Object>,
  Studies: [] as Array<Object>,
  ARC_Structure: true as boolean | string,
  Investigation: {
    identifier: false,
    title: false,
    description: false,
    contacts: [] as Array<boolean | string>,
  },
  ARC: false,
};

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
var permission = ref({ label: "Maintainer", value: 40 });

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

// whether to search inside of all arcs for the name or not
var extendedSearch = ref(false);

// namespace of the arc
var arcNamespace = ref("");

var fdat = ref(false);
var fdatPAT = ref("");
var fdatAddress = ref("");

// set to true if folder contains a datamap xlsx file
var containsDatamap = false;

// here we trick vue js to reload the component
const refresher = ref(0);
const forcereload = () => {
  // when the key value is changed, vue is automatically reloading the page
  refresher.value += 1;
};

// array containing all the files to upload
var fileInput = ref([] as Array<File>);

var arcTreeList: Array<ArcTreeList> = [];

var selectedNode = ref("");

var splitterModel = ref(0);

var repairClicked = ref(false);

/** adds the given child to the respective Arc Tree subnode
 *
 * @param path - the path where the children node resides (form of name/name2/...)
 * @param treeChild - the tree child to append
 */
function addTreeChildren(path: string, treeChild: TreeChildren) {
  function recursivePathSearch(
    subPath: string,
    currentChild: Array<TreeChildren>
  ) {
    let pathPieces = subPath.split("/");
    let treeChildIndex = currentChild.findIndex(
      (element) => element.label == pathPieces[0]
    );
    if (pathPieces.length > 1) {
      recursivePathSearch(
        pathPieces.slice(1).join("/"),
        currentChild[treeChildIndex].children
      );
    } else {
      // check if treeChild already exists
      if (
        currentChild[treeChildIndex].children.findIndex(
          (element) => element.label == treeChild.label
        ) == -1
      )
        currentChild[treeChildIndex].children.push(treeChild);
    }
  }
  if (path != "") recursivePathSearch(path, arcTreeList[0].children);
}

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
    case "tuebingen_testenv":
      window.open("https://gitlab.test-nfdi4plants.de/explore");
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
  arcProperties.branch = "main";
  lfs.value = false;
  splitterModel.value = 0;
  arcsPage.value = page;
  treePage.value = treePageMax = 1;
  searchList = [];
  repairClicked.value = false;
  // if not logged in, show only public arcs
  if (!appProperties.loggedIn) {
    // if no datahub is selected, show an error
    if (git.site == "") {
      errors = "Please select a DataHub first!";
      $q.notify({
        type: "warning",
        message: "Please select a Datahub first!",
      });
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
          arcsPageMax = 1;
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
        $q.notify({
          type: "negative",
          message: error.toString(),
        });
        errors = error.toString();
      }

      loading = false;
      forcereload();
    }
    // if logged in, reset the properties and views and fetch the arc list from the backend
  } else {
    arcList = [];
    arcProperties.identifier = "";
    arcProperties.description = "";
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
      $q.notify({
        type: "negative",
        message: error.toString(),
      });
      errors = error.toString();
    }
    loading = false;
    forcereload();
  }
}

/** get a list of all arcs at the same time in the gitlab
 *
 */
async function fetchAllArcs() {
  loading = true;
  appProperties.showIsaView = false;
  appProperties.arcList = true;
  arcProperties.branch = "main";
  lfs.value = false;
  splitterModel.value = 0;
  arcsPage.value = 1;
  treePage.value = treePageMax = 1;
  arcsPageMax = 1;
  searchList = [];
  repairClicked.value = false;
  // if not logged in, show only public arcs
  if (!appProperties.loggedIn) {
    $q.notify({
      type: "warning",
      message: "Please login first!",
    });
    errors = "Please login first!";
    loading = false;
    forcereload();

    // if logged in, reset the properties and views and fetch the arc list from the backend
  } else {
    // reset Properties and histories
    arcList = [];
    arcProperties.identifier = "";
    arcProperties.description = "";
    assaySync = studySync = false;
    user = -1;
    cleanIsaView();
    isaProperties.rowId = 0;
    fileProperties.name = "";
    arcProperties.changes = "";
    pathHistory = [];
    try {
      // get page number
      let pageCount = await fetch(backend + "arc_list?owned=" + owned.value, {
        credentials: "include",
        method: "HEAD",
      });
      list = [];

      // get the number of total pages
      let pages = pageCount.headers.get("total-pages");
      let totalPages = 1;

      if (pages) {
        totalPages = parseInt(pages);
      }
      for (let i = 1; i <= totalPages; i++) {
        const response = await fetch(
          backend + "arc_list?owned=" + owned.value + "&page=" + i,
          {
            credentials: "include",
          }
        );
        const data = await response.json();
        if (!response.ok)
          throw new Error(response.statusText + ", " + data["detail"]);

        errors = null;

        data.projects.forEach((element: Arc) => {
          list.push(element);
        });
      }

      if (list.length == 0) throw new Error("No arcs found for you!");
      // fill searchList with the full list and clear the search bar
      searchList = list;
      search.value = "";

      // set the username in sessionStorage and display it
      if (window.sessionStorage.getItem("username") != null)
        username = window.sessionStorage.getItem("username");
    } catch (error: any) {
      $q.notify({
        type: "negative",
        message: error.toString(),
      });
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
  fileProperties.pdfContent = "";
  sheetProperties.names = sheetProperties.sheets = [];
  sheetProperties.name = "";
  errors = "";
  forcereload();
}

async function inspectArcTree(selectedNode: string) {
  if (selectedNode && selectedNode != "") {
    let arcTreeElement = searchElement(arcTreeList[0].children);
    if (arcTreeElement) {
      if (arcTreeElement.icon == "folder") {
        inspectTree(arcId, arcTreeElement.key);
        let pathParts = arcTreeElement.key.split("/");
        pathHistory = [""];
        pathParts.forEach((part) => {
          if (pathHistory.length == 1) pathHistory.push(part);
          else if (pathHistory.length > 1) {
            pathHistory.push(pathHistory[pathHistory.length - 1] + "/" + part);
          }
        });
      } else if (arcTreeElement.icon == "description") {
        let pathParts = arcTreeElement.key.split("/");
        if (pathParts.length > 1) {
          inspectArcTree(pathParts.slice(0, pathParts.length - 1).join("/"));
        } else {
          inspectTree(arcId, "");
          pathHistory = [""];
        }
        getFile(arcId, arcTreeElement.key, arcProperties.branch);
      }
    }
  }

  function searchElement(
    nodeChildren: Array<TreeChildren>
  ): TreeChildren | null {
    for (let i = 0; i < nodeChildren.length; i++) {
      let element = nodeChildren[i];

      if (element.key == selectedNode) {
        return element;
      }
      if (element.children.length > 0) {
        let deeperSearch = searchElement(element.children);
        if (deeperSearch) return deeperSearch;
      }
    }
    return null;
  }
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
  repairClicked.value = false;
  forcereload();
  try {
    const response = await fetch(
      backend + "arc_tree?id=" + id + "&branch=" + arcProperties.branch,
      {
        credentials: "include",
      }
    );
    const data = await response.json();
    if (!response.ok)
      throw new Error(response.statusText + ", " + data["detail"].toString());

    arcList = [];
    let arcTreeChildren: Array<TreeChildren> = [];
    data.Arc.forEach((element: ArcTree) => {
      arcList.push(element);

      let treeIcon = element.type == "tree" ? "folder" : "description";
      arcTreeChildren.push(
        new TreeChildren(
          element.name,
          treeIcon,
          element.name,
          [],
          checkName(element.name)
        )
      );
    });

    arcTreeList = [new ArcTreeList(arcProperties.identifier, arcTreeChildren)];
    pathHistory = [];
    pathHistory.push("");

    // get the changes
    getChanges(id, arcProperties.branch);

    // get the branches
    getBranches(id);
  } catch (error: any) {
    $q.notify({
      type: "negative",
      message: error.toString(),
    });
    errors = error.toString();
  }
  splitterModel.value = 20;
  loading = false;
  forcereload();
}

/** get the list of changes
 *
 * @param id - the id of the arc
 * @param branch - the chosen branch
 */
async function getChanges(id: number, branch: string) {
  try {
    await fetch(backend + `getChanges?id=${id}&branch=${branch}`, {
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
    $q.notify({
      type: "negative",
      message: error.toString(),
    });
    errors = error.toString();
  }
}

/** get the list of branches
 *
 * @param id - the id of the arc
 */
async function getBranches(id: number) {
  try {
    await fetch(backend + "getBranches?id=" + id, {
      credentials: "include",
    })
      .then((response) => {
        if (response.ok) {
          return response.json();
        }
      })
      .then((branches) => {
        if (branches) {
          arcProperties.branches = branches;
        }
      });
  } catch (error: any) {
    $q.notify({
      type: "negative",
      message: error.toString(),
    });
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
  isaProperties.entry = [];
  user = -1;
  errors = "";
  showInput = false;
  showFolderInput = false;
  containsDatamap = false;
  treePage.value = page;
  forcereload();
  try {
    const response = await fetch(
      backend +
        `arc_path?path=${path}&id=${id}&page=${page}&branch=${arcProperties.branch} `,
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

      let treeIcon = element.type == "tree" ? "folder" : "description";
      addTreeChildren(
        path,
        new TreeChildren(
          element.name,
          treeIcon,
          path + "/" + element.name,
          [],
          checkName(element.name)
        )
      );

      if (element.name == "isa.datamap.xlsx") containsDatamap = true;
    });
    forcereload();
    if (expand) pathHistory.push(path);
    else if (expand == undefined) console.log("skip");
    else pathHistory.pop();
    cleanIsaView();
  } catch (error: any) {
    $q.notify({
      type: "negative",
      message: error.toString(),
    });
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
 * @param branch - the chosen branch
 */
async function getFile(id: number, path: string, branch: string) {
  loading = true;
  appProperties.showIsaView = false;

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

    // if its a pdf file, render it as html stored inside pdfContent
    if (response.headers.get("content-type")?.includes("html")) {
      let htmlContent = await response.text();

      fileProperties.pdfContent = htmlContent;
    } else {
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
      }
      // its an isa file
      else if (path.includes("isa.datamap.xlsx")) {
        // save the sheets
        sheetProperties.sheets = data[0];
        sheetProperties.names = data[1];
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

            // user orcid
            case "Comment[ORCID]":
              if (isaProperties.contacts.length > 0) {
                let entry = data[i];
                let cache: string[] = [];
                entry.forEach((element: string | null) => {
                  if (element) cache.push(element);
                  else cache.push("");
                });
                isaProperties.contacts.push(cache);
              }
              break;

            // compliance agreement (Convention of biodiversity compliance)
            case "Comment[Special CDB-ABS permissions required]":
              if (isaProperties.identification.length > 0) {
                let entry = data[i];
                let cache: string[] = [];
                entry.forEach((element: string | null) => {
                  if (element) cache.push(element);
                  else cache.push("");
                });
                isaProperties.identification.push(cache);
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

        // if there is data missing, fill in empty values to prevent errors
        if (isaProperties.identification.length == 0)
          for (let i = 0; i < 5; i++) {
            isaProperties.identification.push(["", ""]);
          }

        if (isaProperties.contacts.length == 0)
          isaProperties.contacts.push([""]);

        if (
          isaProperties.publications.length == 0 &&
          !path.endsWith("isa.assay.xlsx")
        )
          isaProperties.publications.push([""]);
      }
    }
    // catch any error and display it
  } catch (error: any) {
    fileProperties.content = error.toString();
    fileProperties.name = status.toString();
  }
  appProperties.showIsaView = true;
  loading = false;
  forcereload();
}

/** create a new isa structure with a given identifier
 *
 * @param id - the id of the arc
 * @param identifier - the identifier (the name) of the isa file
 * @param type - the type of isa (study or assay)
 * @param branch - the chosen branch
 */
async function addIsa(
  id: number,
  identifier: string,
  type: string,
  branch: string
) {
  loading = true;
  forcereload();
  try {
    const response = await fetch(backend + "createISA", {
      credentials: "include",
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier: identifier,
        id: id,
        type: type,
        branch: branch,
      }),
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(response.statusText + ", " + data["detail"]);
  } catch (error: any) {
    $q.notify({
      type: "negative",
      message: error.toString(),
    });
    errors = error.toString();
  }
  inspectTree(id, type);

  // get the updated changes, assays and studies
  await getChanges(id, arcProperties.branch);

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
    if (searchString.includes(searchTerm.toLowerCase())) {
      searchList.push(element);
    }
  });
}

/** uploads the file(s) to the hub
 *
 * @param folder - if a folder is uploaded instead of a list of files (in case of folder the webkitRelativePath is used)
 */
async function fileUpload(folder = false) {
  uploading = true;

  errors = "";

  // chunksize is set to 100mb
  const chunkSize = 100 * 1024 * 1024;

  let filesDone = 0;

  forcereload();
  // loop for the amount of selected files
  for (let i = 0; i < fileInput.value.length; i++) {
    let filePath = "";

    const selectedFile = fileInput.value[i];

    // save the file on the most recent path
    if (folder)
      if (pathHistory[pathHistory.length - 1] != "")
        filePath =
          pathHistory[pathHistory.length - 1] +
          "/" +
          selectedFile.webkitRelativePath;
      else filePath = selectedFile.webkitRelativePath;
    else filePath = pathHistory[pathHistory.length - 1];
    $q.loading.show({
      message:
        "Uploading the file(s)...<br><i>All files over 50 mb are uploaded through git-lfs!</i>",
      html: true,
    });

    if (!folder) {
      // if the file is in a subfolder, include an "/"
      if (filePath == "") {
        filePath += selectedFile.name;
      } else {
        filePath += "/" + selectedFile.name;
      }
    }

    // amount of chunks for the current file
    const totalChunks = Math.ceil(selectedFile.size / chunkSize);
    const chunkProgress = 1 / totalChunks;
    progress = chunkProgress;
    let fileSize = selectedFile.size;

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
        formData.append("name", selectedFile.name);
        formData.append("id", arcId.toString());
        formData.append("branch", arcProperties.branch);
        formData.append("path", filePath);
        formData.append("namespace", arcNamespace.value);

        // force lfs for files larger than 50 mb
        if (fileSize > 50 * 1024 * 1024) {
          formData.append("lfs", "true");
        } else {
          formData.append("lfs", lfs.value.toString());
        }

        try {
          let response = await fetch(appProperties.backend + "fnf/uploadFile", {
            method: "POST",
            body: formData,
            credentials: "include",
          });

          if (!response.ok && response.status != 504) {
            try {
              let data = await response.json();
              errors =
                response.statusText + ", " + data["detail"].slice(0, 300);
              $q.notify({
                type: "negative",
                message: errors,
              });
            } catch (error) {
              errors =
                response.statusText + ", Error while uploading your file(s)!";
            }
            $q.notify({
              type: "negative",
              message: errors,
            });
            progress = 1;
            $q.loading.hide();
            uploading = false;
          } else {
            if (response.status == 504) {
              $q.notify({
                message:
                  "Your file is uploaded in the background. Check again later!",
                color: "primary",
              });
            }
            if (
              response.status == 201 ||
              response.status == 200 ||
              response.status == 504
            )
              filesDone++;
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
        $q.notify({
          type: "positive",
          message: selectedFile.name + " was uploaded successfully!",
        });
        console.log("Upload complete");
        // when the largest file (which in return is the last file to finish) was uploaded, finish the process and clear the input
        if (filesDone == fileInput.value.length) {
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
  appProperties.showIsaView = false;
  assaySync = studySync = false;
  templateProperties.rowId = 1;
  templateProperties.templateName = "";
  templateProperties.templateVersion = "";
  user = -1;
  forcereload();

  // retrieve the templates
  let response = await fetch(appProperties.backend + "tnt/getTemplates");

  let templates = await response.json();

  if (!response.ok) {
    errors = "ERROR: No templates found!";
    $q.notify({
      type: "negative",
      message: errors,
    });
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
    appProperties.showIsaView = true;
  }
  loading = false;
  forcereload();
}

/** get a list of all the swate sheets
 *
 * @param path - the path to the isa file
 * @param id - the id of the arc
 * @param branch - the chosen branch
 */
async function getSheets(path: string, id: number, branch: string) {
  cleanIsaView();
  assaySync = studySync = false;
  user = -1;
  appProperties.showIsaView = false;
  loading = true;
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
    $q.notify({
      type: "negative",
      message: errors,
    });
  } else {
    if (sheets[0].length == 0) {
      errors = "Warning: No sheets found!";
      $q.notify({
        type: "warning",
        message: errors,
      });
      forcereload();
    } else {
      appProperties.showIsaView = true;
    }

    // save the sheets
    sheetProperties.sheets = sheets[0];
    sheetProperties.names = sheets[1];
    templateProperties.pages = 1;
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
  errors = "";
  forcereload();
  try {
    // get names of the assays and studies
    let assays = await fetch(
      backend + "getAssays?id=" + id + "&branch=" + arcProperties.branch,
      {
        credentials: "include",
      }
    );
    if (!assays.ok) {
      const data = await assays.json();
      throw new Error(assays.statusText + ", " + data["detail"]);
    }

    let studies = await fetch(
      backend + "getStudies?id=" + id + "&branch=" + arcProperties.branch,
      {
        credentials: "include",
      }
    );
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

  if (errors != "")
    $q.notify({
      type: "negative",
      message: errors ? errors : "",
    });

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
    } else {
      $q.notify({
        type: "positive",
        message: assay + " data was synced into study successfully!",
      });
    }
  } catch (error: any) {
    $q.notify({
      type: "negative",
      message: error.toString(),
    });
    errors = error.toString();
  }
  loading = false;
  forcereload();
}

/** sync a study to the investigation file
 *
 * @param id - the id of the arc
 * @param study - the name of the study
 * @param branch - the chosen branch
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
    } else {
      $q.notify({
        type: "positive",
        message:
          study + " data was synced into the investigation successfully!",
      });
    }
  } catch (error: any) {
    $q.notify({
      type: "negative",
      message: error.toString(),
    });
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
    ".xml",
    ".zip",
    ".7z",
    ".gz",
    ".bz2",
    ".html",
    ".css",
    ".mp4",
    ".mp3",
    ".raw",
    ".docx",
    ".db",
    ".sqlite",
    ".dll",
    ".pdb",
    ".pptx",
    ".bt2",
    ".rdata",
    ".rhistory",
    ".ds_store",
    ".cys",
    ".bam",
    "._output",
    ".swp",
    ".ab1",
    ".spf",
    ".rds",
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
    downloadLink.href = `${arcProperties.url.split(".git")[0]}/-/archive/${
      arcProperties.branch
    }/${arcProperties.identifier}-${arcProperties.branch}.zip`;

    // start the download
    downloadLink.click();
  } catch (error: any) {
    $q.notify({
      type: "negative",
      message: error.toString(),
    });
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
 * @param branch - the chosen branch
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
      appProperties.backend +
        "fnf/deleteFile?path=" +
        path +
        "&id=" +
        id +
        "&branch=" +
        branch,
      {
        method: "DELETE",
        credentials: "include",
      }
    );
    let data = await response.json();
    if (!response.ok) {
      errors = response.statusText + ", " + data["detail"];
      $q.notify({
        type: "negative",
        message: errors,
      });
    }
    // if the deletion was successful
    else {
      $q.notify({ type: "positive", message: data });
      await inspectTree(arcId, pathHistory[pathHistory.length - 1]);
    }
    forcereload();
  });
}

/** deletes the entire folder on the given path
 *
 * @param id - the id of the arc
 * @param path - the folder path
 * @param branch - the chosen branch
 * @param name - the name of the folder
 */
async function deleteFolder(
  id: number,
  path: string,
  branch: string,
  name: string
) {
  inspectTree(id, pathHistory[pathHistory.length - 1], undefined);
  // ask the user for confirmation
  $q.dialog({
    dark: appProperties.dark,
    title: "Delete " + name,
    message: "Are you sure you want to delete the entirety of '" + name + "'?",
    cancel: true,
  }).onOk(async () => {
    loading = true;
    forcereload();
    // user confirmed the deletion
    console.log("Deleting " + name + "...");
    // send delete request to backend
    let response = await fetch(
      appProperties.backend +
        "fnf/deleteFolder?path=" +
        path +
        "&id=" +
        id +
        "&branch=" +
        branch,
      {
        method: "DELETE",
        credentials: "include",
      }
    );
    let data = await response.json();
    if (!response.ok) {
      errors = response.statusText + ", " + data["detail"];
      $q.notify({
        type: "negative",
        message: errors,
      });
    } else {
      $q.notify({ type: "positive", message: data });
      await inspectTree(arcId, pathHistory[pathHistory.length - 1], undefined);
    }
    loading = false;
    forcereload();
  });
}

/** create a new folder with the given identifier
 *
 * @param id - the id of the arc
 * @param identifier - the identifier (the name) of the new folder
 * @param path - the current path
 * @param branch - the chosen branch
 */
async function createFolder(
  id: number,
  identifier: string,
  path: string,
  branch: string
) {
  if (path == null) path = "";
  loading = true;
  forcereload();
  // send name and properties to the backend
  let response = await fetch(appProperties.backend + "fnf/createFolder", {
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
    $q.notify({
      type: "negative",
      message: errors,
    });
  } else {
    // get the updated tree
    inspectTree(id, path);

    // get the updated changes, assays and studies
    await getChanges(id, arcProperties.branch);
  }
  $q.notify({
    type: "positive",
    message: "New folder '" + identifier + "' was created successfully!",
  });
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
  permission.value = { label: "Maintainer", value: 40 };
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
    $q.notify({
      type: "negative",
      message: error.toString(),
    });
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
  permission.value = { label: "Maintainer", value: 40 };
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
    $q.notify({
      type: "negative",
      message: error.toString(),
    });
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
  if (!response.ok) {
    errors = response.statusText + ", " + data["detail"];
    $q.notify({
      type: "negative",
      message: errors,
    });
  } else $q.notify({ type: "positive", message: data });

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
  if (!response.ok) {
    errors = response.statusText + ", " + data["detail"];
    $q.notify({
      type: "negative",
      message: errors,
    });
  } else $q.notify({ type: "positive", message: data });

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
  if (!response.ok) {
    errors = response.statusText + ", " + data["detail"];
    $q.notify({
      type: "negative",
      message: errors,
    });
  } else $q.notify({ type: "positive", message: data });

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
    downloadLink.href = `${arcProperties.url.split(".git")[0]}/-/raw/${
      arcProperties.branch
    }/${path}?ref_type=heads&inline=false`;

    // start the download
    downloadLink.click();
  } catch (error: any) {
    $q.notify({
      type: "negative",
      message: error.toString(),
    });
    errors = error.toString();
  }
  loading = false;
  forcereload();
}

/** uploads the given folder to the Arc
 *
 * @param event - the input event containing all the files
 */
function uploadFolder(event: InputEvent) {
  let files: Array<File> = [];

  // if there is a valid event target, read out the files
  if (event.target) files = event.target.files;

  // set fileInput to the list of files
  fileInput.value = files;

  // upload the files with property "folder" set to true
  fileUpload(true);
}

/** views the selected tree from the breadcrumb
 *
 * @param index - the index value of the breadcrumb
 */
async function inspectTreeCrumb(index: number) {
  loading = true;
  assaySync = studySync = false;
  appProperties.showIsaView = false;
  user = -1;
  errors = "";
  showInput = false;
  showFolderInput = false;
  treePage.value = 1;
  forcereload();
  try {
    const response = await fetch(
      backend +
        `arc_path?path=${pathHistory[index + 1]}&id=${arcId}&branch=${
          arcProperties.branch
        }`,
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

    const historyLength = pathHistory.length;

    for (let i = index; i < historyLength - 2; i++) {
      pathHistory.pop();
    }
    cleanIsaView();
  } catch (error: any) {
    $q.notify({
      type: "negative",
      message: error.toString(),
    });
    errors = error.toString();
  }
  window.scrollTo(0, 0);
  loading = false;
  forcereload();
}

/** create a isa.datamap for the assay/study
 *
 */
async function addDatamap() {
  loading = true;
  forcereload();
  // send name and properties to the backend
  let response = await fetch(backend + "addDatamap", {
    credentials: "include",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      path: pathHistory[pathHistory.length - 1],
      id: arcId,
      branch: arcProperties.branch,
    }),
  });
  let data = await response.json();
  if (!response.ok) {
    errors = response.statusText + ", " + data["detail"];
    $q.notify({
      type: "negative",
      message: errors,
    });
  } else {
    // get the updated tree
    inspectTree(arcId, pathHistory[pathHistory.length - 1]);

    // get the updated changes, assays and studies
    await getChanges(arcId, arcProperties.branch);
  }

  loading = false;
  forcereload();
}

/** deletes the entire folder on the given path
 *
 * @param id - the id of the arc
 * @param path - the folder path
 * @param branch - the chosen branch
 */
async function renameFolder(id: number, path: string, branch: string) {
  // send delete request to backend
  let pathSplit = path.split("/");

  let currentPath = pathSplit.slice(0, -1).toString().replaceAll(",", "/");

  inspectTree(id, currentPath, undefined);
  // open a message window asking the user for confirmation
  $q.dialog({
    dark: appProperties.dark,
    title: "Rename " + pathSplit.slice(-1)[0],
    message: "Type in the new name for your folder (no whitespace or '/'): ",
    prompt: {
      model: "",
      isValid: (val) => val.length > 0 && !val.includes("/"),
      type: "text",
    },
    cancel: true,
  }).onOk(async (name) => {
    loading = true;
    forcereload();

    // replace whitespace and "/"
    name = name.replaceAll(" ", "_");
    name = name.replaceAll("/", "");

    // user confirmed the deletion
    console.log("Renaming folder " + path + "...");

    let newPath = "";
    if (currentPath != "") newPath = currentPath + "/" + name;
    else newPath = name;

    let response = await fetch(
      appProperties.backend +
        `fnf/renameFolder?oldPath=${path}&newPath=${newPath}&id=${id}&branch=${branch}`,
      {
        method: "PUT",
        credentials: "include",
      }
    );
    let data = await response.json();
    if (!response.ok) {
      errors = response.statusText + ", " + data["detail"];
      $q.notify({
        type: "negative",
        message: errors,
      });
    } else {
      $q.notify({ type: "positive", message: data });
      await inspectTree(arcId, currentPath, undefined);
    }
    loading = false;
    forcereload();
  });
}

/** repairs the arc with all necessary identifiers
 *
 */
async function repairArc() {
  loading = true;
  forcereload();

  let payload = {
    name: arcProperties.identifier,
    description: arcProperties.description,
    investIdentifier: arcProperties.identifier,
  };

  const response = await fetch(
    backend + "repairArc?id=" + arcId + "&branch=" + arcProperties.branch,
    {
      credentials: "include",
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  let data = await response.json();
  if (!response.ok) {
    errors = "ERROR: " + data["detail"];
    $q.notify({
      type: "negative",
      message: errors,
    });
    forcereload();
  }

  isaProperties.entries = [];

  await inspectArc(arcId);

  loading = false;
  forcereload();
}

async function validateArc() {
  loading = true;
  appProperties.showIsaView = false;
  forcereload();

  const response = await fetch(
    appProperties.backend + "validate/validateArc?id=" + arcId,
    {
      credentials: "include",
    }
  );
  let data = await response.json();
  if (!response.ok) {
    errors = "ERROR: " + data["detail"];
    $q.notify({
      type: "negative",
      message: errors,
    });
    forcereload();
  } else {
    slide.value = "structure";
    validateData = data;
    validate.value = true;
  }
  loading = false;
  forcereload();
}

/** Publishes the arc to invenio (FDAT)
 *
 *
 */
async function publishArc() {
  loading = true;
  $q.notify({ message: "This will take some time. You can continue working." });
  appProperties.arcList = true;
  forcereload();
  if (fdatAddress.value.length > 0) {
    try {
      let request = await fetch(appProperties.backend + "projects/publishArc", {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          arcName: arcProperties.identifier,
          namespace: arcNamespace.value,
          invenioPAT: fdatPAT.value,
          invenioURL: fdatAddress.value,
        }),
      });
      if (request.ok) {
        $q.notify({ message: await request.text(), type: "positive" });
      } else {
        errors = "Error publishing your ARC! Try again!";
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
  } else {
    errors = "Failed to retrieve the record ID! Please try again!";
    $q.notify({
      type: "negative",
      message: errors,
    });
  }
  loading = false;
  appProperties.arcList = true;
  fdatPAT.value = "";
  fdatAddress.value = "";
  forcereload();
}
</script>

<template>
  <!-- FETCH ARC/FILE UPLOAD BUTTON/OPEN ARC/ZIP/SYNC ASSAYS/STUDIES RELOAD MEMBER-->
  <div class="q-pa-xs row q-gutter-sm">
    <q-btn
      id="arcFetch"
      @click="
        extendedSearch ? fetchAllArcs() : fetchArcs();
        forcereload();
      "
      icon="downloading"
      dense
      ><q-tooltip>Load a list of all available Arcs</q-tooltip
      ><template v-if="!appProperties.showIsaView && appProperties.arcList"
        >Load Arcs</template
      ></q-btn
    ><q-btn
      icon="open_in_new"
      dense
      style="background-color: lightskyblue"
      v-if="arcList.length == 0 && !appProperties.loggedIn"
      @click="openGit(git.site.value)"
      ><q-tooltip>Open the datahub in a new tab</q-tooltip>Explore Git</q-btn
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
      "
      ><q-tooltip>List only your personal Arcs</q-tooltip></q-checkbox
    >
    <template v-if="arcList.length != 0">
      <q-btn-group style="max-height: 3em">
        <!-- File Upload -->
        <q-file
          :style="[
            $q.dark.isActive
              ? 'background-color: midnightblue'
              : 'background-color: lightgoldenrodyellow',
            appProperties.showIsaView ? 'max-width: 56px' : 'max-width: 150px',
            'overflow: hidden',
          ]"
          v-model="fileInput"
          dense
          borderless
          :label="appProperties.showIsaView ? '' : 'Upload File(s)'"
          multiple
          :max-file-size="
            appProperties.experimental ? '53687091200' : '10737418240'
          "
          @update:model-value="
            fileUpload();
            uploading = true;
          "
          @rejected="
            errors = appProperties.experimental
              ? 'ERROR: File too big (max. 50 GB) or too many selected!'
              : 'ERROR: File too big (max. 10 GB) or too many selected!';
            $q.notify({
              type: 'negative',
              message: errors,
            });
            forcereload();
          "
          :key="refresher"
          :loading="uploading"
          :disable="progress > 0 && progress != 1 && progress != null"
          ><template v-slot:before> <q-icon name="file_upload" /> </template
          ><q-tooltip
            >Upload one or multiple files
            <template v-if="appProperties.experimental"
              >(max. 50 Gb per file)</template
            ><template v-else>(max. 10 Gb per file)</template></q-tooltip
          ></q-file
        >
        <!-- Folder Upload -->
        <div>
          <label for="folderUp" class="customFilePicker"
            ><q-icon name="drive_folder_upload" size="md" /><span
              v-if="
                appProperties.arcList &&
                !appProperties.showIsaView &&
                windowWidth > 1520
              "
              >Upload Folder</span
            ></label
          >
          <input
            type="file"
            id="folderUp"
            webkitdirectory
            multiple
            @change="uploadFolder"
          />
          <q-tooltip>Upload a single folder</q-tooltip>
        </div>
        <!-- OPEN -->
        <q-btn
          id="open"
          @click="openArc(arcProperties.url)"
          icon="open_in_new"
          glossy
          :key="refresher + 1"
          ><template
            v-if="
              !appProperties.showIsaView &&
              appProperties.arcList &&
              windowWidth > 1520
            "
            >Open</template
          ><q-tooltip
            >Open the arc from the datahub in a new tab</q-tooltip
          ></q-btn
        >
        <!-- ZIP -->
        <q-btn icon="download" @click="getArchive(arcId)" glossy color="teal-10"
          ><template
            v-if="
              !appProperties.showIsaView &&
              appProperties.arcList &&
              windowWidth > 1520
            "
            >zip</template
          ><q-tooltip
            >Download the arc compressed as a zip file</q-tooltip
          ></q-btn
        >

        <!-- Reloads the arc -->
        <q-btn icon="refresh" @click="inspectArc(arcId)" glossy
          ><template
            v-if="
              !appProperties.showIsaView &&
              appProperties.arcList &&
              windowWidth > 1520
            "
            >Reload</template
          ><q-tooltip>Reload the content of the arc</q-tooltip></q-btn
        >
      </q-btn-group>
      <q-checkbox v-model="lfs" v-if="appProperties.experimental"
        >LFS<q-tooltip
          >Activate lfs for all your file upload</q-tooltip
        ></q-checkbox
      >
    </template>

    <!-- LOADING SPINNER --><q-spinner
      id="loader"
      size="2em"
      v-show="loading"
      :key="refresher + 4"
    ></q-spinner>
  </div>
  <div class="q-pa-xs row q-gutter-sm" v-if="arcList.length != 0">
    <q-btn-group style="max-height: 3em">
      <q-btn class="send" icon="checklist" @click="validateArc()"
        ><template
          v-if="
            !appProperties.showIsaView &&
            appProperties.arcList &&
            windowWidth > 1520
          "
          >Validate</template
        ><q-tooltip>Performs a validation check on your ARC</q-tooltip></q-btn
      ><!-- SYNC ASSAY-->
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
        ><template
          v-if="
            !appProperties.showIsaView &&
            appProperties.arcList &&
            windowWidth > 1520
          "
          >Sync Assay/Study</template
        ><q-tooltip>Sync the data of an assay to a study</q-tooltip></q-btn
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
        ><template
          v-if="
            !appProperties.showIsaView &&
            appProperties.arcList &&
            windowWidth > 1520
          "
          >Sync Study/Invest</template
        ><q-tooltip
          >Sync the data of a study to the investigation</q-tooltip
        ></q-btn
      ><!-- USER MANAGEMENT-->
      <q-btn icon="person" glossy id="user"
        ><template
          v-if="
            !appProperties.showIsaView &&
            appProperties.arcList &&
            windowWidth > 1520
          "
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
              "
            >
              <q-item-section>Add User</q-item-section>
              <q-tooltip>Add a new user to the arc</q-tooltip>
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
              "
            >
              <q-item-section>Remove User</q-item-section
              ><q-tooltip>Remove a current user of the arc</q-tooltip>
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
              "
            >
              <q-item-section>Edit User</q-item-section
              ><q-tooltip>Edit the role of a current user of the arc</q-tooltip>
            </q-item>
          </q-list> </q-menu
        ><q-tooltip>Add, edit or remove members of your arc</q-tooltip></q-btn
      ><!-- PUBLISH ARC-->
      <q-btn
        v-if="appProperties.experimental"
        id="publish"
        icon="publish"
        glossy
        @click="
          studySync = false;
          assaySync = false;
          fdat = true;
          appProperties.arcList = false;
          forcereload();
        "
        :key="refresher + 7"
        ><template
          v-if="
            !appProperties.showIsaView &&
            appProperties.arcList &&
            windowWidth > 1520
          "
          >Publish ARC</template
        ><q-tooltip>Publish your ARC to FDAT</q-tooltip></q-btn
      ></q-btn-group
    >
    <!-- VALIDATION -->
    <q-dialog v-model="validate">
      <q-carousel
        style="width: 80%"
        v-model="slide"
        transition-prev="scale"
        transition-next="scale"
        swipeable
        animated
        control-color="white"
        navigation
        padding
        arrows
        height="80%"
        width
        class="bg-primary text-white shadow-1 rounded-borders"
      >
        <!-- BASIC STRUCTURE -->
        <q-carousel-slide name="structure" class="column no-wrap flex-center"
          ><h5>Basic structure:</h5>
          <div
            class="q-mt-md text-center"
            v-if="typeof validateData.ARC_Structure === 'boolean'"
          >
            Your ARC structure is valid. It contains all necessary folders and
            files.
          </div>
          <div
            class="q-mt-md text-center"
            v-else-if="typeof validateData.ARC_Structure === 'string'"
          >
            Your ARC structure is not valid. {{ validateData.ARC_Structure }}
          </div>
        </q-carousel-slide>
        <!-- ASSAYS -->
        <q-carousel-slide name="assays" class="column no-wrap flex-center">
          <h5>Assays:</h5>
          <div class="q-pa-none text-center">
            <q-list>
              <q-item v-for="item in validateData.Assays">
                <q-item-section
                  >{{ Object.keys(item)[0]
                  }}<q-item-label
                    caption
                    v-if="typeof Object.values(item)[0] == 'string'"
                    >{{ Object.values(item)[0] }}</q-item-label
                  ></q-item-section
                >
                <q-item-section avatar>
                  <q-icon
                    v-if="typeof Object.values(item)[0] === 'boolean'"
                    name="done"
                    :color="validateData.ARC ? 'gold' : 'green'"
                /></q-item-section>
              </q-item>
            </q-list>
            <span v-if="validateData.Assays.length == 0">No assays found!</span>
          </div>
        </q-carousel-slide>
        <!-- STUDIES-->
        <q-carousel-slide name="studies" class="column no-wrap flex-center">
          <h5>Studies:</h5>
          <div class="q-pa-sm text-center">
            <span v-if="validateData.Studies.length == 0"
              >No studies found!</span
            >
            <q-list>
              <q-item v-for="item in validateData.Studies">
                <q-item-section
                  >{{ Object.keys(item)[0]
                  }}<q-item-label
                    caption
                    v-if="typeof Object.values(item)[0] == 'string'"
                    >{{ Object.values(item)[0] }}</q-item-label
                  ></q-item-section
                >
                <q-item-section
                  avatar
                  v-if="typeof Object.values(item)[0] == 'boolean'"
                >
                  <q-icon
                    name="done"
                    :color="validateData.ARC ? 'gold' : 'green'"
                  />
                </q-item-section>
              </q-item>
            </q-list>
          </div>
        </q-carousel-slide>
        <!-- INVESTIGATION -->
        <q-carousel-slide
          v-if="validateData.Investigation"
          name="investigation"
          class="column no-wrap flex-center"
        >
          <h5>Investigation:</h5>
          <div class="q-pa-none text-center">
            <!-- Identifier-->
            <q-item>
              <q-item-section>Identifier</q-item-section>
              <q-item-section avatar>
                <q-icon
                  v-if="validateData.Investigation.identifier"
                  name="done"
                  :color="validateData.ARC ? 'gold' : 'green'" />
                <q-icon v-else name="clear" color="red"
              /></q-item-section>
            </q-item>
            <!-- Title -->
            <q-item>
              <q-item-section>Title</q-item-section>
              <q-item-section avatar>
                <q-icon
                  v-if="validateData.Investigation.title"
                  name="done"
                  :color="validateData.ARC ? 'gold' : 'green'" />
                <q-icon v-else name="clear" color="red"
              /></q-item-section>
            </q-item>
            <!-- Description -->
            <q-item>
              <q-item-section>Description</q-item-section>
              <q-item-section avatar>
                <q-icon
                  v-if="validateData.Investigation.description"
                  name="done"
                  :color="validateData.ARC ? 'gold' : 'green'" />
                <q-icon v-else name="clear" color="red"
              /></q-item-section>
            </q-item>
            <!-- Contacts-->
            <q-item>
              <q-item-section>
                <q-expansion-item label="Contacts">
                  <ol>
                    <li v-for="contact in validateData.Investigation.contacts">
                      <span v-if="typeof contact === 'boolean'"
                        >Is a valid contact</span
                      ><span v-else>{{ contact }}</span>
                    </li>
                  </ol>
                </q-expansion-item></q-item-section
              >
            </q-item>
          </div>
        </q-carousel-slide>
        <q-carousel-slide
          v-if="validateData.ARC"
          name="Arc"
          class="column no-wrap flex-center"
          ><div class="q-pa-none text-center">
            <h4 class="text-gold">
              Your ARC is fully valid! <q-icon name="check" color="gold" />
            </h4>
          </div> </q-carousel-slide
      ></q-carousel>
    </q-dialog>
  </div>
  <!-- PROGRESS BAR-->
  <template v-if="progress > 0 && progress != 1 && progress != null">
    <q-linear-progress
      style="margin-top: 1em"
      :value="progress"
      :key="refresher + 5"
      color="red"
      :indeterminate="progress == 0.99"
    ></q-linear-progress>
    <p v-if="progress < 0.99">Uploading File...</p>
    <p v-else>Processing data... This may take a moment!</p>
  </template>
  <!-- HINTS FOR LFS AND EXT. SEARCH-->
  <p v-if="lfs">Note: Large file uploads may take a while!</p>
  <p v-if="extendedSearch && arcList.length == 0">
    Note: Retrieving the list of all available ARCs may take a moment!
  </p>
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
      :label="arcList.length > 0 ? 'List ARC content' : 'List ARCs/Projects'"
      :caption="
        arcList.length > 0
          ? 'List of the files and folders of the ARC'
          : 'List of ARCs and other projects from the DataHUB'
      "
      header-class="bg-grey-33"
      default-opened
    >
      <div style="display: block; margin: 0 auto; max-width: 100%">
        <q-splitter v-model="splitterModel" style="height: 100%">
          <template v-slot:before v-if="arcList.length > 0">
            <div class="q-pa-xs row">
              <q-tree
                :nodes="arcTreeList"
                dense
                accordion
                default-expand-all
                v-model:selected="selectedNode"
                @update:selected="inspectArcTree(selectedNode)"
                selected-color="primary"
                label-key="label"
                node-key="key"
              />
            </div>
          </template>

          <template v-slot:after>
            <!-- ERRORS -->
            <q-item-section v-if="errors != null">{{
              errors.slice(0, 200)
            }}</q-item-section>
            <q-separator />
            <!-- CREATE ISA -->
            <template v-if="showInput"
              ><q-btn
                icon="arrow_back"
                class="return"
                @click="
                  showInput = false;
                  forcereload();
                "
              ></q-btn>
              <span style="margin-left: 1em">Add Isa:</span>
              <q-input
                outlined
                v-model="ident"
                :rules="[
                  (val) => !val.includes(' ') || 'No whitespace allowed!',
                ]"
                label="An identifier for the isa file (e.g. GelBasedProteomicsWT)"
              />
              <q-separator></q-separator>

              <q-btn
                icon="send"
                class="send"
                @click="
                  addIsa(
                    arcId,
                    ident,
                    pathHistory[pathHistory.length - 1],
                    arcProperties.branch
                  );
                  showInput = false;
                  ident = '';
                  forcereload();
                "
                :disable="ident.length == 0"
                :key="refresher + 6"
              ></q-btn
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
                "
              ></q-btn>
              <span style="margin-left: 1em">Add Folder:</span>
              <q-input
                outlined
                v-model="identFolder"
                :rules="[
                  (val) => !val.includes(' ') || 'No whitespace allowed!',
                ]"
                label="A name for the folder"
              />
              <q-separator></q-separator>

              <q-btn
                icon="send"
                class="send"
                @click="
                  createFolder(
                    arcId,
                    identFolder,
                    pathHistory[pathHistory.length - 1],
                    arcProperties.branch
                  );
                  showFolderInput = false;
                  identFolder = '';
                  forcereload();
                "
                :disable="identFolder.length == 0"
                :key="refresher + 10"
              ></q-btn
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
              @update:model-value="(newValue:string) => sortArcs(newValue.toLowerCase())"
              :disable="list.length == 0"
              ><template v-slot:append>
                <q-icon name="search"></q-icon></template
            ></q-input>
            <!-- EXTENDED SEARCH-->
            <q-checkbox
              @click="extendedSearch ? fetchAllArcs() : fetchArcs()"
              v-model="extendedSearch"
              v-if="appProperties.loggedIn && arcList.length == 0"
              >Extended search<q-tooltip
                >Extends the search to include all ARCs available</q-tooltip
              ></q-checkbox
            >
            <!-- PATH; RETURN ARROW; CREATE ISA; CREATE DATAMAP -->
            <q-item-section
              style="padding-bottom: 2em"
              v-if="pathHistory.length > 1"
              :key="refresher + 7"
              ><q-breadcrumbs
                ><span @click="inspectArc(arcId)" style="cursor: pointer"
                  >Path:</span
                >
                <q-breadcrumbs-el
                  style="cursor: pointer"
                  @click="inspectTreeCrumb(i)"
                  v-for="(item, i) in pathHistory[pathHistory.length - 1].split(
                    '/'
                  )"
                  >{{ item }}</q-breadcrumbs-el
                >
              </q-breadcrumbs>
              <q-item
                dense
                clickable
                @click="
                  inspectTree(
                    arcId,
                    pathHistory[pathHistory.length - 2],
                    false
                  );
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
                  "
                >
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
                      >Add<q-tooltip>Create a new isa file</q-tooltip></q-btn
                    >
                  </div></q-item-section
                >
                <!-- ADD DATAMAP -->
                <q-item-section
                  side
                  v-if="
                    appProperties.experimental &&
                    (pathHistory[pathHistory.length - 2] == 'studies' ||
                      pathHistory[pathHistory.length - 2] == 'assays')
                  "
                >
                  <div class="q-gutter-xs">
                    <q-btn
                      id="add"
                      dense
                      flat
                      size="12px"
                      icon="add"
                      :disable="containsDatamap"
                      @click="
                        addDatamap();
                        forcereload();
                      "
                      >Add Datamap<q-tooltip
                        >Create a new datamap file</q-tooltip
                      ></q-btn
                    >
                  </div></q-item-section
                >
              </q-item>
            </q-item-section>
            <!-- RETURN TO ARCS BUTTON -->
            <q-item-section v-else>
              <q-item
                class="alt"
                v-if="arcList.length > 0"
                dense
                clickable
                @click="
                  arcList = [];
                  arcProperties.changes = '';
                  appProperties.showIsaView = false;
                  appProperties.arcList = true;
                  isaProperties.entries = [];
                  isaProperties.entry = [];
                  splitterModel = 0;
                  lfs = false;
                  showInput = showFolderInput = false;
                  forcereload();
                "
                ><q-item-section avatar
                  ><q-icon name="arrow_back"></q-icon
                ></q-item-section>
                <q-item-section>Return to ARCs</q-item-section>
                <q-btn
                  color="orange"
                  icon="build"
                  v-if="
                    appProperties.experimental &&
                    arcList.length == 1 &&
                    arcList[0].path == 'README.md'
                  "
                  @click="
                    repairClicked = true;
                    repairArc;
                  "
                  :disable="repairClicked"
                  >Repair Arc<q-tooltip
                    >Adds all necessary files and folders to complete the ARC
                    structure</q-tooltip
                  ></q-btn
                >
              </q-item>
            </q-item-section>
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
                  if (item.name.toLowerCase().endsWith('.pdf'))
                    fileProperties.name = item.name;
                  getFile(arcId, item.path, arcProperties.branch);
                }
              "
              :disable="checkName(item.name) || item.type == 'commit'"
            >
              <template v-if="item.type == 'tree'">
                <q-item-section avatar top
                  ><q-avatar icon="folder"></q-avatar
                ></q-item-section>
                <q-item-section
                  ><q-item-label v-if="windowWidth < 1200">{{
                    item.name.slice(0, 20)
                  }}</q-item-label>
                  <q-item-label v-else>{{
                    item.name
                  }}</q-item-label></q-item-section
                >
                <q-item-section side v-if="!checkForDeletion(item.name)">
                  <q-btn-group outline>
                    <q-btn
                      icon="drive_file_rename_outline"
                      color="gray"
                      round
                      dense
                      flat
                      @click="
                        renameFolder(arcId, item.path, arcProperties.branch)
                      "
                      ><q-tooltip>Rename the folder</q-tooltip></q-btn
                    ><q-btn
                      icon="close"
                      color="red"
                      round
                      dense
                      flat
                      @click="
                        deleteFolder(
                          arcId,
                          item.path,
                          arcProperties.branch,
                          item.name
                        )
                      "
                      ><q-tooltip>Delete the folder</q-tooltip></q-btn
                    ></q-btn-group
                  >
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
                      >Add Sheet<q-tooltip
                        >Create a new annotation sheet</q-tooltip
                      ></q-btn
                    ><q-btn
                      icon="edit"
                      class="gt-xs"
                      size="12px"
                      flat
                      dense
                      @click="getSheets(item.path, arcId, arcProperties.branch)"
                      >Edit Sheet<q-tooltip
                        >Edit a annotation sheet</q-tooltip
                      ></q-btn
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
                    icon="image"
                  ></q-avatar>
                  <q-avatar
                    v-else-if="item.name.toLowerCase().includes('.mp4')"
                    icon="movie"
                  ></q-avatar>
                  <q-avatar
                    v-else-if="item.name.toLowerCase().includes('.html')"
                    icon="html"
                  ></q-avatar
                  ><q-avatar
                    v-else-if="item.name.toLowerCase().includes('.css')"
                    icon="css"
                  ></q-avatar>
                  <q-avatar
                    v-else-if="item.name.toLowerCase().endsWith('.js')"
                    icon="javascript"
                  ></q-avatar>
                  <q-avatar
                    v-else-if="item.name.toLowerCase().includes('.zip')"
                    icon="folder_zip"
                  ></q-avatar>
                  <q-avatar
                    v-else-if="
                      item.name.toLowerCase().includes('.py') ||
                      item.name.toLowerCase().endsWith('.r')
                    "
                    icon="code"
                  ></q-avatar>
                  <q-avatar v-else icon="description"></q-avatar
                ></q-item-section>
                <q-item-section
                  ><q-item-label
                    ><template v-if="item.name.length > 60"
                      >{{ item.name.slice(0, 60) }}...</template
                    >
                    <template
                      v-else-if="
                        appProperties.showIsaView && windowWidth < 2000
                      "
                      >{{ item.name.slice(0, 25) }}...</template
                    >
                    <template v-else-if="windowWidth < 1200">
                      {{ item.name.slice(0, 40)
                      }}<template v-if="item.name.length > 40"
                        >...</template
                      ></template
                    >
                    <template v-else>{{ item.name }}</template></q-item-label
                  ></q-item-section
                >
                <q-item-section
                  side
                  v-if="!checkForDeletion(item.name.toLowerCase())"
                >
                  <q-btn
                    icon="download"
                    color="green"
                    flat
                    dense
                    @click="downloadFile(item.path)"
                    ><q-tooltip>Download the file</q-tooltip></q-btn
                  ></q-item-section
                >
                <q-item-section
                  side
                  v-if="!checkForDeletion(item.name.toLowerCase())"
                >
                  <q-btn
                    icon="cancel"
                    color="red"
                    flat
                    dense
                    round
                    @click="
                      deleteFile(
                        arcId,
                        item.path,
                        arcProperties.branch,
                        item.name
                      )
                    "
                    ><q-tooltip>Delete the file</q-tooltip></q-btn
                  ></q-item-section
                >
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
              >New Folder<q-tooltip>Create a new folder</q-tooltip></q-btn
            >
            <!-- PAGE SELECTOR-->
            <div
              class="q-pa-lg flex flex-center"
              v-if="arcList.length != 0"
              v-show="treePageMax > 1"
            >
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
                "
              />
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
                  arcProperties.branch = item.default_branch;
                  arcProperties.identifier = item.name;
                  arcProperties.description = item.description;
                  arcProperties.url = item.http_url_to_repo;
                  arcNamespace = item.path_with_namespace;
                  inspectArc(item.id);
                "
              >
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
                  <template
                    v-if="!appProperties.showIsaView || windowWidth > 1200"
                  >
                    <div
                      class="q-pa-xs q-gutter-md"
                      v-if="item.topics.length > 0"
                    >
                      <q-badge
                        outline
                        v-for="i in item.topics"
                        :color="$q.dark.isActive ? 'orange' : 'brown'"
                        >{{ i }}</q-badge
                      >
                    </div>
                    <q-item-label class="text"
                      >[{{ item.created_at }}]</q-item-label
                    >
                    <q-item-label v-if="item.description != null">
                      <template v-if="item.description.length > 200"
                        >{{ item.description.slice(0, 200) }}...</template
                      >
                      <template v-else>{{ item.description }}</template>
                    </q-item-label>
                  </template>
                  <q-item-label
                    class="text"
                    :style="
                      item.namespace.name === username
                        ? 'font-weight:bold;'
                        : ''
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
                      arcProperties.branch = item.default_branch;
                      arcProperties.identifier = item.name;
                      arcProperties.description = item.description;
                      arcProperties.url = item.http_url_to_repo;
                      arcNamespace = item.path_with_namespace;
                      inspectArc(item.id);
                    "
                    icon="expand_more"
                    :disable="!appProperties.loggedIn || item.id == 1"
                    ><q-tooltip>Expand</q-tooltip></q-btn
                  >
                </q-item-section>
              </q-item>
            </q-list>
            <!-- PAGE SELECTOR ARCS-->
            <div
              class="q-pa-lg flex flex-center"
              v-if="arcList.length == 0"
              v-show="arcsPageMax > 1"
            >
              <q-pagination
                :max="arcsPageMax"
                v-model="arcsPage"
                boundary-numbers
                :max-pages="6"
                @update:model-value="fetchArcs(arcsPage)"
              ></q-pagination></div
          ></template>
        </q-splitter>
      </div>
    </q-expansion-item>
    <!-- SYNC ASSAY TO STUDY-->
    <template v-if="assaySync"
      ><div
        class="q-pa-md"
        v-show="
          arcProperties.assays.length > 0 && arcProperties.studies.length > 0
        "
      >
        <q-btn
          icon="arrow_back"
          @click="
            assaySync = false;
            forcereload();
          "
          class="return"
        >
          Return
        </q-btn>
        <div class="q-gutter-md row">
          <q-select
            v-model="assaySelect"
            :options="arcProperties.assays"
            label="Assay"
            style="width: 200px"
          />
          <q-icon name="arrow_forward" size="48px"></q-icon>
          <q-select
            v-model="studySelect"
            :options="arcProperties.studies"
            label="Study"
            style="width: 200px"
          />
          <q-btn
            @click="
              assaySync = false;
              syncAssay(arcId, assaySelect, studySelect, arcProperties.branch);
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
          class="return"
        >
          Return
        </q-btn>
        <div class="q-gutter-md row">
          <q-select
            v-model="studySelect"
            :options="arcProperties.studies"
            label="Study"
            style="width: 200px"
          />
          <q-btn
            @click="
              studySync = false;
              syncStudy(arcId, studySelect, arcProperties.branch);
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
          class="return"
        >
          Return
        </q-btn>
        <div class="q-gutter-md row">
          <q-select
            v-model="userSelect"
            :options="userList"
            label="Users"
            style="width: 200px"
            :key="refresher + 11"
          />
          <q-select
            v-if="user != 1"
            v-model="permission"
            :options="userPermissions"
            label="Role"
            style="width: 200px"
          />
          <!-- ADD/REMOVE/EDIT USER -->
          <q-btn
            v-if="user == 0"
            @click="
              user = -1;
              addUser(arcId, userSelect, permission);
              userSelect = { label: '', value: 0 };
              permission = { label: 'Maintainer', value: 40 };
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
              permission = { label: 'Maintainer', value: 40 };
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
              permission = { label: 'Maintainer', value: 40 };
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
    <!-- PUBLISH ARC -->
    <template v-if="fdat"
      ><div class="q-pa-md">
        <q-btn
          icon="arrow_back"
          @click="
            appProperties.arcList = true;
            fdat = false;
            forcereload();
          "
          class="return"
        >
          Return
        </q-btn>
        <div class="q-gutter-md row">
          <q-input
            outlined
            v-model="fdatPAT"
            label="Personal Access token from FDAT"
            style="width: 50em"
          />
          <q-input
            outlined
            v-model="fdatAddress"
            placeholder="https://fdat.uni-tuebingen.de/uploads/xxxxx-xxxxx"
            label="Address of the record"
            style="width: 50em"
          />
          <q-btn
            @click="
              fdat = false;
              publishArc();
              forcereload();
            "
            :disable="fdatAddress.length == 0 || fdatPAT.length == 0"
            glossy
            >Publish</q-btn
          >
        </div>
      </div>
    </template>
  </q-list>
</template>

<style>
input[type="file"] {
  display: none;
}

.customFilePicker {
  border: 1px solid;
  display: inline-block;
  padding: 6px 12px;
  cursor: pointer;
}
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
  background-color: rebeccapurple;
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
