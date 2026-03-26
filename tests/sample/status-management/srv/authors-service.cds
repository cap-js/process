using { sap.capire.bookshop as my } from '../db/schema';

service AuthorsService @(path:'/api/authors', protocol: 'odata-v4') {
  @odata.draft.enabled
  entity Authors as projection on my.Authors {
    *,
    virtual verificationStatus: String,
    virtual isVerified: Boolean default false,
    virtual verificationCriticality: Integer default 0
  };
}


