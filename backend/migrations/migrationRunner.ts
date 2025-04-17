import { bigQueryClient, bigQueryConfig } from '../dbConfig';

async function runMigration() {
  try {
    console.log('Running migration...');

    // Example: Using the BigQuery client to create a dataset
    const [dataset] = await bigQueryClient.dataset(bigQueryConfig.dataset).get({ autoCreate: true });

    console.log(`Dataset "${dataset.id}" is ready.`);

    // Example: Using the BigQuery client to create a table
    const [table] = await dataset.table(bigQueryConfig.userTable).get({ autoCreate: true });

    console.log(`Table "${table.id}" is ready.`);
  } catch (error) {
    console.error('Error while running migration:', error);
  }
}

runMigration();