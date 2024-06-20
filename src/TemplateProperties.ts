import { reactive } from "vue";

class Template {
  id: string;
  authors: Array<Authors>;
  description: string;
  endpoint_repositories?: Array<any>;
  last_updated: string;
  name: string;
  organisation: string;
  table: Table;
  tags?: Array<Tag>;
  version: string;

  constructor(
    id: string,
    authors: Array<Authors>,
    description: string,
    endpoint_repositories = [],
    last_updated: string,
    name: string,
    organisation: string,
    table: Table,
    tags: Array<Tag> = [],
    version: string
  ) {
    this.id = id;
    this.authors = authors;
    this.description = description;
    this.endpoint_repositories = endpoint_repositories;
    this.last_updated = last_updated;
    this.name = name;
    this.organisation = organisation;
    this.table = table;
    this.tags = tags;
    this.version = version;
  }
}

class Authors {
  firstName: string;
  lastName: string;
  email: string;

  constructor(firstName: string, lastName: string, email: string) {
    this.firstName = firstName;
    this.lastName = lastName;
    this.email = email;
  }
}

class Table {
  name: string;
  header: Array<{
    headertype: string;
    values: Array<string | Tag>;
  }>;
  values: Array<
    [
      Array<number>,
      {
        celltype: string;
        values: Array<string | Tag>;
      }
    ]
  >;

  constructor(
    name: string,
    header: Array<{ headertype: string; values: Array<string | Tag> }>,
    values: Array<
      [Array<number>, { celltype: string; values: Array<string | Tag> }]
    >
  ) {
    this.name = name;
    this.header = header;
    this.values = values;
  }
}

class Tag {
  annotationValue: string;
  termSource: string;
  termAccession: string;

  constructor(
    annotationValue: string,
    termSource: string,
    termAccession: string
  ) {
    this.annotationValue = annotationValue;
    this.termSource = termSource;
    this.termAccession = termAccession;
  }
}

const templateProperties = reactive({
  // list of all templates
  templates: [] as Array<Template>,

  // list of the filtered templates
  filtered: [] as Array<Template>,

  // the chosen template
  template: [] as Array<{ Type: string; Accession?: string; Custom?: boolean }>,

  // the content of the cells of the chosen template
  content: [] as Array<Array<string>>,

  // id of the cell to overwrite
  id: 0,

  // id of the row to overwrite
  rowId: 1,
});

export { templateProperties, Template, Table, Tag };
