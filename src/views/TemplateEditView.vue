<script lang="ts" setup>
import { ref } from "vue";

import { useQuasar } from "quasar";
import appProperties from "@/AppProperties";

import { Template, Table, Tag } from "@/TemplateProperties";

import { Term } from "@/TermProperties";

import draggable from "vuedraggable";

var backend = appProperties.backend + "tnt/";
var loading = false;

class Unit {
  name: string;
  termSource: string;
  termAccession: string;

  constructor(name: string, termSource: string, termAccession: string) {
    this.name = name;
    this.termAccession = termAccession;
    this.termSource = termSource;
  }
}

class Column {
  name: string;
  annotationValue: string;
  termAccession: string;
  termSource: string;
  unit: boolean | Unit;

  constructor(
    name: string,
    annotationValue: string,
    termAccession: string,
    termSource: string,
    unit: boolean | Unit
  ) {
    this.name = name;
    this.annotationValue = annotationValue;
    this.termAccession = termAccession;
    this.termSource = termSource;
    this.unit = unit;
  }
}

const emptyTemplate = new Template(
  "Empty",
  [{ firstName: "", lastName: "", email: "" }],
  "Start with a empty Template",
  [],
  "-",
  "Empty Template",
  "Custom",
  new Table(
    "",
    [
      { headertype: "Input", values: ["Source Name"] },
      { headertype: "Output", values: ["Sample Name"] },
    ],
    [
      [[0, 0], { celltype: "FreeText", values: [""] }],
      [[1, 0], { celltype: "FreeText", values: [""] }],
    ]
  ),
  [],
  "1.0.0"
);

// list containing all the templates
var templateList: Template[] = [];
// list containing all the templates after filtering through the search bar
var templatesFiltered: Template[] = [];

// list of columns stored in the template (they are stored like [[column 1, column 2....][column 6, column 7...]...], basically nested lists)
var template: Array<Array<Column>> = [];

// list containing the input and output columns
var inputOutput: Array<Column> = [];

// the specific template to search for (name, author, ...)
var templateSearch = ref("");

// name of the template
var templateName = ref("");
// identifier of the template
var templateIdentifier = ref("");
// description of the template
var templateDesc = ref("");
// organisation of the template
var templateOrg = ref("Other");
// version of the template
var templateVersion = ref("1.0.0");
// author of the template (the first author)
var templateAuthor = ref({
  firstName: "",
  lastName: "",
  email: "",
});

const $q = useQuasar();

var errors = "";
// toggle to show the units
var unitNames = ref(false);

// all the parameter options for a new building block
const parameterOptions: ReadonlyArray<string> = [
  "Parameter",
  "Factor",
  "Characteristic",
  "Component",
  "Date",
  "Performer",
  "Protocol",
];

// default option is 'Parameter'
var parameter = ref("Parameter");

// list of suggestions for parameters
var parameterList: Term[] = [];

// list of suggestions for unit values (if the parameter is a unit)
var unitList: Term[] = [];

