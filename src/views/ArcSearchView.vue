<script lang="ts" setup>
import appProperties from "@/AppProperties";
import isaProperties from "@/IsaProperties";
import { useQuasar } from "quasar";
import { ref } from "vue";

const $q = useQuasar();

var backend = appProperties.backend + "search/";

var loading = false;

class Contact {
  "Investigation Person Last Name": string;
  "Investigation Person First Name": string;
  "Investigation Person Mid Initials"?: string;
  "Investigation Person Email"?: string;
  "Investigation Person Phone"?: string | number;
  "Investigation Person Fax"?: string;
  "Investigation Person Address"?: string;
  "Investigation Person Affiliation"?: string;
  "Investigation Person Roles"?: string;
  "Investigation Person Term Accession Number"?: string;
  "Investigation Person Term Source REF"?: string;

  constructor(
    lastName: string,
    firstName: string,
    midInitials?: string,
    email?: string,
    phone?: string | number,
    fax?: string,
    address?: string,
    affiliation?: string,
    roles?: string,
    rolesTan?: string,
    rolesREF?: string
  ) {
    this["Investigation Person Last Name"] = lastName;
    this["Investigation Person First Name"] = firstName;
    this["Investigation Person Mid Initials"] = midInitials;
    this["Investigation Person Email"] = email;
    this["Investigation Person Phone"] = phone;
    this["Investigation Person Fax"] = fax;
    this["Investigation Person Address"] = address;
    this["Investigation Person Affiliation"] = affiliation;
    this["Investigation Person Roles"] = roles;
    this["Investigation Person Term Accession Number"] = rolesTan;
    this["Investigation Person Term Source REF"] = rolesREF;
  }
}

class Publication {
  "Investigation Publication PubMed ID"?: number | string;
  "Investigation Publication DOI": string;
  "Investigation Publication Author List"?: string;
  "Investigation Publication Title": string;
  "Investigation Publication Status"?: string;
  "Investigation Publication Status Term Accession Number"?: string;
  "Investigation Publication Status Term Source REF"?: string;

  constructor(
    doi: string,
    title: string,
    pubMedID?: number | string,
    authors?: string,
    status?: string,
    statusTan?: string,
    statusREF?: string
  ) {
    this["Investigation Publication PubMed ID"] = pubMedID;
    this["Investigation Publication DOI"] = doi;
    this["Investigation Publication Author List"] = authors;
    this["Investigation Publication Title"] = title;
    this["Investigation Publication Status"] = status;
    this["Investigation Publication Status Term Accession Number"] = statusTan;
    this["Investigation Publication Status Term Source REF"] = statusREF;
  }
}

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
  contacts: Array<Contact>;
  publications: Array<Publication>;

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
    contacts: [],
    publications: [],
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
    this.contacts = contacts;
    this.publications = publications;
    this.license = license;
  }
}
// field for searchbar
var search = ref("");

var sort = ref("datahub");

var card = ref(false);

var tab = ref("desc");

var cardArc: ArcSearch;

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
    $q.notify({
      type: "negative",
      message: errors,
    });
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
    console.log(element);
    // craft the string to search in including the name of the arc, the creators name, the id and the topics of the arc
    let searchString = `${element.name.toLowerCase()}
    ${element.id}
    ${element.datahub}
    ${element.topics.toString().toLowerCase()}
    ${element.author.name.toLowerCase()}
    ${element.author.username.toLowerCase()}`;
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

