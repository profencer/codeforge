import { DataModel, Entity, EntityField, DataType, ProjectConfig, GenerationResult, GeneratedFile } from '../core/types';
import * as Handlebars from 'handlebars';
import * as fs from 'fs-extra';
import * as path from 'path';

export class NestJSGenerator {
  private config: ProjectConfig;
  private dataModel: DataModel;
  private templatePath: string;

  constructor(config: ProjectConfig, dataModel: DataModel, templatePath?: string) {
    this.config = config;
    this.dataModel = dataModel;
    this.templatePath = templatePath || path.join(__dirname, '../templates/nestjs');
    this.registerHandlebarsHelpers();
  }

  public async generate(): Promise<GenerationResult> {
    try {
      const files: GeneratedFile[] = [];

      // Generate package.json
      files.push(await this.generatePackageJson());

      // Generate main application files
      files.push(...await this.generateAppFiles());

      // Generate entities
      for (const entity of this.dataModel.entities) {
        files.push(...await this.generateEntityFiles(entity));
      }

      // Generate database configuration
      files.push(...await this.generateDatabaseFiles());

      // Generate authentication if enabled
      if (this.config.features.authentication) {
        files.push(...await this.generateAuthFiles());
      }

      // Generate configuration files
      files.push(...await this.generateConfigFiles());

      // Generate test files if enabled
      if (this.config.features.testing) {
        files.push(...await this.generateTestFiles());
      }

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

  private registerHandlebarsHelpers(): void {
    // Helper to convert to PascalCase
    Handlebars.registerHelper('pascalCase', (str: string) => {
      return str.charAt(0).toUpperCase() + str.slice(1);
    });

    // Helper to convert to camelCase
    Handlebars.registerHelper('camelCase', (str: string) => {
      return str.charAt(0).toLowerCase() + str.slice(1);
    });

    // Helper to convert to kebab-case
    Handlebars.registerHelper('kebabCase', (str: string) => {
      return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    });

    // Helper to convert to snake_case
    Handlebars.registerHelper('snakeCase', (str: string) => {
      return str.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
    });

    // Helper to pluralize entity names
    Handlebars.registerHelper('pluralize', (str: string) => {
      if (str.endsWith('y')) {
        return str.slice(0, -1) + 'ies';
      } else if (str.endsWith('s') || str.endsWith('sh') || str.endsWith('ch')) {
        return str + 'es';
      } else {
        return str + 's';
      }
    });

    // Helper to get TypeScript type from DataType
    Handlebars.registerHelper('tsType', (dataType: DataType) => {
      return this.dataTypeToTypeScript(dataType);
    });

    // Helper to get TypeORM column type
    Handlebars.registerHelper('columnType', (dataType: DataType) => {
      return this.dataTypeToColumnType(dataType);
    });

    // Helper to check if field is a relationship
    Handlebars.registerHelper('isRelationship', (field: EntityField) => {
      return !!field.relationship;
    });

    // Helper to get relationship decorator
    Handlebars.registerHelper('relationshipDecorator', (field: EntityField) => {
      if (!field.relationship) return '';

      const { type, target } = field.relationship;
      switch (type) {
        case 'oneToOne':
          return `@OneToOne(() => ${target})`;
        case 'oneToMany':
          return `@OneToMany(() => ${target}, ${target.toLowerCase()} => ${target.toLowerCase()}.${field.relationship.foreignKey})`;
        case 'manyToOne':
          return `@ManyToOne(() => ${target})`;
        case 'manyToMany':
          return `@ManyToMany(() => ${target})`;
        default:
          return '';
      }
    });

    // Helper for conditional rendering
    Handlebars.registerHelper('if_eq', function(this: any, a: any, b: any, options: any) {
      if (a === b) {
        return options.fn(this);
      }
      return options.inverse(this);
    });
  }

  private async generatePackageJson(): Promise<GeneratedFile> {
    const packageJson: any = {
      name: this.config.project.name.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      version: this.config.project.version,
      description: this.config.project.description,
      author: this.config.project.author,
      private: true,
      license: 'MIT',
      scripts: {
        build: 'nest build',
        format: 'prettier --write "src/**/*.ts" "test/**/*.ts"',
        start: 'nest start',
        'start:dev': 'nest start --watch',
        'start:debug': 'nest start --debug --watch',
        'start:prod': 'node dist/main',
        lint: 'eslint "{src,apps,libs,test}/**/*.ts" --fix',
        test: 'jest',
        'test:watch': 'jest --watch',
        'test:cov': 'jest --coverage',
        'test:debug': 'node --inspect-brk -r tsconfig-paths/register -r ts-node/register node_modules/.bin/jest --runInBand',
        'test:e2e': 'jest --config ./test/jest-e2e.json',
        'typeorm:migration:generate': 'typeorm-ts-node-commonjs migration:generate',
        'typeorm:migration:run': 'typeorm-ts-node-commonjs migration:run',
        'typeorm:migration:revert': 'typeorm-ts-node-commonjs migration:revert'
      },
      dependencies: {
        '@nestjs/common': '^10.0.0',
        '@nestjs/core': '^10.0.0',
        '@nestjs/platform-express': '^10.0.0',
        '@nestjs/typeorm': '^10.0.0',
        '@nestjs/config': '^3.0.0',
        '@nestjs/swagger': '^7.0.0',
        'typeorm': '^0.3.17',
        'class-validator': '^0.14.0',
        'class-transformer': '^0.5.1',
        'reflect-metadata': '^0.1.13',
        'rxjs': '^7.8.1',
        'swagger-ui-express': '^5.0.0'
      },
      devDependencies: {
        '@nestjs/cli': '^10.0.0',
        '@nestjs/schematics': '^10.0.0',
        '@nestjs/testing': '^10.0.0',
        '@types/express': '^4.17.17',
        '@types/jest': '^29.5.2',
        '@types/node': '^20.3.1',
        '@types/supertest': '^2.0.12',
        '@typescript-eslint/eslint-plugin': '^6.0.0',
        '@typescript-eslint/parser': '^6.0.0',
        'eslint': '^8.42.0',
        'eslint-config-prettier': '^9.0.0',
        'eslint-plugin-prettier': '^5.0.0',
        'jest': '^29.5.0',
        'prettier': '^3.0.0',
        'source-map-support': '^0.5.21',
        'supertest': '^6.3.3',
        'ts-jest': '^29.1.0',
        'ts-loader': '^9.4.3',
        'ts-node': '^10.9.1',
        'tsconfig-paths': '^4.2.0',
        'typescript': '^5.1.3'
      }
    };

    // Add database-specific dependencies
    switch (this.config.database.type) {
      case 'postgresql':
        packageJson.dependencies['pg'] = '^8.11.0';
        packageJson.devDependencies['@types/pg'] = '^8.10.2';
        break;
      case 'mysql':
        packageJson.dependencies['mysql2'] = '^3.6.0';
        break;
      case 'mongodb':
        packageJson.dependencies['mongodb'] = '^5.7.0';
        break;
      case 'sqlite':
        packageJson.dependencies['sqlite3'] = '^5.1.6';
        break;
    }

    // Add authentication dependencies if enabled
    if (this.config.features.authentication) {
      packageJson.dependencies['@nestjs/jwt'] = '^10.1.0';
      packageJson.dependencies['@nestjs/passport'] = '^10.0.0';
      packageJson.dependencies['passport'] = '^0.6.0';
      packageJson.dependencies['passport-jwt'] = '^4.0.1';
      packageJson.dependencies['passport-local'] = '^1.0.0';
      packageJson.dependencies['bcrypt'] = '^5.1.0';
      packageJson.devDependencies['@types/passport-jwt'] = '^3.0.9';
      packageJson.devDependencies['@types/passport-local'] = '^1.0.35';
      packageJson.devDependencies['@types/bcrypt'] = '^5.0.0';
    }

    return {
      path: 'package.json',
      content: JSON.stringify(packageJson, null, 2),
      type: 'config',
      language: 'json'
    };
  }

  private async generateAppFiles(): Promise<GeneratedFile[]> {
    const files: GeneratedFile[] = [];

    // Generate main.ts
    files.push({
      path: 'src/main.ts',
      content: this.generateMainFile(),
      type: 'source',
      language: 'typescript'
    });

    // Generate app.module.ts
    files.push({
      path: 'src/app.module.ts',
      content: this.generateAppModule(),
      type: 'source',
      language: 'typescript'
    });

    // Generate app.controller.ts
    files.push({
      path: 'src/app.controller.ts',
      content: this.generateAppController(),
      type: 'source',
      language: 'typescript'
    });

    // Generate app.service.ts
    files.push({
      path: 'src/app.service.ts',
      content: this.generateAppService(),
      type: 'source',
      language: 'typescript'
    });

    return files;
  }

  private generateMainFile(): string {
    return `import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors();

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // Global prefix
  app.setGlobalPrefix('api/v1');

${this.config.features.swagger ? `  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('${this.config.project.name}')
    .setDescription('${this.config.project.description || 'API Documentation'}')
    .setVersion('${this.config.project.version}')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
` : ''}
  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(\`🚀 Application is running on: http://localhost:\${port}\`);
${this.config.features.swagger ? `  console.log(\`📚 Swagger documentation: http://localhost:\${port}/api/docs\`);\n` : ''}
}

bootstrap();
`;
  }

  private generateAppModule(): string {
    const imports = [
      'Module',
      this.config.features.swagger ? 'ValidationPipe' : null
    ].filter(Boolean);

    const moduleImports = [
      'ConfigModule',
      'TypeOrmModule',
      ...this.dataModel.entities.map(entity => `${entity.name}Module`)
    ];

    if (this.config.features.authentication) {
      moduleImports.push('AuthModule');
    }

    return `import { ${imports.join(', ')} } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseConfig } from './config/database.config';
${this.dataModel.entities.map(entity =>
  `import { ${entity.name}Module } from './${entity.name.toLowerCase()}/${entity.name.toLowerCase()}.module';`
).join('\n')}
${this.config.features.authentication ? "import { AuthModule } from './auth/auth.module';" : ''}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      useClass: DatabaseConfig,
    }),
    ${moduleImports.join(',\n    ')},
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
`;
  }

  private generateAppController(): string {
    return `import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  getHealth(): object {
    return this.appService.getHealth();
  }

  @Get()
  @ApiOperation({ summary: 'Get API information' })
  @ApiResponse({ status: 200, description: 'API information' })
  getInfo(): object {
    return this.appService.getInfo();
  }
}
`;
  }

  private generateAppService(): string {
    return `import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth(): object {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    };
  }

  getInfo(): object {
    return {
      name: '${this.config.project.name}',
      version: '${this.config.project.version}',
      description: '${this.config.project.description || ''}',
      documentation: '/api/docs',
    };
  }
}
`;
  }

  private async generateEntityFiles(entity: Entity): Promise<GeneratedFile[]> {
    const files: GeneratedFile[] = [];
    const entityName = entity.name;
    const entityPath = entityName.toLowerCase();

    // Generate entity class
    files.push({
      path: `src/${entityPath}/${entityPath}.entity.ts`,
      content: this.generateEntityClass(entity),
      type: 'source',
      language: 'typescript'
    });

    // Generate DTOs
    files.push({
      path: `src/${entityPath}/dto/create-${entityPath}.dto.ts`,
      content: this.generateCreateDto(entity),
      type: 'source',
      language: 'typescript'
    });

    files.push({
      path: `src/${entityPath}/dto/update-${entityPath}.dto.ts`,
      content: this.generateUpdateDto(entity),
      type: 'source',
      language: 'typescript'
    });

    // Generate service
    files.push({
      path: `src/${entityPath}/${entityPath}.service.ts`,
      content: this.generateService(entity),
      type: 'source',
      language: 'typescript'
    });

    // Generate controller
    files.push({
      path: `src/${entityPath}/${entityPath}.controller.ts`,
      content: this.generateController(entity),
      type: 'source',
      language: 'typescript'
    });

    // Generate module
    files.push({
      path: `src/${entityPath}/${entityPath}.module.ts`,
      content: this.generateModule(entity),
      type: 'source',
      language: 'typescript'
    });

    return files;
  }

  private generateEntityClass(entity: Entity): string {
    const imports = ['Entity', 'Column'];
    const decorators = [];

    // Check what TypeORM decorators we need
    const hasPrimaryKey = entity.fields.some(f => f.isPrimaryKey);
    if (hasPrimaryKey) {
      imports.push('PrimaryGeneratedColumn', 'PrimaryColumn');
    }

    const hasRelationships = entity.fields.some(f => f.relationship);
    if (hasRelationships) {
      imports.push('OneToOne', 'OneToMany', 'ManyToOne', 'ManyToMany', 'JoinColumn');
    }

    if (entity.timestamps) {
      imports.push('CreateDateColumn', 'UpdateDateColumn');
    }

    if (entity.softDelete) {
      imports.push('DeleteDateColumn');
    }

    return `import { ${imports.join(', ')} } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