// different options of organisations for the template
const organisations: ReadonlyArray<string> = [
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

// key value for the different components
var keyNumber = ref(0);

// the building block term to search for
var search = ref("");

// show the building block area
var showBuildingBlock = false;

// set to true if the building block has a unit
var bbUnit = ref(false);

// the type of unit for the building block
var unitSearch = ref("");

// the tag to search for
var tagSearch = ref("");

// list of terms used for tags
var tagList: Term[] = [];

// the list of tags of the template
var templateTags: Tag[] = [];

const forcereload = () => {
  // when the key value is changed, vue is automatically reloading the components with a key value
  keyNumber.value += 1;
};

/** save the current template on the backend
 *
 */
async function saveTemplate() {
  loading = true;
  forcereload();

  // extract the columns back from the different lists into one final list
  let concatTable = [];

  // if there is something stored inside inputOutput, start with the first column stored there (must be the input column)
  if (inputOutput.length > 0) concatTable.push(inputOutput[0]);

  // next read out the different lists in template and push every column stored in there into concatTable
  template.forEach((element) => {
    element.forEach((entry) => {
      concatTable.push(entry);
    });
  });

  // if there is more than one column stored in input/output, push the second column there into concatTable (must be the output column)
  if (inputOutput.length > 1) concatTable.push(inputOutput[1]);

  // send the full template data to the backend
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
  // cleanup
  template = [];
  templateList = [];
  templatesFiltered = [];
  search.value = "";
  tagSearch.value = "";
  unitSearch.value = "";
  loading = false;
  appProperties.arcList = true;
  appProperties.showIsaView = false;
  forcereload();
}

/** suggestions for the building blocks (or tags)
 *
 */
async function getSuggestions(tag = false) {
  loading = true;
  errors = "";
  forcereload();

  // reset lists to clear up
  parameterList = [];
  unitList = [];
  tagList = [];

  // if a tag is searched instead of a term
  if (tag) {
    const terms = await fetch(
      backend + "getTermSuggestions?input=" + tagSearch.value
    );
    let data = await terms.json();
    if (!terms.ok) {
      errors = "ERROR: " + data["detail"];
    } else {
      // if the list of tags is empty
      if (data["terms"].length == 0) {
        tagList = [new Term("", "No Term was found!", "", false, "")];
      }
      // save the list of tags
      else {
        tagList = data["terms"];
      }
    }
    // if a term is searched
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
        parameterList = [new Term("", "No Term was found!", "", false, "")];
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

  // reset lists
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
      unitList = [new Term("", "No Term was found!", "", false, "")];
    }
    // save the list of terms
    else {
      unitList = data["terms"];
    }
  }
  loading = false;
  forcereload();
}

/** deletes the chosen column
 *
 * @param column - the column
 */
