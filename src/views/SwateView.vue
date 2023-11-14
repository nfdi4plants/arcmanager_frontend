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

let keyNumber = ref(0);

// the term to search for
let search = ref("");

// show the search bar
let showSearch = false;

// the type of term to be search
let searchType = "";

// the accession value of the type
let searchAccession = "";

// get a list of all found terms for the given input
async function getTerms(input: string) {
  loading = true;
  keyNumber.value += 1;

  // reset terms and templates to clear up IsaView
  templateProperties.templates = [];
  termProperties.terms = [];

  // get the list of terms
  const response = await fetch(
    backend + "getTerms?input=" + input + "&advanced=" + advanced.value,
    {
      method: "POST",
      body: JSON.stringify({
        parent_name: searchType,
        parent_accession: searchAccession,
      }),
    }
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
    method: "POST",
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
    name.startsWith("Sample Name")
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
    } else {
      if (templateProperties.template[i].Type.toString().startsWith("Term")) {
        templateProperties.content[i].push(templateProperties.content[i][0]);
      } else {
        templateProperties.content[i].push(null);
      }
    }
  });
}

async function getSuggestions() {
  loading = true;
  keyNumber.value += 1;

  // reset terms and templates to clear up IsaView
  templateProperties.templates = [];
  termProperties.terms = [];
  sheetProperties.sheets = sheetProperties.names = [];

  // get the list of terms
  const response = await fetch(backend + "getTermSuggestions", {
    method: "POST",
    body: JSON.stringify({
      parent_name: searchType,
      parent_accession: searchAccession,
    }),
  });
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
</script>

<template>
  <p :key="keyNumber">{{ errors }}</p>
  <div>
    <q-scroll-area style="height: 800px; max-width: 100%" :key="keyNumber">
      <!-- The table to enter the values with swate is a default html table -->
      <template v-if="showSearch">
        <q-input v-model="search" :label="searchType"
          ><template v-slot:append>
            <q-icon name="search"></q-icon></template></q-input
        ><q-btn @click="getTerms(search)" :disable="search.length == 0"
          >Search</q-btn
        >
        <q-checkbox v-model="advanced">Extended search</q-checkbox>
        <q-btn @click="getSuggestions()">Get suggestions</q-btn>
      </template>
      <q-input
        type="text"
        v-model="sheetProperties.name"
        placeholder="Name your Sheet" />
      <q-btn
        @click="saveSheet()"
        style="background-color: bisque"
        :disable="sheetProperties.name.length == 0"
        >Save</q-btn
      >
      <q-spinner
        id="loader"
        color="primary"
        size="2em"
        v-show="loading"
        :key="keyNumber"></q-spinner>
      <table style="width: max-content; border-collapse: collapse">
        <thead>
          <tr>
            <!-- Each table header column is a entry in the template array -->
            <th v-for="(column, i) in templateProperties.template">
              {{ column.Type }}
              <!-- if the type is neither a term accession or a unit, insert a search button -->
              <template v-if="checkName(column.Type)"
                ><q-btn
                  @click="
                    showSearch = true;
                    searchType = searchName(column.Type);
                    searchAccession = column.Accession;
                    templateProperties.id = i;
                    keyNumber += 1;
                  "
                  >search</q-btn
                ></template
              >
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, j) in templateProperties.content[0]">
            <!-- insert a second row containing the cell values for the headers -->
            <td v-for="(column, i) in templateProperties.template">
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
                  style="width: 100%; height: unset; border: 0px"
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
  padding: 10px;
}
</style>
