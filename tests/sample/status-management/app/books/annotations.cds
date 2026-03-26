using BooksService as service from '../../srv/books-service';
annotate service.Books with @(
    UI.FieldGroup #GeneratedGroup : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Label : 'ID',
                Value : ID,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Author',
                Value : author_ID,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Title',
                Value : title,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Description',
                Value : descr,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Stock',
                Value : stock,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Price',
                Value : price,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Currency',
                Value : currency_code,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Genre',
                Value : genre_ID,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Approval Status',
                Value : processStatus,
                Criticality : processCriticality,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Approved',
                Value : isApproved,
            },
        ],
    },
    UI.Facets : [
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'GeneratedFacet1',
            Label : 'General Information',
            Target : '@UI.FieldGroup#GeneratedGroup',
        },
    ],
    UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Label : 'ID',
            Value : ID,
        },
        {
            $Type : 'UI.DataField',
            Label : 'Author',
            Value : author_ID,
        },
        {
            $Type : 'UI.DataField',
            Label : 'Title',
            Value : title,
        },
        {
            $Type : 'UI.DataField',
            Label : 'Description',
            Value : descr,
        },
        {
            $Type : 'UI.DataField',
            Label : 'Price',
            Value : price,
        },
        {
            $Type : 'UI.DataField',
            Label : 'Approval Status',
            Value : processStatus,
            Criticality : processCriticality,
        },
        {
            $Type : 'UI.DataField',
            Label : 'Approved',
            Value : isApproved,
        },
    ],
);

annotate service.Books with {
    author   @Common.Text : author.name    @Common.TextArrangement : #TextOnly;
    genre    @Common.Text : genre.name     @Common.TextArrangement : #TextOnly;
    currency @Common.Text : currency.name  @Common.TextArrangement : #TextOnly;
};

annotate service.Books with {
    author @Common.ValueList : {
        $Type : 'Common.ValueListType',
        CollectionPath : 'Authors',
        Parameters : [
            {
                $Type : 'Common.ValueListParameterInOut',
                LocalDataProperty : author_ID,
                ValueListProperty : 'ID',
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'name',
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'dateOfBirth',
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'dateOfDeath',
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'placeOfBirth',
            },
        ],
    }
};
