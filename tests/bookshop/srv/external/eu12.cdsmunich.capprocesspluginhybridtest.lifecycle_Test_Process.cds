/* checksum : 5d15df873426db3131530b7d110f59be */
namespace eu12.cdsmunich.capprocesspluginhybridtest;

/** DO NOT EDIT. THIS IS A GENERATED SERVICE THAT WILL BE OVERRIDDEN ON NEXT IMPORT. */
@protocol : 'none'
@bpm.process : 'eu12.cdsmunich.capprocesspluginhybridtest.lifecycle_Test_Process'
service Lifecycle_Test_ProcessService {
  type ProcessInputs {
    ID : String not null;
  };

  type ProcessOutputs { };

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

  type ProcessInstanceStatus : many String;

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
    status : ProcessInstanceStatus
  ) returns ProcessInstances;

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

