<script lang="ts" setup>
import { ref } from "vue";
import isaProperties from "../IsaProperties.ts";
import fileProperties from "../FileProperties";
import arcProperties from "@/ArcProperties";
import appProperties from "@/AppProperties";
import templateProperties from "@/TemplateProperties";
import termProperties from "@/TermProperties";
import sheetProperties from "@/SheetProperties";

import { setCssVar } from "quasar";
setCssVar("primary", "#2d3e50");

// list of the fields of the specific entry
isaProperties.entry = [];

let loading = false;

let backend = appProperties.backend + "projects/";

let keyNumber = ref(0);

let errors = "";

let showChanges = ref(false);

// field for searchbar
let search = ref("");

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
      method: "PUT",
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
  errors = "";
  loading = true;
  appProperties.showIsaView = false;
  search.value = "";
  keyNumber.value += 1;
  fetch(backend + "getTemplate?id=" + templateId)
    .then((response) => response.json())
    .then((data) => {
      // reset the current template and add the input column
      templateProperties.template = [
        {
          Type: "Input [Source Name]",
        },
      ];
      templateProperties.content = [[""]];

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

        // if the current template part has a unit, insert an extra unit column
        if (element["HasUnit"]) {
          templateProperties.template.push({
            Type: "Unit [" + element["ColumnHeader"].Name + "]",
          });

          // the unit column cell is filled with the name of the unit
          templateProperties.content.push([element["UnitTerm"].Name]);
          // for unit columns the term source ref cell is filled with the accessionToTSR
          templateProperties.content.push([element["UnitTerm"].accessionToTSR]);
          // for unit columns the term accession cell is filled with the termAccession of the unit
          templateProperties.content.push([element["UnitTerm"].TermAccession]);
        } else {
          // if there is no unit cell the term accession cell is empty
          templateProperties.content.push([""], [""]);
        }
        // insert the term source ref column
        templateProperties.template.push({
          Type: "Term Source REF (" + element["ColumnTerm"].TermAccession + ")",
        });

        // insert the term accession column
        templateProperties.template.push({
          Type:
            "Term Accession Number (" +
            element["ColumnTerm"].TermAccession +
            ")",
        });
      });
      // insert the output column at the end
      templateProperties.template.push({ Type: "Output [Sample Name]" });
      templateProperties.content.push([""]);
    });
  loading = false;
  keyNumber.value += 1;
}

// if a term is chosen the values of the columns header and the term accession will be set to the chosen values
function setTerm(name: string, accession: string, ontology: string) {
  templateProperties.content[templateProperties.id].splice(
    templateProperties.rowId - 1,
    1,
    name
  );
  templateProperties.content[templateProperties.id + 1].splice(
    templateProperties.rowId - 1,
    1,
    ontology
  );
  templateProperties.content[templateProperties.id + 2].splice(
    templateProperties.rowId - 1,
    1,
    accession
  );
}

// if a term is chosen the values of the columns header and the term accession will be set to the chosen values
function setBB(name: string, accession: string) {
  errors = "";

  // the new block will be inserted right before the output column
  templateProperties.template.splice(
    templateProperties.template.length - 1,
    0,
    {
      Type: "Parameter" + " [" + name + "]",
      Accession: accession,
    },
    {
      Type: "Term Source REF" + " [" + accession + "]",
    },
    {
      Type: "Term Accession Number" + " [" + accession + "]",
    }
  );

  // fill the new columns with empty field with the same amount of rows the table already has
  let emptyCells: string[] = [];
  let emptyCells2: string[] = [];
  let emptyCells3: string[] = [];
  templateProperties.content[0].forEach(() => {
    emptyCells.push("");
    emptyCells2.push("");
    emptyCells3.push("");
  });
  templateProperties.content.splice(
    templateProperties.content.length - 1,
    0,
    emptyCells,
    emptyCells2,
    emptyCells3
  );
}

function setUnit(name: string, accession: string, ontology: string) {
  errors = "";
  // if the building block has no unit so far, you can add one
  if (
    !templateProperties.template[
      templateProperties.template.length - 4
    ].Type.startsWith("Unit")
  ) {
    templateProperties.template.splice(
      templateProperties.template.length - 3,
      0,
      {
        Type: "Unit" + " [" + name + "]",
      }
    );

    // fill the new unit columns with the terms and names
    let unitCells: string[] = [];
    let refCells: string[] = [];
    let accNumberCells: string[] = [];
    templateProperties.content[0].forEach(() => {
      unitCells.push(name);
      refCells.push(ontology);
      accNumberCells.push(accession);
    });
    templateProperties.content.splice(
      templateProperties.content.length - 3,
      2,
      unitCells,
      refCells,
      accNumberCells
    );
    // if there is already a unit column, throw an error
  } else {
    errors = "ERROR: Building block already has a Unit!";
    keyNumber.value += 1;
  }
}

