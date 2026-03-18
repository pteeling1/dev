/**
 * Azure Cosmos DB Helper
 * Manages database connection and common operations
 */

const { CosmosClient } = require('@azure/cosmos');

let cosmosContainer = null;

/**
 * Initialize Cosmos DB connection
 */
async function initializeContainer() {
  if (cosmosContainer) {
    return cosmosContainer;
  }

  try {
    const endpoint = process.env.COSMOS_ENDPOINT;
    const key = process.env.COSMOS_KEY;
    const databaseId = process.env.COSMOS_DATABASE || 'ax-calculator';
    const containerId = process.env.COSMOS_CONTAINER || 'configurations';

    if (!endpoint || !key) {
      throw new Error('Missing COSMOS_ENDPOINT or COSMOS_KEY environment variables');
    }

    const client = new CosmosClient({ endpoint, key });
    const database = client.database(databaseId);
    cosmosContainer = database.container(containerId);

    // Test connection
    try {
      await cosmosContainer.item('test').read();
    } catch (e) {
      // Expected on first use
      console.log('Container initialized (first use or no test item)');
    }

    console.log(`✅ Connected to Cosmos DB: ${databaseId}/${containerId}`);
    return cosmosContainer;
  } catch (error) {
    console.error('❌ Failed to initialize Cosmos DB:', error);
    throw error;
  }
}

/**
 * Get the container (initialize if needed)
 */
async function getContainer() {
  if (!cosmosContainer) {
    await initializeContainer();
  }
  return cosmosContainer;
}

/**
 * Query configurations for a user
 */
async function getUserConfigurations(userId) {
  const container = await getContainer();
  
  try {
    const query = `
      SELECT * FROM c 
      WHERE c.userId = @userId 
      ORDER BY c.metadata.lastModified DESC
    `;

    const { resources } = await container.items
      .query(query, { parameters: [{ name: '@userId', value: userId }] })
      .fetchAll();

    return resources;
  } catch (error) {
    console.error('❌ Error querying configurations:', error);
    throw error;
  }
}

/**
 * Get a single configuration
 */
async function getConfiguration(configId) {
  const container = await getContainer();
  
  try {
    const { resource } = await container.item(configId).read();
    return resource;
  } catch (error) {
    console.error('❌ Error reading configuration:', error);
    throw error;
  }
}

/**
 * Create a new configuration
 */
async function createConfiguration(userId, config) {
  const container = await getContainer();
  
  if (!config.metadata || !config.metadata.name) {
    throw new Error('Configuration must have a name');
  }

  try {
    const configId = `${userId}#${Date.now()}#${Math.random().toString(36).substr(2, 9)}`;
    
    const document = {
      id: configId,
      userId,
      ...config,
      serverCreatedDate: new Date().toISOString()
    };

    const { resource } = await container.items.create(document);
    console.log(`✅ Saved config for user ${userId}: ${configId}`);
    return resource;
  } catch (error) {
    console.error('❌ Error creating configuration:', error);
    throw error;
  }
}

/**
 * Update an existing configuration
 */
async function updateConfiguration(configId, updates) {
  const container = await getContainer();
  
  try {
    const { resource: existing } = await container.item(configId).read();
    
    const updated = {
      ...existing,
      ...updates,
      metadata: {
        ...existing.metadata,
        ...updates.metadata,
        lastModified: new Date().toISOString()
      }
    };

    await container.item(configId).replace(updated);
    console.log(`✅ Updated config ${configId}`);
    return updated;
  } catch (error) {
    console.error('❌ Error updating configuration:', error);
    throw error;
  }
}

/**
 * Delete a configuration
 */
async function deleteConfiguration(configId) {
  const container = await getContainer();
  
  try {
    await container.item(configId).delete();
    console.log(`✅ Deleted config ${configId}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Error deleting configuration:', error);
    throw error;
  }
}

module.exports = {
  initializeContainer,
  getContainer,
  getUserConfigurations,
  getConfiguration,
  createConfiguration,
  updateConfiguration,
  deleteConfiguration
};
