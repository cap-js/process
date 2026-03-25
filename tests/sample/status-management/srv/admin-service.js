const cds = require('@sap/cds');

module.exports = class AdminService extends cds.ApplicationService {
  init() {
    const { Books } = this.entities;
    this.before(['NEW', 'CREATE'], 'Authors', genid);
    this.before(['NEW', 'CREATE'], 'Books', genid);

    this.after('READ', Books, async (results, _req) => {
      for (const book of results) {
        const bookTitle = book.title;

        const processService = await cds.connect.to('ProcessService');
        const instances = await processService.getInstancesByBusinessKey(bookTitle, [
          'RUNNING',
          'COMPLETED',
          'CANCELED',
        ]);

        if (instances[0] && instances[0].id && instances[0].status) {
          if (instances[0].status === 'RUNNING') {
            // Get attributes from running process
            const attributes = await processService.getAttributes(instances[0].id);
            const currentStatus = attributes[0].value;
            book.processStatus = currentStatus;
            book.isApproved = false;
          } else if (instances[0].status === 'COMPLETED') {
            // get outputs from completed process
            const outputs = await processService.getOutputs(instances[0].id);
            console.log(outputs);
            const { finalstatus, isapproved } = outputs;
            book.processStatus = finalstatus;
            book.isApproved = isapproved;
          } else if (instances[0].status === 'CANCELED') {
            book.processStatus = 'Process has been cancelled and is not required';
            book.isApproved = true;
          }
        } else {
          book.processStatus = 'No process started';
          book.isApproved = true;
        }
      }
    });
    return super.init();
  }
};

/** Generate primary keys for target entity in request */
async function genid(req) {
  if (req.data.ID) return;
  const { id } = await SELECT.one.from(req.target).columns('max(ID) as id');
  req.data.ID = id + 4; // Note: that is not safe! ok for this sample only.
}
