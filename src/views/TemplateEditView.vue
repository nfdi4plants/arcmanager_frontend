<script lang="ts" setup>
import { ref } from "vue";

import { useQuasar } from "quasar";
import appProperties from "@/AppProperties";

import draggable from "vuedraggable";

var backend = appProperties.backend + "tnt/";
var loading = false;

var templateList = [];
var templatesFiltered = [];

var template = [];

var inputOutput = [];

var templateSearch = ref("");

var templateName = ref("");

var templateIdentifier = ref("");
var templateDesc = ref("");

var templateOrg = ref("Other");
var templateVersion = ref("1.0.0");

var templateAuthor = ref({
  firstName: "",
  lastName: "",
  email: "",
});

const $q = useQuasar();

var errors = "";

var unitNames = ref(false);

// if the search for terms should be extended or not
var advanced = ref(false);

const parameterOptions = [
  "Parameter",
  "Factor",
  "Characteristic",
  "Component",
  "Date",
  "Performer",
  "Protocol",
];

var parameter = ref("Parameter");

// list of suggestions for parameters
var parameterList = [];

// list of suggestions for unit values (if the parameter is a unit)
var unitList = [];

const organisations = [
  "DataPLANT",
  "TRR341",
  "RPTU - MBS",
  "MPIMP",
  "MAdLand",
  "CMML",
  "CEPLAS-data",
  "TRR356",
  "Other",
];

var keyNumber = ref(0);

// the building block term to search for
var search = ref("");

// show the search bar for tags
var showSearch = false;

// show the building block area
var showBuildingBlock = false;

// set to true if the building block has a unit
var bbUnit = ref(false);

// the type of unit for the building block
var unitSearch = ref("");

var tagSearch = ref("");

// list of terms used for tags
var tagList = [];

// the list of tags of the template
var templateTags = [];

const forcereload = () => {
  // when the key value is changed, vue is automatically reloading the page
  keyNumber.value += 1;
};

/** save the current template on the backend
 *
 */
async function saveTemplate() {
  loading = true;
  forcereload();

  let concatTable = [];

  if (inputOutput.length > 0) concatTable.push(inputOutput[0]);

  template.forEach((element) => {
    element.forEach((entry) => {
      concatTable.push(entry);
    });
  });

  if (inputOutput.length > 1) concatTable.push(inputOutput[1]);

  // send the content of the sheet to the backend
  const response = await fetch(backend + "saveTemplate", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      table: concatTable,
      name: templateName.value,
      identifier: templateIdentifier.value,
      description: templateDesc.value,
      organisation: templateOrg.value,
      version: templateVersion.value,
      username: templateAuthor.value,
      tags: templateTags,
    }),
    credentials: "include",
  });
  if (!response.ok) {
    errors = "ERROR: Couldn't save Template!";
    loading = false;
  } else {
    $q.notify("Template was saved successfully!");
  }
  // cleanup view
  template = [];
  templateList = [];
  templatesFiltered = [];
  loading = false;
  appProperties.arcList = true;
  appProperties.showIsaView = false;
  forcereload();
}

/** suggestions for the building blocks
 *
 */
async function getSuggestions(tag = false) {
  loading = true;
  errors = "";
  forcereload();

  // reset terms to clear up
  parameterList = [];
  unitList = [];
  tagList = [];

  if (tag) {
    const terms = await fetch(
      backend + "getTermSuggestions?input=" + tagSearch.value
    );
    let data = await terms.json();
    if (!terms.ok) {
      errors = "ERROR: " + data["detail"];
    } else {
      // if the list of terms is empty
      if (data["terms"].length == 0) {
        tagList = [{ Name: "No Term was found!" }];
      }
      // save the list of terms
      else {
        tagList = data["terms"];
      }
    }
  } else {
    const terms = await fetch(
      backend + "getTermSuggestions?input=" + search.value
    );

    let data = await terms.json();
    if (!terms.ok) {
      errors = "ERROR: " + data["detail"];
    } else {
      // if the list of terms is empty
      if (data["terms"].length == 0) {
        parameterList = [{ Name: "No Term was found!" }];
      }
      // save the list of terms
      else {
        parameterList = data["terms"];
      }
    }
  }
  loading = false;
  forcereload();
}

