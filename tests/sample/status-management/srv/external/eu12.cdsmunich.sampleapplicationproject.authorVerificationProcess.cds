/* checksum : e4e85b6560cc4b66e72dcd48b9b3ee30 */
namespace eu12.cdsmunich.sampleapplicationproject;

/** DO NOT EDIT. THIS IS A GENERATED SERVICE THAT WILL BE OVERRIDDEN ON NEXT IMPORT. */
@protocol : 'none'
@bpm.process : 'eu12.cdsmunich.sampleapplicationproject.authorVerificationProcess'
service AuthorVerificationProcessService {
  type ProcessInputs {
    authorname : String not null;
    dateofbirth : String;
    placeofbirth : String;
    entityid : String;
  };

  type ProcessOutputs {
    isverified : Boolean not null;
    verificationstatus : String not null;
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

