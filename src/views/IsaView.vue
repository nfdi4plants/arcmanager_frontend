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

let backend = "http://localhost:8000/arcmanager/api/v1/projects/";
//let backend = "https://nfdi4plants.de/arcmanager/api/v1/projects/";

let keyNumber = ref(0);

let errors = "";

// edit the fields of the entry
const setEntry = (entry: string[], id: number) => {
  // clear old entry arrays
  isaProperties.entry = [];
  isaProperties.entryOld = [];
  isaProperties.rowId = id;
  // load both entry and entry old with the entry fields
  entry.forEach((element) => {
    if (element != null) {
      isaProperties.entry.push(element);
      isaProperties.entryOld.push(element);
    } else {
      isaProperties.entry.push("");
      isaProperties.entryOld.push("");
    }
  });
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

      data.forEach((element) => {
        // insert the columnHeader with type, name and accession set
        templateProperties.template.push({
          Type: element["ColumnHeader"].Type,
          Name: element["ColumnHeader"].Name,
          Accession: element["ColumnTerm"].TermAccession,
        });

        // for the columnHeader column insert an empty cell
        templateProperties.content.push("");

        // insert the term accession column
        templateProperties.template.push({
          Type: "Term Accession Number",
          Name: element["ColumnTerm"].TermAccession,
        });

        // if the current template part has a unit, insert an extra unit column
        if (element["HasUnit"]) {
          templateProperties.template.push({
            Type: "Unit",
            Name: element["UnitTerm"].Name,
          });

          // for unit columns the term accession cell is filled with the termAccession of the unit
          templateProperties.content.push(element["UnitTerm"].TermAccession);
          // the unit column cell is filled with the name of the unit
          templateProperties.content.push(element["UnitTerm"].Name);
        } else {
          // if there is no unit cell the term accession cell is empty
          templateProperties.content.push("");
        }
      });
    });
}

// if a term is chosen the values of the columns header and the term accession will be set to the chosen values
function setTerm(name: string, accession: string) {
  templateProperties.content[templateProperties.id] = name;
  templateProperties.content[templateProperties.id + 1] = accession;
}

function selectSheet(name: string, index: number) {
  sheetProperties.name = name;
  templateProperties.template = [];
  templateProperties.content = [];
  for (let i = 0; i < sheetProperties.sheets[index].columns.length; i++) {
    let element = sheetProperties.sheets[index].columns[i];
    let words = element.split("[");
    if (words[0] != "Term Accession Number " && words[0] != "Unit ") {
      templateProperties.template.push({
        Type: words[0],
        Name: words[1].split("]")[0],
        Accession: sheetProperties.sheets[index].columns[i + 1]
          .split("[")[1]
          .split("]")[0],
      });
    } else {
      templateProperties.template.push({
        Type: words[0],
        Name: words[1].split("]")[0],
      });
    }
    templateProperties.content.push(sheetProperties.sheets[index].data[0][i]);
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
  <!-- limit the size of input fields to first 500-->
  <q-item-section
    v-if="isaProperties.entries.length != 0"
    v-for="(item, i) in isaProperties.entries.slice(0, 500)"
    :style="i % 2 === 1 ? 'background-color:#fafafa;' : ''">
    <q-item-section v-for="entry in item">
      <q-item-section>{{ entry }}</q-item-section> </q-item-section
    ><q-btn
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

    <q-editor
      v-model="fileProperties.content"
      style="white-space: pre-line"></q-editor>
    <q-btn icon="save" @click="commitFile()">Save</q-btn>
  </q-item-section>
</template>