function deleteColumn(column: Column) {
  // ask the user for confirmation
  $q.dialog({
    dark: appProperties.dark,
    title: "Delete " + column.name,
    message: `Are you sure you want to delete '${column.name} [${column.annotationValue}]'?`,
    cancel: true,
  }).onOk(() => {
    // user confirmed the deletion
    console.log("Deleting " + column.annotationValue + "...");

    // loop each list for the column with the same annotation value
    template.forEach((list) => {
      let columnIndex = list.findIndex(
        (element) => element.annotationValue == column.annotationValue
      );
      // if it was found, remove it
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
function deleteTag(tag: Tag) {
  // ask user for confirmation
  $q.dialog({
    dark: appProperties.dark,
    title: "Delete " + tag.annotationValue,
    message: `Are you sure you want to delete '${tag.annotationValue} (${tag.termAccession})'?`,
    cancel: true,
  }).onOk(() => {
    // user confirmed the deletion
    console.log("Deleting " + tag.annotationValue + "...");

    // search for the tag inside of the tag list
    let tagIndex = templateTags.findIndex(
      (element) => element.annotationValue == tag.annotationValue
    );
    // if found, remove it
    if (tagIndex != -1) templateTags.splice(tagIndex, 1);

    $q.notify("Successfully deleted the tag " + tag.annotationValue + " !");
    forcereload();
  });
}

/** retrieves the list of templates for editing
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

  // if there was an error, fill the templates with an empty template
  if (!response.ok) {
    errors = "ERROR: No templates found!";
    templateList = [emptyTemplate];
    templatesFiltered = [emptyTemplate];
    forcereload();
  } else {
    // save the templates, starting with an empty template
    templateList = [emptyTemplate];
    templatesFiltered = [emptyTemplate];
    // merge the templates from the get request with the current template list (also for the filtered list)
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
  templateList.forEach((element) => {
    // craft the string to search in including the name of the template, the organisation, description and name of the first author
    let searchString =
      element.name.toLowerCase() +
      " " +
      element.organisation.toLowerCase() +
      " " +
      element.description.toString().toLowerCase() +
      element.authors[0].firstName.toLowerCase() +
      element.authors[0].lastName.toLowerCase();
    if (searchString.includes(searchTerm.toLowerCase())) {
      templatesFiltered.push(element);
    }
  });
}

/** setups a new table using the chosen template
 *
 * @param table - the table section of a template
 */
function setTemplate(table: Table) {
  errors = "";
  loading = true;

  // clear up
  appProperties.showIsaView = false;
  appProperties.arcList = false;
  search.value = "";
  unitSearch.value = "";
  tagSearch.value = "";
  forcereload();

  // reset the template
  template = [];

  // for every 5 columns a empty list will be added to "template"
  for (let i = 0; i < Math.floor(table.header.length / 5) + 1; i++) {
    template.push([]);
  }

  // start with filling the first list
  let listIndex = 0;

  // list of columns, that are unit columns
  let unitColumns: Array<{ columnId: number; unit: Unit }> = [];
  // here are just the numbers stored (for later ease to use)
  let unitNumbers: Array<number> = [];

  // if there is a table, start filling in the values
  if (table != null) {
    // if there are units, fill them into the unitColumns array
    for (let i = 0; i < table.values.length; i++) {
      if (table.values[i][0][1] == 0) {
        // every unit should have the "unitized" cell type and an annotation value
        if (table.values[i][1].celltype == "Unitized") {
          if ((table.values[i][1].values[1] as Tag).annotationValue != "") {
            unitColumns.push({
              columnId: table.values[i][0][0],
              unit: new Unit(
                (table.values[i][1].values[1] as Tag).annotationValue,
                (table.values[i][1].values[1] as Tag).termSource,
                (table.values[i][1].values[1] as Tag).termAccession
              ),
            });
            unitNumbers.push(table.values[i][0][0]);
          }
        }
      }
    }

    // set the sheet name to the name set by the template
    if (table.name != "") templateIdentifier.value = table.name;

    table.header.forEach((element, index: number) => {
      // increase the index every 5 columns
      listIndex = Math.floor(index / 5);
      // if its not an input/output column
      if (typeof element.values[0] != typeof "") {
        // true if its a unit
        if (unitNumbers.includes(index)) {
          let unitColumn = unitColumns.find(
            (element) => element.columnId == index
          );
          if (unitColumn) {
            // fill in the column including the unit data
            template[listIndex].push(
              new Column(
                element.headertype,
                (element.values[0] as Tag).annotationValue,
                (element.values[0] as Tag).termAccession,
                (element.values[0] as Tag).termSource,
                new Unit(
                  unitColumn.unit.name,
                  unitColumn.unit.termSource,
                  unitColumn.unit.termAccession
                )
              )
            );
          } else {
            template[listIndex].push(
              new Column(
                element.headertype,
                (element.values[0] as Tag).annotationValue,
                (element.values[0] as Tag).termAccession,
                (element.values[0] as Tag).termSource,
                new Unit("", "", "")
              )
            );
          }
          // if its not a unit, set "unit" to false
        } else {
          try {
            template[listIndex].push(
              new Column(
                element.headertype,
                (element.values[0] as Tag).annotationValue,
                (element.values[0] as Tag).termAccession,
                (element.values[0] as Tag).termSource,
                false
              )
            );
            // if there is an error, it is most likely due to missing term values; therefore set them to an empty string
          } catch (error) {
            template[listIndex].push(
              new Column(element.headertype, "", "", "", false)
            );
          }
        }
      } else {
        // an input/output column only has a name and annotation value
        inputOutput.push(
          new Column(
            element.headertype,
            element.values[0] as string,
            "",
            "",
            false
          )
        );
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

  // set to true if the column already exists
  let exists = false;

  // check if there is a column with the same annotation value and name
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
    // the new block will be inserted at the end of the last column list
    template[template.length - 1].splice(
      template[template.length - 1].length,
      0,
      new Column(parameter.value, name, accession, source, false)
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
    // if the last column inside of the last template list has no unit, then add one
    if (
      typeof template[template.length - 1][
        template[template.length - 1].length - 1
      ].unit != typeof Unit
    ) {
      template[template.length - 1][
        template[template.length - 1].length - 1
      ].unit = new Unit(name, ontology, accession);

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
          <!-- search bar-->
          <q-input
            v-model="templateSearch"
            label="Search"
            value="name"
            @update:model-value="(newValue:string) => sortTemplates(newValue)"
            ><template v-slot:append> <q-icon name="search"></q-icon></template
          ></q-input>
          <!-- individual templates-->
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
                      if (template.tags) templateTags = template.tags;
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
                      >{{ term.Name }}
                      <a
                        :href="
                          'http://purl.obolibrary.org/obo/' + term.Accession
                        "
                        target="_blank"
                        style="font-size: medium"
                        >({{ term.Accession }})</a
                      >
                      <template v-if="term.IsObsolete">
                        <span style="color: red; margin-left: 1mm"
                          >Obsolete</span
                        ></template
                      ></span
                    >
                  </template>
                  <q-card
                    ><q-card-section>{{ term.Description }}</q-card-section>
                    <q-card-section
                      ><q-btn
                        class="bb"
                        @click="
                          setUnit(term.Name, term.Accession, term.FK_Ontology)
                        "
                        :disable="term.Name == 'No Term was found!'"
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
                      >{{ term.Name }}
                      <a
                        :href="
                          'http://purl.obolibrary.org/obo/' + term.Accession
                        "
                        target="_blank"
                        style="font-size: medium"
                        >({{ term.Accession }})</a
                      >
                      <template v-if="term.IsObsolete">
                        <span style="color: red; margin-left: 1mm"
                          >Obsolete</span
                        ></template
                      ></span
                    >
                  </template>
                  <q-card
                    ><q-card-section>{{ term.Description }}</q-card-section>
                    <q-card-section
                      ><q-btn
                        class="bb"
                        @click="
                          setBB(term.Name, term.Accession, term.FK_Ontology)
                        "
                        :disable="term.Name == 'No Term was found!'"
                        >Select</q-btn
                      ></q-card-section
                    >
                  </q-card>
                </q-expansion-item>
              </q-item>
              <!-- else if its a list of tags-->
              <q-item
                clickable
                v-else-if="tagList.length > 0"
                v-for="(term, i) in tagList.slice(0, 1000)"
                :class="i % 2 === 1 ? 'alt;' : ''"
                ><q-expansion-item>
                  <template #header>
                    <span style="font-size: medium"
                      >{{ term.Name }}
                      <a
                        :href="
                          'http://purl.obolibrary.org/obo/' + term.Accession
                        "
                        target="_blank"
                        style="font-size: medium"
                        >({{ term.Accession }})</a
                      >
                      <template v-if="term['IsObsolete']">
                        <span style="color: red; margin-left: 1mm"
                          >Obsolete</span
                        ></template
                      ></span
                    >
                  </template>
                  <q-card
                    ><q-card-section>{{ term.Description }}</q-card-section>
                    <q-card-section
                      ><q-btn
                        class="bb"
                        @click="
                          templateTags.push({
                            annotationValue: term.Name,
                            termSource: term.FK_Ontology,
                            termAccession: term.Accession,
                          });
                          tagList = [];
                          forcereload();
                        "
                        :disable="term.Name == 'No Term was found!'"
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
          <!-- button for adding building blocks-->
          <q-btn
            class="sheet"
            style="margin-left: 1em"
            icon="add"
            dense
            @click="
              showBuildingBlock = !showBuildingBlock;
              search = '';
              unitSearch = '';
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
                <!-- The columns will be draggable-->
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
            <!-- display the final table render-->
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
                :rules="[
                  (val) => !val.includes(' ') || 'No whitespace allowed!',
                ]"
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
                :disable="tagSearch == ''"
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
                  templateIdentifier.length == 0 ||
                  templateAuthor.firstName == '' ||
                  templateAuthor.lastName == ''
                "
                >Save</q-btn
              ><span
                style="margin-left: 1em"
                v-if="templateIdentifier.length == 0"
                >Please provide an identifier for the template!</span
              ><span v-else-if="templateAuthor.firstName == ''"
                >Please provide a first name!</span
              ><span v-else-if="templateAuthor.lastName == ''"
                >Please provide a last name!</span
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
