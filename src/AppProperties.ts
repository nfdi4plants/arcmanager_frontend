import { reactive } from "vue";

const appProperties = reactive({
  // is user logged in?
  loggedIn: false,

  //address of the backend
  backend: "https://nfdi4plants.de/arcmanager/api/v1/",
  //backend: "http://localhost:8000/arcmanager/api/v1/",

  // displays the right side
  showIsaView: false
});

export default appProperties;
