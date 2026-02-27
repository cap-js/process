@open
type AnyType {}

@impl: './BTPProcessService.ts'
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
  )returns AnyType;

  function getOutputs(
    @mandatory processInstanceId : String(256)
  )returns AnyType;

  function getInstancesByBusinessKey(
    @mandatory businessKey : String(256)
  )returns AnyType;
}
