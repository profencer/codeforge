import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { DataModelParser } from '../../core/data-model-parser';
import { OpenAPIGenerator } from '../../generators/openapi-generator';
import { AsyncAPIGenerator } from '../../generators/asyncapi-generator';
import { NestJSGenerator } from '../../generators/nestjs-generator';
import { ProjectConfig, DataModel, GeneratedFile } from '../../core/types';

export class PreviewCommand {
  async execute(type: string, options: any): Promise<void> {
    const spinner = ora('Loading configuration...').start();

    try {
      // Load configuration
      const configPath = path.resolve(process.cwd(), options.config);
      if (!await fs.pathExists(configPath)) {
        spinner.fail(chalk.red(`Configuration file not found: ${options.config}`));
        return;
      }

      const config: ProjectConfig = await fs.readJson(configPath);
      spinner.text = 'Loading data model...';

      // Load data model
      const modelPath = path.resolve(process.cwd(), options.model);
      if (!await fs.pathExists(modelPath)) {
        spinner.fail(chalk.red(`Data model file not found: ${options.model}`));
        return;
      }

      const parser = new DataModelParser();
      const dataModel: DataModel = await parser.parseFromFile(modelPath);
      
      spinner.succeed(chalk.green('✓ Configuration and data model loaded'));

      // Generate preview based on type
      switch (type.toLowerCase()) {
        case 'specs':
          await this.previewSpecs(config, dataModel, options.format);
          break;
        case 'backend':
          await this.previewBackend(config, dataModel, options.format);
          break;
        case 'docker':
          await this.previewDocker(config, dataModel, options.format);
          break;
        case 'all':
          await this.previewAll(config, dataModel, options.format);
          break;
        default:
          console.error(chalk.red(`Unknown preview type: ${type}`));
          return;
      }

    } catch (error) {
      spinner.fail(chalk.red('✗ Preview failed'));
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      throw error;
    }
  }

  private async previewSpecs(config: ProjectConfig, dataModel: DataModel, format: string): Promise<void> {
    console.log('\n' + chalk.cyan.bold('📄 API Specifications Preview'));

    const files: GeneratedFile[] = [];

    // Generate OpenAPI
    const openApiGenerator = new OpenAPIGenerator(config, dataModel);
    const openApiResult = openApiGenerator.generate();
    
    if (openApiResult.success) {
      files.push(...openApiResult.files);
    }

    // Generate AsyncAPI if enabled
    if (config.features.asyncapi) {
      const asyncApiGenerator = new AsyncAPIGenerator(config, dataModel);
      const asyncApiResult = asyncApiGenerator.generate();
      
      if (asyncApiResult.success) {
        files.push(...asyncApiResult.files);
      }
    }

    this.displayFiles(files, 'specs', format);
  }

  private async previewBackend(config: ProjectConfig, dataModel: DataModel, format: string): Promise<void> {
    console.log('\n' + chalk.cyan.bold('🏗️  NestJS Backend Preview'));

    const nestjsGenerator = new NestJSGenerator(config, dataModel);
    const result = await nestjsGenerator.generate();
    
    if (result.success) {
      this.displayFiles(result.files, 'backend', format);
    } else {
      console.error(chalk.red('Failed to generate backend preview'));
      result.errors.forEach(error => console.error(chalk.red(`  • ${error}`)));
    }
  }

  private async previewDocker(config: ProjectConfig, dataModel: DataModel, format: string): Promise<void> {
    console.log('\n' + chalk.cyan.bold('🐳 Docker Configuration Preview'));

    const files: GeneratedFile[] = [
      {
        path: 'Dockerfile',
        content: this.generateDockerfile(config),
        type: 'config'
      },
      {
        path: 'docker-compose.yml',
        content: this.generateDockerCompose(config),
        type: 'config'
      },
      {
        path: '.dockerignore',
        content: this.generateDockerignore(),
        type: 'config'
      }
    ];

    this.displayFiles(files, '', format);
  }

  private async previewAll(config: ProjectConfig, dataModel: DataModel, format: string): Promise<void> {
    await this.previewSpecs(config, dataModel, format);
    await this.previewBackend(config, dataModel, format);
    
    if (config.features.docker) {
      await this.previewDocker(config, dataModel, format);
    }
  }

  private displayFiles(files: GeneratedFile[], prefix: string, format: string): void {
    switch (format) {
      case 'tree':
        this.displayAsTree(files, prefix);
        break;
      case 'list':
        this.displayAsList(files, prefix);
        break;
      case 'detailed':
        this.displayDetailed(files, prefix);
        break;
      default:
        this.displayAsTree(files, prefix);
    }
  }

  private displayAsTree(files: GeneratedFile[], prefix: string): void {
    const tree = this.buildFileTree(files, prefix);
    this.printTree(tree, '');
  }

