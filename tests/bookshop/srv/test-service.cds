service TestService {

  @build.process.start: {
    id: 'ShipmentProcess',
    on: 'UPDATE',
    if: (weight > 10)
  }
  entity AnnotatedShipments   as
    projection on Shipments {
      ID,
      address @mandatory @(build.process.input: 'Adresse'),
      date,
      weight @build.process.input,
      items @(build.process.input: 'positionen'),
      home : Association to one Home
               on home.shipmentID = ID
             @build.process.input
    }

  entity Home {
    key ID         : String @build.process.input;
        shipment   : Association to one Shipments
                       on shipment.ID = shipmentID;
        shipmentID : String;
        desc       : String;
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
        items   : Composition of many Items
                    on items.shipmentID = ID;
  }

  entity Items {
    key itemID      : String @build.process.input;
        description : String @build.process.input;
        quantity    : Integer @build.process.input;
        shipmentID  : String;
        shipment    : Association to Shipments
                        on shipment.ID = shipmentID;
        materialID  : String;
        material    : Association to one Material
                        on material.materialID = materialID
                      @build.process.input;
  }

  entity Material {
    key materialID : String @build.process.input;
        unit       : String @build.process.input;
  }
}
