using {
  eu12.cdsmunich.capprocesspluginhybridtest.Annotation_Lifecycle_ProcessService.ProcessInstance
} from './external/eu12.cdsmunich.capprocesspluginhybridtest.annotation_Lifecycle_Process';

service AnnotationHybridService {

  // Full Lifecycle Management entity
  // Start on CREATE, Suspend/Resume on UPDATE, Cancel on DELETE
  @bpm.process.start      : {
      id: 'eu12.cdsmunich.capprocesspluginhybridtest.annotation_Lifecycle_Process',
      on: 'CREATE',
  }
  @bpm.process.suspend    : {
      on: 'UPDATE',
      if: (mileage > 800),
  }
  @bpm.process.resume     : {
      on: 'UPDATE',
      if: (mileage <= 800),
  }
  @bpm.process.cancel     : {
      on     : 'DELETE',
      cascade: true
  }
  @bpm.process.businessKey: (ID)
  entity FullLifecycle {
      key ID           : UUID;
          model        : String(100);
          manufacturer : String(100);
          mileage      : Integer;
          year         : Integer;
  }

  // Two process starts on create
  @bpm.process.start #one      : {
      id: 'eu12.cdsmunich.capprocesspluginhybridtest.annotation_Lifecycle_Process',
      on: 'CREATE'
  }
  @bpm.process.start #two      : {
      id: 'eu12.cdsmunich.capprocesspluginhybridtest.annotation_Lifecycle_Process_Two',
      on: 'CREATE',
      inputs: [
        { path: $self.ID, as: 'id'}
      ]
  }
  @bpm.process.businessKey: (ID)
  entity TwoProcessStarts {
    key ID           : UUID @mandatory;
          model        : String(100);
          manufacturer : String(100);
          mileage      : Integer;
          year         : Integer;
  }

  action getInstancesByBusinessKey(ID: UUID,
                                   status: many String) returns many ProcessInstance;

}
