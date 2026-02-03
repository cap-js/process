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

}
