/* checksum : ff7f2f85755a461155203b777bf3077a */
namespace eu12.cdsmunich.capprocesspluginhybridtest;

/** DO NOT EDIT. THIS IS A GENERATED SERVICE THAT WILL BE OVERRIDDEN ON NEXT IMPORT. */
@protocol : 'none'
@bpm.process : 'eu12.cdsmunich.capprocesspluginhybridtest.programmatic_Output_Process'
service Programmatic_Output_ProcessService {
  type UpdateStatusResult {
    id : String;
    success : Boolean;
  };

  type ProcessInputs {
    ID : String not null;
    mandatory_datetime : Timestamp not null;
    mandatory_string : String not null;
    optional_datetime : Timestamp;
    optional_string : String;
  };

  type ProcessOutputs {
    mandatory_string : String not null;
    mandatory_datetime : Timestamp not null;
    optional_datetime : Timestamp;
    optional_string : String;
  };

  type ProcessAttribute {
    id : String not null;
    label : String not null;
    value : String;
    type : String not null;
  };

  type ProcessAttributes : many ProcessAttribute;

  type ProcessInstance {
    definitionId : String;
    definitionVersion : String;
    id : String;
    status : String;
    startedAt : String;
    startedBy : String;
  };

  type ProcessInstances : many ProcessInstance;

  action start(
    inputs : ProcessInputs not null
  );

  function getAttributes(
    processInstanceId : String not null
  ) returns ProcessAttributes;

  function getOutputs(
    processInstanceId : String not null
  ) returns ProcessOutputs;

  function getInstancesByBusinessKey(
    businessKey : String not null,
    status : many String
  ) returns ProcessInstances;

  function updateInstanceStatus(
    instanceId : String not null,
    status : String not null,
    cascade : Boolean
  ) returns UpdateStatusResult;

  action suspend(
    businessKey : String not null,
    cascade : Boolean
  );

  action resume(
    businessKey : String not null,
    cascade : Boolean
  );

  action cancel(
    businessKey : String not null,
    cascade : Boolean
  );
};

