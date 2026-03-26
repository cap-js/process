using AdminService as service from '../../srv/admin-service';
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
            Label : 'Date of Death',
            Value : dateOfDeath,
        },
        {
            $Type : 'UI.DataField',
            Label : 'Place of Birth',
            Value : placeOfBirth,
        },
    ],
);
