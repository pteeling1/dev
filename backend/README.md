# AX Calculator Backend API

Azure Functions-based backend for the AX Calculator sizing tool. Provides REST API endpoints for saving, loading, and managing user configurations with Auth0 authentication and Azure Cosmos DB storage.

## Architecture

```
backend/
├── functions/
│   ├── Health/              # GET /api/health
│   ├── SaveConfig/          # POST /api/configs
│   ├── ListConfigs/         # GET /api/configs
│   ├── GetConfig/           # GET /api/configs/{configId}
│   ├── UpdateConfig/        # PUT /api/configs/{configId}
│   ├── DeleteConfig/        # DELETE /api/configs/{configId}
│   ├── GetUser/             # GET /api/user
│   └── shared/              # Shared modules
│       ├── authHelper.js    # Auth0 JWT validation
│       └── cosmosHelper.js  # Cosmos DB operations
├── host.json                # Function app configuration
├── local.settings.json      # Local development settings
└── package.json             # Node.js dependencies
```

## Authentication

All endpoints except `/api/health` require Auth0 JWT token in the `Authorization: Bearer <token>` header.

The token is validated against the Auth0 JWKS endpoint and claims are checked for audience and issuer.

## Environment Variables

```
AUTH0_DOMAIN              # Auth0 tenant domain (dev-pzbx0t28157ybwt0.us.auth0.com)
AUTH0_AUDIENCE            # Expected audience in JWT (https://sizer.teeling.ai)
COSMOS_ENDPOINT           # Cosmos DB endpoint URL
COSMOS_KEY                # Cosmos DB primary key
COSMOS_DATABASE           # Cosmos DB database name (ax-calculator)
COSMOS_CONTAINER          # Cosmos DB container name (configurations)
NODE_ENV                  # Environment (development/production)
```

## API Endpoints

### Health Check
```
GET /api/health
```
No authentication required. Returns database connection status.

### Save Configuration
```
POST /api/configs
Authorization: Bearer <token>

Body:
{
  "metadata": { "name": "Config Name", "description": "..." },
  "uiState": { ... },
  "calculation": { ... },
  "state": { ... }
}

Response: { "success": true, "configId": "...", "message": "..." }
```

### List User Configurations
```
GET /api/configs
Authorization: Bearer <token>

Response: [ { "id": "...", "metadata": { ... }, ... }, ... ]
```

### Get Single Configuration
```
GET /api/configs/{configId}
Authorization: Bearer <token>

Response: { "id": "...", "userId": "...", "metadata": { ... }, ... }
```

### Update Configuration
```
PUT /api/configs/{configId}
Authorization: Bearer <token>

Body:
{
  "metadata": { ... },
  "uiState": { ... },
  ...
}

Response: { "success": true, "configId": "...", "message": "..." }
```

### Delete Configuration
```
DELETE /api/configs/{configId}
Authorization: Bearer <token>

Response: { "success": true, "message": "..." }
```

### Get User Profile
```
GET /api/user
Authorization: Bearer <token>

Response: { "userId": "...", "email": "...", "nickname": "..." }
```

## Local Development

