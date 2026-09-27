@description('Azure region for worker-owned resources.')
param location string = resourceGroup().location

@description('Short lowercase prefix used for globally unique Azure resource names.')
@minLength(3)
@maxLength(16)
param namePrefix string = 'statsthegame'

@description('Deployment environment label included in resource names and logs.')
@allowed(['dev', 'test', 'prod'])
param environmentName string = 'dev'

@description('Deploy the Container App after its image has been built in the provisioned registry.')
param deployWorker bool = true

@description('Immutable worker container image including its digest or commit tag.')
param containerImage string = 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'

@description('Existing storage account containing the private staged-ingestion container.')
param storageAccountName string


@description('Existing private Blob container used for staged ingestion.')
param storageContainerName string = 'staged-ingestion'
@description('Existing private container for immutable dataset release artifacts.')
param releaseStorageContainerName string = 'dataset-releases'

@description('Existing Key Vault that stores the PostgreSQL connection string.')
param keyVaultName string

@description('Versionless HTTPS Key Vault secret URI for DATABASE_URL.')
param databaseSecretUri string

@description('Minimum continuously available worker replicas. Keep one running so the PostgreSQL outbox relay can publish queued batch jobs.')
@minValue(1)
@maxValue(3)
param minReplicas int = 1

@description('Maximum replicas, bounded to protect PostgreSQL and storage.')
@minValue(1)
@maxValue(5)
param maxReplicas int = 3

var suffix = '${namePrefix}-${environmentName}'
var containerAppName = '${suffix}-batch-worker'
var queueName = 'batch-ingestion'
var serviceBusReceiverRoleId = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '4f6d3b9b-027b-4f4c-9142-0e5a2a2247e0')
var serviceBusSenderRoleId = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '69a216fc-b8fb-44d8-bc22-1f3c2cd27a39')
var blobContributorRoleId = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'ba92f5b4-2d11-453d-a403-e96b0029c9fe')
var keyVaultSecretsUserRoleId = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '4633458b-17de-408a-b874-0445c86b69e6')
var acrPullRoleId = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '7f951dda-4ed3-4680-a7ca-43fe172d538d')

resource runtimeIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: '${suffix}-worker-runtime'
  location: location
}

resource pullIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: '${suffix}-worker-pull'
  location: location
}

resource logWorkspace 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: '${suffix}-worker-logs'
  location: location
  properties: {
    retentionInDays: 30
    sku: { name: 'PerGB2018' }
  }
}

resource containerEnvironment 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: '${suffix}-worker-env'
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logWorkspace.properties.customerId
        sharedKey: logWorkspace.listKeys().primarySharedKey
      }
    }
  }
}

resource registry 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: take(replace('${namePrefix}${environmentName}${uniqueString(resourceGroup().id)}', '-', ''), 50)
  location: location
  sku: { name: 'Basic' }
  properties: {
    adminUserEnabled: false
    anonymousPullEnabled: false
    publicNetworkAccess: 'Enabled'
  }
}

resource serviceBus 'Microsoft.ServiceBus/namespaces@2024-01-01' = {
  name: take('${suffix}-bus-${uniqueString(resourceGroup().id)}', 50)
  location: location
  sku: { name: 'Standard', tier: 'Standard' }
  properties: {
    disableLocalAuth: true
    publicNetworkAccess: 'Enabled'
    zoneRedundant: false
  }
}

resource queue 'Microsoft.ServiceBus/namespaces/queues@2024-01-01' = {
  parent: serviceBus
  name: queueName
  properties: {
    deadLetteringOnMessageExpiration: true
    defaultMessageTimeToLive: 'P14D'
    duplicateDetectionHistoryTimeWindow: 'P1D'
    enableBatchedOperations: true
    enableExpress: false
    enablePartitioning: true
    lockDuration: 'PT1M'
    maxDeliveryCount: 5
    maxSizeInMegabytes: 1024
    requiresDuplicateDetection: true
    requiresSession: false
    status: 'Active'
  }
}

resource existingStorage 'Microsoft.Storage/storageAccounts@2023-05-01' existing = {
  name: storageAccountName
}

resource existingKeyVault 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: keyVaultName
}

