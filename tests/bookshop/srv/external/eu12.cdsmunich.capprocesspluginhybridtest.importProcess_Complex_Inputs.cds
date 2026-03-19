/* checksum : c03cdf2e606ab17a35b5c033564432b3 */
namespace eu12.cdsmunich.capprocesspluginhybridtest;

/** DO NOT EDIT. THIS IS A GENERATED SERVICE THAT WILL BE OVERRIDDEN ON NEXT IMPORT. */
@protocol : 'none'
@bpm.process : 'eu12.cdsmunich.capprocesspluginhybridtest.importProcess_Complex_Inputs'
service ImportProcess_Complex_InputsService {
  type ImportProcess_Complex_DataType_StringList_Array : many {
    SubString1 : String not null;
    Substring2 : String not null;
  };

  type ImportProcess_Complex_DataType_StringType_SubStringType_SubSubStringType {
    SubSubSubDate : Date;
    SubSubSubPassword : String;
    SubSubSubAny : String;
  };

  type ImportProcess_Complex_DataType_StringType_SubStringType {
    SubSubStringType : ImportProcess_Complex_DataType_StringType_SubStringType_SubSubStringType;
  };

  type ImportProcess_Complex_DataType_StringType {
    SubStringType : ImportProcess_Complex_DataType_StringType_SubStringType;
  };

  type ImportProcess_Complex_DataType {
    StringList : ImportProcess_Complex_DataType_StringList_Array not null;
    StringType : ImportProcess_Complex_DataType_StringType;
  };

  type ProcessInputs_complexlist_Array : many String;

  type ProcessInputs {
    complextype : ImportProcess_Complex_DataType not null;
    stringlist : String not null;
    complexlist : ProcessInputs_complexlist_Array not null;
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