/** suggestions for the units of building blocks
 *
 */
async function getUnitSuggestions() {
  loading = true;
  errors = "";
  forcereload();

  // reset terms and templates to clear up IsaView
  parameterList = [];
  unitList = [];
  tagList = [];

  const terms = await fetch(
    backend + "getTermSuggestions?input=" + unitSearch.value
  );
  let data = await terms.json();
  if (!terms.ok) {
    errors = "ERROR: " + data["detail"];
  } else {
    // if the list of terms is empty
    if (data["terms"].length == 0) {
      unitList = [{ Name: "No Term was found!" }];
    }
    // save the list of terms
    else {
      unitList = data["terms"];
    }
  }
  loading = false;
  forcereload();
}

/** deletes the chosen column including the terms and unit column
 *
 * @param columnType - the full name of the column header
 */
function deleteColumn(column) {
  $q.dialog({
    dark: appProperties.dark,
    title: "Delete " + column.name,
    message: `Are you sure you want to delete '${column.name} [${column.annotationValue}]'?`,
    cancel: true,
  }).onOk(() => {
    // user confirmed the deletion
    console.log("Deleting " + column.annotationValue + "...");

    template.forEach((list) => {
      let columnIndex = list.findIndex(
        (element) => element.annotationValue == column.annotationValue
      );
      if (columnIndex != -1) list.splice(columnIndex, 1);
    });

    $q.notify(
      "Successfully deleted the column " + column.annotationValue + " !"
    );
    forcereload();
  });
}

/** deletes the chosen column including the terms and unit column
 *
 * @param tag - the tag to be deleted
 */
function deleteTag(tag) {
  $q.dialog({
    dark: appProperties.dark,
    title: "Delete " + tag.annotationValue,
    message: `Are you sure you want to delete '${tag.annotationValue} (${tag.termAccession})'?`,
    cancel: true,
  }).onOk(() => {
    // user confirmed the deletion
    console.log("Deleting " + tag.annotationValue + "...");

    let tagIndex = templateTags.findIndex(
      (element) => element.annotationValue == tag.annotationValue
    );
    templateTags.splice(tagIndex, 1);

    $q.notify("Successfully deleted the tag " + tag.annotationValue + " !");
    forcereload();
  });
}

/** if you click the 'create new sheet' button, you will get a list containing all the current templates
 *
 */
