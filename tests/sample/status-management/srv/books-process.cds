using { BooksService } from './books-service.cds';

annotate BooksService.Books with @(
    
    bpm.process.businessKey: (title),
    bpm.process.start : {
        id: 'eu12.cdsmunich.sampleapplicationproject.bookApprovalProcess',
        on: 'CREATE',
        inputs: [
            { path: $self.title, as: 'booktitle'},
            { path: $self.descr, as: 'description'},
            $self.author.name,
            $self.author.dateOfBirth,
            $self.price,
        ],
        if: (price > 50)
    },
    bpm.process.cancel : {
        on: 'UPDATE',
        if: (price <= 50)
    }
);