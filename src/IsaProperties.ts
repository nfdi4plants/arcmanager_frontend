import { reactive } from "vue";

const isaProperties = reactive({
  // path to the file
  path: "",

  // list of all entries
  entries: [] as Array<Array<string>>,

  // current entry to edit
  entry: [] as Array<string>,

  // the number of the row
  rowId: 0,

  // id of the arc
  repoId: 0,

  // Tübingen, Freiburg, Dev, ...
  repoTarget: "",

  // array containing the basic information of the isa, like identification, title, description, ...
  identification: [] as Array<Array<string>>,

  // array containing the contact information; name of the current contact page
  contacts: [] as Array<Array<string>>,
  contact: "contact 1",

  // array containing the publications information; name of the current publication page
  publications: [] as Array<Array<string>>,
  publication: "publication 1",
});

export default isaProperties;
