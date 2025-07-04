import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import { ProjectConfig, DataModel } from '../../core/types';
import { DataModelParser } from '../../core/data-model-parser';

export class InfoCommand {
  async execute(options: any): Promise<void> {
    try {
      console.log('\n' + chalk.cyan.bold('📊 CodeForge Project Information'));

      // Load and display configuration
      await this.showConfigInfo(options.config);

      // Load and display data model info
      await this.showDataModelInfo();

      // Show project status
      await this.showProjectStatus();

    } catch (error) {
      console.error(chalk.red('✗ Failed to get project information'));
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      throw error;
    }
  }

  private async showConfigInfo(configPath: string): Promise<void> {
    const fullPath = path.resolve(process.cwd(), configPath);

    if (!await fs.pathExists(fullPath)) {
      console.log(chalk.red('\n❌ Configuration file not found'));
      return;
    }

    try {
      const config: ProjectConfig = await fs.readJson(fullPath);

      console.log('\n' + chalk.blue.bold('⚙️  Configuration:'));
      console.log(chalk.white(`  Name: ${config.project.name}`));
      console.log(chalk.white(`  Version: ${config.project.version}`));
      if (config.project.description) {
        console.log(chalk.white(`  Description: ${config.project.description}`));
      }
      if (config.project.author) {
        console.log(chalk.white(`  Author: ${config.project.author}`));
      }

      console.log('\n' + chalk.blue.bold('🗄️  Database:'));
      console.log(chalk.white(`  Type: ${config.database.type}`));
      console.log(chalk.white(`  Host: ${config.database.host || 'localhost'}`));
      console.log(chalk.white(`  Port: ${config.database.port}`));
      console.log(chalk.white(`  Database: ${config.database.database}`));

      console.log('\n' + chalk.blue.bold('🎛️  Features:'));
      const features = config.features;
      console.log(chalk.white(`  Authentication: ${features.authentication ? '✓' : '✗'}`));
      console.log(chalk.white(`  Authorization: ${features.authorization ? '✓' : '✗'}`));
      console.log(chalk.white(`  Swagger: ${features.swagger ? '✓' : '✗'}`));
      console.log(chalk.white(`  AsyncAPI: ${features.asyncapi ? '✓' : '✗'}`));
      console.log(chalk.white(`  Docker: ${features.docker ? '✓' : '✗'}`));
      console.log(chalk.white(`  Testing: ${features.testing ? '✓' : '✗'}`));
      console.log(chalk.white(`  Logging: ${features.logging ? '✓' : '✗'}`));
      console.log(chalk.white(`  Monitoring: ${features.monitoring ? '✓' : '✗'}`));

    } catch (error) {
      console.log(chalk.red('\n❌ Failed to parse configuration file'));
    }
  }

  private async showDataModelInfo(): Promise<void> {
    const modelPath = path.resolve(process.cwd(), 'models/data-model.json');

    if (!await fs.pathExists(modelPath)) {
      console.log(chalk.red('\n❌ Data model file not found'));
      return;
    }

    try {
      const parser = new DataModelParser();
      const dataModel: DataModel = await parser.parseFromFile(modelPath);

      console.log('\n' + chalk.blue.bold('📋 Data Model:'));
      console.log(chalk.white(`  Name: ${dataModel.name}`));
      console.log(chalk.white(`  Version: ${dataModel.version}`));
      if (dataModel.description) {
        console.log(chalk.white(`  Description: ${dataModel.description}`));
      }

      console.log('\n' + chalk.blue.bold('🏗️  Entities:'));
      console.log(chalk.white(`  Count: ${dataModel.entities.length}`));
      
      for (const entity of dataModel.entities) {
        const fieldCount = entity.fields.length;
        const relationshipCount = entity.fields.filter(f => f.relationship).length;
        const primaryKeyCount = entity.fields.filter(f => f.isPrimaryKey).length;
        
        console.log(chalk.white(`  • ${entity.name}:`));
        console.log(chalk.gray(`    Fields: ${fieldCount}, Relationships: ${relationshipCount}, Primary Keys: ${primaryKeyCount}`));
        if (entity.description) {
          console.log(chalk.gray(`    Description: ${entity.description}`));
        }
      }

      if (dataModel.enums && dataModel.enums.length > 0) {
        console.log('\n' + chalk.blue.bold('🔢 Enums:'));
        console.log(chalk.white(`  Count: ${dataModel.enums.length}`));
        
        for (const enumDef of dataModel.enums) {
          console.log(chalk.white(`  • ${enumDef.name}: ${enumDef.values.length} values`));
          if (enumDef.description) {
            console.log(chalk.gray(`    Description: ${enumDef.description}`));
          }
        }
      }

    } catch (error) {
      console.log(chalk.red('\n❌ Failed to parse data model file'));
      console.log(chalk.red(`   ${error instanceof Error ? error.message : String(error)}`));
    }
  }