${entity.fields
  .filter(f => f.relationship)
  .map(f => `import { ${f.relationship!.target} } from '../${f.relationship!.target.toLowerCase()}/${f.relationship!.target.toLowerCase()}.entity';`)
  .join('\n')}

@Entity('${entity.tableName || entity.name.toLowerCase()}s')
export class ${entity.name} {
${entity.fields.map(field => this.generateEntityField(field)).join('\n\n')}
${entity.timestamps ? `
  @CreateDateColumn()
  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @UpdateDateColumn()
  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;` : ''}
${entity.softDelete ? `
  @DeleteDateColumn()
  deletedAt?: Date;` : ''}
}
`;
  }

  private generateEntityField(field: EntityField): string {
    const lines = [];

    // Add relationship decorator if present
    if (field.relationship) {
      const decorator = this.getRelationshipDecorator(field);
      lines.push(`  ${decorator}`);

      if (field.relationship.type === 'manyToOne' || field.relationship.type === 'oneToOne') {
        lines.push(`  @JoinColumn({ name: '${field.relationship.foreignKey}' })`);
      }
    } else {
      // Add column decorator for non-relationship fields
      const columnOptions = [];

      if (field.isPrimaryKey) {
        if (field.isGenerated) {
          lines.push(`  @PrimaryGeneratedColumn('${field.generationStrategy === 'increment' ? 'increment' : 'uuid'}')`);
        } else {
          lines.push(`  @PrimaryColumn()`);
        }
      } else {
        if (field.isUnique) columnOptions.push('unique: true');
        if (field.dataType.nullable) columnOptions.push('nullable: true');
        if (field.dataType.default !== undefined) {
          columnOptions.push(`default: ${JSON.stringify(field.dataType.default)}`);
        }

        const columnType = this.dataTypeToColumnType(field.dataType);
        const optionsStr = columnOptions.length > 0 ? `{ type: '${columnType}', ${columnOptions.join(', ')} }` : `'${columnType}'`;
        lines.push(`  @Column(${optionsStr})`);
      }
    }

    // Add API property decorator
    const apiPropertyOptions = [];
    if (field.dataType.description) {
      apiPropertyOptions.push(`description: '${field.dataType.description}'`);
    }
    if (field.dataType.type === 'enum' && field.dataType.enum) {
      apiPropertyOptions.push(`enum: [${field.dataType.enum.map(v => `'${v}'`).join(', ')}]`);
    }

    const apiPropertyStr = apiPropertyOptions.length > 0 ? `{ ${apiPropertyOptions.join(', ')} }` : '';
    lines.push(`  @ApiProperty(${apiPropertyStr})`);

    // Add field declaration
    const tsType = this.dataTypeToTypeScript(field.dataType, field.relationship?.target);
    const optional = field.dataType.nullable || !field.dataType.required ? '?' : '';
    lines.push(`  ${field.name}${optional}: ${tsType};`);

    return lines.join('\n');
  }

  private getRelationshipDecorator(field: EntityField): string {
    if (!field.relationship) return '';

    const { type, target, foreignKey, cascade, eager } = field.relationship;
    const options = [];

    if (cascade) options.push('cascade: true');
    if (eager) options.push('eager: true');

    const optionsStr = options.length > 0 ? `, { ${options.join(', ')} }` : '';

    switch (type) {
      case 'oneToOne':
        return `@OneToOne(() => ${target}${optionsStr})`;
      case 'oneToMany':
        return `@OneToMany(() => ${target}, ${target.toLowerCase()} => ${target.toLowerCase()}.${foreignKey}${optionsStr})`;
      case 'manyToOne':
        return `@ManyToOne(() => ${target}${optionsStr})`;
      case 'manyToMany':
        return `@ManyToMany(() => ${target}${optionsStr})`;
      default:
        return '';
    }
  }

  private dataTypeToTypeScript(dataType: DataType, relationshipTarget?: string): string {
    if (relationshipTarget) {
      return dataType.type === 'array' ? `${relationshipTarget}[]` : relationshipTarget;
    }

    switch (dataType.type) {
      case 'string':
        return 'string';
      case 'number':
        return 'number';
      case 'boolean':
        return 'boolean';
      case 'date':
        return 'Date';
      case 'array':
        const itemType = dataType.items ? this.dataTypeToTypeScript(dataType.items) : 'any';
        return `${itemType}[]`;
      case 'object':
        return 'object';
      case 'enum':
        if (dataType.enum && Array.isArray(dataType.enum)) {
          return dataType.enum.map(v => `'${v}'`).join(' | ');
        }
        return 'string';
      default:
        return 'any';
    }
  }

  private dataTypeToColumnType(dataType: DataType): string {
    switch (dataType.type) {
      case 'string':
        if (dataType.format === 'uuid') return 'uuid';
        if (dataType.validation?.maxLength && dataType.validation.maxLength <= 255) return 'varchar';
        return 'text';
      case 'number':
        if (dataType.format === 'int32') return 'int';
        if (dataType.format === 'int64') return 'bigint';
        return 'decimal';
      case 'boolean':
        return 'boolean';
      case 'date':
        return dataType.format === 'date' ? 'date' : 'timestamp';
      case 'array':
        return 'json';
      case 'object':
        return 'json';
      case 'enum':
        return 'enum';
      default:
        return 'text';
    }
  }

  private generateCreateDto(entity: Entity): string {
    const imports = ['IsString', 'IsNumber', 'IsBoolean', 'IsDate', 'IsOptional', 'IsEnum', 'IsUUID'];
    const usedValidators = new Set<string>();

    return `import { ApiProperty } from '@nestjs/swagger';
