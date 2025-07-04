# BlogAPI

A simple blog API data model

This is a sample blog API project generated with [CodeForge](https://github.com/codeforge/codeforge).

## Features

- **2 Entities**: User, Post
- **1 Enums**: UserRole
- **RESTful API**: Complete CRUD operations for all entities
- **OpenAPI Documentation**: Auto-generated Swagger documentation
- **Type Safety**: Full TypeScript support
- **Database Integration**: TypeORM with PostgreSQL
- **Authentication**: JWT-based authentication system
- **Docker Support**: Ready for containerized deployment

## Quick Start

1. **Validate the data model**:
   ```bash
   codeforge validate
   ```

2. **Generate API specifications**:
   ```bash
   codeforge generate specs
   ```

3. **Generate NestJS backend**:
   ```bash
   codeforge generate backend
   ```

4. **Preview the generated code**:
   ```bash
   codeforge preview all
   ```

5. **Deploy to GitHub**:
   ```bash
   codeforge deploy github --token YOUR_GITHUB_TOKEN
   ```

## Data Model

### Entities


#### User
User entity for authentication and authorization

**Fields:**
- `id`: string (optional)
- `email`: string (optional)
- `name`: string (optional)
- `role`: enum (optional)

**Relationships:**
- `posts`: oneToMany → Post


#### Post
Blog post entity

**Fields:**
- `id`: string (optional)
- `title`: string (optional)
- `content`: string (optional)
- `published`: boolean (optional)
- `authorId`: string (optional)

**Relationships:**
- `author`: manyToOne → User



### Enums


#### UserRole
User roles for authorization

Values: `ADMIN`, `USER`, `MODERATOR`



## Next Steps

1. **Customize the data model** in `models/data-model.json`
2. **Update configuration** in `codeforge.config.json`
3. **Generate your backend** with `codeforge generate backend`
4. **Deploy to production** with `codeforge deploy github`

## Learn More

- [CodeForge Documentation](https://docs.codeforge.dev)
- [NestJS Documentation](https://docs.nestjs.com)
- [TypeORM Documentation](https://typeorm.io)
- [OpenAPI Specification](https://swagger.io/specification)

---

Generated with ❤️ by [CodeForge](https://github.com/codeforge/codeforge)
