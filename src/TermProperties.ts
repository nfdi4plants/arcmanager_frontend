import { reactive } from "vue";

class Term {
  Accession: string;
  Name: string;
  Description: string;
  IsObsolete: boolean;
  FK_Ontology: string;

  constructor(
    Accession: string,
    Name: string,
    Description: string,
    IsObsolete: boolean,
    Fk_Ontology: string
  ) {
    this.Accession = Accession;
    this.Name = Name;
    this.Description = Description;
    this.IsObsolete = IsObsolete;
    this.FK_Ontology = Fk_Ontology;
  }
}

const termProperties = reactive({
  // list of all terms
  terms: [] as Array<Term>,

  // list of terms for the building blocks
  buildingBlocks: [] as Array<Term>,

  // list of unit terms for the building blocks
  unitTerms: [] as Array<Term>,

  parameterType: "Parameter",
});

export { termProperties, Term };
