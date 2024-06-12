<script lang="ts" setup>
import appProperties from "@/AppProperties";
import isaProperties from "@/IsaProperties";
import { ref } from "vue";

var backend = appProperties.backend + "projects/";

var loading = false;

class ArcSearch {
  datahub: string;
  id: number;
  name: string;
  description: string;
  topics: Array<string>;
  author: { name: string; username: string };
  created_at: string;
  last_activity: string;
  license?: {
    key: string;
    name: string;
    nickname?: string;
    html_url: string;
    source_url?: string;
  };
  assay_study_relation: {};
  identifier: string;
  url: string;

  constructor(
    datahub: string,
    created_at: string,
    description: string,
    id: number,
    last_activity: string,
    name: string,
    topics: Array<string>,
    author: { name: string; username: string },
    identifier: string,
    url: string,
    assay_study_relation: {},
    license?: {
      key: string;
      name: string;
      nickname?: string;
      html_url: string;
      source_url?: string;
    }
  ) {
    this.created_at = created_at;
    this.description = description;
    this.id = id;
    this.last_activity = last_activity;
    this.name = name;
    this.topics = topics;
    this.datahub = datahub;
    this.author = author;
    this.identifier = identifier;
    this.url = url;
    this.assay_study_relation = assay_study_relation;
    this.license = license;
  }
}
// field for searchbar
var search = ref("");

var sort = ref("datahub");

var arcJson: Array<ArcSearch> = [];

// the filtered list, that will be displayed
var searchList: Array<ArcSearch> = [];

/** send the updated entry fields to the backend to save and commit the update
 *
 */
async function getArcJson() {
  loading = true;
  keyNumber.value += 1;

  arcJson = [];
  searchList = [];

  const arcJsonData = await fetch(backend + "getArcJson");

  if (!arcJsonData.ok) {
    errors = "ERROR: " + arcJsonData.statusText;
    keyNumber.value += 1;
  } else {
    arcJson = await arcJsonData.json();
    searchList = arcJson.concat([]);

    sortList("datahub");
  }
  loading = false;
  keyNumber.value += 1;
}

/** sort the arcList to include only the arcs containing the searchTerm
 *
 * @param searchTerm - the term to search the arcs for (id, name, tags, ...)
 */
function sortArcs(searchTerm: string) {
  searchList = [];
  searchTerm = searchTerm.replace("ü", "ue");
  arcJson.forEach((element) => {
    // craft the string to search in including the name of the arc, the creators name, the id and the topics of the arc
    let searchString = `${element.name.toLowerCase()} ${element.id} ${
      element.datahub
    } ${element.topics
      .toString()
      .toLowerCase()} ${element.author.name.toLowerCase()}`;
    if (searchString.includes(searchTerm.toLowerCase())) {
      searchList.push(element);
    }
  });
  keyNumber.value += 1;
}

/** opens the url of the arc in a new tab
 *
 * @param url - the full url of the arc
 */
const openArc = (url: string) => {
  window.open(url);
};

function sortList(term: "datahub" | "name" | "id" | "author") {
  let x: string | number = "";
  let y: string | number = "";

  searchList = arcJson.concat([]);
  sortArcs(search.value);
  searchList.sort(function (a, b) {
    switch (term) {
      case "datahub":
      case "name":
        x = a[term].toLowerCase();
        y = b[term].toLowerCase();
        break;
      case "id":
        x = a.id;
        y = b.id;
        break;
      case "author":
        x = a.author.name.toLowerCase();
        y = b.author.name.toLowerCase();
        break;
    }
    if (x < y) {
      return -1;
    }
    if (x > y) {
      return 1;
    }
    return 0;
  });

  keyNumber.value += 1;
}
let errors = "";

let keyNumber = ref(0);

getArcJson();
</script>

<template>
  <p :key="keyNumber">{{ errors }}</p>
  {{ isaProperties.entry[0] }}
  <q-spinner
    id="loader"
    size="2em"
    v-show="loading"
    :key="keyNumber"></q-spinner>
  <q-input
    v-model="search"
    label="Search"
    value="name"
    @update:model-value="(newValue:string) => sortArcs(newValue.toLowerCase())"
    :disable="arcJson.length == 0"
    ><template v-slot:append> <q-icon name="search"></q-icon></template
  ></q-input>
  <div class="q-gutter-sm">
    <span>Sort by:</span>
    <q-radio
      v-model="sort"
      val="datahub"
      label="Datahub"
      @update:model-value="sortList('datahub')" />
    <q-radio
      v-model="sort"
      val="name"
      label="Name"
      @update:model-value="sortList('name')" />
    <q-radio
      v-model="sort"
      val="id"
      label="Id"
      @update:model-value="sortList('id')" />
    <q-radio
      v-model="sort"
      val="author"
      label="Author"
      @update:model-value="sortList('author')" />
  </div>
  <q-btn @click="getArcJson">Get</q-btn>
  <q-markup-table
    wrap-cells
    bordered
    separator="cell"
    flat
    v-if="searchList.length > 0"
    :key="keyNumber">
    <thead>
      <tr>
        <th>Datahub</th>
        <th>Name</th>
        <th>Id</th>
        <th>Author</th>
        <th>Description</th>
        <th>Identifier</th>
        <th>License</th>
        <th>Study-Assay Relation</th>
        <th>Created at</th>
        <th>Last Activity</th>
      </tr>
    </thead>
    <tbody>
      <tr
        v-for="entry in searchList"
        @click="openArc(entry.url)"
        style="cursor: pointer">
        <td>{{ entry.datahub }}</td>
        <td>{{ entry.name }}</td>
        <td>{{ entry.id }}</td>
        <td>{{ entry.author.name }} ({{ entry.author.username }})</td>
        <td>{{ entry.description }}</td>
        <td>{{ entry.identifier }}</td>
        <td>{{ entry.license?.name }}</td>
        <td>
          <p
            v-for="study in Object.keys(entry.assay_study_relation)"
            style="font-size: small">
            {{ study }}: {{ entry.assay_study_relation[study] }}
          </p>
        </td>

        <td>{{ entry.created_at }}</td>
        <td>{{ entry.last_activity }}</td>
      </tr>
    </tbody>
  </q-markup-table>
</template>
