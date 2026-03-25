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
                Label : 'name',
                Value : name,
            },
            {
                $Type : 'UI.DataField',
                Label : 'dateOfBirth',
                Value : dateOfBirth,
            },
            {
                $Type : 'UI.DataField',
                Label : 'dateOfDeath',
                Value : dateOfDeath,
            },
            {
                $Type : 'UI.DataField',
                Label : 'placeOfBirth',
                Value : placeOfBirth,
            },
            {
                $Type : 'UI.DataField',
                Label : 'placeOfDeath',
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
            Label : 'name',
            Value : name,
        },
        {
            $Type : 'UI.DataField',
            Label : 'dateOfBirth',
            Value : dateOfBirth,
        },
        {
            $Type : 'UI.DataField',
            Label : 'dateOfDeath',
            Value : dateOfDeath,
        },
        {
            $Type : 'UI.DataField',
            Label : 'placeOfBirth',
            Value : placeOfBirth,
        },
    ],
);

