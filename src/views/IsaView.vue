<script lang="ts" setup>
import { reactive, watch, onMounted, ref } from "vue";
import isaProperties from "../IsaProperties.ts";
import fileProperties from "../FileProperties";
import arcProperties from "@/ArcProperties";

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
  // replace null values with empty string

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
</script>

<template>
  <q-toolbar-title v-if="isaProperties.entries.length != 0"
    >Isa Entries</q-toolbar-title
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
  <q-item-section v-if="fileProperties.content != ''">
    <q-toolbar-title>{{ fileProperties.name }}</q-toolbar-title>

    <q-editor
      v-model="fileProperties.content"
      style="white-space: pre-line"></q-editor>
    <q-btn icon="save" @click="commitFile()">Save</q-btn>
  </q-item-section>
</template>
