/* checksum : 060851d153c6463bb8c4fb247ccfd927 */
namespace eu12.![bpm-horizon-walkme].sdshipmentprocessor;

/** DO NOT EDIT. THIS IS A GENERATED SERVICE THAT WILL BE OVERRIDDEN ON NEXT IMPORT. */
@protocol : 'none'
@bpm.process : 'eu12.bpm-horizon-walkme.sdshipmentprocessor.shipmentHandler'
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

  type ProcessAttribute {
    id : String not null;
    label : String not null;
    value : String;
    type : String not null;
  };

  type ProcessAttributes : many ProcessAttribute;

  type ProcessInstance {
    definitionId : String;
    definitionVersion : String;
    id : String;
    status : String;
    startedAt : String;
    startedBy : String;
  };

  type ProcessInstances : many ProcessInstance;

  type ProcessInstanceStatus : many String;

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
    businessKey : String not null,
    status : ProcessInstanceStatus
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

