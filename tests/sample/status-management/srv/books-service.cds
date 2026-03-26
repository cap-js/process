using { sap.capire.bookshop as my } from '../db/schema';

service BooksService @(path:'/api/books', protocol: 'odata-v4') {
  @odata.draft.enabled
  entity Books as projection on my.Books {
    descr @mandatory,
    *,
    virtual processStatus: String,
    virtual isApproved: Boolean default false,
    virtual processCriticality: Integer default 0
  };
  entity Genres as projection on my.Genres;
  @readonly entity Authors as projection on my.Authors;
}


