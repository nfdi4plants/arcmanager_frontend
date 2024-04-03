<script lang="ts" setup>
import { ref } from "vue";
import isaProperties from "../IsaProperties.ts";
import fileProperties from "../FileProperties";
import arcProperties from "@/ArcProperties";
import appProperties from "@/AppProperties";
import templateProperties from "@/TemplateProperties";
import termProperties from "@/TermProperties";
import sheetProperties from "@/SheetProperties";
import { useQuasar, setCssVar } from "quasar";
import ApexCharts from "apexcharts";

const $q = useQuasar();

setCssVar("primary", "#2d3e50");

// list of the fields of the specific entry
isaProperties.entry = [];

var loading = false;

var backend = appProperties.backend + "projects/";

var keyNumber = ref(0);

var errors = "";

// array containing all errors tracked by the backend metrics
var chartErrors = [];

var alternative = ref(false);

var showChanges = ref(true);

var metricsPwd = ref("");

var authorized = ref(false);

// field for searchbar
var search = ref("");

// edit the fields of the entry
const setEntry = (entry: string[], id: number) => {
  // clear old entry arrays
  isaProperties.entry = [];
  isaProperties.rowId = id;
  // map entry with the corresponding row data
  isaProperties.entry = isaProperties.entries[isaProperties.rowId];
  errors = "";
};

/** this builds all the different charts based on the backend metrics data
 *
 */
async function buildChart(password: string) {
  errors = "";
  let metrics = await fetch(`${backend}getMetrics?pwd=${password}`);
  let data = await metrics.json();
  if (!metrics.ok) {
    errors = "ERROR: " + data["detail"];
  } else {
    authorized.value = true;
    let responseTimes = data["responseTimes"];
    let statusCodes = data["statusCodes"];
    chartErrors = data["errors"];

    let endpoints = Object.keys(responseTimes);
    let status = Object.keys(statusCodes);

    let times = [];
    let amount: number[] = [];
    let statusAmount = Object.values(statusCodes);

    Object.values(responseTimes).forEach((element) => {
      times.push(Number(element[0]).toFixed(4));
      amount.push(element[1]);
    });

    let responseChartOptions = {
      chart: {
        height: 600,
        type: "bar",
        zoom: {
          enabled: false,
        },
      },
      series: [
        {
          name: "Res. Time",
          data: times,
        },
      ],
      dataLabels: {
        enabled: false,
      },
      title: {
        text: "Response Times",
        align: "left",
      },
      plotOptions: {
        bar: {
          borderRadius: 5,
          horizontal: true,
        },
      },
      xaxis: {
        categories: endpoints,
      },
    };
    let amountChartOptions = {
      chart: {
        type: "donut",
      },
      series: amount,
      title: {
        text: "Endpoint Amount",
        align: "left",
      },
      labels: endpoints,
      responsive: [
        {
          breakpoint: 480,
          options: {
            chart: {
              width: 200,
            },
            legend: {
              position: "bottom",
            },
          },
        },
      ],
    };
    let statusChartOptions = {
      chart: {
        type: "donut",
      },
      series: statusAmount,
      title: {
        text: "Status Codes",
        align: "left",
      },
      labels: status,
      responsive: [
        {
          breakpoint: 480,
          options: {
            chart: {
              width: 200,
            },
            legend: {
              position: "bottom",
            },
          },
        },
      ],
    };

    let responseChart = new ApexCharts(
      document.querySelector("#response"),
      responseChartOptions
    );
    let amountChart = new ApexCharts(
      document.querySelector("#amount"),
      amountChartOptions
    );
    let statusChart = new ApexCharts(
      document.querySelector("#status"),
      statusChartOptions
    );
    responseChart.render();
    amountChart.render();
    statusChart.render();
  }
  keyNumber.value += 1;
}

/** commit the content of the file back to the datahub
 *
 */
