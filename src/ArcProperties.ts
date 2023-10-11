import { reactive } from 'vue'

const arcProperties = reactive({
  // name of the arc
  identifier: '',

  // default branch of the arc
  branch: '',

  // url of the arc
  url: '',
});

export default arcProperties;
