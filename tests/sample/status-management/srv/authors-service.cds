using { sap.capire.bookshop as my } from '../db/schema';

service AuthorsService @(path:'/api/authors', protocol: 'odata-v4') {
  @odata.draft.enabled
  entity Authors as projection on my.Authors {
    *,
    @UI.Hidden: (not $draft.IsActiveEntity) virtual verificationStatus: String,
    @UI.Hidden: (not $draft.IsActiveEntity) virtual isVerified: Boolean default false,
    @UI.Hidden: (not $draft.IsActiveEntity) virtual verificationCriticality: Integer default 0
  };
}


