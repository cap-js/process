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
  fetchAllDataTypes
} from './process-api-client';

// Workflow Instance Client - for workflow instance operations
export {
  IWorkflowInstanceClient,
  WorkflowInstance,
  WorkflowStatus,
  StartWorkflowResult,
  UpdateStatusResult,
  createWorkflowInstanceClient,
  startWorkflow,
  getWorkflowsByBusinessKey,
  updateWorkflowStatus,
  updateMultipleWorkflowStatus
} from './workflow-client';
