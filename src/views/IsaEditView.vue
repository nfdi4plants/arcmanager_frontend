<script lang="ts" setup>
import appProperties from "@/AppProperties";
import arcProperties from "@/ArcProperties";
import isaProperties from "@/IsaProperties";
import { ref } from "vue";

let backend = appProperties.backend + "projects/";

let loading = false;
// send the updated entry fields to the backend to save and commit the update
async function sendToBackend() {
  loading = true;
  keyNumber.value += 1;
  // replace null values with empty string
  isaProperties.entry.forEach((element, i) => {
    if (element == null) isaProperties.entry[i] = "";
  });

  const response = await fetch(backend + "saveFile", {
    method: "PUT",
    // body for the backend containing all necessary data
    body: JSON.stringify({
      isaInput: isaProperties.entry,
      rowId: isaProperties.rowId,
      isaOld: isaProperties.entryOld,
      isaPath: isaProperties.path,
      isaRepo: isaProperties.repoId,
      arcBranch: arcProperties.branch,
    }),
    credentials: "include",
  });

  if (!(await response).ok) {
    errors = "ERROR: " + (await response).statusText;
    keyNumber.value += 1;
  } else {
    isaProperties.entries[isaProperties.rowId] = isaProperties.entry;
    isaProperties.entry = [];
    errors = "";
  }
  loading = false;
  keyNumber.value += 1;
}

function addEntry() {
  isaProperties.entries.forEach((element) => {
    element.push("");
  });
  isaProperties.entry = isaProperties.entries[isaProperties.rowId];
}

let errors = "";

let keyNumber = ref(0);
</script>

<template>
  <p :key="keyNumber">{{ errors }}</p>
  {{ isaProperties.entry[0] }}
  <q-spinner
    id="loader"
    color="primary"
    size="2em"
    v-show="loading"
    :key="keyNumber"></q-spinner>

  <q-item-section v-for="(item, i) in isaProperties.entry"
    ><QInput outlined v-model="isaProperties.entry[i]" v-if="i != 0"
      >Entry {{ i }}</QInput
    >
  </q-item-section>
  <q-item-section>
    <q-btn
      icon="add"
      style="background-color: lightgrey"
      @click="addEntry()"></q-btn>
    <q-separator />
    <q-btn
      icon="save"
      @click="
        console.log(isaProperties.entry);
        sendToBackend();
      "
      style="background-color: whitesmoke"
      >Save</q-btn
    ></q-item-section
  >
</template>