async function commitFile() {
  loading = true;
  keyNumber.value += 1;

  const response = await fetch(
    `${backend}commitFile?id=${fileProperties.id}&repoPath=${fileProperties.path}&branch=${arcProperties.branch}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      // body for the backend containing all necessary data
      body: JSON.stringify({
        content: fileProperties.content,
      }),
      credentials: "include",
    }
  );

  if (!(await response).ok) {
    let data = await response.json();
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

/** setups a new table using the chosen template
 *
 * @param templateId - the id of the template
 */
function setTemplate(templateId: string) {
  errors = "";
  loading = true;
  appProperties.showIsaView = false;
  appProperties.arcList = false;
  search.value = "";
  keyNumber.value += 1;
  if (templateId == "Empty") {
    templateProperties.template = [
      {
        Type: "Input [Source Name]",
      },
      { Type: "Output [Source Name]" },
    ];
    templateProperties.content = [[""], [""]];
  } else {
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

        data["templateBB"].forEach((element: any) => {
          // insert the columnHeader with type, name and accession set
          templateProperties.template.push({
            Type: `${element["ColumnHeader"].Type} [${element["ColumnHeader"].Name}]`,
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
            templateProperties.content.push([
              element["UnitTerm"].accessionToTSR,
            ]);
            // for unit columns the term accession cell is filled with the termAccession of the unit
            templateProperties.content.push([
              element["UnitTerm"].TermAccession,
            ]);
          } else {
            // if there is no unit cell the term accession cell is empty
            templateProperties.content.push([""], [""]);
          }
          // insert the term source ref column
          templateProperties.template.push({
            Type:
              "Term Source REF (" + element["ColumnTerm"].TermAccession + ")",
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
  }
  loading = false;
  keyNumber.value += 1;
}

/** if a term is chosen the values of the columns header and the term accession will be set to the chosen values
 *
 * @param name - the name of the term
 * @param accession - the term accession
 * @param ontology - the term ontology reference
 */
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

/** if a term is chosen the values of the columns header and the term accession will be set to the chosen values
 *
 * @param name - the name of the building block
 * @param accession - the accession value of the building block
 */
function setBB(name: string, accession: string) {
  errors = "";

  // if column already exists, throw an error
  if (
    templateProperties.template.some(
      (element) =>
        element.Type == termProperties.parameterType + " [" + name + "]"
    )
  ) {
    errors = "ERROR: Column '" + name + "' already exists!!";
    keyNumber.value += 1;
  } else {
    appProperties.showIsaView = false;
    // the new block will be inserted right before the output column
    templateProperties.template.splice(
      templateProperties.template.length - 1,
      0,
      {
        Type: termProperties.parameterType + " [" + name + "]",
        Accession: accession,
      },
      {
        Type: "Term Source REF [" + accession + "]",
      },
      {
        Type: "Term Accession Number [" + accession + "]",
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
}

/** sets a unit column to the building block
 *
 * @param name - the name of the unit
 * @param accession - the accession value of the unit
 * @param ontology - the ontology reference of the unit
 */
function setUnit(name: string, accession: string, ontology: string) {
  errors = "";
  // if the building block has no unit so far, you can add one
  try {
    if (
      !templateProperties.template[
        templateProperties.template.length - 4
      ].Type.startsWith("Unit")
    ) {
      templateProperties.template.splice(
        templateProperties.template.length - 3,
        0,
        {
          Type: "Unit [" + name + "]",
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
  } catch {
    errors = "ERROR: You must add a parameter first!";
    keyNumber.value += 1;
  }
}

/** load the selected sheet and display it
 *
 * @param name - the name of the sheet
 * @param index - the index value of the sheet inside of the sheets array
 */
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

    // if the sheet has more than hundred rows, only show the last 100 to save memory
    if (sheetProperties.sheets[index].data.length < 100) {
      // load in the cell data row by row
      for (let j = 0; j < sheetProperties.sheets[index].data.length; j++) {
        cellContent.push(sheetProperties.sheets[index].data[j][i]);
      }
    } else {
      for (
        let j = sheetProperties.sheets[index].data.length - 100;
        j < sheetProperties.sheets[index].data.length;
        j++
      ) {
        cellContent.push(sheetProperties.sheets[index].data[j][i]);
      }
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
        templateProperties.filtered = templates.templates;
      });
  }
  sheetProperties.sheets = sheetProperties.names = [];
  appProperties.arcList = false;
}

/** check if the right side (the isa view) is empty
 *
 */
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

/** See: https://stackoverflow.com/a/28213320
 * function to remove all unnecessary metadata from a copy pasted text to the q-editor
 */
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

/** sort the templates to include only the templates containing the searchTerm
 *
 * @param searchTerm - the input term to search the templates for (name, author, description, ...)
 */
function sortTemplates(searchTerm: string) {
  templateProperties.filtered = [];
  templateProperties.templates.forEach((element: any) => {
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

/** returns true if the file is one of the file formats/has the name
 *
 * @param name - the name of the file
 */
function checkName(name: String) {
  let includes = false;
  let formats = [
    ".py",
    ".csv",
    ".yml",
    ".cwl",
    ".r ",
    ".rproj",
    ".lock",
    "dockerfile",
    ".fsx",
    ".json",
    ".fa",
    ".gff",
    ".sh",
    "license",
    "licence",
    ".gitkeep",
  ];
  formats.forEach((element) => {
    if (name.toLowerCase().includes(element)) {
      includes = true;
    }
  });
  return includes;
}

/** send the updated identification fields to the backend to save and commit
 *
 */
async function sendToBackend() {
  loading = true;
  keyNumber.value += 1;

  // array containing all the information stored in identification, contacts and publications
  let toSend = isaProperties.identification.concat(
    isaProperties.contacts,
    isaProperties.publications
  );

  // replace null values with empty string
  toSend.forEach(async (element, i) => {
    element.forEach((entry, j) => {
      if (entry == null) toSend[i][j] = "";
    });
  });
  let response = await fetch(backend + "saveFile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    // body for the backend containing all necessary data
    body: JSON.stringify({
      isaInput: toSend,
      isaPath: isaProperties.path,
      isaRepo: isaProperties.repoId,
      arcBranch: arcProperties.branch,
      multiple: !alternative.value,
    }),
    credentials: "include",
  });

  if (!response.ok) {
    errors = "ERROR: " + response.statusText;
    keyNumber.value += 1;
  } else {
    isaProperties.entry = [];
    errors = "";
    $q.notify("Saved");
  }

  loading = false;
  keyNumber.value += 1;
}

/** returns true if the mandatory field is not filled out properly (will be marked red)
 *
 * @param field - array containing the data for the specific row(column wise)
 * @param index - the index number for the current column to check
 */
function mandatory(field: Array<any>, index: number) {
  switch (field[index]) {
    case "Investigation Identifier":
    case "Investigation Title":
    case "Investigation Description":
    case "Study Identifier":
    case "Study File Name":
    case "Assay Measurement Type":
    case "Assay File Name":
    case "Measurement Type":
    case "File Name":
      // return true if the field is not a string type or is an empty string
      return typeof field[1] != "string" || field[1] == "";
  }
}

/** adds an empty string to every entry inside of the identification, contacts and publications arrays
 *
 */
function extendIsa() {
  // extend the three arrays with empty fields
  isaProperties.identification.forEach((element) => {
    element.push("");
  });
  isaProperties.contacts.forEach((element) => {
    element.push("");
  });
  isaProperties.publications.forEach((element) => {
    element.push("");
  });
  keyNumber.value += 1;
}
</script>

<template>
  <!-- TOOLBAR TITLES | SPINNER-->
  <q-list>
    <q-toolbar-title v-if="isaProperties.entries.length != 0"
      >Isa Entries<q-checkbox v-model="alternative">alternative</q-checkbox>
      <span style="padding-left: 1em; color: red"
        >Mandatory fields are red</span
      ></q-toolbar-title
    >
    <q-toolbar-title v-if="templateProperties.templates.length > 1"
      >Templates</q-toolbar-title
    >
    <q-toolbar-title v-if="termProperties.terms.length > 0"
      >Terms</q-toolbar-title
    >
    <q-toolbar-title v-if="sheetProperties.sheets.length > 0"
      >Sheets</q-toolbar-title
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
      style="font-size: medium"
      >{{ errors }}</q-toolbar-title
    >
    <q-spinner
      id="loader"
      size="2em"
      v-show="loading"
      :key="keyNumber + 1"></q-spinner
  ></q-list>
  <!-- METRICS -->
  <q-list v-if="!appProperties.loggedIn">
    <div class="q-gutter-md row items-start" v-if="!authorized">
      <q-input
        v-model="metricsPwd"
        filled
        type="password"
        hint="Password"
        style="size: 1cm" />
      <q-btn @click="buildChart(metricsPwd)" :disabled="metricsPwd.length == 0"
        >Get Metrics</q-btn
      >
    </div>
    <div id="response"></div>
    <div id="amount" style="width: 90%"></div>
    <div style="display: flex; justify-content: space-between">
      <div id="status" style="width: 50%"></div>
    </div>
    <div
      id="errors"
      style="width: 50%"
      :key="keyNumber + 2"
      v-show="chartErrors.length > 0">
      <p><b>Errors:</b></p>
      <ul>
        <li v-for="entry in chartErrors">{{ entry }}</li>
      </ul>
    </div>
  </q-list>
  <!-- ALTERNATIVE VIEW FOR ISA (NEW VIEW)-->
  <template v-if="isaProperties.entries.length > 0 && !alternative">
    <!-- Identification -->
    <div
      class="q-gutter-md row items-start"
      v-if="!isaProperties.path.includes('assay')">
      <q-input
        outlined
        v-model="isaProperties.identification[0][1]"
        :label-color="
          isaProperties.identification[0][1] != '' &&
          isaProperties.identification[0][1] != null
            ? ''
            : 'red'
        "
        :color="
          isaProperties.identification[0][1] != '' &&
          isaProperties.identification[0][1] != null
            ? ''
            : 'red'
        "
        label="Identifier"></q-input>
      <q-input
        style="width: 45%"
        outlined
        v-model="isaProperties.identification[1][1]"
        :label-color="
          isaProperties.identification[1][1] != '' &&
          isaProperties.identification[1][1] != null
            ? ''
            : 'red'
        "
        :color="
          isaProperties.identification[1][1] != '' &&
          isaProperties.identification[1][1] != null
            ? ''
            : 'red'
        "
        label="Title"></q-input>
      <q-input
        style="width: 92%"
        outlined
        type="textarea"
        v-model="isaProperties.identification[2][1]"
        :label-color="
          isaProperties.identification[2][1] != '' &&
          isaProperties.identification[2][1] != null
            ? ''
            : 'red'
        "
        :color="
          isaProperties.identification[2][1] != '' &&
          isaProperties.identification[2][1] != null
            ? ''
            : 'red'
        "
        label="Description"></q-input>
      <q-input
        style="width: 45%"
        outlined
        type="date"
        v-model="isaProperties.identification[3][1]"
        label="Submission Date"></q-input>
      <q-input
        style="width: 45%"
        outlined
        type="date"
        v-model="isaProperties.identification[4][1]"
        label="Public Release Date"></q-input>
    </div>
    <div class="q-gutter-md row items-start" v-else>
      <q-input
        style="width: 45%"
        outlined
        v-for="(entry, i) in isaProperties.identification"
        v-model="isaProperties.identification[i][1]"
        :label="isaProperties.identification[i][0]"></q-input>
    </div>
    <div class="q-gutter-y-md" style="max-width: 600px">
      <q-tabs
        v-model="isaProperties.publication"
        v-if="!isaProperties.path.includes('assay')"
        dense
        align="left"
        outside-arrows>
        <template v-for="i in isaProperties.publications[0].length - 1"
          ><q-tab :label="'Publication ' + i" :name="'publication ' + i"></q-tab
        ></template>
      </q-tabs>
    </div>
    <q-tab-panels
      v-model="isaProperties.publication"
      animated
      v-if="!isaProperties.path.includes('assay')">
      <template v-for="j in isaProperties.publications[0].length - 1">
        <q-tab-panel :name="'publication ' + j">
          <div
            class="q-gutter-md row items-start"
            v-if="!isaProperties.path.includes('assay')">
            <q-input
              style="width: 45%"
              outlined
              v-for="(entry, i) in isaProperties.publications"
              v-model="isaProperties.publications[i][j]"
              :label="isaProperties.publications[i][0]"></q-input
            ><q-btn
              icon="add"
              outline
              @click="
                extendIsa();
                isaProperties.publication = 'publication ' + (j + 1);
              "
              v-if="j == isaProperties.publications[0].length - 1"
              >New Publication</q-btn
            >
          </div></q-tab-panel
        ></template
      ></q-tab-panels
    >
    <div class="q-gutter-y-md" style="max-width: 600px">
      <q-tabs
        v-model="isaProperties.contact"
        dense
        align="left"
        outside-arrows
        mobile-arrows>
        <template v-for="i in isaProperties.contacts[0].length - 1"
          ><q-tab :label="'Contact ' + i" :name="'contact ' + i"></q-tab
        ></template>
      </q-tabs>
    </div>
    <q-tab-panels v-model="isaProperties.contact" animated>
      <template v-for="j in isaProperties.contacts[0].length - 1">
        <q-tab-panel :name="'contact ' + j">
          <div class="q-gutter-md row items-start">
            <q-input
              style="width: 45%"
              outlined
              v-for="(entry, i) in isaProperties.contacts"
              v-model="isaProperties.contacts[i][j]"
              :label="isaProperties.contacts[i][0]"></q-input
            ><q-btn
              icon="add"
              outline
              @click="
                extendIsa();
                isaProperties.contact = 'contact ' + (j + 1);
              "
              v-if="j == isaProperties.contacts[0].length - 1"
              >New Contact</q-btn
            >
          </div></q-tab-panel
        ></template
      ></q-tab-panels
    >
    <q-item-section
      ><q-btn icon="save" type="submit" color="teal" @click="sendToBackend()"
        >Save</q-btn
      ></q-item-section
    >
  </template>
  <!-- Isa File content; limit the size of input fields to first 1000-->
  <!-- Only allow editing for non headline fields (not in all caps)-->
  <!-- OLD VIEW-->
  <template v-if="isaProperties.entries.length > 0 && alternative">
    <q-item
      dense
      :clickable="item[0] != item[0].toUpperCase()"
      @click="setEntry(item, i)"
      v-for="(item, i) in isaProperties.entries.slice(0, 1000)"
      :class="i % 2 === 1 ? 'alt' : ''">
      <q-item-section v-for="(entry, i) in item">
        <q-item-section
          v-if="entry != null"
          :style="mandatory(item, i) ? 'color:red' : ''">
          <template v-if="i > 0"
            >{{ entry.toString().slice(0, 15)
            }}<template v-if="entry.length > 15">...</template></template
          ><template v-else>{{ entry }}</template></q-item-section
        >
      </q-item-section>
    </q-item>
  </template>
  <!-- IF there is a list of terms-->
  <q-list bordered v-if="termProperties.terms.length > 0">
    <q-item
      clickable
      v-for="(term, i) in termProperties.terms.slice(0, 1000)"
      :class="i % 2 === 1 ? 'alt' : ''">
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
              class="alt"
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
      :class="i % 2 === 1 ? 'alt;' : ''">
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
              class="bb"
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
      :class="i % 2 === 1 ? 'alt;' : ''">
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
              class="bb"
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
      :class="i % 2 === 1 ? 'alt' : ''">
      <q-expansion-item>
        <template #header>
          <q-btn @click="selectSheet(name, i)">{{ name }}</q-btn>
        </template>
        <q-card
          ><q-card-section>{{
            sheetProperties.sheets[i]["columns"]
          }}</q-card-section
          ><q-card-section
            >{{ sheetProperties.sheets[i]["data"].slice(0, 100)
            }}<template v-if="sheetProperties.sheets[i]['data'].length > 100">
              <i>
                +{{ sheetProperties.sheets[i]["data"].length - 100 }}</i
              ></template
            ></q-card-section
          >
        </q-card>
      </q-expansion-item>
    </q-item>
  </q-list>
  <!-- IF there is a list of templates -->
  <q-list bordered v-if="templateProperties.templates.length > 1">
    <q-input
      v-model="search"
      label="Search"
      value="name"
      @update:model-value="(newValue:string) => sortTemplates(newValue)"
      ><template v-slot:append> <q-icon name="search"></q-icon></template
    ></q-input>
    <q-item
      clickable
      v-for="(template, i) in templateProperties.filtered"
      :class="i % 2 === 1 ? 'alt' : ''">
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
            ><q-btn class="alt" @click="setTemplate(template.Id)"
              >Import</q-btn
            ></q-card-section
          >
        </q-card>
      </q-expansion-item>
    </q-item>
  </q-list>
  <!-- If its an non isa file, display the content-->
  <q-item-section v-if="fileProperties.content != ''">
    <template
      v-if="
        fileProperties.content.includes(
          'version https://git-lfs.github.com/spec/v1'
        )
      "
      ><q-toolbar-title
        >{{ fileProperties.name
        }}<q-badge outline style="margin-left: 1em" color="blue"
          >LFS</q-badge
        ></q-toolbar-title
      >
      <q-editor
        v-model="fileProperties.content"
        style="white-space: pre-line"
        @paste="onPaste"></q-editor>
    </template>
    <template v-else>
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
          :readonly="checkName(fileProperties.name)"
          @paste="onPaste"></q-editor>
        <q-btn
          icon="save"
          @click="commitFile()"
          :disable="
            fileProperties.name == '413' || checkName(fileProperties.name)
          "
          >Save</q-btn
        ></template
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
.body--dark .alt {
  background-color: #050505;
}
.body--light .alt {
  background-color: #fafafa;
}

.body--light .bb {
  background-color: #f2f2f2;
}
.body--dark .bb {
  background-color: #0d0d0d;
}
</style>
