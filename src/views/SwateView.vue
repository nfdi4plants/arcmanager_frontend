<script lang="ts" setup>
import { ref } from "vue";

let backend = appProperties.backend + "projects/";

import templateProperties from "@/TemplateProperties";
import termProperties from "@/TermProperties";
import isaProperties from "@/IsaProperties";
import sheetProperties from "@/SheetProperties";
import appProperties from "@/AppProperties";

let loading = false;

let errors = "";

// if the search for terms should be extended or not
let advanced = ref(false);

// hide term columns
let hidden = ref(false);

let keyNumber = ref(0);

// the term to search for
let search = ref("");

// show the search bar for terms
let showSearch = false;

// show the building block area
let showBuildingBlock = false;

// set to true if the building block has a unit
let bbUnit = ref(false);

// the type of unit for the building block
let unitSearch = ref("");

// the type of term to be search
let searchType = "";

// ids of the rows to overwrite
let rowIds = [1];

// the accession value of the type
let searchAccession = "";

// get a list of all found terms for the given input
async function getTerms(input: string) {
  loading = true;
  appProperties.showIsaView = true;
  keyNumber.value += 1;

  // reset terms and templates to clear up IsaView
  templateProperties.templates = [];
  termProperties.terms = [];

  // get the list of terms
  const response = await fetch(
    backend +
      "getTerms?input=" +
      input +
      "&advanced=" +
      advanced.value +
      "&parentName=" +
      searchType +
      "&parentTermAccession=" +
      searchAccession
  );
  let data = await response.json();
  if (!response.ok) {
    errors = "ERROR: " + data["detail"];
  }

  // if the list of terms is empty
  if (data.length == 0) {
    termProperties.terms = [{ Name: "No Term was found!" }];
  }
  // save the list of terms
  else {
    termProperties.terms = data;
  }
  loading = false;
  keyNumber.value += 1;
}
async function saveSheet() {
  loading = true;
  keyNumber.value += 1;

  // send the content of the sheet to the backend
  const response = await fetch(backend + "saveSheet", {
    method: "PUT",
    body: JSON.stringify({
      tableHead: templateProperties.template,
      tableContent: templateProperties.content,
      path: isaProperties.path,
      id: isaProperties.repoId,
      // replace whitespace with underscores
      name: sheetProperties.name.replace(" ", "_"),
    }),
    credentials: "include",
  });
  if (!response.ok) {
    errors = "ERROR: Couldn't save Table!";
    loading = false;
  }
  // cleanup view
  templateProperties.template = templateProperties.templates = [];
  templateProperties.content = [];
  termProperties.terms = [];
  loading = false;
  keyNumber.value += 1;
}
function checkName(name: string) {
  if (
    name.startsWith("Term") ||
    name.startsWith("Unit") ||
    name.startsWith("Source Name") ||
    name.startsWith("Sample Name") ||
    name.startsWith("Input") ||
    name.startsWith("Output")
  )
    return false;
  return true;
}
function searchName(type: string) {
  if (type.includes("[")) {
    let words = type.split(" [");
    return words[1].split("]")[0];
  }
  if (type.includes("(")) {
    let words = type.split(" (");
    return words[1].split(")")[0];
  }

  return type;
}
function extendTemplate() {
  templateProperties.template.forEach((element, i) => {
    if (templateProperties.template[i].Type.toString().startsWith("Unit")) {
      templateProperties.content[i].push(templateProperties.content[i][0]);
      if (
        templateProperties.template[i - 1].Type.toString().startsWith("Term")
      ) {
        templateProperties.content[i - 1].pop();
        templateProperties.content[i - 1].push(
          templateProperties.content[i - 1][0]
        );
      }
      // add the term values for the two term columns after
      while (
        templateProperties.template[i + 1].Type.toString().startsWith("Term")
      ) {
        templateProperties.content[i + 1].push(
          templateProperties.content[i + 1][0]
        );
        i += 1;
      }
    } else {
      // skip adding an empty field if its a term column related to a unit
      if (
        !templateProperties.template[i].Type.toString().startsWith("Term") ||
        !(
          templateProperties.template[i - 1].Type.toString().startsWith(
            "Unit"
          ) ||
          templateProperties.template[i - 2].Type.toString().startsWith("Unit")
        )
      )
        templateProperties.content[i].push(null);
    }
  });
  rowIds.push(rowIds.length + 1);
  keyNumber.value += 1;
}

