import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { DataModelParser } from '../../core/data-model-parser';
import { DataModel, ProjectConfig } from '../../core/types';

export class SampleCommand {
  async execute(options: any): Promise<void> {
    const spinner = ora('Generating sample files...').start();

    try {
      const outputDir = path.resolve(process.cwd(), options.output);
      await fs.ensureDir(outputDir);

      // Generate sample data model
      spinner.text = 'Creating sample data model...';
      const dataModel = this.generateSampleDataModel(options.type);

      await fs.ensureDir(path.join(outputDir, 'models'));
      await fs.writeJson(
        path.join(outputDir, 'models', 'data-model.json'),
        dataModel,
        { spaces: 2 }
      );

      // Generate sample configuration
      spinner.text = 'Creating sample configuration...';
      const config = this.generateSampleConfig(options.type);
      
      await fs.writeJson(
        path.join(outputDir, 'codeforge.config.json'),
        config,
        { spaces: 2 }
      );

      // Generate README
      spinner.text = 'Creating documentation...';
      const readme = this.generateSampleReadme(options.type, dataModel);
      await fs.writeFile(path.join(outputDir, 'README.md'), readme);

      // Generate .gitignore
      const gitignore = this.generateGitignore();
      await fs.writeFile(path.join(outputDir, '.gitignore'), gitignore);

      spinner.succeed(chalk.green('✓ Sample files generated successfully!'));

      this.showSampleInfo(options.type, outputDir, dataModel);

    } catch (error) {
      spinner.fail(chalk.red('✗ Failed to generate sample files'));
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      throw error;
    }
  }

  private generateSampleDataModel(type: string): DataModel {
    switch (type) {
      case 'ecommerce':
        return this.generateEcommerceSample();
      case 'social':
        return this.generateSocialSample();
      case 'blog':
      default:
        return this.generateBlogSample();
    }
  }

  private generateBlogSample(): DataModel {
    const parser = new DataModelParser();
    return parser.generateSample(); // Uses the existing blog sample
  }

