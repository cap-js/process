

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
        on: 'CREATE',
        inputs: [
            $self.name
        ]
    }
    @bpm.process.start #two: {
        id: 'testProcess2',
        on: 'CREATE',
        if: (age > 19),
    }
    entity TwoProcessStart {
        key ID: String;
        name: String;
        age: Integer;
    }
}