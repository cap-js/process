/* checksum : 599270b792f9fe49fe94c62583c09a3e */
namespace eu12.![bpm-horizon-walkme].sdshipmentprocessor;

/** DO NOT EDIT. THIS IS A GENERATED SERVICE THAT WILL BE OVERRIDDEN ON NEXT IMPORT. */
@protocol : 'none'
@build.process : 'eu12.bpm-horizon-walkme.sdshipmentprocessor.shipmentHandler'
service ShipmentHandlerService {
  type ShipmentProcessResult_itemProcessResults_Array : many ItemProcessResult;

  type ShipmentProcessResult {
    shipmentId : String;
    status : String;
    itemProcessResults : ShipmentProcessResult_itemProcessResults_Array;
  };

  type Shipment_items_Array : many Item;

  type Shipment {
    identifier : String;
    items : Shipment_items_Array;
  };

  type ItemProcessResult {
    itemId : String;
    isApproved : Boolean;
    comment : String;
  };

  type Item {
    identifier : String;
    title : String;
    quantity : DecimalFloat;
    price : DecimalFloat;
  };

  type ProcessInputs {
    startingShipment : Shipment not null;
    businesskey : String not null;
  };

  type ProcessOutputs {
    shipmentProcessResultOutput : ShipmentProcessResult;
  };

  type ProcessAttributes { };

  type ProcessInstance {
    definitionId : String;
    definitionVersion : String;
    id : String;
    status: String;
    startedAt : String;
    startedBy : String;
  };

  type ProcessInstances : many ProcessInstance;

  action start(
    inputs : ProcessInputs not null
  );

  function getAttributes(
    processInstanceId : String not null
  ) returns ProcessAttributes;

  function getOutputs(
    processInstanceId : String not null
  ) returns ProcessOutputs;

  function getInstancesByBusinessKey(
    businessKey : String not null
  ) returns ProcessInstances;

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

