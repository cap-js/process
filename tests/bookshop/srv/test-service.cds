

service TestService {

    @bpm.process.start: {
        id: 'testProcess',
        on: 'CREATE'
    }
    entity OneProcessStart {
        key ID: String;
        name: String;
    }

    @bpm.process.start: {
        id: 'testProcess',
        on: 'CREATE'
    }
    @bpm.process.cancel #one: {
        on: '*'
    }
    @bpm.process.cancel #two: {
        on: 'DELETE'
    }
    @bpm.process.suspend #three: {
        on: 'DELETE',
    }
    @bpm.process.businessKey #two: (age)
    @bpm.process.businessKey: (name)
    entity TwoProcessStart {
        key ID: String;
        name: String;
        age: Integer;
    }
}