  private displayAsList(files: GeneratedFile[], prefix: string): void {
    console.log(chalk.white(`\n📁 Files (${files.length}):`));
    
    files.forEach(file => {
      const fullPath = prefix ? `${prefix}/${file.path}` : file.path;
      const icon = this.getFileIcon(file);
      const size = this.formatFileSize(file.content.length);
      
      console.log(`  ${icon} ${chalk.white(fullPath)} ${chalk.gray(`(${size})`)}`);
    });
  }

  private displayDetailed(files: GeneratedFile[], prefix: string): void {
    console.log(chalk.white(`\n📁 Detailed File Information (${files.length} files):`));
    
    files.forEach((file, index) => {
      const fullPath = prefix ? `${prefix}/${file.path}` : file.path;
      const icon = this.getFileIcon(file);
      const size = this.formatFileSize(file.content.length);
      const lines = file.content.split('\n').length;
      
      console.log(`\n${index + 1}. ${icon} ${chalk.white.bold(fullPath)}`);
      console.log(`   ${chalk.gray('Type:')} ${file.type}`);
      if (file.language) {
        console.log(`   ${chalk.gray('Language:')} ${file.language}`);
      }
      console.log(`   ${chalk.gray('Size:')} ${size}`);
      console.log(`   ${chalk.gray('Lines:')} ${lines}`);
      
      // Show first few lines as preview
      const previewLines = file.content.split('\n').slice(0, 5);
      if (previewLines.length > 0) {
        console.log(`   ${chalk.gray('Preview:')}`);
        previewLines.forEach(line => {
          console.log(`   ${chalk.gray('│')} ${line.substring(0, 80)}${line.length > 80 ? '...' : ''}`);
        });
        if (lines > 5) {
          console.log(`   ${chalk.gray('│')} ${chalk.gray(`... and ${lines - 5} more lines`)}`);
        }
      }
    });
  }

  private buildFileTree(files: GeneratedFile[], prefix: string): any {
    const tree: any = {};
    
    files.forEach(file => {
      const fullPath = prefix ? `${prefix}/${file.path}` : file.path;
      const parts = fullPath.split('/');
      let current = tree;
      
      parts.forEach((part, index) => {
        if (index === parts.length - 1) {
          // This is a file
          current[part] = {
            type: 'file',
            file: file
          };
        } else {
          // This is a directory
          if (!current[part]) {
            current[part] = {
              type: 'directory',
              children: {}
            };
          }
          current = current[part].children;
        }
      });
    });
    
    return tree;
  }

  private printTree(tree: any, indent: string): void {
    const entries = Object.entries(tree);
    
    entries.forEach(([name, node]: [string, any], index) => {
      const isLast = index === entries.length - 1;
      const prefix = isLast ? '└── ' : '├── ';
      const nextIndent = indent + (isLast ? '    ' : '│   ');
      
      if (node.type === 'file') {
        const icon = this.getFileIcon(node.file);
        const size = this.formatFileSize(node.file.content.length);
        console.log(`${indent}${prefix}${icon} ${chalk.white(name)} ${chalk.gray(`(${size})`)}`);
      } else {
        console.log(`${indent}${prefix}${chalk.blue('📁 ' + name)}`);
        this.printTree(node.children, nextIndent);
      }
    });
  }

  private getFileIcon(file: GeneratedFile): string {
    if (file.language) {
      switch (file.language) {
        case 'typescript':
          return '📘';
        case 'javascript':
          return '📙';
        case 'json':
          return '📄';
        case 'yaml':
          return '📝';
        default:
          return '📄';
      }
    }
    
    switch (file.type) {
      case 'source':
        return '📘';
      case 'config':
        return '⚙️';
      case 'documentation':
        return '📚';
      case 'test':
        return '🧪';
      default:
        return '📄';
    }
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  private generateDockerfile(config: ProjectConfig): string {
    return `# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

# Production stage  
FROM node:18-alpine AS production
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/main"]
`;
  }

  private generateDockerCompose(config: ProjectConfig): string {
    return `version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DB_HOST=database
    depends_on:
      - database

  database:
    image: ${this.getDatabaseImage(config.database.type)}
    environment:
      ${this.getDatabaseEnvironment(config.database)}
    ports:
      - "${config.database.port}:${config.database.port}"
`;
  }

  private generateDockerignore(): string {
    return `node_modules
npm-debug.log
.git
.gitignore
README.md
.env
coverage
.DS_Store
`;
  }

  private getDatabaseImage(type: string): string {
    switch (type) {
      case 'postgresql':
        return 'postgres:15-alpine';
      case 'mysql':
        return 'mysql:8.0';
      case 'mongodb':
        return 'mongo:6.0';
      default:
        return 'postgres:15-alpine';
    }
  }

  private getDatabaseEnvironment(database: any): string {
    switch (database.type) {
      case 'postgresql':
        return `      - POSTGRES_DB=${database.database}
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password`;
      case 'mysql':
        return `      - MYSQL_DATABASE=${database.database}
      - MYSQL_ROOT_PASSWORD=password`;
      default:
        return '';
    }
  }
}