import { ${imports.join(', ')} } from 'class-validator';

export class Create${entity.name}Dto {
${entity.fields
  .filter(f => !f.isPrimaryKey && !f.isGenerated && !f.relationship)
  .map(field => this.generateDtoField(field, usedValidators))
  .join('\n\n')}
}
`;
  }

  private generateUpdateDto(entity: Entity): string {
    return `import { PartialType } from '@nestjs/swagger';
import { Create${entity.name}Dto } from './create-${entity.name.toLowerCase()}.dto';

export class Update${entity.name}Dto extends PartialType(Create${entity.name}Dto) {}
`;
  }

  private generateDtoField(field: EntityField, usedValidators: Set<string>): string {
    const lines = [];
    const validators = [];

    // Add validation decorators
    if (field.dataType.required) {
      switch (field.dataType.type) {
        case 'string':
          validators.push('@IsString()');
          usedValidators.add('IsString');
          break;
        case 'number':
          validators.push('@IsNumber()');
          usedValidators.add('IsNumber');
          break;
        case 'boolean':
          validators.push('@IsBoolean()');
          usedValidators.add('IsBoolean');
          break;
        case 'date':
          validators.push('@IsDate()');
          usedValidators.add('IsDate');
          break;
      }
    } else {
      validators.push('@IsOptional()');
      usedValidators.add('IsOptional');
    }

    if (field.dataType.format === 'uuid') {
      validators.push('@IsUUID()');
      usedValidators.add('IsUUID');
    }

    if (field.dataType.type === 'enum' && field.dataType.enum) {
      validators.push(`@IsEnum([${field.dataType.enum.map(v => `'${v}'`).join(', ')}])`);
      usedValidators.add('IsEnum');
    }

    // Add API property
    const apiPropertyOptions = [];
    if (field.dataType.description) {
      apiPropertyOptions.push(`description: '${field.dataType.description}'`);
    }
    if (field.dataType.type === 'enum' && field.dataType.enum) {
      apiPropertyOptions.push(`enum: [${field.dataType.enum.map(v => `'${v}'`).join(', ')}]`);
    }

    const apiPropertyStr = apiPropertyOptions.length > 0 ? `{ ${apiPropertyOptions.join(', ')} }` : '';
    lines.push(`  @ApiProperty(${apiPropertyStr})`);

    // Add validators
    validators.forEach(validator => lines.push(`  ${validator}`));

    // Add field declaration
    const tsType = this.dataTypeToTypeScript(field.dataType);
    const optional = !field.dataType.required ? '?' : '';
    lines.push(`  ${field.name}${optional}: ${tsType};`);

    return lines.join('\n');
  }

  private generateService(entity: Entity): string {
    const entityName = entity.name;
    const entityPath = entityName.toLowerCase();

    return `import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ${entityName} } from './${entityPath}.entity';
