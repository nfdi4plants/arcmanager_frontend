<script lang="ts" setup>
import { reactive, watch, onMounted, ref } from "vue";
import isaProperties from "../IsaProperties.ts";
import fileProperties from "../FileProperties";
import arcProperties from "@/ArcProperties";
import templateProperties from "@/TemplateProperties";
import termProperties from "@/TermProperties";
import sheetProperties from "@/SheetProperties";

import { setCssVar } from "quasar";
setCssVar("primary", "#2d3e50");

// list of the fields of the specific entry
isaProperties.entry = [];

let loading = false;

//let backend = "http://localhost:8000/arcmanager/api/v1/projects/";
let backend = "https://nfdi4plants.de/arcmanager/api/v1/projects/";

let keyNumber = ref(0);

let errors = "";

let showChanges = ref(false);

let editorRef = ref(null);

// edit the fields of the entry
const setEntry = (entry: string[], id: number) => {
  // clear old entry arrays
  isaProperties.entry = [];
  isaProperties.entryOld = [];
  isaProperties.rowId = id;
  // load entry old with the entry fields
  entry.forEach((element) => {
    if (element != null) {
      isaProperties.entryOld.push(element);
    } else {
      isaProperties.entryOld.push("");
    }
  });
  // map entry with the corresponding row data
  isaProperties.entry = isaProperties.entries[isaProperties.rowId];
  errors = "";
};

async function commitFile() {
  loading = true;
  keyNumber.value += 1;

  const response = await fetch(
    backend +
      "commitFile?id=" +
      fileProperties.id +
      "&repoPath=" +
      fileProperties.path +
      "&branch=" +
      arcProperties.branch,
    {
      method: "POST",
      // body for the backend containing all necessary data
      body: JSON.stringify({
        content: fileProperties.content,
      }),
      credentials: "include",
    }
  );

  if (!(await response).ok) {
    let data = await response.json();
    console.log(data);
    errors = "ERROR: " + data["detail"];
    keyNumber.value += 1;
  } else {
    fileProperties.name = "";
    fileProperties.content = "";
    errors = "";
  }
  loading = false;
  keyNumber.value += 1;
}

function setTemplate(templateId: string) {
  fetch(backend + "getTemplate?id=" + templateId)
    .then((response) => response.json())
    .then((data) => {
      // reset the current template and content
      templateProperties.template = [];
      templateProperties.content = [];

      data.forEach((element: any) => {
        // insert the columnHeader with type, name and accession set
        templateProperties.template.push({
          Type:
            element["ColumnHeader"].Type +
            " [" +
            element["ColumnHeader"].Name +
            "]",
          Accession: element["ColumnTerm"].TermAccession,
        });

        // for the columnHeader column insert an empty cell
        templateProperties.content.push([""]);

        // insert the term accession column
        templateProperties.template.push({
          Type:
            "Term Accession Number [" +
            element["ColumnTerm"].TermAccession +
            "]",
        });

        // if the current template part has a unit, insert an extra unit column
        if (element["HasUnit"]) {
          templateProperties.template.push({
            Type: "Unit",
          });

          // for unit columns the term accession cell is filled with the termAccession of the unit
          templateProperties.content.push([element["UnitTerm"].TermAccession]);
          // the unit column cell is filled with the name of the unit
          templateProperties.content.push([element["UnitTerm"].Name]);
        } else {
          // if there is no unit cell the term accession cell is empty
          templateProperties.content.push([""]);
        }
      });
    });
}

// if a term is chosen the values of the columns header and the term accession will be set to the chosen values
function setTerm(name: string, accession: string) {
  console.log(templateProperties.content);
  templateProperties.content[templateProperties.id].pop();
  templateProperties.content[templateProperties.id + 1].pop();
  templateProperties.content[templateProperties.id].push(name);
  templateProperties.content[templateProperties.id + 1].push(accession);
}