### Prerequisites
- Node.js 20+
- Azure Functions Core Tools (npm or download from https://github.com/Azure/azure-functions-core-tools)

### Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables in `local.settings.json`:
   - Update `COSMOS_KEY` with your actual Cosmos DB key
   - Set `COSMOS_ENDPOINT` if different

3. Start local Functions runtime:
```bash
npm run dev
```

Functions will be available at `http://localhost:7071/api/`

### Testing

Test endpoints with curl or Postman. For authenticated endpoints, you'll need a valid Auth0 token:

```bash
# Get a token from Auth0
TOKEN="your-auth0-token"

# Test list configs
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:7071/api/configs
```

## Deployment to Azure

The backend is deployed as Azure Functions (consumption-based plan) at:
```
https://ax-calculator-api.azurewebsites.net/api/
```

### Deploying Code

1. Install Azure Functions CLI:
```bash
npm install -g azure-functions-core-tools@4 --yes
# or use Homebrew: brew tap azure/functions && brew install azure-functions-core-tools@4
```

2. Deploy:
```bash
func azure functionapp publish ax-calculator-api --build remote
```

3. Verify deployment by testing health endpoint:
```bash
curl https://ax-calculator-api.azurewebsites.net/api/health
```

### Configure Environment Variables in Azure

After deployment, configure Azure Function App environment variables:

```bash
az functionapp config appsettings set \
  --name ax-calculator-api \
  --resource-group axcalculator2 \
  --settings \
    AUTH0_DOMAIN="dev-pzbx0t28157ybwt0.us.auth0.com" \
    AUTH0_AUDIENCE="https://sizer.teeling.ai" \
    COSMOS_ENDPOINT="https://ax-calculator-db.documents.azure.com:443/" \
    COSMOS_KEY="your-cosmos-key" \
    COSMOS_DATABASE="ax-calculator" \
    COSMOS_CONTAINER="configurations" \
    NODE_ENV="production"
```

## Troubleshooting

### Functions not running locally
- Ensure Azure Functions Core Tools is installed: `func --version`
- Check Node.js version: `node --version` (should be 20+)
- Clear npm cache: `npm cache clean --force`

### Auth errors in deployment
- Verify `AUTH0_DOMAIN` and `AUTH0_AUDIENCE` in Azure Function App settings
- Check Auth0 application configuration (OIDC compliant, correct audience)
- Ensure JWKS endpoint is accessible

### Cosmos DB connection issues
- Test connection string: mongo shell or Azure portal
- Verify IP is whitelisted (if using IP-based firewall)
- Check `COSMOS_ENDPOINT` and `COSMOS_KEY` are set correctly

### CORS errors
- Verify frontend origin is listed in `host.json` CORS allowedOrigins
- Ensure `supportCredentials: true` if using credentials

## File Structure Details

### authHelper.js
Handles Auth0 JWT validation:
- `verifyToken(token)` - Validates and decodes JWT
- `authenticateRequest(context)` - Middleware-like auth check for Azure Functions
- `getCorsHeaders()` - Returns CORS headers for all responses
- `handleCorsPreFlight(context)` - Handles OPTIONS requests

### cosmosHelper.js
Manages Cosmos DB operations:
- `initializeContainer()` - Establishes connection (singleton)
- `getContainer()` - Gets existing connection or initializes new
- `getUserConfigurations(userId)` - Lists user's saved configs
- `getConfiguration(configId)` - Retrieves single config
- `createConfiguration(userId, config)` - Creates new config
- `updateConfiguration(configId, updates)` - Updates existing config
- `deleteConfiguration(configId)` - Deletes config

Each function handler:
- Extracts authentication using `authenticateRequest()`
- Handles CORS preflight OPTIONS requests
- Calls cosmos helpers for data operations
- Returns standardized JSON responses with CORS headers
- Includes ownership verification for user-specific endpoints

## Security

- All endpoints (except health) require valid Auth0 JWT token
- User ownership is verified before returning or modifying configs
- Cosmos DB connection uses primary key (production should use read replicas for reads)
- CORS only allows specific origins (see host.json)
- Secrets are stored in Azure Key Vault and referenced in Function App

## Performance

- JWT validation is cached (JWKS cache: 1 hour)
- Cosmos DB uses parameterized queries to prevent injection
- Azure Functions scales automatically on consumption plan
- Database queries are optimized with indexes on userId and lastModified

## References

- [Azure Functions Node.js Developer Guide](https://learn.microsoft.com/en-us/azure/azure-functions/functions-reference-node)
- [Auth0 JWT Validation](https://auth0.com/docs/secure/tokens/access-tokens/validate-access-tokens)
- [Azure Cosmos DB Node.js SDK](https://github.com/Azure/azure-sdk-for-js/tree/main/sdk/cosmosdb/cosmos)
