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

  // date of last edit
  date: "",

  // array containing the basic information of the isa, like identification, title, description, ...
  identification: [],

  // array containing the contact information
  contacts: [],

  // array containing the publications information
  publications: []
});

export default isaProperties;