// load the selected sheet and display it
function selectSheet(name: string, index: number) {
  sheetProperties.name = name;
  templateProperties.template = [];
  templateProperties.content = [];

  // create the table column by column
  for (let i = 0; i < sheetProperties.sheets[index].columns.length; i++) {
    let element = sheetProperties.sheets[index].columns[i];
    let words = element.split(" [");
    if (words[0] != "Term Accession Number " && words[0] != "Unit ") {
      let accession = "";
      try {
        // retrieve the accession (get the word between the square brackets)
        accession = sheetProperties.sheets[index].columns[i + 1]
          .split("[")[1]
          .split("]")[0];
      } catch (error) {
        accession = "";
      }
      templateProperties.template.push({
        Type: element,
        Accession: accession,
      });
    } else {
      templateProperties.template.push({
        Type: element,
      });
    }
    let cellContent: string[] = [];
    // load in the cell data row by row
    for (let j = 0; j < sheetProperties.sheets[index].data.length; j++) {
      cellContent.push(sheetProperties.sheets[index].data[j][i]);
    }
    templateProperties.content.push(cellContent);
  }
}

// check if the right side is empty
function checkEmptyIsaView() {
  if (
    isaProperties.entries.length > 0 ||
    fileProperties.content != "" ||
    sheetProperties.sheets.length > 0 ||
    templateProperties.templates.length > 0 ||
    termProperties.terms.length > 0
  )
    return false;
  return true;
}

// See: https://stackoverflow.com/a/28213320
let _onPaste_StripFormatting_IEPaste = false;
function onPaste(e) {
  if (
    e.originalEvent &&
    e.originalEvent.clipboardData &&
    e.originalEvent.clipboardData.getData
  ) {
    e.preventDefault();
    var text = e.originalEvent.clipboardData.getData("text/plain");
    window.document.execCommand("insertText", false, text);
  } else if (e.clipboardData && e.clipboardData.getData) {
    e.preventDefault();
    var text = e.clipboardData.getData("text/plain");
    window.document.execCommand("insertText", false, text);
  } else if (window.clipboardData && window.clipboardData.getData) {
    // Stop stack overflow
    if (!_onPaste_StripFormatting_IEPaste) {
      _onPaste_StripFormatting_IEPaste = true;
      e.preventDefault();
      window.document.execCommand("ms-pasteTextOnly", false);
    }
    _onPaste_StripFormatting_IEPaste = false;
  }
}
</script>

