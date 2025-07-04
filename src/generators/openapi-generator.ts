import { DataModel, Entity, EntityField, DataType, ProjectConfig, GenerationResult, GeneratedFile } from '../core/types';
import * as yaml from 'yaml';

export interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    description?: string;
    version: string;
    contact?: {
      name?: string;
      email?: string;
    };
  };
  servers: Array<{
    url: string;
    description: string;
  }>;
  paths: Record<string, any>;
  components: {
    schemas: Record<string, any>;
    securitySchemes?: Record<string, any>;
    responses?: Record<string, any>;
    parameters?: Record<string, any>;
  };
  security?: Array<Record<string, any>>;
  tags: Array<{
    name: string;
    description: string;
  }>;
}

export class OpenAPIGenerator {
  private config: ProjectConfig;
  private dataModel: DataModel;

  constructor(config: ProjectConfig, dataModel: DataModel) {
    this.config = config;
    this.dataModel = dataModel;
  }

  public generate(): GenerationResult {
    try {
      const spec = this.generateOpenAPISpec();
      const files: GeneratedFile[] = [
        {
          path: 'openapi.json',
          content: JSON.stringify(spec, null, 2),
          type: 'config',
          language: 'json'
        },
        {
          path: 'openapi.yaml',
          content: yaml.stringify(spec),
          type: 'config',
          language: 'yaml'
        }
      ];

      return {
        success: true,
        files,
        errors: [],
        warnings: []
      };
    } catch (error) {
      return {
        success: false,
        files: [],
        errors: [error instanceof Error ? error.message : String(error)],
        warnings: []
      };
    }
  }

  private generateOpenAPISpec(): OpenAPISpec {
    const spec: OpenAPISpec = {
      openapi: '3.0.3',
      info: {
        title: this.config.project.name,
        description: this.config.project.description,
        version: this.config.project.version
      },
      servers: [
        {
          url: 'http://localhost:3000',
          description: 'Development server'
        },
        {
          url: 'https://api.example.com',
          description: 'Production server'
        }
      ],
      paths: {},
      components: {
        schemas: {},
        responses: this.generateCommonResponses()
      },
      tags: []
    };

    // Add contact info if available
    if (this.config.project.author) {
      spec.info.contact = {
        name: this.config.project.author
      };
    }

    // Generate schemas for entities
    this.generateSchemas(spec);

    // Generate paths for CRUD operations
    this.generatePaths(spec);

    // Add security schemes if authentication is enabled
    if (this.config.features.authentication) {
      this.addSecuritySchemes(spec);
    }

    // Generate tags for entities
    this.generateTags(spec);

    return spec;
  }

  private generateSchemas(spec: OpenAPISpec): void {
    // Generate schemas for entities
    for (const entity of this.dataModel.entities) {
      spec.components.schemas[entity.name] = this.entityToSchema(entity);
      spec.components.schemas[`Create${entity.name}Dto`] = this.entityToCreateDto(entity);
      spec.components.schemas[`Update${entity.name}Dto`] = this.entityToUpdateDto(entity);
    }

    // Generate schemas for enums
    if (this.dataModel.enums) {
      for (const enumDef of this.dataModel.enums) {
        spec.components.schemas[enumDef.name] = {
          type: 'string',
          enum: enumDef.values,
          description: enumDef.description
        };
      }
    }

    // Add common schemas
    spec.components.schemas.PaginationMeta = {
      type: 'object',
      properties: {
        page: { type: 'integer', minimum: 1 },
        limit: { type: 'integer', minimum: 1, maximum: 100 },
        total: { type: 'integer', minimum: 0 },
        totalPages: { type: 'integer', minimum: 0 }
      },
      required: ['page', 'limit', 'total', 'totalPages']
    };

    spec.components.schemas.ErrorResponse = {
      type: 'object',
      properties: {
        statusCode: { type: 'integer' },
        message: { type: 'string' },
        error: { type: 'string' },
        timestamp: { type: 'string', format: 'date-time' },
        path: { type: 'string' }
      },
      required: ['statusCode', 'message', 'timestamp', 'path']
    };
  }

