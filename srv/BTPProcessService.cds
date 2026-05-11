@open
type AnyType {}
type AttributesReturn : many AnyType;
type InstancesReturn : many AnyType;

@protocol: 'none'
@impl: './BTPProcessService'
service ProcessService {

  event start {
    @mandatory definitionId : String(256);
    context                 : AnyType
  }

  event cancel {
    @mandatory businessKey : String(256);
    cascade                : Boolean
  }

  event suspend {
    @mandatory businessKey : String(256);
    cascade                : Boolean
  }

  event resume {
    @mandatory businessKey : String(256);
    cascade                : Boolean
  }

  function getAttributes(
    @mandatory processInstanceId : String(256)
  )returns AttributesReturn;

  function getOutputs(
    @mandatory processInstanceId : String(256)
  )returns AnyType;

  function getInstances(
    id                : String(256),
    businessKey       : String(256),
    status            : many String(256),
    definitionId      : String(256),
    definitionVersion : String(256),
    startedAt         : Timestamp,
    startedFrom       : Timestamp,
    startedUpTo       : Timestamp,
    completedAt       : Timestamp,
    completedFrom     : Timestamp,
    completedUpTo     : Timestamp,
    startedBy         : String(256),
    subject           : String(256),
    containsText      : String(256),
    rootInstanceId    : String(256),
    parentInstanceId  : String(256),
    top               : Integer,
    skip              : Integer,
    orderBy           : String(256),
    inlinecount       : String(256)
  )returns InstancesReturn;
}
