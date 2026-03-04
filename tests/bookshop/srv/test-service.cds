service TestService {

  @bpm.process.start: {
    id: 'ShipmentProcess',
    on: 'UPDATE',
    if: (weight > 10)
  }
  entity AnnotatedShipments   as
    projection on Shipments {
      ID,
      address @mandatory @(bpm.process.input: 'Adresse'),
      date,
      weight @bpm.process.input,
      items @(bpm.process.input: 'positionen'),
      home : Association to one Home
               on home.shipmentID = ID
             @bpm.process.input
    }

  entity Home {
    key ID         : String @bpm.process.input;
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
    key itemID      : String @bpm.process.input;
        description : String @bpm.process.input;
        quantity    : Integer @bpm.process.input;
        shipmentID  : String;
        shipment    : Association to Shipments
                        on shipment.ID = shipmentID;
        materialID  : String;
        material    : Association to one Material
                        on material.materialID = materialID
                      @bpm.process.input;
  }

  entity Material {
    key materialID : String @bpm.process.input;
        unit       : String @bpm.process.input;
  }
}