async function getTemplates() {
  loading = true;
  forcereload();

  templateList = [];
  templatesFiltered = [];
  templateSearch.value = "";

  // retrieve the templates
  let response = await fetch(backend + "getTemplates");

  let templates = await response.json();

  if (!response.ok) {
    errors = "ERROR: No templates found!";
    templateList = [
      {
        id: "Empty",
        name: "Empty Template",
        description: "Start with a empty Template",
        organisation: "Custom",
        version: "1.0.0",
        last_updated: "-",
        authors: [{ firstName: "", lastName: "" }],
        table: {
          name: "",
          header: [
            { headertype: "Input", values: ["Source Name"] },
            { headertype: "Output", values: ["Sample Name"] },
          ],
          values: [
            [[0, 0], { celltype: "FreeText", values: [""] }],
            [[1, 0], { celltype: "FreeText", values: [""] }],
          ],
        },
      },
    ];
    templatesFiltered = [
      {
        id: "Empty",
        name: "Empty Template",
        description: "Start with a empty Template",
        organisation: "Custom",
        version: "1.0.0",
        last_updated: "-",
        authors: [{ firstName: "", lastName: "" }],
        table: {
          name: "",
          header: [
            { headertype: "Input", values: ["Source Name"] },
            { headertype: "Output", values: ["Sample Name"] },
          ],
          values: [
            [[0, 0], { celltype: "FreeText", values: [""] }],
            [[1, 0], { celltype: "FreeText", values: [""] }],
          ],
        },
      },
    ];
    forcereload();
  } else {
    // save the templates
    templateList = [
      {
        id: "Empty",
        name: "Empty Template",
        description: "Start with a empty Template",
        organisation: "Custom",
        version: "1.0.0",
        last_updated: "-",
        authors: [{ firstName: "", lastName: "" }],
        table: {
          name: "",
          header: [
            { headertype: "Input", values: ["Source Name"] },
            { headertype: "Output", values: ["Sample Name"] },
          ],
          values: [
            [[0, 0], { celltype: "FreeText", values: [""] }],
            [[1, 0], { celltype: "FreeText", values: [""] }],
          ],
        },
      },
    ];
    templatesFiltered = [
      {
        id: "Empty",
        name: "Empty Template",
        description: "Start with a empty Template",
        organisation: "Custom",
        version: "1.0.0",
        last_updated: "-",
        authors: [{ firstName: "", lastName: "" }],
        table: {
          name: "",
          header: [
            { headertype: "Input", values: ["Source Name"] },
            { headertype: "Output", values: ["Sample Name"] },
          ],
          values: [
            [[0, 0], { celltype: "FreeText", values: [""] }],
            [[1, 0], { celltype: "FreeText", values: [""] }],
          ],
        },
      },
    ];
    templateList = templateList.concat(templates.templates);
    templatesFiltered = templatesFiltered.concat(templates.templates);
  }
  loading = false;
  forcereload();
}

/** sort the templates to include only the templates containing the searchTerm
 *
 * @param searchTerm - the input term to search the templates for (name, author, description, ...)
 */
function sortTemplates(searchTerm: string) {
  templatesFiltered = [];
  templateList.forEach((element: any) => {
    // craft the string to search in including the name of the arc, the creators name, the id and the topics of the arc
    let searchString =
      element["name"].toLowerCase() +
      " " +
      element["organisation"].toLowerCase() +
      " " +
      element["description"].toString().toLowerCase() +
      element["authors"][0]["firstName"].toLowerCase() +
      element["authors"][0]["lastName"].toLowerCase();
    if (searchString.includes(searchTerm.toLowerCase())) {
      templatesFiltered.push(element);
    }
  });
}

/** setups a new table using the chosen template
 *
 * @param table - the table section of a template
 */
function setTemplate(table: Object) {
  errors = "";
  loading = true;
  appProperties.showIsaView = false;
  appProperties.arcList = false;
  search.value = "";
  forcereload();

  template = [];
  for (let i = 0; i < Math.floor(table.header.length / 5) + 1; i++) {
    template.push([]);
  }

  let listIndex = 0;

  // list of columns, that are unit columns
  let unitColumns = [];
  // here are just the numbers stored (for later ease to use)
  let unitNumbers = [];

  if (table != null) {
    // if there are units, fill them into the unitColumns array
    for (let i = 0; i < table.values.length; i++) {
      if (table.values[i][0][1] == 0) {
        if (
          table.values[i][1].celltype == "Unitized" &&
          table.values[i][1].values[1].annotationValue != ""
        ) {
          unitColumns.push({
            columnId: table.values[i][0][0],
            unitName: table.values[i][1].values[1].annotationValue,
            unitSource: table.values[i][1].values[1].termSource,
            unitAccession: table.values[i][1].values[1].termAccession,
          });
          unitNumbers.push(table.values[i][0][0]);
        }
      }
    }

    // set the sheet name to the name set by the template
    if (table.name != "") templateIdentifier.value = table.name;

    table.header.forEach((element, index) => {
      listIndex = Math.floor(index / 5);
      // if its not an input/output column
      if (typeof element.values[0] != typeof "") {
        // true if its a unit
        if (unitNumbers.includes(index)) {
          let unitColumn = unitColumns.find(
            (element) => element.columnId == index
          );

          template[listIndex].push({
            name: element.headertype,
            annotationValue: element.values[0].annotationValue,
            termAccession: element.values[0].termAccession,
            termSource: element.values[0].termSource,
            unit: {
              name: unitColumn?.unitName,
              termSource: unitColumn?.unitSource,
              termAccession: unitColumn?.unitAccession,
            },
          });
        } else {
          try {
            template[listIndex].push({
              name: element.headertype,
              annotationValue: element.values[0].annotationValue,
              termAccession: element.values[0].termAccession,
              termSource: element.values[0].termSource,
              unit: false,
            });
          } catch (error) {
            template[listIndex].push({
              name: element.headertype,
              annotationValue: "",
              termAccession: "",
              termSource: "",
              unit: false,
            });
          }
        }
      } else {
        inputOutput.push({
          name: element.headertype,
          annotationValue: element.values[0],
          termAccession: false,
          termSource: false,
          unit: false,
        });
      }
    });
  }
  loading = false;
  forcereload();
}

