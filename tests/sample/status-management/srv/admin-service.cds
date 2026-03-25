using { sap.capire.bookshop as my } from '../db/schema';

service AdminService @(odata:'/admin') {
  entity Authors as projection on my.Authors;

  @bpm.process.start : {
    id: '',
    on: 'CREATE',
    inputs: [
      $self.title,
      $self.author,
      $self.price,
    ]
  }
  @bpm.process.businessKey: (title)
  @bpm.process.cancel : {
    id: '',
    on: 'DELETE',
  }
  entity Books as projection on my.Books;
  entity Genres as projection on my.Genres;
}

// Additionally serve via HCQL and REST
annotate AdminService with @hcql @rest;
