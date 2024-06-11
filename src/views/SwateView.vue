<script lang="ts" setup>
import { ref } from "vue";

import { useQuasar } from "quasar";
import { templateProperties } from "@/TemplateProperties";
import { Term, termProperties } from "@/TermProperties";
import isaProperties from "@/IsaProperties";
import sheetProperties from "@/SheetProperties";
import appProperties from "@/AppProperties";
import arcProperties from "@/ArcProperties";

var backend = appProperties.backend + "tnt/";
var loading = false;

const $q = useQuasar();

var errors = "";

// if the search for terms should be extended or not
var advanced = ref(false);

// hide term columns
var hidden = ref(true);

const parameterOptions: ReadonlyArray<string> = [
  "Parameter",
  "Factor",
  "Characteristic",
  "Component",
  "Date",
  "Performer",
  "Protocol",
];

var keyNumber = ref(0);

// the term to search for
var search = ref("");

// show the search bar for terms
var showSearch = false;

// show the building block area
var showBuildingBlock = false;

// set to true if the building block has a unit
var bbUnit = ref(false);

// the type of unit for the building block
var unitSearch = ref("");

// the type of term to be searched for
var searchType = "";

// the accession value of the type
var searchAccession = "";

/** get a list of all found terms for the given input
 *
 * @param input - the input to search for
 */
async function getTerms(input: string) {
  loading = true;
  appProperties.showIsaView = true;
  keyNumber.value += 1;

  // reset terms and templates to clear up IsaView
  templateProperties.templates = [];
  termProperties.terms = [];

  // get the list of terms
  const response = await fetch(
    `${backend}getTerms?input=${input}&advanced=${advanced.value}&parentName=${searchType}&parentTermAccession=${searchAccession}`
  );
  let data = await response.json();
  if (!response.ok) {
    errors = "ERROR: " + data["detail"];
  } else {
    // if the list of terms is empty
    if (data["terms"].length == 0) {
      termProperties.terms = [
        new Term("", "No Term was found!", "", false, ""),
      ];
    }
    // save the list of terms
    else {
      termProperties.terms = data["terms"];
      templateProperties.rowId = sheetProperties.rowIds.length;
    }
  }
  loading = false;
  keyNumber.value += 1;
}

/** save the current content of the sheet back to the isa file
 *
 */
async function saveSheet() {
  loading = true;
  keyNumber.value += 1;

  // send the content of the sheet to the backend
  const response = await fetch(backend + "saveSheet", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tableHead: templateProperties.template,
      tableContent: templateProperties.content,
      path: isaProperties.path,
      id: isaProperties.repoId,
      // replace whitespace with underscores
      name: sheetProperties.name.replace(" ", "_"),
      branch: arcProperties.branch,
    }),
    credentials: "include",
  });
  if (!response.ok) {
    errors = "ERROR: Couldn't save Table!";
    loading = false;
  }
  // cleanup view
  templateProperties.template = [];
  templateProperties.templates = [];
  templateProperties.content = [[]];
  termProperties.terms = [];
  loading = false;
  appProperties.arcList = true;
  appProperties.showIsaView = false;
  keyNumber.value += 1;
}

/** returns false if the column starts with one of the names
 *
 * @param name - the name of the column
 */
function checkName(name: string) {
  return !(
    name.startsWith("Term") ||
    name.startsWith("Unit") ||
    name.startsWith("Source Name") ||
    name.startsWith("Sample Name") ||
    name.startsWith("Input") ||
    name.startsWith("Output")
  );
}

/** returns the value inside of the brackets
 *
 * @param type - the content of the column (like Unit, Term source ref, ...)
 */
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

/** adds an extra row to the sheet (fills out unit cells automatically)
 *
 */
function extendTemplate() {
  // extend each column by a new cell
  templateProperties.template.forEach((element, i) => {
    // if the column is a unit, fill the new cell with the name of the unit
    if (templateProperties.template[i].Type.startsWith("Unit")) {
      templateProperties.content[i].push(templateProperties.content[i][0]);
      if (templateProperties.template[i - 1].Type.startsWith("Term")) {
        templateProperties.content[i - 1].pop();
        templateProperties.content[i - 1].push(
          templateProperties.content[i - 1][0]
        );
      }
      // add the term values for the two (or more) term columns after
      while (templateProperties.template[i + 1].Type.startsWith("Term")) {
        templateProperties.content[i + 1].push(
          templateProperties.content[i + 1][0]
        );
        i += 1;
      }
    } else {
      // skip adding an empty field if its a term column related to a unit
      if (
        !templateProperties.template[i].Type.startsWith("Term") ||
        !(
          templateProperties.template[i - 1].Type.startsWith("Unit") ||
          templateProperties.template[i - 2].Type.startsWith("Unit")
        )
      )
        templateProperties.content[i].push("");
    }
  });
  sheetProperties.rowIds.push(sheetProperties.rowIds.length);
  templateProperties.rowId = sheetProperties.rowIds.length;
  keyNumber.value += 1;
}

