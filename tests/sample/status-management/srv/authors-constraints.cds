using { AuthorsService } from './authors-service.cds';

// Add constraints for Authors
annotate AuthorsService.Authors with {

  name @mandatory;

  dateOfBirth @mandatory@assert: (case
    when dateOfBirth > dateOfDeath then 'Date of birth cannot be after date of death'
  end);

  dateOfDeath @assert: (case
    when dateOfDeath < dateOfBirth then 'Date of death cannot be before date of birth'
  end);
}

// Require 'admin' role to access AuthorsService
// (disabled for getting-started guide)
// annotate AuthorsService with @requires:'admin';