async function getSuggestionsByParent() {
  loading = true;
  appProperties.showIsaView = true;
  errors = "";
  keyNumber.value += 1;

  // reset terms and templates to clear up IsaView
  templateProperties.templates = [];
  termProperties.terms =
    termProperties.buildingBlocks =
    termProperties.unitTerms =
      [];
  sheetProperties.sheets = sheetProperties.names = [];

  // get the list of terms
  const response = await fetch(
    backend +
      "getTermSuggestionsByParentTerm?parentName=" +
      searchType +
      "&parentTermAccession=" +
      searchAccession
  );
  let data = await response.json();
  if (!response.ok) {
    errors = "ERROR: " + data["detail"];
  }

  // if the list of terms is empty
  if (data.length == 0) {
    termProperties.terms = [{ Name: "No Term was found!" }];
  }
  // save the list of terms
  else {
    termProperties.terms = data;
  }
  loading = false;
  keyNumber.value += 1;
}

// suggestions for the building blocks
async function getSuggestions() {
  loading = true;
  appProperties.showIsaView = true;
  errors = "";
  keyNumber.value += 1;

  // reset terms and templates to clear up IsaView
  templateProperties.templates = [];
  termProperties.terms = [];
  sheetProperties.sheets = sheetProperties.names = [];
  termProperties.unitTerms = [];

  const terms = await fetch(
    backend + "getTermSuggestions?input=" + search.value
  );

  let data = await terms.json();
  if (!terms.ok) {
    errors = "ERROR: " + data["detail"];
  }

  // if the list of terms is empty
  if (data.length == 0) {
    termProperties.buildingBlocks = [{ Name: "No Term was found!" }];
  }
  // save the list of terms
  else {
    termProperties.buildingBlocks = data;
  }
  loading = false;
  keyNumber.value += 1;
}

// suggestions for the units of building blocks
async function getUnitSuggestions() {
  loading = true;
  appProperties.showIsaView = true;
  errors = "";
  keyNumber.value += 1;

  // reset terms and templates to clear up IsaView
  templateProperties.templates = [];
  termProperties.terms = [];
  sheetProperties.sheets = sheetProperties.names = [];
  termProperties.buildingBlocks = [];

  const terms = await fetch(
    backend + "getTermSuggestions?input=" + unitSearch.value
  );
  let data = await terms.json();
  if (!terms.ok) {
    errors = "ERROR: " + data["detail"];
  }

  // if the list of terms is empty
  if (data.length == 0) {
    termProperties.unitTerms = [{ Name: "No Term was found!" }];
  }
  // save the list of terms
  else {
    termProperties.unitTerms = data;
  }
  loading = false;
  keyNumber.value += 1;
}

// fills the rowIds array with all possible row ids
function setIds() {
  rowIds = Array.from(
    { length: templateProperties.content[0].length },
    (_, i) => i + 1
  );
}
</script>