/** get suggestion terms based on the given parent term
 *
 */
async function getSuggestionsByParent() {
  loading = true;
  errors = "";
  keyNumber.value += 1;

  // reset terms and templates to clear up IsaView
  templateProperties.templates = [];
  termProperties.terms = [];
  termProperties.buildingBlocks = [];
  termProperties.unitTerms = [];
  sheetProperties.sheets = sheetProperties.names = [];

  // get the list of terms
  const response = await fetch(
    `${backend}getTermSuggestionsByParentTerm?parentName=${searchType}&parentTermAccession=${searchAccession}`
  );
  let data = await response.json();
  if (!response.ok) {
    errors = "ERROR: " + data["detail"];
  } else {
    appProperties.showIsaView = true;
    // if the list of terms is empty
    if (data["terms"].length == 0) {
      termProperties.terms = [
        new Term("", "No Term was found!", "", false, ""),
      ];
    }
    // save the list of terms
    else {
      termProperties.terms = data["terms"];
      templateProperties.rowId = sheetProperties.rowIds.length;
    }
  }
  loading = false;
  keyNumber.value += 1;
}

/** suggestions for the building blocks
 *
 */
async function getSuggestions() {
  loading = true;
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
  } else {
    appProperties.showIsaView = true;
    // if the list of terms is empty
    if (data["terms"].length == 0) {
      termProperties.buildingBlocks = [
        new Term("", "No Term was found!", "", false, ""),
      ];
    }
    // save the list of terms
    else {
      termProperties.buildingBlocks = data["terms"];
    }
  }
  loading = false;
  keyNumber.value += 1;
}

/** suggestions for the units of building blocks
 *
 */
async function getUnitSuggestions() {
  loading = true;
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
  } else {
    appProperties.showIsaView = true;
    // if the list of terms is empty
    if (data["terms"].length == 0) {
      termProperties.unitTerms = [
        new Term("", "No Term was found!", "", false, ""),
      ];
    }
    // save the list of terms
    else {
      termProperties.unitTerms = data["terms"];
    }
  }
  loading = false;
  keyNumber.value += 1;
}

/** deletes the chosen column including the terms and unit column
 *
 * @param columnType - the full name of the column header
 */
function deleteColumn(columnType: string) {
  $q.dialog({
    dark: appProperties.dark,
    title: "Delete " + columnType.split(" ")[0],
    message: "Are you sure you want to delete the column '" + columnType + "'?",
    cancel: true,
  }).onOk(() => {
    // user confirmed the deletion
    console.log("Deleting " + columnType + "...");
    console.log(templateProperties.template);

    let columnIndex = templateProperties.template.findIndex(
      (element) => element.Type == columnType
    );
    let counter = 0;
    templateProperties.template.splice(columnIndex, 1);
    templateProperties.content.splice(columnIndex, 1);

    while (
      counter < 3 &&
      (templateProperties.template[columnIndex].Type.startsWith("Term") ||
        templateProperties.template[columnIndex].Type.startsWith("Unit"))
    ) {
      templateProperties.template.splice(columnIndex, 1);
      templateProperties.content.splice(columnIndex, 1);
      counter++;
    }
    $q.notify("Successfully deleted the column " + columnType + " !");
    keyNumber.value += 1;
  });
}

/** deletes the chosen row
 *
 * @param rowIndex - the full name of the column header
 */
