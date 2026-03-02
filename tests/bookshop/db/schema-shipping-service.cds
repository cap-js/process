using {
  managed, 
} from '@sap/cds/common';

namespace com.sap.shipping.data;

entity Person : managed {
  key    identifier : UUID;
  firstName       : String(100);
  middleName      : String(100);
  lastName        : String(100);
  dateOfBirth     : Date;
}

entity Address : managed {
  key    identifier : UUID;
  street          : String(200);
  houseNumber     : String(20);
  city            : String(100);
  postalCode      : String(20);
  country         : String(100);
  additionalInfo   : String(1000);
}

entity Phone : managed {
  key    identifier : UUID;
  number          : String(20);
  prefix       : String(5);
  type         : String(20);
  extension    : String(10);
  phoneNumbers   : Association to many CustomerPhones on phoneNumbers.phone = $self;
}

entity Customers : managed {
  key    identifier : UUID;
  person          : Association to Person;
  email           : String(100);
  phoneNumbers   : Association to many CustomerPhones on phoneNumbers.customer = $self;
}

entity CustomerPhones : managed {
  customer : Association to one Customers;
  phone    : Association to one Phone;
}

entity Categories : managed {
  key code : String(120);
  title     : String(200);
  description : String(1000);
}

entity Items : managed {
  key identifier : UUID;
  category        : Association to one Categories;
  name            : String(200);
  description     : String(1000);
  weight          : Decimal(10, 2);
  volume          : Decimal(10, 2);
  price           : Decimal(15, 2);
}

entity Orders : managed {
  key identifier : UUID;
  customer        : Association to one Customers;
  orderDate       : Date;
  deliveryDate     : Date;
  status           : String(20) default 'NEW';
  items            : Association to many OrderItems on items.order = $self;
}

entity OrderItems : managed {
  key identifier : UUID;
  order           : Association to one Orders;
  item            : Association to one Items;
  quantity        : Integer;
  unitPrice       : Decimal(15, 2);
}


entity Shipments : managed {
  key identifier : UUID;
  order           : Association to one Orders;
  shipmentDate     : Date;
  expectedDelivery : Date;
  actualDelivery   : Date;
  origin           : Association to one Address;
  destination      : Association to one Address;
  totalValue       : Decimal(15, 2);
  notes            : String(1000);
}
