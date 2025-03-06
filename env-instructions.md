# Environment Variables Management Guide

This guide explains how to manage environment variables in your project to avoid hardcoded credentials and make configuration changes easier.

## Setup Instructions

1. **Create your .env file**

   Copy the `.env.example` file to create your actual `.env` file:
   ```bash
   cp .env.example .env
   ```

2. **Edit your .env file**

   Update the values in your `.env` file with your actual database credentials and other configuration options.

3. **Ensure .env is ignored in git**

   Make sure your `.env` file is listed in `.gitignore` to prevent committing sensitive information:
   ```
   # Environment variables
   .env
   .env.local
   .env.development.local
   .env.test.local
   .env.production.local
   */.env
   ```

## When Database Configurations Change

When you need to change database configurations:

1. **Update your .env file**

   Simply edit the values in your `.env` file. For example, to change the database user:
   ```
   DB_USER=new_username
   ```

2. **No code changes required**

   Since your application code uses environment variables, you don't need to modify any code files when configuration values change.

3. **For team collaboration**

   - Update the `.env.example` file with any new environment variables (but use placeholder values)
   - Inform team members to update their `.env` files accordingly

## Environment-Specific Configurations

For different environments (development, testing, production):

1. Create environment-specific `.env` files:
   - `.env.development`
   - `.env.test`
   - `.env.production`

2. Load the appropriate environment file based on `NODE_ENV`:
   ```javascript
   // In your config file
   dotenv.config({ path: `.env.${process.env.NODE_ENV || 'development'}` });
   ```

## Using Environment Variables

Access environment variables in your code:

```javascript
// TypeScript/JavaScript
const dbHost = process.env.DB_HOST;
```

## Security Best Practices

1. **Never commit .env files** to your repository
2. **Use strong, unique passwords** for database credentials
3. **Regularly rotate credentials** for production environments
4. **Limit permissions** for database users to only what they need
5. **Use different credentials** for development and production environments