  private async showProjectStatus(): Promise<void> {
    console.log('\n' + chalk.blue.bold('📈 Project Status:'));

    // Check for generated files
    const generatedDir = path.resolve(process.cwd(), 'generated');
    const hasGenerated = await fs.pathExists(generatedDir);

    if (hasGenerated) {
      console.log(chalk.green('  ✓ Generated files exist'));

      // Check specific generated content
      const specsDir = path.join(generatedDir, 'specs');
      const backendDir = path.join(generatedDir, 'backend');
      const dockerFile = path.join(generatedDir, 'Dockerfile');

      const hasSpecs = await fs.pathExists(specsDir);
      const hasBackend = await fs.pathExists(backendDir);
      const hasDocker = await fs.pathExists(dockerFile);

      console.log(chalk.white(`    API Specs: ${hasSpecs ? '✓' : '✗'}`));
      console.log(chalk.white(`    Backend: ${hasBackend ? '✓' : '✗'}`));
      console.log(chalk.white(`    Docker: ${hasDocker ? '✓' : '✗'}`));

      if (hasBackend) {
        const packageJsonPath = path.join(backendDir, 'package.json');
        const nodeModulesPath = path.join(backendDir, 'node_modules');
        
        const hasPackageJson = await fs.pathExists(packageJsonPath);
        const hasNodeModules = await fs.pathExists(nodeModulesPath);

        console.log(chalk.white(`    Dependencies installed: ${hasNodeModules ? '✓' : '✗'}`));
        
        if (hasPackageJson && !hasNodeModules) {
          console.log(chalk.yellow('    💡 Run "npm install" in the backend directory'));
        }
      }
    } else {
      console.log(chalk.yellow('  ⚠ No generated files found'));
      console.log(chalk.gray('    Run "codeforge generate" to create files'));
    }

    // Check for common issues
    await this.checkCommonIssues();

    // Show next steps
    this.showNextSteps(hasGenerated);
  }

  private async checkCommonIssues(): Promise<void> {
    const issues: string[] = [];

    // Check if models directory exists
    const modelsDir = path.resolve(process.cwd(), 'models');
    if (!await fs.pathExists(modelsDir)) {
      issues.push('Models directory not found');
    }

    // Check if data model file exists
    const dataModelPath = path.join(modelsDir, 'data-model.json');
    if (!await fs.pathExists(dataModelPath)) {
      issues.push('Data model file not found');
    }

    // Check if config file exists
    const configPath = path.resolve(process.cwd(), 'codeforge.config.json');
    if (!await fs.pathExists(configPath)) {
      issues.push('Configuration file not found');
    }

    if (issues.length > 0) {
      console.log('\n' + chalk.yellow.bold('⚠️  Issues Found:'));
      for (const issue of issues) {
        console.log(chalk.yellow(`  • ${issue}`));
      }
    }
  }

  private showNextSteps(hasGenerated: boolean): void {
    console.log('\n' + chalk.cyan.bold('🚀 Suggested Next Steps:'));

    if (!hasGenerated) {
      console.log(chalk.white('  1. Validate your data model: codeforge validate'));
      console.log(chalk.white('  2. Generate API specs: codeforge generate specs'));
      console.log(chalk.white('  3. Generate backend: codeforge generate backend'));
      console.log(chalk.white('  4. Deploy to GitHub: codeforge deploy github'));
    } else {
      console.log(chalk.white('  1. Review generated code: codeforge preview all'));
      console.log(chalk.white('  2. Install dependencies: cd generated/backend && npm install'));
      console.log(chalk.white('  3. Start development server: npm run start:dev'));
      console.log(chalk.white('  4. Deploy to GitHub: codeforge deploy github'));
    }

    console.log('\n' + chalk.gray('For help: codeforge --help'));
  }
}
