@open type AnyType {}

@impl: './BTPProcessService.ts'
service BTPProcessService {

    // Start a new process
    action start(@mandatory definitionId: String(256), context: AnyType) returns {
        id: UUID;
        success: Boolean;
        message: String;
    };

    // Send a message to a running process
    action message(@mandatory id: UUID, @mandatory messageDefinitionId: UUID, context: AnyType) returns {
        success: Boolean;
        message: String;
    };

    // Get outputs of a completed process
    function getOutputs(@mandatory id: UUID) returns {
        outputs: AnyType;
    };

    // Cancel a running process
    action cancel(@mandatory id: UUID, cascade: Boolean)  returns {
        success: Boolean;
        message: String;
    };

    // Suspend a running process
    action suspend(@mandatory id: UUID) returns {
        success: Boolean;
        message: String;
    };

    // Resume a suspended process
    action resume(@mandatory id: UUID)  returns {
        success: Boolean;
        message: String;
    };

}