resource serviceBusReceiverRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(queue.id, runtimeIdentity.id, serviceBusReceiverRoleId)
  scope: queue
  properties: {
    principalId: runtimeIdentity.properties.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: serviceBusReceiverRoleId
  }
}

resource serviceBusSenderRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(queue.id, runtimeIdentity.id, serviceBusSenderRoleId)
  scope: queue
  properties: {
    principalId: runtimeIdentity.properties.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: serviceBusSenderRoleId
  }
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

resource worker 'Microsoft.App/containerApps@2025-02-02-preview' = if (deployWorker) {
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
        external: false
        targetPort: 3001
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
      ]
    }
    template: {
      terminationGracePeriodSeconds: 30
      containers: [
        {
          name: 'worker'
          image: containerImage
          env: [
            { name: 'NODE_ENV', value: 'production' }
            { name: 'DEPLOYMENT_ENVIRONMENT', value: environmentName }
            { name: 'WORKER_TRANSPORT_PROVIDER', value: 'azure-service-bus' }
            { name: 'OBJECT_STORAGE_PROVIDER', value: 'azure' }
            { name: 'WORKER_PORT', value: '3001' }
            { name: 'WORKER_CONCURRENCY', value: '1' }
            { name: 'WORKER_SHUTDOWN_TIMEOUT_MS', value: '25000' }
            { name: 'SERVICE_BUS_LOCK_RENEWAL_MS', value: '240000' }
            { name: 'WORKER_PROBE_DELAY_MS', value: '0' }
            { name: 'OUTBOX_POLL_INTERVAL_MS', value: '1000' }
            { name: 'OUTBOX_CLAIM_TTL_MS', value: '30000' }
            { name: 'OUTBOX_BATCH_SIZE', value: '20' }
            { name: 'BATCH_CHUNK_SIZE', value: '500' }
            { name: 'BATCH_LEASE_MS', value: '120000' }
            { name: 'DATABASE_URL', secretRef: 'database-url' }
            { name: 'DATABASE_SSL_MODE', value: 'verify-full' }
            { name: 'AZURE_CLIENT_ID', value: runtimeIdentity.properties.clientId }
            { name: 'SERVICE_BUS_FULLY_QUALIFIED_NAMESPACE', value: '${serviceBus.name}.servicebus.windows.net' }
            { name: 'SERVICE_BUS_QUEUE_NAME', value: queue.name }
            { name: 'AZURE_STORAGE_ACCOUNT_NAME', value: existingStorage.name }
            { name: 'AZURE_STORAGE_CONTAINER_NAME', value: storageContainerName }
            { name: 'AZURE_STORAGE_INGESTION_CONTAINER_NAME', value: storageContainerName }
            { name: 'AZURE_STORAGE_RELEASE_CONTAINER_NAME', value: releaseStorageContainerName }
          ]
          probes: [
            {
              type: 'Startup'
              httpGet: { path: '/health/live', port: 3001, scheme: 'HTTP' }
              initialDelaySeconds: 2
              periodSeconds: 5
              failureThreshold: 12
              timeoutSeconds: 2
            }
            {
              type: 'Liveness'
              httpGet: { path: '/health/live', port: 3001, scheme: 'HTTP' }
              initialDelaySeconds: 5
              periodSeconds: 15
              failureThreshold: 3
              timeoutSeconds: 2
            }
            {
              type: 'Readiness'
              httpGet: { path: '/health/ready', port: 3001, scheme: 'HTTP' }
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
        pollingInterval: 15
        cooldownPeriod: 60
        rules: [
          {
            name: 'service-bus-batch-ingestion'
            custom: {
              type: 'azure-servicebus'
              metadata: {
                queueName: queue.name
                namespace: serviceBus.name
                messageCount: '1'
              }
              identity: runtimeIdentity.id
            }
          }
        ]
      }
    }
  }
  dependsOn: [
    serviceBusReceiverRole
    serviceBusSenderRole
    blobContributorRole
    keyVaultSecretRole
    registryPullRole
  ]
}

output containerRegistryName string = registry.name
output containerRegistryServer string = registry.properties.loginServer
output workerName string = containerAppName
output serviceBusNamespace string = '${serviceBus.name}.servicebus.windows.net'
output serviceBusQueue string = queue.name
output runtimeIdentityClientId string = runtimeIdentity.properties.clientId