/** if a term is chosen the values of the columns header and the term accession will be set to the chosen values
 *
 * @param name - the name of the building block
 * @param accession - the accession value of the building block
 * @param source - the term source value of the building block
 */
function setBB(name: string, accession: string, source: string) {
  errors = "";

  let exists = false;

  template.forEach((list) => {
    if (
      list.some(
        (element) =>
          element.name == parameter.value && name == element.annotationValue
      )
    ) {
      exists = true;
    }
  });
  // if column already exists, throw an error
  if (exists) {
    errors = "ERROR: Column '" + name + "' already exists!!";
    forcereload();
  } else {
    // the new block will be inserted right before the output column
    template[template.length - 1].splice(
      template[template.length - 1].length,
      0,
      {
        name: parameter.value,
        annotationValue: name,
        termAccession: accession,
        termSource: source,
        unit: false,
      }
    );
    parameterList = [];
    forcereload();
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
      typeof template[template.length - 1][
        template[template.length - 1].length - 1
      ].unit != typeof {}
    ) {
      template[template.length - 1][
        template[template.length - 1].length - 1
      ].unit = {
        name: name,
        termSource: ontology,
        termAccession: accession,
      };

      // if there is already a unit column, throw an error
    } else {
      errors = "ERROR: Building block already has a Unit!";
      forcereload();
    }
  } catch {
    errors = "ERROR: You must add a parameter first!";
    forcereload();
  }
  unitList = [];
  showBuildingBlock = false;
  forcereload();
}

if (templateList.length == 0) getTemplates();
</script>

