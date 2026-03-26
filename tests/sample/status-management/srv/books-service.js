const cds = require('@sap/cds');

const BOOK_PROCESS = 'eu12.cdsmunich.sampleapplicationproject.BookApprovalProcessService';

module.exports = class BooksService extends cds.ApplicationService {
  init() {
    const { Books } = this.entities;
    this.before(['NEW', 'CREATE'], 'Books', genid);

    // ---------------------------------------------------------------
    // Books: Enrich with approval process status (declarative start)
    // ---------------------------------------------------------------
    this.after('READ', Books, async (results, _req) => {
      const processService = await cds.connect.to(BOOK_PROCESS);

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
              book.processStatus = 'Approval process cancelled as price has been reduced';
              book.isApproved = true;
              book.processCriticality = 3; // Positive (green)
            }
          } else if (book.price > 50) {
            // Process was likely just triggered but hasn't registered in SBPA yet
            book.processStatus = 'Pending Approval';
            book.isApproved = false;
            book.processCriticality = 2; // Warning (yellow)
          } else {
            book.processStatus = 'No Approval Required';
            book.isApproved = true;
            book.processCriticality = 3; // Positive
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
