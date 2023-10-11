import { reactive } from 'vue'

const fileProperties = reactive({
  // name of the file
  name: "",

  // list of all entries
  content: "",

  // id of the repo
  id: 0,
  
  //path to the file
  path: "",
});

export default fileProperties;
