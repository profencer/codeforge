import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { DataModelParser } from '../../core/data-model-parser';
import { OpenAPIGenerator } from '../../generators/openapi-generator';
import { AsyncAPIGenerator } from '../../generators/asyncapi-generator';
import { NestJSGenerator } from '../../generators/nestjs-generator';
import { ProjectConfig, DataModel } from '../../core/types';

export class GenerateCommand {
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
      
      spinner.text = 'Validating data model...';
      
      // Validate data model
      // The parser already validates, but we could add additional business logic here

      const outputDir = path.resolve(process.cwd(), options.output);
      
      if (options.dryRun) {
        spinner.succeed(chalk.green('✓ Dry run mode - showing what would be generated'));
        await this.showDryRun(type, config, dataModel, outputDir);
        return;
      }

      // Ensure output directory exists
      await fs.ensureDir(outputDir);

      // Generate based on type
      switch (type.toLowerCase()) {
        case 'specs':
          await this.generateSpecs(config, dataModel, outputDir, spinner);
          break;
        case 'backend':
          await this.generateBackend(config, dataModel, outputDir, spinner);
          break;
        case 'docker':
          await this.generateDocker(config, dataModel, outputDir, spinner);
          break;
        case 'all':
          await this.generateAll(config, dataModel, outputDir, spinner);
          break;
        default:
          spinner.fail(chalk.red(`Unknown generation type: ${type}`));
          return;
      }