<template>
  <p :key="keyNumber">{{ errors }}</p>
  <!-- SPINNER-->
  <q-spinner
    id="loader"
    size="2em"
    v-show="loading"
    :key="keyNumber"></q-spinner>
  <div>
    <q-scroll-area style="height: 1000px; max-width: 100%" :key="keyNumber">
      <span v-if="template.length == 0">Please select a Template:</span>
      <template v-if="templateList.length == 0 && !loading">
        <q-btn @click="getTemplates()">Get Templates</q-btn>
      </template>
      <!-- LIST OF TEMPLATES-->
      <template v-else-if="template.length == 0">
        <q-list>
          <q-input
            v-model="templateSearch"
            label="Search"
            value="name"
            @update:model-value="(newValue:string) => sortTemplates(newValue)"
            ><template v-slot:append> <q-icon name="search"></q-icon></template
          ></q-input>
          <q-item
            clickable
            v-for="(template, i) in templatesFiltered"
            :class="i % 2 === 1 ? 'alt' : ''">
            <q-expansion-item>
              <template #header>
                {{ template.name }} ({{ template.organisation }})
                {{ template.version }}
              </template>
              <q-card
                ><q-card-section>{{ template.description }}</q-card-section>
                <q-card-section
                  >Authors:
                  <span v-for="(author, i) in template.authors"
                    >{{ author.firstName }} {{ author.lastName
                    }}<template v-if="i < template.authors.length - 1"
                      >,
                    </template></span
                  ></q-card-section
                ><q-card-section v-if="template.last_updated"
                  >Updated last:
                  {{ template.last_updated.slice(0, 10) }}</q-card-section
                ><q-card-section
                  ><q-btn
                    class="alt"
                    @click="
                      setTemplate(template.table);
                      templateName = template.name;
                      templateDesc = template.description;
                      templateOrg = template.organisation;
                      templateVersion = template.version;
                      templateTags = template.tags;
                      if (template.authors.length > 0)
                        templateAuthor = template.authors[0];
                    "
                    >Import</q-btn
                  ></q-card-section
                >
              </q-card>
            </q-expansion-item>
          </q-item>
        </q-list>
      </template>
      <template v-else>
        <!-- LIST OF PARAMETERS/UNITS-->
        <template
          v-if="
            parameterList.length != 0 ||
            unitList.length != 0 ||
            tagList.length != 0
          ">
          <q-scroll-area style="height: 400px">
            <q-list bordered>
              <!-- if its a list of unit terms-->
              <q-item
                clickable
                v-if="unitList.length > 0"
                v-for="(term, i) in unitList.slice(0, 1000)"
                :class="i % 2 === 1 ? 'alt;' : ''">
                <q-expansion-item>
                  <template #header>
                    <span style="font-size: medium"
                      >{{ term["Name"] }}
                      <a
                        :href="
                          'http://purl.obolibrary.org/obo/' + term['Accession']
                        "
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
                          setUnit(
                            term['Name'],
                            term['Accession'],
                            term['FK_Ontology']
                          )
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
                v-else-if="parameterList.length > 0"
                v-for="(term, i) in parameterList.slice(0, 1000)"
                :class="i % 2 === 1 ? 'alt;' : ''">
                <q-expansion-item>
                  <template #header>
                    <span style="font-size: medium"
                      >{{ term["Name"] }}
                      <a
                        :href="
                          'http://purl.obolibrary.org/obo/' + term['Accession']
                        "
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
                          setBB(
                            term['Name'],
                            term['Accession'],
                            term['FK_Ontology']
                          )
                        "
                        :disable="term['Name'] == 'No Term was found!'"
                        >Select</q-btn
                      ></q-card-section
                    >
                  </q-card>
                </q-expansion-item>
              </q-item>
              <q-item
                clickable
                v-else-if="tagList.length > 0"
                v-for="(term, i) in tagList.slice(0, 1000)"
                :class="i % 2 === 1 ? 'alt;' : ''"
                ><q-expansion-item>
                  <template #header>
                    <span style="font-size: medium"
                      >{{ term["Name"] }}
                      <a
                        :href="
                          'http://purl.obolibrary.org/obo/' + term['Accession']
                        "
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
                          templateTags.push({
                            annotationValue: term['Name'],
                            termSource: term['FK_Ontology'],
                            termAccession: term['Accession'],
                          });
                          tagList = [];
                          forcereload();
                        "
                        :disable="term['Name'] == 'No Term was found!'"
                        >Select</q-btn
                      ></q-card-section
                    >
                  </q-card>
                </q-expansion-item>
              </q-item>
            </q-list></q-scroll-area
          >
        </template>
        <!-- show search area for inserting a new building block-->
        <template v-if="showBuildingBlock">
          <span>Add building block:</span
          ><q-checkbox v-model="bbUnit">Unit?</q-checkbox>
          <div class="q-gutter-md row">
            <q-select
              style="width: 10%"
              outlined
              v-model="parameter"
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
        <!-- TEMPLATE AREA-->
        <template v-if="template.length != 0">
          <q-separator></q-separator>
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
            >building block</q-btn
          >
          <p style="margin-top: 1em">
            Drag and drop the columns:
            <q-checkbox v-model="unitNames">Show units</q-checkbox>
          </p>

          <!-- ROWS CONTAINING THE COLUMNS OF THE TEMPLATE-->
          <div style="margin-top: 4em" v-for="(list, index) in template">
            <q-markup-table
              style="width: max-content; border-collapse: collapse"
              separator="cell"
              dense>
              <thead>
                <draggable
                  v-model="template[index]"
                  item-key="annotationValue"
                  tag="thead"
                  @change="forcereload()"
                  group="a">
                  <template #item="{ element: header }"
                    ><th scope="col" style="font-size: large">
                      {{ header.name }} [{{ header.annotationValue }}]
                      <template
                        v-if="typeof header.unit == typeof {} && unitNames"
                        >({{ header.unit.name }})</template
                      ><q-btn
                        size="xs"
                        icon="close"
                        color="red"
                        round
                        dense
                        flat
                        @click="deleteColumn(header)"></q-btn></th></template
                ></draggable>
              </thead>
            </q-markup-table>
            <span v-if="index < template.length - 1">...</span>
          </div>
          <div style="margin-top: 4em">
            <p>Final Table:</p>
            <q-markup-table
              style="width: max-content; border-collapse: collapse"
              separator="cell"
              dense>
              <thead>
                <template v-for="(list, index) in template">
                  <th v-if="index == 0 && inputOutput.length > 0">
                    {{ inputOutput[0].name }} [{{
                      inputOutput[0].annotationValue
                    }}]
                  </th>
                  <th v-for="entry in list">
                    {{ entry.name }} [{{ entry.annotationValue }}]
                  </th>
                  <th
                    v-if="
                      index == template.length - 1 && inputOutput.length > 1
                    ">
                    {{ inputOutput[1].name }} [{{
                      inputOutput[1].annotationValue
                    }}]
                  </th>
                </template>
              </thead>
            </q-markup-table>
          </div>
          <!-- Area for sheet naming and other options-->
          <div class="row">
            <!-- List of inputs-->
            <div style="width: 15%; margin-top: 2em">
              <q-input
                type="text"
                label="Identifier"
                v-model="templateIdentifier"
                placeholder="Give your template an Identifier (e.g. AlgaeGrowth)" />
              <q-input
                type="text"
                label="Name"
                v-model="templateName"
                placeholder="Give your template a name (e.g. Algae Growth)" />
              <q-input
                type="textarea"
                label="Description"
                v-model="templateDesc" />
              <q-select
                :options="organisations"
                v-model="templateOrg"
                style="width: 200px">
              </q-select>
              <q-input
                type="text"
                label="Version"
                v-model="templateVersion"
                placeholder="Give your template a version number (e.g. 1.0.0)" />
            </div>
            <!-- Tag insertion and deletion -->
            <div style="width: 15%">
              <q-input
                style="padding: 2em"
                type="text"
                label="Tag Search"
                v-model="tagSearch"></q-input>
              <q-btn
                icon="search"
                style="margin-left: 2em"
                color="primary"
                @click="getSuggestions(true)"
                >Search</q-btn
              >
              <p v-if="templateTags.length > 0" style="margin: 2em">Tags:</p>
              <ul v-if="templateTags.length > 0" style="margin-left: 4em">
                <li v-for="tag in templateTags">
                  {{ tag.annotationValue }} ({{ tag.termAccession }})
                  <q-btn
                    size="xs"
                    icon="close"
                    color="red"
                    round
                    dense
                    flat
                    @click="deleteTag(tag)"></q-btn>
                </li>
              </ul>
            </div>
            <!-- Name input and save-->
            <div style="padding: 2em; margin-left: 2em; width: 15%">
              <span>Your Name:</span>
              <q-input
                type="text"
                label="First name"
                v-model="templateAuthor.firstName"
                placeholder="Your first name" />
              <q-input
                type="text"
                label="Last Name"
                v-model="templateAuthor.lastName"
                placeholder="Your first name" />
              <q-input
                type="text"
                label="Email"
                v-model="templateAuthor.email"
                placeholder="Your email" />
              <q-btn
                class="sheet"
                @click="saveTemplate()"
                :disable="
                  templateName.length == 0 ||
                  templateAuthor.firstName == '' ||
                  templateAuthor.lastName == ''
                "
                >Save</q-btn
              ><span style="margin-left: 1em" v-if="templateName.length == 0"
                >Please provide a name for the template!</span
              >
            </div>
          </div>
        </template></template
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