  private generateEcommerceSample(): DataModel {
    return {
      name: 'EcommerceAPI',
      version: '1.0.0',
      description: 'E-commerce platform API data model',
      entities: [
        {
          name: 'User',
          description: 'Customer and admin users',
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
              name: 'firstName',
              dataType: { 
                type: 'string',
                validation: { minLength: 2, maxLength: 50 }
              }
            },
            {
              name: 'lastName',
              dataType: { 
                type: 'string',
                validation: { minLength: 2, maxLength: 50 }
              }
            },
            {
              name: 'role',
              dataType: { type: 'enum', enum: ['UserRole'] }
            },
            {
              name: 'orders',
              dataType: { type: 'array', items: { type: 'object' } },
              relationship: {
                type: 'oneToMany',
                target: 'Order',
                foreignKey: 'userId'
              }
            }
          ],
          timestamps: true
        },
        {
          name: 'Category',
          description: 'Product categories',
          fields: [
            {
              name: 'id',
              dataType: { type: 'string', format: 'uuid' },
              isPrimaryKey: true,
              isGenerated: true,
              generationStrategy: 'uuid'
            },
            {
              name: 'name',
              dataType: { 
                type: 'string',
                validation: { minLength: 1, maxLength: 100 }
              },
              isUnique: true
            },
            {
              name: 'description',
              dataType: { type: 'string', nullable: true }
            },
            {
              name: 'parentId',
              dataType: { type: 'string', format: 'uuid', nullable: true }
            },
            {
              name: 'products',
              dataType: { type: 'array', items: { type: 'object' } },
              relationship: {
                type: 'oneToMany',
                target: 'Product',
                foreignKey: 'categoryId'
              }
            }
          ],
          timestamps: true
        },
        {
          name: 'Product',
          description: 'Products in the catalog',
          fields: [
            {
              name: 'id',
              dataType: { type: 'string', format: 'uuid' },
              isPrimaryKey: true,
              isGenerated: true,
              generationStrategy: 'uuid'
            },
            {
              name: 'name',
              dataType: { 
                type: 'string',
                validation: { minLength: 1, maxLength: 200 }
              }
            },
            {
              name: 'description',
              dataType: { type: 'string' }
            },
            {
              name: 'price',
              dataType: { 
                type: 'number',
                format: 'decimal',
                validation: { min: 0 }
              }
            },
            {
              name: 'stock',
              dataType: { 
                type: 'number',
                format: 'int32',
                validation: { min: 0 }
              }
            },
            {
              name: 'status',
              dataType: { type: 'enum', enum: ['ProductStatus'] }
            },
            {
              name: 'categoryId',
              dataType: { type: 'string', format: 'uuid' }
            },
            {
              name: 'category',
              dataType: { type: 'object' },
              relationship: {
                type: 'manyToOne',
                target: 'Category',
                foreignKey: 'categoryId'
              }
            }
          ],
          timestamps: true
        },
        {
          name: 'Order',
          description: 'Customer orders',
          fields: [
            {
              name: 'id',
              dataType: { type: 'string', format: 'uuid' },
              isPrimaryKey: true,
              isGenerated: true,
              generationStrategy: 'uuid'
            },
            {
              name: 'orderNumber',
              dataType: { type: 'string' },
              isUnique: true
            },
            {
              name: 'status',
              dataType: { type: 'enum', enum: ['OrderStatus'] }
            },
            {
              name: 'totalAmount',
              dataType: { 
                type: 'number',
                format: 'decimal',
                validation: { min: 0 }
              }
            },
            {
              name: 'userId',
              dataType: { type: 'string', format: 'uuid' }
            },
            {
              name: 'user',
              dataType: { type: 'object' },
              relationship: {
                type: 'manyToOne',
                target: 'User',
                foreignKey: 'userId'
              }
            },
            {
              name: 'items',
              dataType: { type: 'array', items: { type: 'object' } },
              relationship: {
                type: 'oneToMany',
                target: 'OrderItem',
                foreignKey: 'orderId'
              }
            }
          ],
          timestamps: true
        },
        {
          name: 'OrderItem',
          description: 'Items within an order',
          fields: [
            {
              name: 'id',
              dataType: { type: 'string', format: 'uuid' },
              isPrimaryKey: true,
              isGenerated: true,
              generationStrategy: 'uuid'
            },
            {
              name: 'quantity',
              dataType: { 
                type: 'number',
                format: 'int32',
                validation: { min: 1 }
              }
            },
            {
              name: 'price',
              dataType: { 
                type: 'number',
                format: 'decimal',
                validation: { min: 0 }
              }
            },
            {
              name: 'orderId',
              dataType: { type: 'string', format: 'uuid' }
            },
            {
              name: 'productId',
              dataType: { type: 'string', format: 'uuid' }
            },
            {
              name: 'order',
              dataType: { type: 'object' },
              relationship: {
                type: 'manyToOne',
                target: 'Order',
                foreignKey: 'orderId'
              }
            },
            {
              name: 'product',
              dataType: { type: 'object' },
              relationship: {
                type: 'manyToOne',
                target: 'Product',
                foreignKey: 'productId'
              }
            }
          ],
          timestamps: true
        }
      ],
      enums: [
        {
          name: 'UserRole',
          values: ['CUSTOMER', 'ADMIN', 'MANAGER'],
          description: 'User roles in the system'
        },
        {
          name: 'ProductStatus',
          values: ['ACTIVE', 'INACTIVE', 'OUT_OF_STOCK', 'DISCONTINUED'],
          description: 'Product availability status'
        },
        {
          name: 'OrderStatus',
          values: ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
          description: 'Order processing status'
        }
      ]
    };
  }

  private generateSocialSample(): DataModel {
    return {
      name: 'SocialAPI',
      version: '1.0.0',
      description: 'Social media platform API data model',
      entities: [
        {
          name: 'User',
          description: 'Platform users',
          fields: [
            {
              name: 'id',
              dataType: { type: 'string', format: 'uuid' },
              isPrimaryKey: true,
              isGenerated: true,
              generationStrategy: 'uuid'
            },
            {
              name: 'username',
              dataType: { 
                type: 'string',
                validation: { minLength: 3, maxLength: 30, pattern: '^[a-zA-Z0-9_]+$' }
              },
              isUnique: true
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
              name: 'displayName',
              dataType: { 
                type: 'string',
                validation: { minLength: 1, maxLength: 100 }
              }
            },
            {
              name: 'bio',
              dataType: { 
                type: 'string', 
                nullable: true,
                validation: { maxLength: 500 }
              }
            },
            {
              name: 'avatarUrl',
              dataType: { type: 'string', format: 'url', nullable: true }
            },
            {
              name: 'isVerified',
              dataType: { type: 'boolean', default: false }
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
          description: 'User posts',
          fields: [
            {
              name: 'id',
              dataType: { type: 'string', format: 'uuid' },
              isPrimaryKey: true,
              isGenerated: true,
              generationStrategy: 'uuid'
            },
            {
              name: 'content',
              dataType: { 
                type: 'string',
                validation: { minLength: 1, maxLength: 2000 }
              }
            },
            {
              name: 'imageUrl',
              dataType: { type: 'string', format: 'url', nullable: true }
            },
            {
              name: 'likesCount',
              dataType: { 
                type: 'number',
                format: 'int32',
                default: 0,
                validation: { min: 0 }
              }
            },
            {
              name: 'commentsCount',
              dataType: { 
                type: 'number',
                format: 'int32',
                default: 0,
                validation: { min: 0 }
              }
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
          timestamps: true
        }
      ],
      enums: []
    };
  }

  private generateSampleConfig(type: string): ProjectConfig {
    const baseConfig = {
      project: {
        name: `${type.charAt(0).toUpperCase() + type.slice(1)}API`,
        description: `${type.charAt(0).toUpperCase() + type.slice(1)} platform API generated with CodeForge`,
        version: '1.0.0',
        author: 'CodeForge User'
      },
      database: {
        type: 'postgresql' as const,
        host: 'localhost',
        port: 5432,
        database: `${type}_db`
      },
      features: {
        authentication: true,
        authorization: true,
        swagger: true,
        asyncapi: type === 'social', // Enable AsyncAPI for social media
        docker: true,
        testing: true,
        logging: true,
        monitoring: false
      },
      generation: {
        outputDir: 'generated',
        templateDir: 'templates',
        overwrite: false,
        backup: true
      }
    };

    return baseConfig;
  }

  private generateSampleReadme(type: string, dataModel: DataModel): string {
    return `# ${dataModel.name}

${dataModel.description}

This is a sample ${type} API project generated with [CodeForge](https://github.com/codeforge/codeforge).

## Features

- **${dataModel.entities.length} Entities**: ${dataModel.entities.map(e => e.name).join(', ')}
${dataModel.enums && dataModel.enums.length > 0 ? `- **${dataModel.enums.length} Enums**: ${dataModel.enums.map(e => e.name).join(', ')}` : ''}
- **RESTful API**: Complete CRUD operations for all entities
- **OpenAPI Documentation**: Auto-generated Swagger documentation
- **Type Safety**: Full TypeScript support
- **Database Integration**: TypeORM with PostgreSQL
- **Authentication**: JWT-based authentication system
- **Docker Support**: Ready for containerized deployment

## Quick Start

1. **Validate the data model**:
   \`\`\`bash
   codeforge validate
   \`\`\`

2. **Generate API specifications**:
   \`\`\`bash
   codeforge generate specs
   \`\`\`

3. **Generate NestJS backend**:
   \`\`\`bash
   codeforge generate backend
   \`\`\`

4. **Preview the generated code**:
   \`\`\`bash
   codeforge preview all
   \`\`\`

5. **Deploy to GitHub**:
   \`\`\`bash
   codeforge deploy github --token YOUR_GITHUB_TOKEN
   \`\`\`

## Data Model

### Entities

${dataModel.entities.map(entity => `
#### ${entity.name}
${entity.description}

**Fields:**
${entity.fields.filter(f => !f.relationship).map(field => 
  `- \`${field.name}\`: ${field.dataType.type}${field.dataType.required ? '' : ' (optional)'}`
).join('\n')}

**Relationships:**
${entity.fields.filter(f => f.relationship).map(field => 
  `- \`${field.name}\`: ${field.relationship!.type} → ${field.relationship!.target}`
).join('\n') || 'None'}
`).join('\n')}

${dataModel.enums && dataModel.enums.length > 0 ? `
### Enums

${dataModel.enums.map(enumDef => `
#### ${enumDef.name}
${enumDef.description}

Values: ${enumDef.values.map(v => `\`${v}\``).join(', ')}
`).join('\n')}
` : ''}

## Next Steps

1. **Customize the data model** in \`models/data-model.json\`
2. **Update configuration** in \`codeforge.config.json\`
3. **Generate your backend** with \`codeforge generate backend\`
4. **Deploy to production** with \`codeforge deploy github\`

## Learn More

- [CodeForge Documentation](https://docs.codeforge.dev)
- [NestJS Documentation](https://docs.nestjs.com)
- [TypeORM Documentation](https://typeorm.io)
- [OpenAPI Specification](https://swagger.io/specification)

---

Generated with ❤️ by [CodeForge](https://github.com/codeforge/codeforge)
`;
  }

  private generateGitignore(): string {
    return `# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Generated files
generated/
dist/
build/

# Environment variables
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
logs/
*.log

# CodeForge
.codeforge/cache/

# Database
*.sqlite
*.db
`;
  }

  private showSampleInfo(type: string, outputDir: string, dataModel: DataModel): void {
    console.log('\n' + chalk.green.bold('🎉 Sample project generated!'));
    console.log('\n' + chalk.cyan.bold('📊 Project Overview:'));
    console.log(chalk.white(`  Type: ${type}`));
    console.log(chalk.white(`  Entities: ${dataModel.entities.length}`));
    if (dataModel.enums) {
      console.log(chalk.white(`  Enums: ${dataModel.enums.length}`));
    }
    console.log(chalk.white(`  Location: ${outputDir}`));

    console.log('\n' + chalk.cyan.bold('📁 Generated Files:'));
    console.log(chalk.white('  • models/data-model.json - Data model definition'));
    console.log(chalk.white('  • codeforge.config.json - Project configuration'));
    console.log(chalk.white('  • README.md - Project documentation'));
    console.log(chalk.white('  • .gitignore - Git ignore rules'));

    console.log('\n' + chalk.cyan.bold('🚀 Next Steps:'));
    console.log(chalk.white('  1. Review the generated data model'));
    console.log(chalk.white('  2. Customize the configuration if needed'));
    console.log(chalk.white('  3. Run: codeforge validate'));
    console.log(chalk.white('  4. Run: codeforge generate all'));

    console.log('\n' + chalk.gray('For help: codeforge --help'));
  }
}