// load the selected sheet and display it
async function selectSheet(name: string, index: number) {
  sheetProperties.name = name;
  templateProperties.template = [];
  templateProperties.content = [];
  templateProperties.rowId = 1;
  errors = "";

  if (sheetProperties.sheets[index].columns.length > 0)
    appProperties.showIsaView = false;
  // create the table column by column
  for (let i = 0; i < sheetProperties.sheets[index].columns.length; i++) {
    let element = sheetProperties.sheets[index].columns[i];
    let words = element.split(" [");
    if (
      words[0] != "Term Accession Number " &&
      words[0] != "Unit " &&
      words[0] != "Term Source REF "
    ) {
      let accession = "";
      try {
        // retrieve the accession (get the word between the square brackets)
        accession = sheetProperties.sheets[index].columns[i + 1]
          .split("[")[1]
          .split("]")[0];
      } catch (error) {
        try {
          // retrieve the accession (get the word between the round brackets)
          accession = sheetProperties.sheets[index].columns[i + 1]
            .split("(")[1]
            .split(")")[0];
        } catch (error) {
          accession = "";
        }
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
  // if the content is empty, get a list of templates and display them
  if (templateProperties.template.length == 0) {
    errors = "ERROR: Sheet is empty! Insert a Template!";
    // retrieve the templates
    await fetch(backend + "getTemplates")
      .then((response) => response.json())
      .then((templates) => {
        if (templates.templates.length == 0) {
          errors = "ERROR: No templates found!";
          keyNumber.value += 1;
        }
        // save the templates
        templateProperties.templates = templates.templates;
      });
  }
  sheetProperties.sheets = sheetProperties.names = [];
}

// check if the right side is empty
function checkEmptyIsaView() {
  if (
    isaProperties.entries.length > 0 ||
    fileProperties.content != "" ||
    sheetProperties.sheets.length > 0 ||
    templateProperties.templates.length > 0 ||
    termProperties.terms.length > 0 ||
    termProperties.buildingBlocks.length > 0 ||
    termProperties.unitTerms.length > 0
  )
    return false;

  errors = "";
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

// sort the templates to include only the templates containing the searchTerm
function sortTemplates(searchTerm: string) {
  templateProperties.filtered = [];
  templateProperties.templates.forEach((element) => {
    // craft the string to search in including the name of the arc, the creators name, the id and the topics of the arc
    let searchString =
      element["Name"].toLowerCase() +
      " " +
      element["Organisation"].toLowerCase() +
      " " +
      element["Description"].toString().toLowerCase() +
      element["Authors"].toLowerCase();
    if (searchString.includes(searchTerm.toLowerCase())) {
      templateProperties.filtered.push(element);
    }
  });
}
</script>

<template>
  <q-toolbar-title v-if="isaProperties.entries.length != 0"
    >Isa Entries ({{ isaProperties.date }})</q-toolbar-title
  >
  <q-toolbar-title v-if="templateProperties.templates.length > 0"
    >Templates</q-toolbar-title
  >
  <q-toolbar-title v-if="termProperties.unitTerms.length > 0"
    >Units</q-toolbar-title
  >
  <q-toolbar-title v-if="termProperties.buildingBlocks.length > 0"
    >Building blocks</q-toolbar-title
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
  <!-- Only allow editing for non headline fields (not in all caps)-->
  <q-item
    dense
    :clickable="item[0] != item[0].toUpperCase()"
    @click="setEntry(item, i)"
    v-if="isaProperties.entries.length != 0"
    v-for="(item, i) in isaProperties.entries.slice(0, 1000)"
    :style="i % 2 === 1 ? 'background-color:#fafafa;' : ''">
    <q-item-section v-for="(entry, i) in item">
      <q-item-section>
        <template v-if="i > 0 && entry != null"
          >{{ entry.toString().slice(0, 15)
          }}<template v-if="entry.length > 15">...</template></template
        ><template v-else>{{ entry }}</template></q-item-section
      >
    </q-item-section>
  </q-item>
  <!-- IF there is a list of terms-->
  <q-list bordered v-if="termProperties.terms.length > 0">
    <q-item
      clickable
      v-for="(term, i) in termProperties.terms.slice(0, 1000)"
      :style="i % 2 === 1 ? 'background-color:#fafafa;' : ''">
      <q-expansion-item>
        <template #header>
          <span style="font-size: medium"
            >{{ term["Name"] }}
            <a
              :href="'http://purl.obolibrary.org/obo/' + term['Accession']"
              target="_blank"
              style="font-size: medium"
              >({{ term["Accession"] }})</a
            >
            <template v-if="term['IsObsolete']">
              <span style="color: red; margin-left: 1mm"
                >Obsolete</span
              ></template
            ></span
          >
        </template>
        <q-card
          ><q-card-section>{{ term["Description"] }}</q-card-section>
          <q-card-section
            ><q-btn
              style="background-color: #f2f2f2"
              @click="
                setTerm(term['Name'], term['Accession'], term['FK_Ontology'])
              "
              :disable="term['Name'] == 'No Term was found!'"
              >Insert</q-btn
            ></q-card-section
          >
        </q-card>
      </q-expansion-item>
    </q-item>
  </q-list>
  <!-- IF there is a list of terms for building blocks-->
  <q-list
    bordered
    v-if="
      termProperties.unitTerms.length > 0 ||
      termProperties.buildingBlocks.length > 0
    ">
    <!-- if its a list of unit terms-->
    <q-item
      clickable
      v-if="termProperties.unitTerms.length > 0"
      v-for="(term, i) in termProperties.unitTerms.slice(0, 1000)"
      :style="i % 2 === 1 ? 'background-color:#fafafa;' : ''">
      <q-expansion-item>
        <template #header>
          <span style="font-size: medium"
            >{{ term["Name"] }}
            <a
              :href="'http://purl.obolibrary.org/obo/' + term['Accession']"
              target="_blank"
              style="font-size: medium"
              >({{ term["Accession"] }})</a
            >
            <template v-if="term['IsObsolete']">
              <span style="color: red; margin-left: 1mm"
                >Obsolete</span
              ></template
            ></span
          >
        </template>
        <q-card
          ><q-card-section>{{ term["Description"] }}</q-card-section>
          <q-card-section
            ><q-btn
              style="background-color: #f2f2f2"
              @click="
                setUnit(term['Name'], term['Accession'], term['FK_Ontology'])
              "
              :disable="term['Name'] == 'No Term was found!'"
              >Select</q-btn
            ></q-card-section
          >
        </q-card>
      </q-expansion-item>
    </q-item>
    <!-- else if its a list of building blocks-->
    <q-item
      clickable
      v-else-if="termProperties.buildingBlocks.length > 0"
      v-for="(term, i) in termProperties.buildingBlocks.slice(0, 1000)"
      :style="i % 2 === 1 ? 'background-color:#fafafa;' : ''">
      <q-expansion-item>
        <template #header>
          <span style="font-size: medium"
            >{{ term["Name"] }}
            <a
              :href="'http://purl.obolibrary.org/obo/' + term['Accession']"
              target="_blank"
              style="font-size: medium"
              >({{ term["Accession"] }})</a
            >
            <template v-if="term['IsObsolete']">
              <span style="color: red; margin-left: 1mm"
                >Obsolete</span
              ></template
            ></span
          >
        </template>
        <q-card
          ><q-card-section>{{ term["Description"] }}</q-card-section>
          <q-card-section
            ><q-btn
              style="background-color: #f2f2f2"
              @click="setBB(term['Name'], term['Accession'])"
              :disable="term['Name'] == 'No Term was found!'"
              >Select</q-btn
            ></q-card-section
          >
        </q-card>
      </q-expansion-item>
    </q-item>
  </q-list>
  <!-- list of different sheets -->
  <q-list bordered v-if="sheetProperties.names.length > 0">
    <q-item
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
  <!-- IF there is a list of templates -->
  <q-list bordered v-if="templateProperties.templates.length > 0">
    <q-input
      v-model="search"
      label="Search"
      value="name"
      @update:model-value="(newValue:string) => sortTemplates(newValue)"
      style="background-color: white"
      ><template v-slot:append> <q-icon name="search"></q-icon></template
    ></q-input>
    <q-item
      clickable
      v-for="(template, i) in templateProperties.filtered"
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
    <!-- IF its an svg -->
    <q-editor
      v-else-if="fileProperties.name.toLowerCase().includes('.svg')"
      style="white-space: pre-line"
      v-model="fileProperties.content"></q-editor>
    <template v-else>
      <q-editor
        v-model="fileProperties.content"
        style="white-space: pre-line"
        @paste="onPaste"></q-editor>
      <q-btn
        icon="save"
        @click="commitFile()"
        :disable="
          fileProperties.name == '413' ||
          // if its an lfs file, it should not be editable
          fileProperties.content.includes(
            'version https://git-lfs.github.com/spec/v1'
          )
        "
        >Save</q-btn
      ></template
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

<style scoped>
* {
  font-size: medium;
}
</style>
