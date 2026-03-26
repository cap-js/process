using { sap.capire.bookshop as my } from '../db/schema';

service AdminService @(odata:'/admin') {
  entity Authors as projection on my.Authors;
  @odata.draft.enabled
  entity Books as projection on my.Books {
    *,
    virtual processStatus: String,
    virtual isApproved: Boolean default false,
    virtual processCriticality: Integer default 0
  };
  entity Genres as projection on my.Genres;
}

// Additionally serve via HCQL and REST
annotate AdminService with @hcql @rest;