function deleteRow(rowIndex: number) {
  $q.dialog({
    dark: appProperties.dark,
    title: "Delete row " + (rowIndex + 1),
    message: "Are you sure you want to delete row " + (rowIndex + 1) + "?",
    cancel: true,
  }).onOk(() => {
    for (let i = 0; i < templateProperties.content.length; i++) {
      templateProperties.content[i].splice(rowIndex, 1);
    }
    $q.notify("Successfully deleted the row " + (rowIndex + 1) + " !");

    // if the current row selection is out of range, set it to the new last entry
    if (templateProperties.rowId > sheetProperties.rowIds.length - 1)
      templateProperties.rowId = sheetProperties.rowIds.pop() - 1;
    else sheetProperties.rowIds.pop();
    keyNumber.value += 1;
  });
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
    <q-scroll-area style="height: 1000px; max-width: 100%" :key="keyNumber">
      <!-- Display the search area for default terms-->
      <template v-if="showSearch">
        <span>Search term:</span>
        <q-input v-model="search" :label="searchType" style="width: 20%"
          ><template v-slot:append>
            <q-icon name="search"></q-icon></template></q-input
        ><q-btn @click="getTerms(search)" :disable="search.length == 0"
          >Search</q-btn
        >
        <q-checkbox v-model="advanced"
          >Extended search<q-tooltip
            >Search for any term containing the name</q-tooltip
          ></q-checkbox
        >
        <q-btn id="suggestion" @click="getSuggestionsByParent()"
          >Get suggestions<q-tooltip
            >Get fitting suggestions for the parent term</q-tooltip
          ></q-btn
        >
      </template>
      <!-- show search area for inserting a new building block-->
      <template v-else-if="showBuildingBlock">
        <span>Add building block:</span
        ><q-checkbox v-model="bbUnit"
          >Unit?<q-tooltip
            >Add a unit to the building block</q-tooltip
          ></q-checkbox
        >
        <div class="q-gutter-md row">
          <q-select
            style="width: 10%"
            outlined
            v-model="termProperties.parameterType"
            :options="parameterOptions"
            label="Parameter Type" />
        </div>
        <q-input
          v-model="search"
          label="Search building blocks"
          style="width: 10%"></q-input
        ><q-btn @click="getSuggestions()" :disable="search.length == 0"
          >Search</q-btn
        >

        <q-input
          v-show="bbUnit"
          style="width: 10%"
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
        style="width: 10%"
        label="Sheet name"
        v-model="sheetProperties.name"
        placeholder="Name your sheet" />
      <q-btn
        class="sheet"
        @click="saveSheet()"
        :disable="sheetProperties.name.length == 0"
        >Save<q-tooltip>Save the sheet and go back to the arc</q-tooltip></q-btn
      ><span style="margin-left: 1em" v-if="sheetProperties.name.length == 0"
        >Please provide a name for the sheet!</span
      >
      <q-spinner
        id="loader"
        size="2em"
        v-show="loading"
        :key="keyNumber"></q-spinner>
      <q-checkbox v-model="hidden"
        >Hide Terms<q-tooltip>Hide the term columns</q-tooltip></q-checkbox
      >
      <q-btn
        class="sheet"
        style="margin-left: 1em"
        icon="add"
        dense
        @click="
          showBuildingBlock = !showBuildingBlock;
          search = '';
          showSearch = false;
          keyNumber += 1;
        "
        >building block<q-tooltip>Create a new building block</q-tooltip></q-btn
      >
      <!-- The table to enter the values with swate is a default html table -->
      <q-markup-table
        style="width: max-content; border-collapse: collapse"
        separator="cell"
        dense>
        <thead>
          <tr q-tr--no-hover>
            <!-- Each table header column is a entry in the template array -->
            <th style="width: 1em; al"></th>
            <th
              v-for="(column, i) in templateProperties.template"
              v-show="!(column.Type.startsWith('Term') && hidden)"
              style="width: 13em">
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
                <q-btn
                  v-if="
                    !column.Type.startsWith('Term') &&
                    !column.Type.startsWith('Unit')
                  "
                  size="xs"
                  icon="close"
                  color="red"
                  round
                  dense
                  flat
                  @click="deleteColumn(column.Type)"
                  ><q-tooltip>Delete the column</q-tooltip></q-btn
                >
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
                <q-btn
                  v-if="
                    !column.Type.startsWith('Term') &&
                    !column.Type.startsWith('Unit')
                  "
                  size="xs"
                  icon="close"
                  color="red"
                  round
                  dense
                  flat
                  @click="deleteColumn(column.Type)"
                  ><q-tooltip>Delete the column</q-tooltip></q-btn
                >
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
                    showSearch = true;
                    showBuildingBlock = false;
                    search = '';
                    searchType = searchName(column.Type);
                    if (column.Accession) searchAccession = column.Accession;
                    templateProperties.id = i;
                    keyNumber += 1;
                  "
                  size="xs"
                  ><q-tooltip>Search for terms</q-tooltip></q-btn
                ></template
              >
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, j) in templateProperties.content[0]">
            <!-- insert a second row containing the cell values for the headers -->
            <td>
              <q-btn
                size="xs"
                icon="close"
                color="red"
                round
                dense
                flat
                @click="deleteRow(j)"
                ><q-tooltip>Delete the row</q-tooltip></q-btn
              >{{ j + 1 }}
            </td>
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
      </q-markup-table>
      <q-btn icon="add" @click="extendTemplate()"
        >Extend<q-tooltip>Add a new row</q-tooltip></q-btn
      >
    </q-scroll-area>
  </div>
</template>
<style scoped>
td,
th {
  border: 1px solid;
  padding: 1px;
  font-size: small;
}

.body--light .sheet {
  background-color: cornsilk;
}
.body--dark .sheet {
  background-color: sienna;
}

.body--light #suggestion {
  background-color: azure;
  margin-left: 1em;
}
.body--dark #suggestion {
  background-color: darkcyan;
  margin-left: 1em;
}

.body--dark input {
  background-color: #1d1d1d;
  color: white;
}
</style>
