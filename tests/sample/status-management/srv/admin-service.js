const cds = require('@sap/cds');

module.exports = class AdminService extends cds.ApplicationService {
  init() {
    const { Books } = this.entities;
    this.before(['NEW', 'CREATE'], 'Authors', genid);
    this.before(['NEW', 'CREATE'], 'Books', genid);

    this.after('READ', Books, async (results, _req) => {
      const processService = await cds.connect.to(
        'eu12.cdsmunich.sampleapplicationproject.BookApprovalProcessService',
      );

      // Parallelize all process lookups using Promise.all instead of sequential loop
      await Promise.all(
        results.map(async (book) => {
          const bookTitle = book.title;
          if (!bookTitle) {
            // Draft entries without a title yet
            book.processStatus = 'No Approval Required';
            book.isApproved = true;
            book.processCriticality = 0; // Neutral
            return;
          }

          try {
            const instances = await processService.getInstancesByBusinessKey(bookTitle, [
              'RUNNING',
              'COMPLETED',
              'CANCELED',
            ]);

            if (instances[0]?.id && instances[0]?.status) {
              const { id, status } = instances[0];

              if (status === 'RUNNING') {
                const attributes = await processService.getAttributes(id);
                book.processStatus = attributes[0]?.value ?? 'Pending Approval';
                book.isApproved = false;
                book.processCriticality = 2; // Warning (yellow)
              } else if (status === 'COMPLETED') {
                const outputs = await processService.getOutputs(id);
                const { finalstatus, isapproved } = outputs;
                book.processStatus = finalstatus;
                book.isApproved = isapproved;
                book.processCriticality = isapproved ? 3 : 1; // Positive (green) or Negative (red)
              } else if (status === 'CANCELED') {
                book.processStatus = 'Cancelled';
                book.isApproved = true;
                book.processCriticality = 0; // Neutral
              }
            } else if (book.price > 50) {
              // Process was likely just triggered but hasn't registered in SBPA yet
              book.processStatus = 'Pending Approval';
              book.isApproved = false;
              book.processCriticality = 2; // Warning (yellow)
            } else {
              book.processStatus = 'No Approval Required';
              book.isApproved = true;
              book.processCriticality = 0; // Neutral
            }
          } catch (err) {
            book.processStatus = 'Status Unavailable';
            book.isApproved = false;
            book.processCriticality = 0; // Neutral
          }
        }),
      );
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
