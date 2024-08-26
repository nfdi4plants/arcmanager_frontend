import { reactive } from "vue";

const fileProperties = reactive({
  // name of the file
  name: "",

  // list of all entries
  content: "",

  buffer: new Uint8Array(),

  pdfContent: "",

  // id of the repo
  id: 0,

  //path to the file
  path: "",
});

export default fileProperties;
