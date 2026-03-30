

service TestService {

    @bpm.process.start: {
        id: 'testProcess',
        on: 'CREATE'
    }
    entity OneProcessStart {
        key ID: String;
        name: String;
    }

    @bpm.process.cancel #two: {
        on: 'DELETE'
    }
    @bpm.process.businessKey: (name || name)
    entity TwoProcessStart {
        key ID: String;
        name: String;
        age: Integer;
    }
}