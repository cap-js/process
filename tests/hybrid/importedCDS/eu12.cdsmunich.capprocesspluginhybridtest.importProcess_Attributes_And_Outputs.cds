/* checksum : b2be28c9da2617d511526b2f68e5e6b0 */
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

