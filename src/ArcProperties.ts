import { reactive } from "vue";

const arcProperties = reactive({
  // name of the arc
  identifier: "",

  // default branch of the arc
  branch: "main",

  // list containing the names of the different branches
  branches: [] as Array<string>,

  // url of the arc
  url: "",

  // list of changes in the arc
  changes: "",

  // list containing the names of studies and assays
  studies: [""],
  assays: [""],
});

export default arcProperties;
