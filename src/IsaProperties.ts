import { reactive } from 'vue'

const isaProperties = reactive({
  // path to the file
  path: "",

  // list of all entries
  entries: [],

  // current entry to edit
  entry: [""],
  
  // the number of the row
  rowId: 0,

  // id of the arc
  repoId: 0,

  // Tübingen, Freiburg, Dev, ...
  repoTarget: "",

  // array containing the basic information of the isa, like identification, title, description, ...
  identification: [],

  // array containing the contact information; name of the current contact page
  contacts: [],
  contact: "contact 1",

  // array containing the publications information; name of the current publication page
  publications: [],
  publication: "publication 1"
});

export default isaProperties;
