/**
 * Core types for CodeForge data model definition system
 */

export interface DataType {
  type: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object' | 'enum';
  format?: string;
  items?: DataType;
  properties?: Record<string, DataType>;
  enum?: string[];
  required?: boolean;
  nullable?: boolean;
  default?: any;
  description?: string;
  validation?: ValidationRules;
}

export interface ValidationRules {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  email?: boolean;
  url?: boolean;
  uuid?: boolean;
  custom?: string[];
}

export interface Relationship {
  type: 'oneToOne' | 'oneToMany' | 'manyToOne' | 'manyToMany';
  target: string;
  foreignKey?: string;
  joinTable?: string;
  cascade?: boolean;
  eager?: boolean;
  onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT';
}

export interface EntityField {
  name: string;
  dataType: DataType;
  relationship?: Relationship;
  isPrimaryKey?: boolean;
  isUnique?: boolean;
  isIndexed?: boolean;
  isGenerated?: boolean;
  generationStrategy?: 'uuid' | 'increment' | 'timestamp';
}

export interface Entity {
  name: string;
  tableName?: string;
  description?: string;
  fields: EntityField[];
  indexes?: Index[];
  constraints?: Constraint[];
  timestamps?: boolean;
  softDelete?: boolean;
}

export interface Index {
  name: string;
  fields: string[];
  unique?: boolean;
  type?: 'btree' | 'hash' | 'gin' | 'gist';
}

export interface Constraint {
  name: string;
  type: 'check' | 'unique' | 'foreignKey';
  fields: string[];
  expression?: string;
  references?: {
    table: string;
    fields: string[];
  };
}

export interface DataModel {
  name: string;
  version: string;
  description?: string;
  entities: Entity[];
  enums?: EnumDefinition[];
  metadata?: Record<string, any>;
}

export interface EnumDefinition {
  name: string;
  values: string[];
  description?: string;
}

export interface ProjectConfig {
  project: {
    name: string;
    description?: string;
    version: string;
    author?: string;
  };
  database: {
    type: 'postgresql' | 'mysql' | 'mongodb' | 'sqlite';
    host?: string;
    port?: number;
    database?: string;
    schema?: string;
  };
  features: {
    authentication?: boolean;
    authorization?: boolean;
    swagger?: boolean;
    asyncapi?: boolean;
    docker?: boolean;
    testing?: boolean;
    logging?: boolean;
    monitoring?: boolean;
  };
  generation: {
    outputDir?: string;
    templateDir?: string;
    overwrite?: boolean;
    backup?: boolean;
  };
  github?: {
    owner: string;
    token?: string;
    private?: boolean;
    description?: string;
    topics?: string[];
  };
}

export interface GenerationContext {
  config: ProjectConfig;
  dataModel: DataModel;
  outputPath: string;
  templatePath: string;
  variables: Record<string, any>;
}

export interface GenerationResult {
  success: boolean;
  files: GeneratedFile[];
  errors: string[];
  warnings: string[];
}

export interface GeneratedFile {
  path: string;
  content: string;
  type: 'source' | 'config' | 'documentation' | 'test';
  language?: string;
}

export interface TemplateData {
  project: ProjectConfig['project'];
  entities: Entity[];
  enums: EnumDefinition[];
  database: ProjectConfig['database'];
  features: ProjectConfig['features'];
  helpers: Record<string, any>;
}