<template>
  <q-toolbar-title v-if="isaProperties.entries.length != 0"
    >Isa Entries ({{ isaProperties.date }})</q-toolbar-title
  >
  <q-toolbar-title v-if="templateProperties.templates.length > 0"
    >Templates</q-toolbar-title
  >
  <q-toolbar-title
    v-if="errors != ''"
    :key="keyNumber"
    style="font-size: small"
    >{{ errors }}</q-toolbar-title
  >
  <q-spinner
    id="loader"
    color="primary"
    size="2em"
    v-show="loading"
    :key="keyNumber"></q-spinner>
  <!-- Isa File content; limit the size of input fields to first 1000-->
  <q-item-section
    v-if="isaProperties.entries.length != 0"
    v-for="(item, i) in isaProperties.entries.slice(0, 1000)"
    :style="i % 2 === 1 ? 'background-color:#fafafa;' : ''">
    <q-item-section v-for="entry in item">
      <q-item-section>{{ entry }}</q-item-section>
    </q-item-section>
    <!-- Only allow editing for non headline fields (not in all caps)-->
    <q-btn
      v-if="item[0] != item[0].toUpperCase()"
      style="width: 5px; height: auto"
      icon="edit"
      @click="setEntry(item, i)"></q-btn>
  </q-item-section>
  <!-- IF there is a list of templates -->
  <q-list bordered>
    <q-item
      clickable
      v-if="templateProperties.templates.length > 0"
      v-for="(template, i) in templateProperties.templates"
      :style="i % 2 === 1 ? 'background-color:#fafafa;' : ''">
      <q-expansion-item>
        <template #header>
          {{ template.Name }} ({{ template.Organisation }})
          {{ template.Version }}
        </template>
        <q-card
          ><q-card-section>{{ template.Description }}</q-card-section>
          <q-card-section>Authors: {{ template.Authors }}</q-card-section
          ><q-card-section
            >Updated last:
            {{ template.LastUpdated.slice(0, 10) }}</q-card-section
          ><q-card-section
            ><q-btn
              style="background-color: #f2f2f2"
              @click="setTemplate(template.Id)"
              >Import</q-btn
            ></q-card-section
          >
        </q-card>
      </q-expansion-item>
    </q-item>
  </q-list>
  <!-- IF there is a list of terms-->
  <q-list bordered>
    <q-item
      clickable
      v-if="termProperties.terms.length > 0"
      v-for="(term, i) in termProperties.terms.slice(0, 1000)"
      :style="i % 2 === 1 ? 'background-color:#fafafa;' : ''">
      <q-expansion-item>
        <template #header>
          {{ term["Name"] }} ({{ term["Accession"] }})
        </template>
        <q-card
          ><q-card-section>{{ term["Description"] }}</q-card-section>
          <q-card-section
            ><q-btn
              style="background-color: #f2f2f2"
              @click="setTerm(term['Name'], term['Accession'])"
              :disable="term['Name'] == 'No Term was found!'"
              >Insert</q-btn
            ></q-card-section
          >
        </q-card>
      </q-expansion-item>
    </q-item>
  </q-list>
  <!-- list of different sheets -->
  <q-list bordered>
    <q-item
      v-if="sheetProperties.names.length > 0"
      v-for="(name, i) in sheetProperties.names"
      :style="i % 2 === 1 ? 'background-color:#fafafa;' : ''">
      <q-expansion-item>
        <template #header>
          <q-btn @click="selectSheet(name, i)">{{ name }}</q-btn>
        </template>
        <q-card
          ><q-card-section>{{
            sheetProperties.sheets[i]["columns"]
          }}</q-card-section
          ><q-card-section>{{
            sheetProperties.sheets[i]["data"]
          }}</q-card-section>
        </q-card>
      </q-expansion-item>
    </q-item>
  </q-list>
  <!-- If its an non isa file, display the content-->
  <q-item-section v-if="fileProperties.content != ''">
    <q-toolbar-title>{{ fileProperties.name }}</q-toolbar-title>
    <!-- IF its an png -->
    <q-img
      v-if="fileProperties.name.toLowerCase().includes('.png')"
      :src="'data:image/png;base64,' + fileProperties.content"></q-img>
    <!-- IF its an jpeg -->
    <q-img
      v-else-if="fileProperties.name.toLowerCase().includes('.jpeg')"
      :src="'data:image/jpeg;base64,' + fileProperties.content"></q-img>
    <!-- IF its an jpg -->
    <q-img
      v-else-if="fileProperties.name.toLowerCase().includes('.jpg')"
      :src="'data:image/jpg;base64,' + fileProperties.content"></q-img>
    <template v-else>
      <q-editor
        v-model="fileProperties.content"
        style="white-space: pre-line"
        @paste="onPaste"></q-editor>
      <q-btn icon="save" @click="commitFile()">Save</q-btn></template
    >
  </q-item-section>
  <!-- Display the changes made in the arc-->
  <q-item-section
    v-else-if="checkEmptyIsaView() && arcProperties.changes != ''">
    <q-checkbox v-model="showChanges" label="View changes" />
    <q-card v-if="showChanges">
      <q-card-section>Changes</q-card-section>
      <q-card-section v-html="arcProperties.changes"></q-card-section>
    </q-card>
  </q-item-section>
</template>
