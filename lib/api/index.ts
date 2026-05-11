// API module - centralized API clients for SBPA services

// Process API Client - for artifact/process definition fetching
export {
  IProcessApiClient,
  ProcessHeader,
  DataType,
  Dependency,
  JsonSchema,
  createProcessApiClient,
  fetchProcessHeader,
  fetchArtifact,
  fetchAllDataTypes,
} from './process-api-client';

// Workflow Instance Client - for workflow instance operations
export {
  IWorkflowInstanceClient,
  WorkflowInstance,
  WorkflowStatus,
  GetInstancesParams,
  StartWorkflowResult,
  UpdateStatusResult,
  INSTANCES_PARAMS_SKIP_KEYS,
  INSTANCES_PARAM_KEY_MAP,
  createWorkflowInstanceClient,
  startWorkflow,
  getWorkflowsByBusinessKey,
  getInstances,
  updateWorkflowStatus,
  updateMultipleWorkflowStatus,
  getAttributes,
  getOutputs,
} from './workflow-client';

// Local Workflow Store - for local development
export {
  LocalWorkflowStore,
  LocalWorkflowInstance,
  localWorkflowStore,
} from './local-workflow-store';
