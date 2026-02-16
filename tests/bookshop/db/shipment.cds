using {
  cuid,
  managed,
} from '@sap/cds/common';

namespace sap.capire.bookshop;

entity Shipments : managed {
  key ID               : UUID;
      status           : String(20) default 'PENDING';
      shipmentDate     : Date;
      expectedDelivery : Date;
      actualDelivery   : Date;
      origin           : String(200);
      destination      : String(200);
      carrier          : Association to Carriers;
      items            : Composition of many ShipmentItems
                           on items.shipment = $self;
      totalValue       : Decimal(15, 2);
      notes            : String(1000);
}


entity ShipmentItems : cuid, managed {
  key ID         : UUID;
      shipment   : Association to Shipments;
      identifier : String(50);
      title      : String(200);
      quantity   : Integer;
      price      : Decimal(15, 2);
      weight     : Decimal(10, 2);
      volume     : Decimal(10, 2);
      fragile    : Boolean default false;
}


entity Carriers : managed {
  key ID           : UUID;
      business_key : String(50);
      name         : String(200);
      code         : String(10);
      contactEmail : String(100);
      contactPhone : String(50);
      website      : String(200);
      rating       : Decimal(3, 2);
      active       : Boolean default true;
      shipments    : Association to many Shipments
                       on shipments.carrier = $self;
}

entity Car {
  key ID           : UUID;
      model        : String(100);
      manufacturer : String(100);
      mileage      : Integer;
      year         : Integer;
}
