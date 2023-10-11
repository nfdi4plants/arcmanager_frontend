import { reactive } from 'vue'

const isaProperties = reactive({
  // path to the file
  path: "",

  // list of all entries
  entries: [],

  // current entry to edit
  entry: [""],

  // entry before the edit (for replacing purposes)
  entryOld: [""],
  
  // the number of the row
  rowId: 0,

  // id of the arc
  repoId: 0,

  // Tübingen, Freiburg, Dev, ...
  repoTarget: "",

  // date of last edit
  date: "",
});

export default isaProperties;
