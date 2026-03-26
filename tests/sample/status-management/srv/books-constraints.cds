using { BooksService } from './books-service.cds';

// Add constraints for input validation on Books
annotate BooksService.Books with {

  title @mandatory;

  author @assert: (case 
    when not exists author then 'Specified Author does not exist'
  end);

  genre @assert: (case 
    when not exists genre then 'Specified Genre does not exist'
  end);

  stock @assert.range: [(0),_]; // positive numbers only
}

// Add constraints for Genres
annotate BooksService.Genres with {

  name @mandatory;
  
  parent @assert: (case
    when parent == ID then 'A genre cannot be its own parent'
  end);
}
