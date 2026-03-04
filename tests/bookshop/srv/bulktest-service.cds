service BulkService {

  @build.process.start: {
    id: 'someProcess',
    on: 'READ'
  }
  entity StartEntity {
    key ID   : String(10);
        name : String(1000);
  }
}
