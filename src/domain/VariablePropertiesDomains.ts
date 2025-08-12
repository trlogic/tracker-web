import DataType from "./DataType";

export interface VariablePropertiesModel {
  dataType: string;
}

export interface VariableProperties {
  dataType:       DataType;
  dataStructure?: string;
}

export interface ArrayVariableProperties extends VariableProperties {
  properties: VariableProperties | ArrayVariableProperties | ObjectVariableProperties | CustomStructureProperties;
  dataType:   DataType;
}

export interface ArrayVariablePropertiesModel extends VariablePropertiesModel {
  properties:
    | VariableProperties
    | ArrayVariablePropertiesModel
    | ObjectVariablePropertiesModel
    | CustomStructureProperties;
  dataType: string;
}

export interface CustomStructureProperties extends VariableProperties {
  name: string;
}

export interface DateVariableProperties extends VariableProperties {
  format: string;
}

export interface DateVariablePropertiesModel extends VariablePropertiesModel {
  format: string;
}

export interface EntryProperties {
  name:        string;
  description: string | undefined;
  properties:  VariableProperties | ArrayVariableProperties | ObjectVariableProperties;
}

export interface ObjectVariableProperties extends VariableProperties {
  variables: EntryProperties[];
  dataType:  DataType;
}

export interface ObjectVariablePropertiesModel extends VariablePropertiesModel {
  variables: EntryPropertiesModel[];
  dataType:  string;
}

export interface EntryPropertiesModel {
  name:       string;
  properties: VariableProperties | ArrayVariableProperties | ObjectVariableProperties;
}
