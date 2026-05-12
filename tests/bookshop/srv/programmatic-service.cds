using {
  eu12.cdsmunich.capprocesspluginhybridtest.Programmatic_Lifecycle_ProcessService.ProcessInstance,
  eu12.cdsmunich.capprocesspluginhybridtest.Programmatic_Lifecycle_ProcessService.ProcessAttribute,
} from './external/eu12.cdsmunich.capprocesspluginhybridtest.programmatic_Lifecycle_Process';

using {
  eu12.cdsmunich.capprocesspluginhybridtest.Programmatic_Output_ProcessService.ProcessOutputs
} from './external/eu12.cdsmunich.capprocesspluginhybridtest.programmatic_Output_Process';

service ProgrammaticService {

  type AttributeEntry {
    workflowId : String;
    attributes : many ProcessAttribute;
  };

  action updateProcess(ID: UUID,
                       @mandatory newStatus: String);

  action cancelProcess(ID: UUID);

  action startLifeCycleProcess(ID: UUID);

  action startAttributeProcess(ID: UUID, attributesContext: many String);

  action startOutputProcess(ID: UUID);

  action getAttributes(ID: UUID)       returns many AttributeEntry;

  action getOutputs(instanceId: String) returns ProcessOutputs;

  action getInstances(ID: UUID,
                      status: many String,
                      top: Integer,
                      skip: Integer) returns many ProcessInstance;

  action startForGetOutputs(ID: UUID,
                            mandatory_datetime: Timestamp,
                            mandatory_string: String,
                            optional_string: String,
                            optional_datetime: Timestamp);

  action getInstanceIDForGetOutputs(ID: UUID,
                                    status: many String) returns many AttributeEntry;

  // Generic ProcessService actions (using cds.connect.to('ProcessService'))
  action genericStart(definitionId: String, businessKey: String, context: LargeString);
  action genericCancel(businessKey: String, cascade: Boolean);
  action genericSuspend(businessKey: String, cascade: Boolean);
  action genericResume(businessKey: String, cascade: Boolean);
  action genericGetInstances(
    id: String,
    businessKey: String,
    status: many String,
    definitionId: String,
    definitionVersion: String,
    startedAt: Timestamp,
    startedFrom: Timestamp,
    startedUpTo: Timestamp,
    completedAt: Timestamp,
    completedFrom: Timestamp,
    completedUpTo: Timestamp,
    startedBy: String,
    subject: String,
    containsText: String,
    rootInstanceId: String,
    parentInstanceId: String,
    top: Integer,
    skip: Integer,
    orderBy: String,
    inlinecount: String
  ) returns many ProcessInstance;
  action genericGetAttributes(processInstanceId: String) returns many ProcessAttribute;
  action genericGetOutputs(processInstanceId: String) returns ProcessOutputs;
}
