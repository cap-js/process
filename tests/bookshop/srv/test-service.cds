service TestService {

  @build.process.start: {
    id: 'eu10-canary.bpm-flying-saucer.riskmanagement.customProcess',
    on: 'CREATE'
  }
  @build.process.cancel: {
    on: 'DELETE',
    cascade: 'true'
  }
  @build.process.suspend: {
    on: 'UPDATE',
    cascade: 'true'
  }
  entity AnnotatedShipments   as
    projection on Shipments {
      ID,
      address @(build.process.input: 'Adresse'),
      date,
      weight @build.process.input,
      case
        when weight > 100
             then true
        else false
      end as isTooHeavy : Boolean @build.process.start.if
    }

  entity UnAnnotatedShipments as
    projection on Shipments {
      *
    }

  entity Shipments {
    key ID      : String;
        address : String;
        date    : String;
        weight  : Integer;
  }
}
