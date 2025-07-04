import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import * as fs from 'fs-extra';
import * as path from 'path';
import { DataModel, Entity, ProjectConfig } from './types';

export class DataModelParser {
  private ajv: Ajv;
  private schema: any;

  constructor() {
    this.ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(this.ajv);
    this.loadSchema();
  }

  private loadSchema(): void {
    const schemaPath = path.join(__dirname, '../schemas/data-model.schema.json');
    this.schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
    this.ajv.addSchema(this.schema, 'data-model');
  }

  /**
   * Parse and validate a data model from JSON
   */
  public parseFromJson(jsonContent: string): DataModel {
    let data: any;
    
    try {
      data = JSON.parse(jsonContent);
    } catch (error) {
      throw new Error(`Invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
    }

    return this.validateAndParse(data);
  }

  /**
   * Parse and validate a data model from file
   */
  public async parseFromFile(filePath: string): Promise<DataModel> {
    if (!await fs.pathExists(filePath)) {
      throw new Error(`Data model file not found: ${filePath}`);
    }

    const content = await fs.readFile(filePath, 'utf-8');
    const ext = path.extname(filePath).toLowerCase();

    switch (ext) {
      case '.json':
        return this.parseFromJson(content);
      case '.yaml':
      case '.yml':
        return this.parseFromYaml(content);
      default:
        throw new Error(`Unsupported file format: ${ext}`);
    }
  }

  /**
   * Parse and validate a data model from YAML
   */
  public parseFromYaml(yamlContent: string): DataModel {
    try {
      const yaml = require('yaml');
      const data = yaml.parse(yamlContent);
      return this.validateAndParse(data);
    } catch (error) {
      throw new Error(`Invalid YAML: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Validate and parse data model
   */
  private validateAndParse(data: any): DataModel {
    const validate = this.ajv.getSchema('data-model');
    
    if (!validate) {
      throw new Error('Schema not loaded');
    }

    const isValid = validate(data);
    
    if (!isValid) {
      const errors = validate.errors?.map(err => 
        `${err.instancePath}: ${err.message}`
      ).join(', ') || 'Unknown validation error';
      
      throw new Error(`Data model validation failed: ${errors}`);
    }

    // Additional business logic validation
    this.validateBusinessRules(data);

    return data as DataModel;
  }

  /**
   * Validate business rules that can't be expressed in JSON Schema
   */
  private validateBusinessRules(dataModel: any): void {
    const entityNames = new Set<string>();
    const errors: string[] = [];

    // Check for duplicate entity names
    for (const entity of dataModel.entities) {
      if (entityNames.has(entity.name)) {
        errors.push(`Duplicate entity name: ${entity.name}`);
      }
      entityNames.add(entity.name);
    }

    // Validate relationships
    for (const entity of dataModel.entities) {
      for (const field of entity.fields) {
        if (field.relationship) {
          const targetEntity = field.relationship.target;
          
          if (!entityNames.has(targetEntity)) {
            errors.push(
              `Entity ${entity.name}.${field.name}: ` +
              `relationship target '${targetEntity}' does not exist`
            );
          }

          // Validate foreign key for many-to-one and one-to-one relationships
          if (['manyToOne', 'oneToOne'].includes(field.relationship.type)) {
            if (!field.relationship.foreignKey) {
              errors.push(
                `Entity ${entity.name}.${field.name}: ` +
                `${field.relationship.type} relationship requires foreignKey`
              );
            }
          }

          // Validate join table for many-to-many relationships
          if (field.relationship.type === 'manyToMany') {
            if (!field.relationship.joinTable) {
              errors.push(
                `Entity ${entity.name}.${field.name}: ` +
                `manyToMany relationship requires joinTable`
              );
            }
          }
        }
      }

      // Validate that each entity has at least one primary key
      const primaryKeys = entity.fields.filter((f: any) => f.isPrimaryKey);
      if (primaryKeys.length === 0) {
        errors.push(`Entity ${entity.name}: must have at least one primary key field`);
      }
    }

    // Validate enum references
    const enumNames = new Set(dataModel.enums?.map((e: any) => e.name) || []);
    for (const entity of dataModel.entities) {
      for (const field of entity.fields) {
        if (field.dataType.type === 'enum' && field.dataType.enum) {
          // Check if it's a reference to a defined enum
          const enumRef = field.dataType.enum[0];
          if (enumRef && !enumNames.has(enumRef) && !Array.isArray(field.dataType.enum)) {
            errors.push(
              `Entity ${entity.name}.${field.name}: ` +
              `enum reference '${enumRef}' does not exist`
            );
          }
        }
      }
    }

    if (errors.length > 0) {
      throw new Error(`Business rule validation failed:\n${errors.join('\n')}`);
    }
  }

  /**
   * Generate a sample data model for reference
   */
  public generateSample(): DataModel {
    return {
      name: 'BlogAPI',
      version: '1.0.0',
      description: 'A simple blog API data model',
      entities: [
        {
          name: 'User',
          description: 'User entity for authentication and authorization',
          fields: [
            {
              name: 'id',
              dataType: { type: 'string', format: 'uuid' },
              isPrimaryKey: true,
              isGenerated: true,
              generationStrategy: 'uuid'
            },
            {
              name: 'email',
              dataType: { 
                type: 'string', 
                format: 'email',
                validation: { email: true }
              },
              isUnique: true
            },
            {
              name: 'name',
              dataType: { 
                type: 'string',
                validation: { minLength: 2, maxLength: 100 }
              }
            },
            {
              name: 'role',
              dataType: { type: 'enum', enum: ['UserRole'] }
            },
            {
              name: 'posts',
              dataType: { type: 'array', items: { type: 'object' } },
              relationship: {
                type: 'oneToMany',
                target: 'Post',
                foreignKey: 'authorId'
              }
            }
          ],
          timestamps: true
        },
        {
          name: 'Post',
          description: 'Blog post entity',
          fields: [
            {
              name: 'id',
              dataType: { type: 'string', format: 'uuid' },
              isPrimaryKey: true,
              isGenerated: true,
              generationStrategy: 'uuid'
            },
            {
              name: 'title',
              dataType: { 
                type: 'string',
                validation: { minLength: 1, maxLength: 200 }
              }
            },
            {
              name: 'content',
              dataType: { type: 'string' }
            },
            {
              name: 'published',
              dataType: { type: 'boolean', default: false }
            },
            {
              name: 'authorId',
              dataType: { type: 'string', format: 'uuid' }
            },
            {
              name: 'author',
              dataType: { type: 'object' },
              relationship: {
                type: 'manyToOne',
                target: 'User',
                foreignKey: 'authorId'
              }
            }
          ],
          timestamps: true,
          indexes: [
            {
              name: 'idx_post_author',
              fields: ['authorId']
            },
            {
              name: 'idx_post_published',
              fields: ['published']
            }
          ]
        }
      ],
      enums: [
        {
          name: 'UserRole',
          values: ['ADMIN', 'USER', 'MODERATOR'],
          description: 'User roles for authorization'
        }
      ]
    };
  }
}
