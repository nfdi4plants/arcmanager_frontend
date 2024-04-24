import { reactive } from 'vue'

const templateProperties = reactive({
  // list of all templates
  templates: [{}],

  // list of the filtered templates
  filtered: [],

  // the chosen template
  template: [{}],

  // the content of the cells of the chosen template
  content: [[]],

  // id of the cell to overwrite
  id: 0,

  // id of the row to overwrite
  rowId: 1

});

export default templateProperties;
