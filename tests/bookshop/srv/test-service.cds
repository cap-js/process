

service TestService {

    @bpm.process.start: {
        id: 'testProcess',
        on: 'CREATE'
    }
    entity OneProcessStart {
        key ID: String;
        name: String;
    }

    @bpm.process.start  : {
        id: 'testProcess',
        on: 'DELETE',
        inputs: [
            $self.name
        ]
    }
    @bpm.process.start #two: {
        id: 'testProcess2',
        on: 'DELETE',
        if: (age > 19),
    }
    @bpm.process.businessKey#two: (name)
    @bpm.process.businessKey: (name || age)

    entity TwoProcessStart {
        key ID: String;
        name: String;
        age: Integer;
    }
}