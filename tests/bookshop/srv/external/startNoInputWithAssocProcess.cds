/* checksum : test-fixture-start-no-input-with-assoc */

/** Test fixture: Process definition for startNoInputWithAssocProcess.
 *  Used to test that when no @bpm.process.start.inputs annotation is defined,
 *  only entity fields matching ProcessInputs element names are sent. */
@protocol : 'none'
@bpm.process : 'startNoInputWithAssocProcess'
service StartNoInputWithAssocProcessService {

  type ProcessInputs {
    ID        : UUID;
    status    : String;
    author_ID : UUID;
  };

  type ProcessOutputs {};

  action start(
    inputs : ProcessInputs not null
  );

  action suspend(
    businessKey : String not null,
    cascade : Boolean
  );

  action resume(
    businessKey : String not null,
    cascade : Boolean
  );

  action cancel(
    businessKey : String not null,
    cascade : Boolean
  );
};
