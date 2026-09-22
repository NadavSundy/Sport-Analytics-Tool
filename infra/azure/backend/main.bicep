@description('Azure region for backend-specific resources.')
param location string = resourceGroup().location

@description('Short lowercase prefix used for backend resource names.')
@minLength(3)
@maxLength(16)
param namePrefix string = 'statsthegame'

@description('Deployment environment label included in backend resource names and configuration.')
@allowed([
  'dev'
  'test'
  'prod'
])
param environmentName string = 'dev'

@description('Immutable backend container image including its digest or commit tag.')
param containerImage string

@description('Existing Container Apps managed environment shared with the asynchronous worker.')
param containerAppsEnvironmentName string = 'statsthegame-dev-worker-env'

@description('Existing Azure Container Registry used for immutable application images.')
param containerRegistryName string = 'statsthegamedevyhmqlinqfhkyg'

@description('Existing private Blob Storage account used by the API.')
param storageAccountName string = 'statsthegameblobdev'

@description('Existing private Blob container used for staged ingestion payloads.')
param storageContainerName string = 'staged-ingestion'

@description('Existing private Blob container used for immutable dataset release artifacts.')
param releaseStorageContainerName string = 'dataset-releases'

@description('Existing Key Vault that stores the PostgreSQL connection string.')
param keyVaultName string = 'statsthegame-dev-kv'

@description('Versionless HTTPS Key Vault secret URI for DATABASE_URL.')
param databaseSecretUri string

@description('Versionless HTTPS Key Vault secret URI for SUPABASE_SECRET_KEY.')
param supabaseSecretKeySecretUri string

@description('Exact allowed browser origins for credentialed API requests.')
param corsOrigins string

@description('Supabase project URL used by backend token verification.')
param supabaseUrl string

@description('Supabase publishable key used by backend token verification.')
param supabasePublishableKey string

@description('Minimum continuously available API replicas. Scale to zero while idle; maxReplicas remains one to preserve process-local rate-limit semantics.')
@minValue(0)
@maxValue(1)
param minReplicas int = 0

@description('Maximum API replicas. Keep at one until shared rate-limit state is implemented.')
@minValue(1)
@maxValue(1)
param maxReplicas int = 1

var suffix = '${namePrefix}-${environmentName}'
var containerAppName = '${suffix}-api'
var blobContributorRoleId = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'ba92f5b4-2d11-453d-a403-e96b0029c9fe')
var keyVaultSecretsUserRoleId = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '4633458b-17de-408a-b874-0445c86b69e6')
var acrPullRoleId = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '7f951dda-4ed3-4680-a7ca-43fe172d538d')

resource runtimeIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: '${suffix}-api-runtime'
  location: location
}

resource pullIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: '${suffix}-api-pull'
  location: location
}

resource containerEnvironment 'Microsoft.App/managedEnvironments@2024-03-01' existing = {
  name: containerAppsEnvironmentName
}

resource registry 'Microsoft.ContainerRegistry/registries@2023-07-01' existing = {
  name: containerRegistryName
}

resource existingStorage 'Microsoft.Storage/storageAccounts@2023-05-01' existing = {
  name: storageAccountName
}

resource existingKeyVault 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: keyVaultName
}

resource blobContributorRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(existingStorage.id, runtimeIdentity.id, blobContributorRoleId)
  scope: existingStorage
  properties: {
    principalId: runtimeIdentity.properties.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: blobContributorRoleId
  }
}

resource keyVaultSecretRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(existingKeyVault.id, runtimeIdentity.id, keyVaultSecretsUserRoleId)
  scope: existingKeyVault
  properties: {
    principalId: runtimeIdentity.properties.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: keyVaultSecretsUserRoleId
  }
}

resource registryPullRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(registry.id, pullIdentity.id, acrPullRoleId)
  scope: registry
  properties: {
    principalId: pullIdentity.properties.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: acrPullRoleId
  }
}

resource backend 'Microsoft.App/containerApps@2025-02-02-preview' = {
  name: containerAppName
  location: location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${runtimeIdentity.id}': {}
      '${pullIdentity.id}': {}
    }
  }
  properties: {
    environmentId: containerEnvironment.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        allowInsecure: false
        targetPort: 3000
        transport: 'http'
      }
      registries: [
        {
          server: registry.properties.loginServer
          identity: pullIdentity.id
        }
      ]
      secrets: [
        {
          name: 'database-url'
          keyVaultUrl: databaseSecretUri
          identity: runtimeIdentity.id
        }
        {
          name: 'supabase-secret-key'
          keyVaultUrl: supabaseSecretKeySecretUri
          identity: runtimeIdentity.id
        }
      ]
    }
    template: {
      terminationGracePeriodSeconds: 30
      containers: [
        {
          name: 'api'
          image: containerImage
          env: [
            { name: 'NODE_ENV', value: 'production' }
            { name: 'PORT', value: '3000' }
            { name: 'DEPLOYMENT_ENVIRONMENT', value: environmentName }
            { name: 'CORS_ORIGINS', value: corsOrigins }
            { name: 'SUPABASE_URL', value: supabaseUrl }
            { name: 'SUPABASE_PUBLISHABLE_KEY', value: supabasePublishableKey }
            { name: 'SUPABASE_SECRET_KEY', secretRef: 'supabase-secret-key' }
            { name: 'DATABASE_URL', secretRef: 'database-url' }
            { name: 'OBJECT_STORAGE_PROVIDER', value: 'azure' }
            { name: 'AZURE_STORAGE_ACCOUNT_NAME', value: existingStorage.name }
            { name: 'AZURE_STORAGE_CONTAINER_NAME', value: storageContainerName }
            { name: 'AZURE_STORAGE_INGESTION_CONTAINER_NAME', value: storageContainerName }
            { name: 'AZURE_STORAGE_RELEASE_CONTAINER_NAME', value: releaseStorageContainerName }
            { name: 'AZURE_CLIENT_ID', value: runtimeIdentity.properties.clientId }
          ]
          probes: [
            {
              type: 'Startup'
              httpGet: { path: '/api/v1/health', port: 3000, scheme: 'HTTP' }
              initialDelaySeconds: 2
              periodSeconds: 5
              failureThreshold: 12
              timeoutSeconds: 2
            }
            {
              type: 'Liveness'
              httpGet: { path: '/api/v1/health', port: 3000, scheme: 'HTTP' }
              initialDelaySeconds: 5
              periodSeconds: 15
              failureThreshold: 3
              timeoutSeconds: 2
            }
            {
              type: 'Readiness'
              httpGet: { path: '/api/v1/health', port: 3000, scheme: 'HTTP' }
              initialDelaySeconds: 5
              periodSeconds: 10
              failureThreshold: 3
              successThreshold: 1
              timeoutSeconds: 5
            }
          ]
          resources: { cpu: json('0.5'), memory: '1Gi' }
        }
      ]
      scale: {
        minReplicas: minReplicas
        maxReplicas: maxReplicas
      }
    }
  }
  dependsOn: [
    blobContributorRole
    keyVaultSecretRole
    registryPullRole
  ]
}

output backendName string = containerAppName
output runtimeIdentityClientId string = runtimeIdentity.properties.clientId
