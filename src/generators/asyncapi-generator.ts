import { DataModel, Entity, EntityField, DataType, ProjectConfig, GenerationResult, GeneratedFile } from '../core/types';
import * as yaml from 'yaml';

export interface AsyncAPISpec {
  asyncapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
    contact?: {
      name?: string;
      email?: string;
    };
  };
  servers: Record<string, any>;
  channels: Record<string, any>;
  components: {
    messages: Record<string, any>;
    schemas: Record<string, any>;
    messageTraits?: Record<string, any>;
    operationTraits?: Record<string, any>;
  };
}

export class AsyncAPIGenerator {
  private config: ProjectConfig;
  private dataModel: DataModel;

  constructor(config: ProjectConfig, dataModel: DataModel) {
    this.config = config;
    this.dataModel = dataModel;
  }

  public generate(): GenerationResult {
    try {
      const spec = this.generateAsyncAPISpec();
      const files: GeneratedFile[] = [
        {
          path: 'asyncapi.json',
          content: JSON.stringify(spec, null, 2),
          type: 'config',
          language: 'json'
        },
        {
          path: 'asyncapi.yaml',
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

  private generateAsyncAPISpec(): AsyncAPISpec {
    const spec: AsyncAPISpec = {
      asyncapi: '2.6.0',
      info: {
        title: `${this.config.project.name} Events`,
        version: this.config.project.version,
        description: `Event-driven API for ${this.config.project.name}`
      },
      servers: this.generateServers(),
      channels: {},
      components: {
        messages: {},
        schemas: {}
      }
    };

    // Add contact info if available
    if (this.config.project.author) {
      spec.info.contact = {
        name: this.config.project.author
      };
    }

    // Generate schemas for entities
    this.generateSchemas(spec);

    // Generate channels and messages for entity events
    this.generateChannels(spec);

    // Generate common message traits
    this.generateMessageTraits(spec);

    return spec;
  }

  private generateServers(): Record<string, any> {
    const servers: Record<string, any> = {};

    // Default message broker configurations
    servers.development = {
      url: 'localhost:5672',
      protocol: 'amqp',
      description: 'Development RabbitMQ server',
      variables: {
        port: {
          description: 'RabbitMQ port',
          default: '5672'
        }
      }
    };

    servers.production = {
      url: 'message-broker.example.com:5672',
      protocol: 'amqp',
      description: 'Production RabbitMQ server'
    };

    // Add Redis if needed for real-time features
    servers.redis = {
      url: 'localhost:6379',
      protocol: 'redis',
      description: 'Redis server for real-time events'
    };

    return servers;
  }

  private generateSchemas(spec: AsyncAPISpec): void {
    // Generate schemas for entities
    for (const entity of this.dataModel.entities) {
      spec.components.schemas[entity.name] = this.entityToAsyncAPISchema(entity);
      spec.components.schemas[`${entity.name}Event`] = this.generateEventSchema(entity);
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

    // Add common event schemas
    spec.components.schemas.EventMetadata = {
      type: 'object',
      properties: {
        eventId: {
          type: 'string',
          format: 'uuid',
          description: 'Unique event identifier'
        },
        eventType: {
          type: 'string',
          description: 'Type of the event'
        },
        timestamp: {
          type: 'string',
          format: 'date-time',
          description: 'Event timestamp'
        },
        version: {
          type: 'string',
          description: 'Event schema version'
        },
        source: {
          type: 'string',
          description: 'Event source service'
        },
        correlationId: {
          type: 'string',
          format: 'uuid',
          description: 'Correlation ID for tracing'
        }
      },
      required: ['eventId', 'eventType', 'timestamp', 'version', 'source']
    };
  }

  private entityToAsyncAPISchema(entity: Entity): any {
    const schema: any = {
      type: 'object',
      description: entity.description,
      properties: {},
      required: []
    };

    for (const field of entity.fields) {
      // Skip relationship fields in event schemas
      if (field.relationship) {
        continue;
      }

      schema.properties[field.name] = this.dataTypeToAsyncAPIProperty(field.dataType);
      
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

  private generateEventSchema(entity: Entity): any {
    return {
      type: 'object',
      description: `Event payload for ${entity.name} operations`,
      properties: {
        metadata: {
          $ref: '#/components/schemas/EventMetadata'
        },
        data: {
          $ref: `#/components/schemas/${entity.name}`
        },
        previousData: {
          $ref: `#/components/schemas/${entity.name}`,
          description: 'Previous state for update/delete events'
        }
      },
      required: ['metadata', 'data']
    };
  }

  private dataTypeToAsyncAPIProperty(dataType: DataType): any {
    const property: any = {
      description: dataType.description
    };

    switch (dataType.type) {
      case 'string':
        property.type = 'string';
        if (dataType.format) {
          property.format = dataType.format;
        }
        break;

      case 'number':
        property.type = dataType.format === 'int32' || dataType.format === 'int64' ? 'integer' : 'number';
        if (dataType.format) property.format = dataType.format;
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
          property.items = this.dataTypeToAsyncAPIProperty(dataType.items);
        }
        break;

      case 'object':
        property.type = 'object';
        if (dataType.properties) {
          property.properties = {};
          for (const [key, value] of Object.entries(dataType.properties)) {
            property.properties[key] = this.dataTypeToAsyncAPIProperty(value);
          }
        }
        break;

      case 'enum':
        if (dataType.enum && Array.isArray(dataType.enum)) {
          property.type = 'string';
          property.enum = dataType.enum;
        } else if (dataType.enum && typeof dataType.enum[0] === 'string') {
          property.$ref = `#/components/schemas/${dataType.enum[0]}`;
        }
        break;
    }

    if (dataType.default !== undefined) {
      property.default = dataType.default;
    }

    return property;
  }

  private generateChannels(spec: AsyncAPISpec): void {
    for (const entity of this.dataModel.entities) {
      const entityName = entity.name.toLowerCase();
      
      // Entity lifecycle events
      spec.channels[`${entityName}.created`] = {
        description: `${entity.name} created events`,
        publish: {
          operationId: `on${entity.name}Created`,
          summary: `Handle ${entity.name} created event`,
          message: {
            $ref: `#/components/messages/${entity.name}CreatedMessage`
          }
        }
      };

      spec.channels[`${entityName}.updated`] = {
        description: `${entity.name} updated events`,
        publish: {
          operationId: `on${entity.name}Updated`,
          summary: `Handle ${entity.name} updated event`,
          message: {
            $ref: `#/components/messages/${entity.name}UpdatedMessage`
          }
        }
      };

      spec.channels[`${entityName}.deleted`] = {
        description: `${entity.name} deleted events`,
        publish: {
          operationId: `on${entity.name}Deleted`,
          summary: `Handle ${entity.name} deleted event`,
          message: {
            $ref: `#/components/messages/${entity.name}DeletedMessage`
          }
        }
      };

      // Generate corresponding messages
      this.generateMessages(spec, entity);
    }

    // Add system-wide channels
    spec.channels['system.health'] = {
      description: 'System health check events',
      subscribe: {
        operationId: 'publishHealthCheck',
        summary: 'Publish system health status',
        message: {
          $ref: '#/components/messages/HealthCheckMessage'
        }
      }
    };

    // Generate system messages
    this.generateSystemMessages(spec);
  }

  private generateMessages(spec: AsyncAPISpec, entity: Entity): void {
    const entityName = entity.name;

    spec.components.messages[`${entityName}CreatedMessage`] = {
      name: `${entityName}Created`,
      title: `${entityName} Created`,
      summary: `A ${entityName} was created`,
      contentType: 'application/json',
      traits: [
        { $ref: '#/components/messageTraits/commonHeaders' }
      ],
      payload: {
        $ref: `#/components/schemas/${entityName}Event`
      },
      examples: [
        {
          name: `${entityName}CreatedExample`,
          summary: `Example of ${entityName} created event`,
          payload: this.generateExamplePayload(entity, 'created')
        }
      ]
    };

    spec.components.messages[`${entityName}UpdatedMessage`] = {
      name: `${entityName}Updated`,
      title: `${entityName} Updated`,
      summary: `A ${entityName} was updated`,
      contentType: 'application/json',
      traits: [
        { $ref: '#/components/messageTraits/commonHeaders' }
      ],
      payload: {
        $ref: `#/components/schemas/${entityName}Event`
      }
    };

    spec.components.messages[`${entityName}DeletedMessage`] = {
      name: `${entityName}Deleted`,
      title: `${entityName} Deleted`,
      summary: `A ${entityName} was deleted`,
      contentType: 'application/json',
      traits: [
        { $ref: '#/components/messageTraits/commonHeaders' }
      ],
      payload: {
        $ref: `#/components/schemas/${entityName}Event`
      }
    };
  }

  private generateSystemMessages(spec: AsyncAPISpec): void {
    spec.components.messages.HealthCheckMessage = {
      name: 'HealthCheck',
      title: 'System Health Check',
      summary: 'System health status information',
      contentType: 'application/json',
      payload: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['healthy', 'degraded', 'unhealthy']
          },
          timestamp: {
            type: 'string',
            format: 'date-time'
          },
          services: {
            type: 'object',
            additionalProperties: {
              type: 'object',
              properties: {
                status: {
                  type: 'string',
                  enum: ['up', 'down']
                },
                responseTime: {
                  type: 'number',
                  description: 'Response time in milliseconds'
                }
              }
            }
          }
        },
        required: ['status', 'timestamp']
      }
    };
  }

  private generateMessageTraits(spec: AsyncAPISpec): void {
    spec.components.messageTraits = {
      commonHeaders: {
        headers: {
          type: 'object',
          properties: {
            'x-correlation-id': {
              type: 'string',
              format: 'uuid',
              description: 'Correlation ID for request tracing'
            },
            'x-request-id': {
              type: 'string',
              format: 'uuid',
              description: 'Unique request identifier'
            },
            'x-user-id': {
              type: 'string',
              description: 'ID of the user who triggered the event'
            },
            'x-source-service': {
              type: 'string',
              description: 'Service that published the event'
            }
          }
        }
      }
    };
  }

  private generateExamplePayload(entity: Entity, eventType: string): any {
    const example: any = {
      metadata: {
        eventId: '123e4567-e89b-12d3-a456-426614174000',
        eventType: `${entity.name}.${eventType}`,
        timestamp: '2023-01-01T12:00:00Z',
        version: '1.0.0',
        source: this.config.project.name,
        correlationId: '123e4567-e89b-12d3-a456-426614174001'
      },
      data: {}
    };

    // Generate example data based on entity fields
    for (const field of entity.fields) {
      if (field.relationship) continue;

      example.data[field.name] = this.generateExampleValue(field);
    }

    if (entity.timestamps) {
      example.data.createdAt = '2023-01-01T12:00:00Z';
      example.data.updatedAt = '2023-01-01T12:00:00Z';
    }

    return example;
  }

  private generateExampleValue(field: EntityField): any {
    const dataType = field.dataType;

    switch (dataType.type) {
      case 'string':
        if (dataType.format === 'uuid') return '123e4567-e89b-12d3-a456-426614174000';
        if (dataType.format === 'email') return 'user@example.com';
        if (dataType.format === 'url') return 'https://example.com';
        return `example ${field.name}`;

      case 'number':
        return dataType.format?.includes('int') ? 42 : 3.14;

      case 'boolean':
        return true;

      case 'date':
        return '2023-01-01T12:00:00Z';

      case 'array':
        return [];

      case 'object':
        return {};

      case 'enum':
        return dataType.enum && Array.isArray(dataType.enum) ? dataType.enum[0] : 'EXAMPLE_VALUE';

      default:
        return null;
    }
  }
}
