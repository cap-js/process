const cds = require('@sap/cds');

const BOOK_PROCESS = 'eu12.cdsmunich.sampleapplicationproject.BookApprovalProcessService';

const NO_APPROVAL_REQUIRED = 'No Approval Required';
const PENDING_APPROVAL = 'Pending Approval';
const APPROVAL_CANCELLED = 'Approval process cancelled as price has been reduced';

module.exports = class BooksService extends cds.ApplicationService {
  async init() {
    const { Books } = this.entities;
    const bookProcess = await cds.connect.to(BOOK_PROCESS);
    // ---------------------------------------------------------------
    // Books: Enrich with approval process status (declarative start)
    // ---------------------------------------------------------------
    this.after('READ', Books, async (results, _req) => {
      await Promise.all(
        results.map(async (book) => {
          const bookTitle = book.title;
          if (!bookTitle) {
            // Draft entries without a title yet
            book.processStatus = NO_APPROVAL_REQUIRED;
            book.isApproved = true;
            book.processCriticality = 0; // Neutral
            return;
          }

          const instances = await bookProcess.getInstancesByBusinessKey(bookTitle, [
            'RUNNING',
            'COMPLETED',
            'CANCELED',
          ]);

          if (instances[0]?.id && instances[0]?.status) {
            const { id, status } = instances[0];

            switch (status) {
              case 'RUNNING':
                {
                  let attributes = await bookProcess.getAttributes(id);
                  book.processStatus = attributes[0]?.value ?? PENDING_APPROVAL;
                  book.isApproved = false;
                  book.processCriticality = 2;
                }
                break;
              case 'COMPLETED':
                {
                  const outputs = await bookProcess.getOutputs(id);
                  const { finalstatus, isapproved } = outputs;
                  book.processStatus = finalstatus;
                  book.isApproved = isapproved;
                  book.processCriticality = isapproved ? 3 : 1; // Positive (green) or Negative (red)
                }
                break;
              case 'CANCELED':
                {
                  book.processStatus = APPROVAL_CANCELLED;
                  book.isApproved = true;
                  book.processCriticality = 3; // Positive (green)
                }
                break;
            }
          } else if (book.price > 50) {
            // Process was likely just triggered but hasn't registered in SBPA yet
            book.processStatus = PENDING_APPROVAL;
            book.isApproved = false;
            book.processCriticality = 2; // Warning (yellow)
          } else {
            book.processStatus = NO_APPROVAL_REQUIRED;
            book.isApproved = true;
            book.processCriticality = 3; // Positive (green)
          }
        }),
      );
    });

    return super.init();
  }
};
