service CharacterLimitTestingService {


  @build.process.start: {
    id: 'someProcess',
    on: 'CREATE'
  }
  @build.process.cancel: {on: 'UPDATE'}
  entity ManyKeyFields {
    key field1 : String(50);
    key field2 : String(100);
    key field3 : String(100);
    key field4 : String(250);
        name   : String(100);
  }

  @build.process.start: {
    id: 'someProcess',
    on: 'CREATE'
  }
  @build.process.cancel: {on: 'UPDATE'}
  entity CacheTest {
    key id   : String(10);
        name : String(100);
  }

}
