service LocalTestService {

  @bpm.process.start: {
    id: 'TestProcess',
    on: 'DELETE',
    inputs: [
        {path: $self.name, as: 'NAME'}
    ]
  }
  @bpm.process.cancel: {
    on: 'DELETE',
  }
  @bpm.process.resume: {
    on: 'DELETE',
  }
  entity Test {
    key ID: String;
    name: String;
    age: Integer;

  }

}