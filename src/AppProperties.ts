import { reactive } from "vue";

const appProperties = reactive({
  // is user logged in?
  loggedIn: false,

  //address of the backend
  backend: "https://nfdi4plants.de/arcmanager/api/v1/",
  //backend: "http://localhost:8000/arcmanager/api/v1/",

  // displays the right side
  showIsaView: false,

  // the list containing the arcs/arc folders
  arcList: true,

  // displays dark mode
  dark: false,

  //version of the app
  version: "0.6.2"
});

export default appProperties;
