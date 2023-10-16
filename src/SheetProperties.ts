import { reactive } from 'vue'

const sheetProperties = reactive({
  // list of all sheets
  sheets: [],

  // name of the sheets
  names: [],

  // name of the chosen sheet
  name: ""
});

export default sheetProperties;
