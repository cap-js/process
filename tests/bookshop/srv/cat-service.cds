using {sap.capire.bookshop as my} from '../db/schema';

service CatalogService {

  /**
   * For displaying lists of Books
   */
  @readonly
  entity ListOfBooks        as
    projection on Books {
      *,
      genre.name      as genre,
      currency.symbol as currency,
      case
        genre.name
        when 'Science Fiction'
             then true
        else false
      end             as startCondition : Boolean
    }
    excluding {
      descr
    };

  /**
   * For display in details pages
   */
  @readonly
  entity Books              as
    projection on my.Books {
      *,
      author.name as author
    }
    excluding {
      createdBy,
      modifiedBy
    };

  entity AnotherListOfBooks as
    projection on Books {
      *,
      genre.name      as genre,
      currency.symbol as currency,
      case
        genre.name
        when 'Science Fiction'
             then true
        else false
      end             as startCondition : Boolean
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
  entity Shipment           as
    projection on Shipments {
      ID,
      address @(build.process.input: 'Adresse'),
      date,
      weight @build.process.input,
      case
        when weight > 100
             then true
        else false
      end as isTooHeavy : Boolean @build.process.suspend.if
    };

  entity Shipments {
    key ID      : String;
        address : String;
        date    : String;
        weight  : Integer;
  }
}
