import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { DataModelParser } from '../../core/data-model-parser';
import { ProjectConfig, DataModel } from '../../core/types';

export class ValidateCommand {
  async execute(options: any): Promise<void> {
    const spinner = ora('Starting validation...').start();

    try {
      const results = {
        config: { valid: false, errors: [], warnings: [] },
        model: { valid: false, errors: [], warnings: [] }
      };

      // Validate configuration file
      spinner.text = 'Validating configuration...';
      await this.validateConfig(options.config, results.config);

      // Validate data model
      spinner.text = 'Validating data model...';
      await this.validateDataModel(options.model, results.model, options.strict);

      spinner.stop();

      // Display results
      this.displayResults(results);

      // Exit with error code if validation failed
      if (!results.config.valid || !results.model.valid) {
        process.exit(1);
      }

    } catch (error) {
      spinner.fail(chalk.red('✗ Validation failed'));
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      throw error;
    }
  }

  private async validateConfig(configPath: string, result: any): Promise<void> {
    const fullPath = path.resolve(process.cwd(), configPath);

    try {
      // Check if file exists
      if (!await fs.pathExists(fullPath)) {
        result.errors.push(`Configuration file not found: ${configPath}`);
        return;
      }

      // Parse JSON
      const config: ProjectConfig = await fs.readJson(fullPath);

      // Validate required fields
      if (!config.project) {
        result.errors.push('Missing required field: project');
      } else {
        if (!config.project.name) {
          result.errors.push('Missing required field: project.name');
        }
        if (!config.project.version) {
          result.errors.push('Missing required field: project.version');
        } else if (!/^\d+\.\d+\.\d+$/.test(config.project.version)) {
          result.errors.push('Invalid version format. Expected semver (x.y.z)');
        }
      }

      if (!config.database) {
        result.errors.push('Missing required field: database');
      } else {
        if (!config.database.type) {
          result.errors.push('Missing required field: database.type');
        } else if (!['postgresql', 'mysql', 'mongodb', 'sqlite'].includes(config.database.type)) {
          result.errors.push('Invalid database type. Supported: postgresql, mysql, mongodb, sqlite');
        }
      }

      if (!config.features) {
        result.warnings.push('No features configuration found. Using defaults.');
      }

      // Validate GitHub configuration if present
      if (config.github) {
        if (!config.github.owner) {
          result.errors.push('Missing required field: github.owner');
        }
      }

      result.valid = result.errors.length === 0;

    } catch (error) {
      result.errors.push(`Failed to parse configuration: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async validateDataModel(modelPath: string, result: any, strict: boolean): Promise<void> {
    const fullPath = path.resolve(process.cwd(), modelPath);

    try {
      // Check if file exists
      if (!await fs.pathExists(fullPath)) {
        result.errors.push(`Data model file not found: ${modelPath}`);
        return;
      }

      // Parse and validate data model
      const parser = new DataModelParser();
      const dataModel: DataModel = await parser.parseFromFile(fullPath);

      // Additional validation checks
      this.validateEntityRelationships(dataModel, result);
      this.validateEntityFields(dataModel, result, strict);
      this.validateNamingConventions(dataModel, result, strict);
      this.validateBusinessRules(dataModel, result);

      result.valid = result.errors.length === 0;

    } catch (error) {
      result.errors.push(`Data model validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private validateEntityRelationships(dataModel: DataModel, result: any): void {
    const entityNames = new Set(dataModel.entities.map(e => e.name));

    for (const entity of dataModel.entities) {
      for (const field of entity.fields) {
        if (field.relationship) {
          const { type, target, foreignKey, joinTable } = field.relationship;

          // Check if target entity exists
          if (!entityNames.has(target)) {
            result.errors.push(
              `Entity ${entity.name}.${field.name}: relationship target '${target}' does not exist`
            );
          }

          // Validate relationship configuration
          if (type === 'manyToMany' && !joinTable) {
            result.warnings.push(
              `Entity ${entity.name}.${field.name}: manyToMany relationship should specify joinTable`
            );
          }

          if (['manyToOne', 'oneToOne'].includes(type) && !foreignKey) {
            result.warnings.push(
              `Entity ${entity.name}.${field.name}: ${type} relationship should specify foreignKey`
            );
          }
        }
      }
    }
  }

  private validateEntityFields(dataModel: DataModel, result: any, strict: boolean): void {
    for (const entity of dataModel.entities) {
      const fieldNames = new Set<string>();

      // Check for duplicate field names
      for (const field of entity.fields) {
        if (fieldNames.has(field.name)) {
          result.errors.push(`Entity ${entity.name}: duplicate field name '${field.name}'`);
        }
        fieldNames.add(field.name);

        // Validate field data types
        this.validateFieldDataType(entity.name, field, result, strict);
      }

      // Check for primary key
      const primaryKeys = entity.fields.filter(f => f.isPrimaryKey);
      if (primaryKeys.length === 0) {
        result.errors.push(`Entity ${entity.name}: must have at least one primary key field`);
      }

      // Check for generated primary keys
      const generatedPrimaryKeys = primaryKeys.filter(f => f.isGenerated);
      if (generatedPrimaryKeys.length > 1) {
        result.errors.push(`Entity ${entity.name}: cannot have multiple generated primary keys`);
      }
    }
  }

  private validateFieldDataType(entityName: string, field: any, result: any, strict: boolean): void {
    const { dataType } = field;

    // Validate enum references
    if (dataType.type === 'enum') {
      if (!dataType.enum || !Array.isArray(dataType.enum) || dataType.enum.length === 0) {
        result.errors.push(
          `Entity ${entityName}.${field.name}: enum type must have at least one value`
        );
      }
    }

    // Validate array item types
    if (dataType.type === 'array' && !dataType.items) {
      result.warnings.push(
        `Entity ${entityName}.${field.name}: array type should specify items type`
      );
    }

    // Validate string constraints
    if (dataType.type === 'string' && dataType.validation) {
      const { minLength, maxLength } = dataType.validation;
      if (minLength !== undefined && maxLength !== undefined && minLength > maxLength) {
        result.errors.push(
          `Entity ${entityName}.${field.name}: minLength cannot be greater than maxLength`
        );
      }
    }

    // Validate number constraints
    if (dataType.type === 'number' && dataType.validation) {
      const { min, max } = dataType.validation;
      if (min !== undefined && max !== undefined && min > max) {
        result.errors.push(
          `Entity ${entityName}.${field.name}: min cannot be greater than max`
        );
      }
    }

    // Strict mode validations
    if (strict) {
      if (!dataType.description) {
        result.warnings.push(
          `Entity ${entityName}.${field.name}: missing field description`
        );
      }

      if (dataType.type === 'string' && !dataType.validation?.maxLength) {
        result.warnings.push(
          `Entity ${entityName}.${field.name}: string field should have maxLength constraint`
        );
      }
    }
  }

  private validateNamingConventions(dataModel: DataModel, result: any, strict: boolean): void {
    // Validate entity names (PascalCase)
    for (const entity of dataModel.entities) {
      if (!/^[A-Z][a-zA-Z0-9]*$/.test(entity.name)) {
        result.warnings.push(
          `Entity ${entity.name}: name should be in PascalCase`
        );
      }

      // Validate field names (camelCase)
      for (const field of entity.fields) {
        if (!/^[a-z][a-zA-Z0-9]*$/.test(field.name)) {
          result.warnings.push(
            `Entity ${entity.name}.${field.name}: field name should be in camelCase`
          );
        }
      }
    }

    // Validate enum names (PascalCase)
    if (dataModel.enums) {
      for (const enumDef of dataModel.enums) {
        if (!/^[A-Z][a-zA-Z0-9]*$/.test(enumDef.name)) {
          result.warnings.push(
            `Enum ${enumDef.name}: name should be in PascalCase`
          );
        }

        // Validate enum values (UPPER_CASE)
        for (const value of enumDef.values) {
          if (strict && !/^[A-Z][A-Z0-9_]*$/.test(value)) {
            result.warnings.push(
              `Enum ${enumDef.name}.${value}: value should be in UPPER_CASE`
            );
          }
        }
      }
    }
  }

  private validateBusinessRules(dataModel: DataModel, result: any): void {
    // Check for circular relationships
    this.checkCircularRelationships(dataModel, result);

    // Validate entity relationships make sense
    this.validateRelationshipLogic(dataModel, result);
  }

  private checkCircularRelationships(dataModel: DataModel, result: any): void {
    // Simple circular dependency check
    const entityGraph = new Map<string, string[]>();

    // Build relationship graph
    for (const entity of dataModel.entities) {
      entityGraph.set(entity.name, []);
      for (const field of entity.fields) {
        if (field.relationship && field.relationship.type !== 'oneToMany') {
          entityGraph.get(entity.name)!.push(field.relationship.target);
        }
      }
    }

    // Check for cycles using DFS
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (node: string): boolean => {
      visited.add(node);
      recursionStack.add(node);

      const neighbors = entityGraph.get(node) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (hasCycle(neighbor)) return true;
        } else if (recursionStack.has(neighbor)) {
          return true;
        }
      }

      recursionStack.delete(node);
      return false;
    };

    for (const entity of dataModel.entities) {
      if (!visited.has(entity.name)) {
        if (hasCycle(entity.name)) {
          result.warnings.push(
            `Potential circular relationship detected involving entity ${entity.name}`
          );
        }
      }
    }
  }

  private validateRelationshipLogic(dataModel: DataModel, result: any): void {
    // Additional relationship validation logic can be added here
    // For example, checking if bidirectional relationships are properly defined
  }

  private displayResults(results: any): void {
    console.log('\n' + chalk.cyan.bold('📋 Validation Results'));

    // Configuration results
    console.log('\n' + chalk.blue.bold('⚙️  Configuration:'));
    if (results.config.valid) {
      console.log(chalk.green('  ✓ Valid'));
    } else {
      console.log(chalk.red('  ✗ Invalid'));
      for (const error of results.config.errors) {
        console.log(chalk.red(`    • ${error}`));
      }
    }

    if (results.config.warnings.length > 0) {
      for (const warning of results.config.warnings) {
        console.log(chalk.yellow(`    ⚠ ${warning}`));
      }
    }

    // Data model results
    console.log('\n' + chalk.blue.bold('📊 Data Model:'));
    if (results.model.valid) {
      console.log(chalk.green('  ✓ Valid'));
    } else {
      console.log(chalk.red('  ✗ Invalid'));
      for (const error of results.model.errors) {
        console.log(chalk.red(`    • ${error}`));
      }
    }

    if (results.model.warnings.length > 0) {
      for (const warning of results.model.warnings) {
        console.log(chalk.yellow(`    ⚠ ${warning}`));
      }
    }

    // Summary
    const totalErrors = results.config.errors.length + results.model.errors.length;
    const totalWarnings = results.config.warnings.length + results.model.warnings.length;

    console.log('\n' + chalk.cyan.bold('📈 Summary:'));
    console.log(chalk.white(`  Errors: ${totalErrors}`));
    console.log(chalk.white(`  Warnings: ${totalWarnings}`));

    if (totalErrors === 0) {
      console.log('\n' + chalk.green.bold('🎉 All validations passed!'));
    } else {
      console.log('\n' + chalk.red.bold('❌ Validation failed. Please fix the errors above.'));
    }
  }
}
