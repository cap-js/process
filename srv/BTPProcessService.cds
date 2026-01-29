@open type AnyType {}

@impl: './BTPProcessService.ts'
service ProcessService {

    // Start a new process
    action start(@mandatory definitionId: String(256), context: AnyType) returns {
        id: UUID;
        success: Boolean;
        message: String;
    };
    
    // Cancel a running process
    action cancel(@mandatory businessKey: String(256), cascade: Boolean)  returns {
        success: Boolean;
        message: String;
    };

}