  private entityToSchema(entity: Entity): any {
    const schema: any = {
      type: 'object',
      description: entity.description,
      properties: {},
      required: []
    };

    for (const field of entity.fields) {
      // Skip relationship fields in the main schema
      if (field.relationship) {
        continue;
      }

      schema.properties[field.name] = this.dataTypeToOpenAPIProperty(field.dataType);
      
      if (field.dataType.required) {
        schema.required.push(field.name);
      }
    }

    // Add timestamp fields if enabled
    if (entity.timestamps) {
      schema.properties.createdAt = {
        type: 'string',
        format: 'date-time',
        description: 'Creation timestamp'
      };
      schema.properties.updatedAt = {
        type: 'string',
        format: 'date-time',
        description: 'Last update timestamp'
      };
    }

    return schema;
  }

  private entityToCreateDto(entity: Entity): any {
    const schema: any = {
      type: 'object',
      description: `Data transfer object for creating ${entity.name}`,
      properties: {},
      required: []
    };

    for (const field of entity.fields) {
      // Skip generated fields and relationships
      if (field.isGenerated || field.isPrimaryKey || field.relationship) {
        continue;
      }

      schema.properties[field.name] = this.dataTypeToOpenAPIProperty(field.dataType);
      
      if (field.dataType.required) {
        schema.required.push(field.name);
      }
    }

    return schema;
  }

  private entityToUpdateDto(entity: Entity): any {
    const createDto = this.entityToCreateDto(entity);
    return {
      ...createDto,
      description: `Data transfer object for updating ${entity.name}`,
      required: [] // All fields are optional for updates
    };
  }

  private dataTypeToOpenAPIProperty(dataType: DataType): any {
    const property: any = {
      description: dataType.description
    };

    switch (dataType.type) {
      case 'string':
        property.type = 'string';
        if (dataType.format) {
          property.format = dataType.format;
        }
        if (dataType.validation) {
          if (dataType.validation.minLength) property.minLength = dataType.validation.minLength;
          if (dataType.validation.maxLength) property.maxLength = dataType.validation.maxLength;
          if (dataType.validation.pattern) property.pattern = dataType.validation.pattern;
        }
        break;

      case 'number':
        property.type = dataType.format === 'int32' || dataType.format === 'int64' ? 'integer' : 'number';
        if (dataType.format) property.format = dataType.format;
        if (dataType.validation) {
          if (dataType.validation.min !== undefined) property.minimum = dataType.validation.min;
          if (dataType.validation.max !== undefined) property.maximum = dataType.validation.max;
        }
        break;

      case 'boolean':
        property.type = 'boolean';
        break;

      case 'date':
        property.type = 'string';
        property.format = dataType.format || 'date-time';
        break;

      case 'array':
        property.type = 'array';
        if (dataType.items) {
          property.items = this.dataTypeToOpenAPIProperty(dataType.items);
        }
        break;

      case 'object':
        property.type = 'object';
        if (dataType.properties) {
          property.properties = {};
          for (const [key, value] of Object.entries(dataType.properties)) {
            property.properties[key] = this.dataTypeToOpenAPIProperty(value);
          }
        }
        break;

      case 'enum':
        if (dataType.enum && Array.isArray(dataType.enum)) {
          property.type = 'string';
          property.enum = dataType.enum;
        } else if (dataType.enum && typeof dataType.enum[0] === 'string') {
          // Reference to enum definition
          property.$ref = `#/components/schemas/${dataType.enum[0]}`;
        }
        break;
    }

    if (dataType.default !== undefined) {
      property.default = dataType.default;
    }

    if (dataType.nullable) {
      property.nullable = true;
    }

    return property;
  }

  private generatePaths(spec: OpenAPISpec): void {
    for (const entity of this.dataModel.entities) {
      const entityPath = `/${entity.name.toLowerCase()}s`;
      const entityIdPath = `${entityPath}/{id}`;

      spec.paths[entityPath] = {
        get: this.generateListOperation(entity),
        post: this.generateCreateOperation(entity)
      };

      spec.paths[entityIdPath] = {
        get: this.generateGetOperation(entity),
        put: this.generateUpdateOperation(entity),
        delete: this.generateDeleteOperation(entity)
      };
    }
  }

