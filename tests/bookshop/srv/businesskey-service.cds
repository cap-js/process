service BusinesskeyService {

  // Example that shows a prefix is required to differentiate processes

  @build.process.start: {
    id: 'dogProcess',
    on: 'CREATE'
  }
  @build.process.cancel: {on: 'UPDATE'}
  entity Dog {
    key ID   : String(10);
        name : String(1000);
  }

  @build.process.start: {
    id: 'carProcess',
    on: 'CREATE'
  }
  entity Car {
    key ID      : String(10);
        mileage : Integer;
  }


  // Example that shows character limit

  @build.process.start: {
    id: 'someProcess',
    on: 'CREATE'
  }
  entity MultipleKeyFields {
    key one   : String(100);
    key two   : String(100);
    key three : String(100);
  }
}
