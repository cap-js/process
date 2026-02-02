service TestService {

  @build.process.start: {
    id: 'eu12.bpm-horizon-walkme.sdshipmentprocessor.shipmentHandler',
    on: 'CREATE'
  }
  @build.process.cancel: {
    on: 'DELETE',
    cascade: 'false'
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
      end as isTooHeavy : Boolean @build.process.cancel.if
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