  private generateListOperation(entity: Entity): any {
    return {
      tags: [entity.name],
      summary: `List ${entity.name}s`,
      description: `Retrieve a paginated list of ${entity.name}s`,
      parameters: [
        {
          name: 'page',
          in: 'query',
          description: 'Page number',
          schema: { type: 'integer', minimum: 1, default: 1 }
        },
        {
          name: 'limit',
          in: 'query',
          description: 'Number of items per page',
          schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 }
        },
        {
          name: 'sort',
          in: 'query',
          description: 'Sort field and direction (e.g., "name:asc")',
          schema: { type: 'string' }
        }
      ],
      responses: {
        '200': {
          description: 'Successful response',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'array',
                    items: { $ref: `#/components/schemas/${entity.name}` }
                  },
                  meta: { $ref: '#/components/schemas/PaginationMeta' }
                }
              }
            }
          }
        },
        '400': { $ref: '#/components/responses/BadRequest' },
        '500': { $ref: '#/components/responses/InternalServerError' }
      }
    };
  }

  private generateCreateOperation(entity: Entity): any {
    return {
      tags: [entity.name],
      summary: `Create ${entity.name}`,
      description: `Create a new ${entity.name}`,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: `#/components/schemas/Create${entity.name}Dto` }
          }
        }
      },
      responses: {
        '201': {
          description: 'Created successfully',
          content: {
            'application/json': {
              schema: { $ref: `#/components/schemas/${entity.name}` }
            }
          }
        },
        '400': { $ref: '#/components/responses/BadRequest' },
        '500': { $ref: '#/components/responses/InternalServerError' }
      }
    };
  }

  private generateGetOperation(entity: Entity): any {
    return {
      tags: [entity.name],
      summary: `Get ${entity.name}`,
      description: `Retrieve a ${entity.name} by ID`,
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: `${entity.name} ID`,
          schema: { type: 'string' }
        }
      ],
      responses: {
        '200': {
          description: 'Successful response',
          content: {
            'application/json': {
              schema: { $ref: `#/components/schemas/${entity.name}` }
            }
          }
        },
        '404': { $ref: '#/components/responses/NotFound' },
        '500': { $ref: '#/components/responses/InternalServerError' }
      }
    };
  }

  private generateUpdateOperation(entity: Entity): any {
    return {
      tags: [entity.name],
      summary: `Update ${entity.name}`,
      description: `Update a ${entity.name} by ID`,
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: `${entity.name} ID`,
          schema: { type: 'string' }
        }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: `#/components/schemas/Update${entity.name}Dto` }
          }
        }
      },
      responses: {
        '200': {
          description: 'Updated successfully',
          content: {
            'application/json': {
              schema: { $ref: `#/components/schemas/${entity.name}` }
            }
          }
        },
        '400': { $ref: '#/components/responses/BadRequest' },
        '404': { $ref: '#/components/responses/NotFound' },
        '500': { $ref: '#/components/responses/InternalServerError' }
      }
    };
  }

  private generateDeleteOperation(entity: Entity): any {
    return {
      tags: [entity.name],
      summary: `Delete ${entity.name}`,
      description: `Delete a ${entity.name} by ID`,
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: `${entity.name} ID`,
          schema: { type: 'string' }
        }
      ],
      responses: {
        '204': {
          description: 'Deleted successfully'
        },
        '404': { $ref: '#/components/responses/NotFound' },
        '500': { $ref: '#/components/responses/InternalServerError' }
      }
    };
  }

  private generateCommonResponses(): Record<string, any> {
    return {
      BadRequest: {
        description: 'Bad Request',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' }
          }
        }
      },
      NotFound: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' }
          }
        }
      },
      InternalServerError: {
        description: 'Internal Server Error',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' }
          }
        }
      }
    };
  }

  private addSecuritySchemes(spec: OpenAPISpec): void {
    spec.components.securitySchemes = {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    };

    spec.security = [
      {
        bearerAuth: []
      }
    ];
  }

  private generateTags(spec: OpenAPISpec): void {
    for (const entity of this.dataModel.entities) {
      spec.tags.push({
        name: entity.name,
        description: entity.description || `${entity.name} operations`
      });
    }
  }
}
