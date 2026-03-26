using AuthorsService as service from '../../srv/authors-service';
annotate service.Authors with @(
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
                Label : 'Name',
                Value : name,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Date of Birth',
                Value : dateOfBirth,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Date of Death',
                Value : dateOfDeath,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Place of Birth',
                Value : placeOfBirth,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Place of Death',
                Value : placeOfDeath,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Verification Status',
                Value : verificationStatus,
                Criticality : verificationCriticality,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Verified',
                Value : isVerified,
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
            Label : 'Name',
            Value : name,
        },
        {
            $Type : 'UI.DataField',
            Label : 'Date of Birth',
            Value : dateOfBirth,
        },
        {
            $Type : 'UI.DataField',
            Label : 'Place of Birth',
            Value : placeOfBirth,
        },
        {
            $Type : 'UI.DataField',
            Label : 'Verification Status',
            Value : verificationStatus,
            Criticality : verificationCriticality,
        },
        {
            $Type : 'UI.DataField',
            Label : 'Verified',
            Value : isVerified,
        },
    ],
);
