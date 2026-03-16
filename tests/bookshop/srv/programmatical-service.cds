using {
  eu12.cdsmunich.capprocesspluginhybridtest.Programatically_Lifecycle_ProcessService.ProcessInstance,
  eu12.cdsmunich.capprocesspluginhybridtest.Programatically_Lifecycle_ProcessService.ProcessAttribute
} from './external/eu12.cdsmunich.capprocesspluginhybridtest.programatically_Lifecycle_Process';

using {
  eu12.cdsmunich.capprocesspluginhybridtest.Programatically_Output_ProcessService.ProcessOutputs
} from './external/eu12.cdsmunich.capprocesspluginhybridtest.programatically_Output_Process';

service ProgramaticalService {

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

  action getInstancesByBusinessKey(ID: UUID,
                                  status: many String) returns many ProcessInstance;

  action startForGetOutputs(ID: UUID,
                            mandetory_date: Timestamp,
                            mandetory_string: String,
                            optional_string: String,
                            optional_date: Timestamp);

  action getInstanceIDForGetOutputs(ID: UUID,
                                    status: many String) returns many AttributeEntry;
}
