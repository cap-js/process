/* checksum : test-fixture-start-no-input */

/** Test fixture: Process definition for startNoInputProcess.
 *  Used to test that when no @bpm.process.start.inputs annotation is defined,
 *  only entity fields matching ProcessInputs element names are sent. */
@protocol : 'none'
@bpm.process : 'startNoInputProcess'
service StartNoInputProcessService {

  type ProcessInputs {
    status : String;
    origin : String;
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
