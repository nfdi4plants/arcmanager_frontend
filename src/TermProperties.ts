import { reactive } from 'vue'

const termProperties = reactive({
  // list of all terms
  terms: [],

  // list of terms for the building blocks
  buildingBlocks: [],

  // list of unit terms for the building blocks
  unitTerms: []

});

export default termProperties;