import { Create${entityName}Dto } from './dto/create-${entityPath}.dto';
import { Update${entityName}Dto } from './dto/update-${entityPath}.dto';

@Injectable()
export class ${entityName}Service {
  constructor(
    @InjectRepository(${entityName})
    private readonly ${entityPath}Repository: Repository<${entityName}>,
  ) {}

  async create(create${entityName}Dto: Create${entityName}Dto): Promise<${entityName}> {
    const ${entityPath} = this.${entityPath}Repository.create(create${entityName}Dto);
    return await this.${entityPath}Repository.save(${entityPath});
  }

  async findAll(page: number = 1, limit: number = 10): Promise<{ data: ${entityName}[]; total: number; page: number; limit: number }> {
    const [data, total] = await this.${entityPath}Repository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<${entityName}> {
    const ${entityPath} = await this.${entityPath}Repository.findOne({
      where: { id },
    });

    if (!${entityPath}) {
      throw new NotFoundException(\`${entityName} with ID \${id} not found\`);
    }

    return ${entityPath};
  }

  async update(id: string, update${entityName}Dto: Update${entityName}Dto): Promise<${entityName}> {
    const ${entityPath} = await this.findOne(id);

    Object.assign(${entityPath}, update${entityName}Dto);

    return await this.${entityPath}Repository.save(${entityPath});
  }

  async remove(id: string): Promise<void> {
    const ${entityPath} = await this.findOne(id);
    await this.${entityPath}Repository.remove(${entityPath});
  }
}
`;
  }

  private generateController(entity: Entity): string {
    const entityName = entity.name;
    const entityPath = entityName.toLowerCase();
    const pluralPath = this.pluralize(entityPath);

    return `import {
  Controller,
  Get,
  Post as HttpPost,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ${entityName}Service } from './${entityPath}.service';
import { Create${entityName}Dto } from './dto/create-${entityPath}.dto';
import { Update${entityName}Dto } from './dto/update-${entityPath}.dto';
import { ${entityName} } from './${entityPath}.entity';

@ApiTags('${entityName}')
@Controller('${pluralPath}')
${this.config.features.authentication ? '@ApiBearerAuth()' : ''}
export class ${entityName}Controller {
  constructor(private readonly ${entityPath}Service: ${entityName}Service) {}

  @HttpPost()
  @ApiOperation({ summary: 'Create a new ${entityName.toLowerCase()}' })
  @ApiResponse({ status: 201, description: 'The ${entityName.toLowerCase()} has been successfully created.', type: ${entityName} })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  create(@Body() create${entityName}Dto: Create${entityName}Dto): Promise<${entityName}> {
    return this.${entityPath}Service.create(create${entityName}Dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all ${pluralPath}' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiResponse({ status: 200, description: 'List of ${pluralPath}', type: [${entityName}] })
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.${entityPath}Service.findAll(page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a ${entityName.toLowerCase()} by ID' })
  @ApiParam({ name: 'id', description: '${entityName} ID' })
  @ApiResponse({ status: 200, description: 'The ${entityName.toLowerCase()} has been found.', type: ${entityName} })
  @ApiResponse({ status: 404, description: '${entityName} not found.' })
  findOne(@Param('id') id: string): Promise<${entityName}> {
    return this.${entityPath}Service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a ${entityName.toLowerCase()}' })
  @ApiParam({ name: 'id', description: '${entityName} ID' })
  @ApiResponse({ status: 200, description: 'The ${entityName.toLowerCase()} has been successfully updated.', type: ${entityName} })
  @ApiResponse({ status: 404, description: '${entityName} not found.' })
  update(
    @Param('id') id: string,
    @Body() update${entityName}Dto: Update${entityName}Dto,
  ): Promise<${entityName}> {
    return this.${entityPath}Service.update(id, update${entityName}Dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a ${entityName.toLowerCase()}' })
  @ApiParam({ name: 'id', description: '${entityName} ID' })
  @ApiResponse({ status: 204, description: 'The ${entityName.toLowerCase()} has been successfully deleted.' })
  @ApiResponse({ status: 404, description: '${entityName} not found.' })
  remove(@Param('id') id: string): Promise<void> {
    return this.${entityPath}Service.remove(id);
  }
}
`;
  }

  private generateModule(entity: Entity): string {
    const entityName = entity.name;
    const entityPath = entityName.toLowerCase();

    return `import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ${entityName}Service } from './${entityPath}.service';
import { ${entityName}Controller } from './${entityPath}.controller';
import { ${entityName} } from './${entityPath}.entity';

@Module({
  imports: [TypeOrmModule.forFeature([${entityName}])],
  controllers: [${entityName}Controller],
  providers: [${entityName}Service],
  exports: [${entityName}Service],
})
export class ${entityName}Module {}
`;
  }

  private pluralize(str: string): string {
    if (str.endsWith('y')) {
      return str.slice(0, -1) + 'ies';
    } else if (str.endsWith('s') || str.endsWith('sh') || str.endsWith('ch')) {
      return str + 'es';
    } else {
      return str + 's';
    }
  }

  private async generateDatabaseFiles(): Promise<GeneratedFile[]> {
    const files: GeneratedFile[] = [];

    // Generate database configuration
    files.push({
      path: 'src/config/database.config.ts',
      content: this.generateDatabaseConfig(),
      type: 'source',
      language: 'typescript'
    });

    // Generate environment file
    files.push({
      path: '.env.example',
      content: this.generateEnvExample(),
      type: 'config'
    });

    return files;
  }

  private generateDatabaseConfig(): string {
    const { type, host, port, database } = this.config.database;

    return `import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';
${this.dataModel.entities.map(entity =>
  `import { ${entity.name} } from '../${entity.name.toLowerCase()}/${entity.name.toLowerCase()}.entity';`
).join('\n')}

@Injectable()
export class DatabaseConfig implements TypeOrmOptionsFactory {
  constructor(private configService: ConfigService) {}

  createTypeOrmOptions(): TypeOrmModuleOptions {
    return {
      type: '${type === 'postgresql' ? 'postgres' : type}',
      host: this.configService.get<string>('DB_HOST', '${host}'),
      port: this.configService.get<number>('DB_PORT', ${port}),
      username: this.configService.get<string>('DB_USERNAME', '${type === 'postgresql' ? 'postgres' : 'root'}'),
      password: this.configService.get<string>('DB_PASSWORD', ''),
      database: this.configService.get<string>('DB_DATABASE', '${database}'),
      entities: [
        ${this.dataModel.entities.map(entity => entity.name).join(',\n        ')},
      ],
      synchronize: this.configService.get<boolean>('DB_SYNCHRONIZE', false),
      logging: this.configService.get<boolean>('DB_LOGGING', false),
      migrations: ['dist/migrations/*.js'],
      migrationsRun: this.configService.get<boolean>('DB_MIGRATIONS_RUN', false),
    };
  }
}
`;
  }

  private generateEnvExample(): string {
    const { type, host, port, database } = this.config.database;

    return `# Application
NODE_ENV=development
PORT=3000

# Database
DB_TYPE=${type}
DB_HOST=${host}
DB_PORT=${port}
DB_USERNAME=${type === 'postgresql' ? 'postgres' : 'root'}
DB_PASSWORD=
DB_DATABASE=${database}
DB_SYNCHRONIZE=true
DB_LOGGING=false
DB_MIGRATIONS_RUN=false

${this.config.features.authentication ? `# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
` : ''}
# CORS
CORS_ORIGIN=http://localhost:3000

# API
API_PREFIX=api/v1
`;
  }

  private async generateAuthFiles(): Promise<GeneratedFile[]> {
    const files: GeneratedFile[] = [];

    // Generate auth module
    files.push({
      path: 'src/auth/auth.module.ts',
      content: this.generateAuthModule(),
      type: 'source',
      language: 'typescript'
    });

    // Generate auth service
    files.push({
      path: 'src/auth/auth.service.ts',
      content: this.generateAuthService(),
      type: 'source',
      language: 'typescript'
    });

    // Generate auth controller
    files.push({
      path: 'src/auth/auth.controller.ts',
      content: this.generateAuthController(),
      type: 'source',
      language: 'typescript'
    });

    // Generate JWT strategy
    files.push({
      path: 'src/auth/strategies/jwt.strategy.ts',
      content: this.generateJwtStrategy(),
      type: 'source',
      language: 'typescript'
    });

    // Generate auth DTOs
    files.push({
      path: 'src/auth/dto/login.dto.ts',
      content: this.generateLoginDto(),
      type: 'source',
      language: 'typescript'
    });

    files.push({
      path: 'src/auth/dto/register.dto.ts',
      content: this.generateRegisterDto(),
      type: 'source',
      language: 'typescript'
    });

    return files;
  }

  private generateAuthModule(): string {
    return `import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '7d'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
`;
  }

  private generateAuthService(): string {
    return `import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  async login(loginDto: LoginDto) {
    // TODO: Implement user validation logic
    // This is a placeholder implementation
    const { email, password } = loginDto;

    // Validate user credentials here
    const user = await this.validateUser(email, password);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { email: user.email, sub: user.id };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }

  async register(registerDto: RegisterDto) {
    // TODO: Implement user registration logic
    const { email, password, name } = registerDto;

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user (implement based on your User entity)
    const user = {
      id: 'generated-id',
      email,
      name,
      password: hashedPassword,
    };

    const payload = { email: user.email, sub: user.id };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }

  private async validateUser(email: string, password: string): Promise<any> {
    // TODO: Implement user validation
    // This should query your User entity and validate password
    return null;
  }
}
`;
  }

  private generateAuthController(): string {
    return `import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('register')
  @ApiOperation({ summary: 'User registration' })
  @ApiResponse({ status: 201, description: 'Registration successful' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }
}
`;
  }

  private generateJwtStrategy(): string {
    return `import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    return { userId: payload.sub, email: payload.email };
  }
}
`;
  }

  private generateLoginDto(): string {
    return `import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ description: 'User email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'User password', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;
}
`;
  }

  private generateRegisterDto(): string {
    return `import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ description: 'User name' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ description: 'User email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'User password', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;
}
`;
  }

  private async generateConfigFiles(): Promise<GeneratedFile[]> {
    const files: GeneratedFile[] = [];

    // Generate TypeScript configuration
    files.push({
      path: 'tsconfig.json',
      content: this.generateTsConfig(),
      type: 'config',
      language: 'json'
    });

    // Generate NestJS CLI configuration
    files.push({
      path: 'nest-cli.json',
      content: this.generateNestCliConfig(),
      type: 'config',
      language: 'json'
    });

    // Generate ESLint configuration
    files.push({
      path: '.eslintrc.js',
      content: this.generateEslintConfig(),
      type: 'config',
      language: 'javascript'
    });

    // Generate Prettier configuration
    files.push({
      path: '.prettierrc',
      content: this.generatePrettierConfig(),
      type: 'config',
      language: 'json'
    });

    return files;
  }

  private generateTsConfig(): string {
    return JSON.stringify({
      compilerOptions: {
        module: 'commonjs',
        declaration: true,
        removeComments: true,
        emitDecoratorMetadata: true,
        experimentalDecorators: true,
        allowSyntheticDefaultImports: true,
        target: 'ES2020',
        sourceMap: true,
        outDir: './dist',
        baseUrl: './',
        incremental: true,
        skipLibCheck: true,
        strictNullChecks: false,
        noImplicitAny: false,
        strictBindCallApply: false,
        forceConsistentCasingInFileNames: false,
        noFallthroughCasesInSwitch: false
      }
    }, null, 2);
  }

  private generateNestCliConfig(): string {
    return JSON.stringify({
      $schema: 'https://json.schemastore.org/nest-cli',
      collection: '@nestjs/schematics',
      sourceRoot: 'src',
      compilerOptions: {
        deleteOutDir: true
      }
    }, null, 2);
  }

  private generateEslintConfig(): string {
    return `module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint/eslint-plugin'],
  extends: [
    '@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['.eslintrc.js'],
  rules: {
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
  },
};
`;
  }

  private generatePrettierConfig(): string {
    return JSON.stringify({
      singleQuote: true,
      trailingComma: 'all'
    }, null, 2);
  }

  private async generateTestFiles(): Promise<GeneratedFile[]> {
    const files: GeneratedFile[] = [];

    // Generate Jest configuration
    files.push({
      path: 'jest.config.js',
      content: this.generateJestConfig(),
      type: 'config',
      language: 'javascript'
    });

    // Generate test setup
    files.push({
      path: 'test/jest-e2e.json',
      content: this.generateE2EJestConfig(),
      type: 'config',
      language: 'json'
    });

    return files;
  }

  private generateJestConfig(): string {
    return `module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    '**/*.(t|j)s',
  ],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
};
`;
  }

  private generateE2EJestConfig(): string {
    return JSON.stringify({
      moduleFileExtensions: ['js', 'json', 'ts'],
      rootDir: '.',
      testEnvironment: 'node',
      testRegex: '.e2e-spec.ts$',
      transform: {
        '^.+\\.(t|j)s$': 'ts-jest'
      }
    }, null, 2);
  }
}