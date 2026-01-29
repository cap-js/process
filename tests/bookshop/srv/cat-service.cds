using {sap.capire.bookshop as my} from '../db/schema';

service CatalogService {

  /** For displaying lists of Books */
  @readonly
  @build.process.start: {
        id: 'eu10-canary.bpm-flying-saucer.riskmanagement.riskManagementProcess',
        on: 'READ'
  }
  entity ListOfBooks as
    projection on Books {
      *,
      genre.name      as genre @build.process.input,
      currency.symbol as currency @(build.process.input: 'otherField'),
      case genre.name
        when 'Science Fiction' then true
        else false
      end            as startCondition: Boolean @build.process.start.if
    }
    excluding {
      descr
    };

  /** For display in details pages */
  @readonly
  @build.process.start: {
        id: 'eu10-canary.bpm-flying-saucer.riskmanagement.riskManagementProcess'
  }
  entity Books       as
    projection on my.Books {
      *,
      author.name as author
    }
    excluding {
      createdBy,
      modifiedBy
    };

  @build.process.start: {
        id: 'eu10-canary.bpm-flying-saucer.riskmanagement.riskManagementProcess',
        on: 'DELETE'
  }
  entity AnotherListOfBooks as
    projection on Books {
      *,
      genre.name      as genre @build.process.input,
      currency.symbol as currency @(build.process.input: 'otherField'),
      case genre.name
        when 'Science Fiction' then true
        else false
      end            as startCondition: Boolean @build.process.start.if
    }
    excluding {
      descr
    };

  @requires: 'authenticated-user'
  action submitOrder(book: Books:ID, quantity: Integer) returns {
    stock : Integer
  };
    @build.process.start: {
        id: 'eu10-canary.bpm-flying-saucer.riskmanagement.customProcess',
        on: 'UPDATE'
  }
  entity Shipment as projection on Shipments {
    ID,
    address @(build.process.input: 'Adresse'),
    date,
    weight @build.process.input,
    case
      when weight > 100 then true
      else false
    end as isTooHeavy: Boolean @build.process.start.if
  };
  entity Shipments {
    key ID: String;
    address: String;
    date: String;
    weight: Integer;
}
}