<template>
  <p :key="keyNumber">{{ errors }}</p>
  <a href="https://www.ebi.ac.uk/ols4" target="_blank">Ontology Lookup</a>
  <a
    href="https://github.com/nfdi4plants/nfdi4plants_ontology/blob/main/dpbo.obo"
    target="_blank"
    style="margin-left: 1em"
    >DataPLANT Ontology</a
  >
  <div>
    <q-scroll-area style="height: 650px; max-width: 100%" :key="keyNumber">
      <!-- Display the search area for default terms-->
      <template v-if="showSearch">
        <span>Search term:</span>
        <q-input v-model="search" :label="searchType"
          ><template v-slot:append>
            <q-icon name="search"></q-icon></template></q-input
        ><q-btn @click="getTerms(search)" :disable="search.length == 0"
          >Search</q-btn
        >
        <q-checkbox v-model="advanced">Extended search</q-checkbox>
        <q-btn
          @click="getSuggestionsByParent()"
          style="background-color: azure; margin-left: 1em"
          >Get suggestions</q-btn
        ><q-select
          v-model="templateProperties.rowId"
          :options="rowIds"
          label="select row to overwrite"
          dense
          options-dense
          style="width: 4cm"></q-select>
      </template>
      <!-- show search area for inserting a new building block-->
      <template v-else-if="showBuildingBlock">
        <span>Add building block:</span
        ><q-checkbox v-model="bbUnit">Unit?</q-checkbox>
        <q-input v-model="search" label="Search building blocks"></q-input
        ><q-btn @click="getSuggestions()" :disable="search.length == 0"
          >Search</q-btn
        >
        <q-input
          v-show="bbUnit"
          v-model="unitSearch"
          label="Search building block unit"></q-input
        ><q-btn
          v-show="bbUnit"
          @click="getUnitSuggestions()"
          :disable="unitSearch.length == 0"
          >Search unit</q-btn
        >
      </template>
      <q-separator></q-separator>
      <!-- Area for sheet naming and other options-->
      <q-input
        type="text"
        v-model="sheetProperties.name"
        placeholder="Name your sheet" />
      <q-btn
        @click="saveSheet()"
        style="background-color: bisque"
        :disable="sheetProperties.name.length == 0"
        >Save</q-btn
      ><span style="margin-left: 1em" v-if="sheetProperties.name.length == 0"
        >Please provide a name for the sheet!</span
      >
      <q-spinner
        id="loader"
        color="primary"
        size="2em"
        v-show="loading"
        :key="keyNumber"></q-spinner>
      <q-checkbox v-model="hidden">Hide Terms</q-checkbox>
      <q-btn
        icon="add"
        style="margin-left: 1em; background-color: cornsilk"
        dense
        @click="
          showBuildingBlock = true;
          search = '';
          showSearch = false;
          keyNumber += 1;
        "
        >building block</q-btn
      >
      <!-- The table to enter the values with swate is a default html table -->
      <table style="width: max-content; border-collapse: collapse">
        <thead>
          <tr>
            <!-- Each table header column is a entry in the template array -->
            <th
              v-for="(column, i) in templateProperties.template"
              v-show="!(column.Type.startsWith('Term') && hidden)">
              <!-- Input and Output columns are editable (e.g. to exchange source name to image file)-->
              <template
                v-if="
                  column.Type.startsWith('Input') ||
                  column.Type.startsWith('Output')
                "
                ><input
                  type="text"
                  style="width: 100%; height: unset; border: 0px"
                  v-model="column.Type"
              /></template>
              <!-- if there are round brackets-->
              <template v-else-if="column.Type.includes('(')">
                {{ column.Type.split("(")[0] }}<br />
                <template
                  v-if="
                    column.Type.startsWith('Term') && column.Type.includes('(')
                  "
                  ><a
                    :href="
                      'http://purl.obolibrary.org/obo/' +
                      column.Type.split('(')[1].split(')')[0]
                    "
                    style="font-size: small"
                    target="_blank"
                    >({{ column.Type.split("(")[1] }}</a
                  ></template
                >

                <template v-else
                  ><template v-if="column.Type.includes(')')">(</template
                  >{{ column.Type.split("(")[1] }}</template
                >
              </template>
              <!-- if there are no round brackets, there must be square brackets-->
              <template v-else>
                {{ column.Type.split("[")[0] }}<br /><template
                  v-if="
                    column.Type.startsWith('Term') && column.Type.includes('[')
                  ">
                  <a
                    :href="
                      'http://purl.obolibrary.org/obo/' +
                      column.Type.split('[')[1].split(']')[0]
                    "
                    style="font-size: small"
                    target="_blank"
                    >[{{ column.Type.split("[")[1] }}</a
                  ></template
                ><template v-else>
                  <template v-if="column.Type.includes(']')">[</template>
                  {{ column.Type.split("[")[1] }}</template
                >
              </template>

              <!-- if the type is neither a term accession or a unit, insert a search button -->
              <!-- also the parameter should not be of type "unit" -->
              <template v-if="checkName(column.Type)"
                ><q-btn
                  icon="search"
                  round
                  @click="
                    setIds();
                    showSearch = true;
                    showBuildingBlock = false;
                    search = '';
                    searchType = searchName(column.Type);
                    searchAccession = column.Accession;
                    templateProperties.id = i;
                    keyNumber += 1;
                  "
                  size="xs"></q-btn
              ></template>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, j) in templateProperties.content[0]">
            <!-- insert a second row containing the cell values for the headers -->
            <td
              v-for="(column, i) in templateProperties.template"
              v-show="!(column.Type.startsWith('Term') && hidden)">
              <div
                style="
                  display: flex;
                  justify-content: space-between;
                  height: 100%;
                  min-height: 35px;
                  width: 100%;
                  padding: 0.5em 0.75em;
                  align-items: center;
                ">
                <input
                  type="text"
                  style="
                    width: 100%;
                    height: unset;
                    border: 0px;
                    font-size: small;
                  "
                  v-model="templateProperties.content[i][j]" />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <q-btn icon="add" @click="extendTemplate()">Extend</q-btn>
    </q-scroll-area>
  </div>
</template>
<style>
td,
th {
  border: 1px solid;
  padding: 1px;
  font-size: small;
}
</style>
