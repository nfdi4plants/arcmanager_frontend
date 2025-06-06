import { reactive } from "vue";

const sheetProperties = reactive({
  // list of all sheets
  sheets: [] as Array<{
    columns: Array<string>;
    data: Array<Array<string>>;
    index: Array<number>;
  }>,

  // name of the sheets
  names: [] as Array<string>,

  // name of the chosen sheet
  name: "",

  // amount of rows
  rowIds: [1],

  // amount of columns
  columnIds: 1,

  // amount of rows per page of a sheet
  rowsPerPage: 50,
});

export default sheetProperties;
