service ProgramaticalService {
  action updateProcess(shipmentID: UUID,
                       @mandatory newStatus: String);

  action cancelProcess(shipmentID: UUID);

  action startShipment(shipmentID: UUID);

  action getShipmentAttributes(shipmentID: UUID)       returns String;

  action getShipmentOutputs(shipmentID: UUID)          returns String;

  action getInstancesByShipmentID(shipmentID: UUID,
                                  status: many String) returns String;
}