      spinner.succeed(chalk.green('✓ Generation completed successfully!'));
      this.showNextSteps(type, outputDir);

    } catch (error) {
      spinner.fail(chalk.red('✗ Generation failed'));
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      if (options.verbose && error instanceof Error) {
        console.error(chalk.gray(error.stack));
      }
      throw error;
    }
  }

  private async generateSpecs(
    config: ProjectConfig, 
    dataModel: DataModel, 
    outputDir: string, 
    spinner: ora.Ora
  ): Promise<void> {
    spinner.text = 'Generating OpenAPI specification...';
    
    const openApiGenerator = new OpenAPIGenerator(config, dataModel);
    const openApiResult = openApiGenerator.generate();
    
    if (!openApiResult.success) {
      throw new Error(`OpenAPI generation failed: ${openApiResult.errors.join(', ')}`);
    }

    // Write OpenAPI files
    for (const file of openApiResult.files) {
      const filePath = path.join(outputDir, 'specs', file.path);
      await fs.ensureDir(path.dirname(filePath));
      await fs.writeFile(filePath, file.content);
    }

    if (config.features.asyncapi) {
      spinner.text = 'Generating AsyncAPI specification...';
      
      const asyncApiGenerator = new AsyncAPIGenerator(config, dataModel);
      const asyncApiResult = asyncApiGenerator.generate();
      
      if (!asyncApiResult.success) {
        throw new Error(`AsyncAPI generation failed: ${asyncApiResult.errors.join(', ')}`);
      }

      // Write AsyncAPI files
      for (const file of asyncApiResult.files) {
        const filePath = path.join(outputDir, 'specs', file.path);
        await fs.ensureDir(path.dirname(filePath));
        await fs.writeFile(filePath, file.content);
      }
    }
  }

  private async generateBackend(
    config: ProjectConfig, 
    dataModel: DataModel, 
    outputDir: string, 
    spinner: ora.Ora
  ): Promise<void> {
    spinner.text = 'Generating NestJS backend...';
    
    const nestjsGenerator = new NestJSGenerator(config, dataModel);
    const result = await nestjsGenerator.generate();
    
    if (!result.success) {
      throw new Error(`Backend generation failed: ${result.errors.join(', ')}`);
    }

    // Write backend files
    const backendDir = path.join(outputDir, 'backend');
    for (const file of result.files) {
      const filePath = path.join(backendDir, file.path);
      await fs.ensureDir(path.dirname(filePath));
      await fs.writeFile(filePath, file.content);
    }

    // Copy additional files if needed
    await this.copyStaticFiles(backendDir);
  }

  private async generateDocker(
    config: ProjectConfig, 
    dataModel: DataModel, 
    outputDir: string, 
    spinner: ora.Ora
  ): Promise<void> {
    spinner.text = 'Generating Docker configuration...';
    
    // Generate Dockerfile
    const dockerfile = this.generateDockerfile(config);
    await fs.writeFile(path.join(outputDir, 'Dockerfile'), dockerfile);

    // Generate docker-compose.yml
    const dockerCompose = this.generateDockerCompose(config);
    await fs.writeFile(path.join(outputDir, 'docker-compose.yml'), dockerCompose);

    // Generate .dockerignore
    const dockerignore = this.generateDockerignore();
    await fs.writeFile(path.join(outputDir, '.dockerignore'), dockerignore);
  }

  private async generateAll(
    config: ProjectConfig, 
    dataModel: DataModel, 
    outputDir: string, 
    spinner: ora.Ora
  ): Promise<void> {
    await this.generateSpecs(config, dataModel, outputDir, spinner);
    await this.generateBackend(config, dataModel, outputDir, spinner);
    
    if (config.features.docker) {
      await this.generateDocker(config, dataModel, outputDir, spinner);
    }
  }

  private async showDryRun(
    type: string, 
    config: ProjectConfig, 
    dataModel: DataModel, 
    outputDir: string
  ): Promise<void> {
    console.log(chalk.cyan.bold('\n📋 Generation Plan:'));
    console.log(chalk.white(`Type: ${type}`));
    console.log(chalk.white(`Output Directory: ${outputDir}`));
    console.log(chalk.white(`Entities: ${dataModel.entities.length}`));
    
    console.log(chalk.cyan.bold('\n📁 Files that would be generated:'));
    
    if (type === 'specs' || type === 'all') {
      console.log(chalk.green('  📄 API Specifications:'));
      console.log('    - specs/openapi.json');
      console.log('    - specs/openapi.yaml');
      if (config.features.asyncapi) {
        console.log('    - specs/asyncapi.json');
        console.log('    - specs/asyncapi.yaml');
      }
    }

    if (type === 'backend' || type === 'all') {
      console.log(chalk.green('  🏗️  NestJS Backend:'));
      console.log('    - backend/package.json');
      console.log('    - backend/src/main.ts');
      console.log('    - backend/src/app.module.ts');
      
      for (const entity of dataModel.entities) {
        const entityPath = entity.name.toLowerCase();
        console.log(`    - backend/src/${entityPath}/${entityPath}.entity.ts`);
        console.log(`    - backend/src/${entityPath}/${entityPath}.service.ts`);
        console.log(`    - backend/src/${entityPath}/${entityPath}.controller.ts`);
        console.log(`    - backend/src/${entityPath}/${entityPath}.module.ts`);
      }
    }

    if ((type === 'docker' || type === 'all') && config.features.docker) {
      console.log(chalk.green('  🐳 Docker Configuration:'));
      console.log('    - Dockerfile');
      console.log('    - docker-compose.yml');
      console.log('    - .dockerignore');
    }
  }

  private async copyStaticFiles(backendDir: string): Promise<void> {
    // Copy any static files that might be needed
    // This could include templates, assets, etc.
  }

  private generateDockerfile(config: ProjectConfig): string {
    return `# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built application
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# Change ownership of the app directory
RUN chown -R nestjs:nodejs /app
USER nestjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost:3000/api/v1/health || exit 1

# Start the application
CMD ["node", "dist/main"]
`;
  }

  private generateDockerCompose(config: ProjectConfig): string {
    const { database } = config;
    
    return `version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DB_HOST=database
      - DB_PORT=${database.port}
      - DB_USERNAME=${database.type === 'postgresql' ? 'postgres' : 'root'}
      - DB_PASSWORD=password
      - DB_DATABASE=${database.database}
    depends_on:
      - database
    restart: unless-stopped

  database:
    image: ${this.getDatabaseImage(database.type)}
    environment:
      ${this.getDatabaseEnvironment(database)}
    ports:
      - "${database.port}:${database.port}"
    volumes:
      - db_data:/var/lib/${database.type === 'postgresql' ? 'postgresql' : 'mysql'}/data
    restart: unless-stopped

volumes:
  db_data:
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
      case 'mongodb':
        return `      - MONGO_INITDB_DATABASE=${database.database}
      - MONGO_INITDB_ROOT_USERNAME=root
      - MONGO_INITDB_ROOT_PASSWORD=password`;
      default:
        return '';
    }
  }

  private generateDockerignore(): string {
    return `node_modules
npm-debug.log
.git
.gitignore
README.md
.env
.nyc_output
coverage
.coverage
.coverage.*
.cache
.DS_Store
`;
  }

  private showNextSteps(type: string, outputDir: string): void {
    console.log('\n' + chalk.green.bold('🎉 Generation completed!'));
    console.log('\n' + chalk.cyan.bold('Next steps:'));
    
    if (type === 'specs' || type === 'all') {
      console.log(chalk.white('  📄 API Specifications generated in specs/'));
      console.log(chalk.gray('    - Review the OpenAPI specification'));
      console.log(chalk.gray('    - Import into Postman or Insomnia for testing'));
    }

    if (type === 'backend' || type === 'all') {
      console.log(chalk.white('  🏗️  NestJS Backend generated in backend/'));
      console.log(chalk.gray('    - cd backend/'));
      console.log(chalk.gray('    - npm install'));
      console.log(chalk.gray('    - npm run start:dev'));
    }

    if (type === 'docker' || type === 'all') {
      console.log(chalk.white('  🐳 Docker configuration generated'));
      console.log(chalk.gray('    - docker-compose up -d'));
    }

    console.log('\n' + chalk.gray('For help: codeforge --help'));
  }
}