function sortList(term: "datahub" | "name" | "id" | "author" | "activity") {
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
        x = b.id;
        y = a.id;
        break;
      case "author":
        x = a.author.name.toLowerCase();
        y = b.author.name.toLowerCase();
        break;
      case "activity":
        x = b.last_activity;
        y = a.last_activity;
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

/** opens a card when you click on an Arc
 *
 * @param name - name of the arc
 * @param id - id of the arc
 */
function openCard(name: string, id: number) {
  let selectedArc = searchList.find(
    (item) => item.name === name && item.id === id
  );

  if (selectedArc) {
    cardArc = selectedArc;
    tab.value = "desc";

    card.value = true;
  }
}

/** download the json containing the data about the arcs
 *
 */
async function downloadJson() {
  let searchJson = await fetch(backend + "getArcJson");

  if (!searchJson.ok) {
    errors = "ERROR: " + searchJson.json();
    $q.notify({
      type: "negative",
      message: errors,
    });
    keyNumber.value += 1;
  } else {
    const url = window.URL.createObjectURL(await searchJson.blob());
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;

    a.download = "searchableArcs.json";
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
  }
}
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
    <q-radio
      v-model="sort"
      val="activity"
      label="Activity"
      @update:model-value="sortList('activity')" />
  </div>
  <q-btn
    @click="
      getArcJson();
      sort = 'datahub';
    "
    class="return"
    >Get</q-btn
  >
  <q-btn
    icon="download"
    @click="downloadJson"
    dense
    class="send"
    style="margin-left: 1em"
    >Json</q-btn
  >
  <q-markup-table
    wrap-cells
    bordered
    dense
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
        @click="openCard(entry.name, entry.id)"
        style="cursor: pointer">
        <td>{{ entry.datahub }}</td>
        <td>
          {{ entry.name.slice(0, 50) }}
          <template v-if="entry.name.length > 50">...</template>
        </td>
        <td>{{ entry.id }}</td>
        <td>{{ entry.author.name }} ({{ entry.author.username }})</td>
        <td v-if="entry.description">
          {{ entry.description.slice(0, 100)
          }}<template v-if="entry.description.length > 100">...</template>
        </td>
        <td v-else>{{ entry.description }}</td>
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
  <q-dialog v-model="card">
    <q-card style="width: 700px; max-width: 80vw">
      <q-item>
        <q-item-section>
          <q-item-label
            :style="cardArc.name.length > 30 ? 'font-size: small' : ''"
            >{{ cardArc.name }}</q-item-label
          >
          <q-item-label caption>
            {{ cardArc.datahub }}, ID: {{ cardArc.id }}
          </q-item-label>
        </q-item-section>
        <q-item-section style="padding-left: 15em">
          <q-item-label>by {{ cardArc.author.name }}</q-item-label>
          <q-item-label caption>({{ cardArc.author.username }})</q-item-label>
        </q-item-section>
      </q-item>

      <q-separator />

      <q-card-section horizontal>
        <q-card-section
          ><q-item-label caption class="caption"> created at: </q-item-label>
          {{ cardArc.created_at }}
        </q-card-section>

        <q-separator vertical />

        <q-card-section class="col-4">
          <q-item-label caption class="caption">
            last activity at:
          </q-item-label>
          {{ cardArc.last_activity }} </q-card-section
        ><q-item-section side style="padding-left: 10%">
          Open ARC:
          <q-btn
            icon="open_in_new"
            color="light-blue"
            @click="openArc(cardArc.url)"></q-btn>
        </q-item-section> </q-card-section
      ><q-separator />
      <q-tabs v-model="tab" class="text-teal">
        <q-tab label="Description" name="desc" />
        <q-tab label="Assay-Study Relations" name="assayStudy" />
        <q-tab
          label="Contacts"
          name="contacts"
          v-show="cardArc.contacts.length > 0" />
        <q-tab
          label="Publications"
          name="publications"
          v-show="cardArc.publications.length > 0" />
      </q-tabs>

      <q-separator />

      <q-tab-panels v-model="tab" animated>
        <q-tab-panel name="desc">
          {{ cardArc.description }}
          <span v-if="cardArc.description == '' || cardArc.description == null"
            >No description available!</span
          >
        </q-tab-panel>

        <q-tab-panel name="assayStudy">
          <q-markup-table
            wrap-cells
            bordered
            separator="cell"
            flat
            :key="keyNumber">
            <thead>
              <th>Study</th>
              <th>Assays</th>
            </thead>
            <tbody>
              <tr v-for="study in Object.keys(cardArc.assay_study_relation)">
                <td>{{ study }}</td>
                <td>
                  <ul>
                    <li
                      v-for="assay in cardArc.assay_study_relation[study]"
                      style="font-size: small">
                      {{ assay }}
                    </li>
                  </ul>
                </td>
              </tr>
            </tbody>
          </q-markup-table>
        </q-tab-panel>
        <q-tab-panel name="contacts">
          <q-list bordered>
            <q-item
              v-for="contact in cardArc.contacts"
              class="q-my-sm"
              v-ripple="false">
              <q-item-section>
                <q-item-label
                  >{{ contact["Investigation Person First Name"] }}
                  <template
                    v-if="contact['Investigation Person Mid Initials']"
                    >{{
                      contact["Investigation Person Mid Initials"]
                    }}</template
                  >
                  {{ contact["Investigation Person Last Name"] }}</q-item-label
                >
                <q-item-label caption lines="1">{{
                  contact["Investigation Person Email"]
                }}</q-item-label>
                <q-item-label
                  caption
                  lines="1"
                  v-if="contact['Investigation Person Roles']"
                  >{{ contact["Investigation Person Roles"] }}</q-item-label
                >
              </q-item-section>

              <q-item-section>
                <q-item-label>{{
                  contact["Investigation Person Affiliation"]
                }}</q-item-label>
                <q-item-label v-if="contact['Investigation Person Address']">{{
                  contact["Investigation Person Address"]
                }}</q-item-label>
                <q-item-label
                  caption
                  lines="1"
                  v-if="contact['Investigation Person Phone']"
                  >Phone:
                  {{ contact["Investigation Person Phone"] }}</q-item-label
                >
              </q-item-section>
            </q-item>
          </q-list>
        </q-tab-panel>
        <q-tab-panel name="publications">
          <q-list bordered>
            <q-item
              v-for="publication in cardArc.publications"
              class="q-my-sm"
              v-ripple="false">
              <q-item-section>
                <q-item-label>{{
                  publication["Investigation Publication Title"]
                }}</q-item-label>
                <q-item-label
                  caption
                  lines="1"
                  v-if="publication['Investigation Publication PubMed ID']"
                  >PubMed ID:
                  {{
                    publication["Investigation Publication PubMed ID"]
                  }}</q-item-label
                >
                <q-item-label
                  caption
                  lines="1"
                  v-if="publication['Investigation Publication Status']"
                  >Status:
                  {{
                    publication["Investigation Publication Status"]
                  }}</q-item-label
                >
              </q-item-section>

              <q-item-section>
                <q-item-label>{{
                  publication["Investigation Publication Author List"]
                }}</q-item-label>
                <q-item-label
                  v-if="publication['Investigation Publication DOI']">
                  <a
                    v-if="
                      publication['Investigation Publication DOI'].startsWith(
                        'http'
                      )
                    "
                    :href="publication['Investigation Publication DOI']"
                    target="_blank"
                    >{{ publication["Investigation Publication DOI"] }}</a
                  >
                  <a
                    v-else-if="
                      publication['Investigation Publication DOI'].startsWith(
                        '10.'
                      )
                    "
                    :href="
                      'https://doi.org/' +
                      publication['Investigation Publication DOI']
                    "
                    target="_blank"
                    >{{ publication["Investigation Publication DOI"] }}</a
                  >
                  <template v-else>{{
                    publication["Investigation Publication DOI"]
                  }}</template>
                </q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-tab-panel>
      </q-tab-panels>
    </q-card>
  </q-dialog>
</template>
<style>
.body--light .caption {
  color: black;
}

.body--dark .caption {
  color: white;
}
</style>
