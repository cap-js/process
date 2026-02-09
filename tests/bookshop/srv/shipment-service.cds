using {sap.capire.bookshop as my} from '../db/shipment';

service ShipmentService {

  entity Shipments     as
    projection on my.Shipments {
      *,
    }

  entity ShipmentItems as
    projection on my.ShipmentItems {
      *,
    };

  @readonly
  entity Carriers      as
    projection on my.Carriers {
      *
    }

  action updateShipmentStatus(shipmentID: UUID,
                              @mandatory newStatus: String,
                              notes: String) returns Shipments;

  action cancelShipment(shipmentID: UUID)    returns Shipments;

  action startShipment(shipmentID: UUID)     returns Shipments;
}
