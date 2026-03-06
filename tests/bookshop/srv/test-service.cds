service TestService {

  @UI.HeaderInfo #bpm: {
    Title: {
      Value: (ssn || '-' || age)
    }
  }
  @bpm.process.start: {
    id: 'eu12.bpm-horizon-walkme.sdshipmentprocessor.shipmentHandler',
    on: 'CREATE',
  }
  @bpm.process.cancel: {
    on: 'DELETE',
  }
  entity NewBusinessKey {
    key ID: String;
    name: String;
    age: Integer;
    testNum: Integer;
    ssn: String;
  }
  @bpm.process.start: {
    id: 'ShipmentProcess',
    on: 'UPDATE',
    if: (weight > 10),
    inputs: [
      { path: $self.address, as: 'Adresse' },
      $self.weight,
      { path: $self.items, as: 'positionen' },
      $self.items.itemID,
      $self.items.description,
      $self.items.quantity,
      $self.items.material,
      $self.items.material.materialID,
      $self.items.material.unit,
      $self.home,
      $self.home.ID
    ]
  }
  entity AnnotatedShipments   as
    projection on Shipments {
      ID,
      address @mandatory,
      date,
      weight,
      items,
      home : Association to one Home
               on home.shipmentID = ID
    }

  entity Home {
    key ID         : String;
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
    key itemID      : String;
        description : String;
        quantity    : Integer;
        shipmentID  : String;
        shipment    : Association to Shipments
                        on shipment.ID = shipmentID;
        materialID  : String;
        material    : Association to one Material
                        on material.materialID = materialID;
  }

  entity Material {
    key materialID : String;
        unit       : String;
  }
}
