/* checksum : 99dc8a7a72e25f64ab1b6bdec8fbafa8 */
namespace eu12.cdsmunich.capprocesspluginhybridtest;

/** DO NOT EDIT. THIS IS A GENERATED SERVICE THAT WILL BE OVERRIDDEN ON NEXT IMPORT. */
@protocol : 'none'
@bpm.process : 'eu12.cdsmunich.capprocesspluginhybridtest.importProcess_Attributes_And_Outputs'
service ImportProcess_Attributes_And_OutputsService {
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

  type ProcessInputs_complexe_Array : many ImportProcess_Complex_DataType;

  type ProcessInputs {
    stringattribute : String not null;
    intattribute : DecimalFloat not null;
    complexe : ProcessInputs_complexe_Array not null;
    optionalcomplexe : ImportProcess_Complex_DataType;
  };

  type ProcessOutputs_complexe_Array : many ImportProcess_Complex_DataType;

  type ProcessOutputs {
    string : String not null;
    optionalstring : String;
    optionalcomplexe : ImportProcess_Complex_DataType;
    complexe : ProcessOutputs_complexe_Array not null;
  };

  type ProcessAttribute {
    id : String not null;
    label : String not null;
    value : String;
    type : String not null;
  };

  type ProcessAttributes : many ProcessAttribute;

  type ProcessInstance {
    id : String;
    definitionId : String;
    definitionVersion : String;
    status : String;
    startedAt : Timestamp;
    completedAt : Timestamp;
    startedBy : String;
    subject : String;
    businessKey : String;
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

  function getInstances(
    id : String,
    businessKey : String,
    status : many String,
    definitionId : String,
    definitionVersion : String,
    startedAt : Timestamp,
    startedFrom : Timestamp,
    startedUpTo : Timestamp,
    completedAt : Timestamp,
    completedFrom : Timestamp,
    completedUpTo : Timestamp,
    startedBy : String,
    subject : String,
    containsText : String,
    rootInstanceId : String,
    parentInstanceId : String,
    top : Integer,
    skip : Integer,
    orderBy : String,
    inlinecount : String
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

