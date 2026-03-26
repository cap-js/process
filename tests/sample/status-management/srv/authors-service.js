const cds = require('@sap/cds');

const AUTHOR_PROCESS = 'eu12.cdsmunich.sampleapplicationproject.AuthorVerificationProcessService';

const VERIFICATION_PENDING = 'Verification Pending';
const VERIFICATION_CANCELED = 'Cancelled';
const VERIFICATION_SUCCESSFUL = 'Author verified';

module.exports = class AuthorsService extends cds.ApplicationService {
  async init() {
    const { Authors } = this.entities;
    const authorProcess = await cds.connect.to(AUTHOR_PROCESS);
    // Track authors created at runtime so we can distinguish them from seed data
    const createdAuthorIDs = new Set();
    // ---------------------------------------------------------------
    // Authors: Programmatic process lifecycle (start, cancel, status)
    // ---------------------------------------------------------------

    // Start verification process when a new author is created
    this.after('CREATE', Authors, async (author, req) => {
      createdAuthorIDs.add(author.ID);
      await authorProcess.start({
        entityid: author.ID,
        authorname: author.name,
        dateofbirth: author.dateOfBirth ?? '',
        placeofbirth: author.placeOfBirth ?? '',
      });
    });

    // Cancel verification process when an unverified author is deleted
    this.after('DELETE', Authors, async (author, req) => {
      if (!author.ID) return;

      const instances = await authorProcess.getInstancesByBusinessKey(author.ID, ['RUNNING']);
      if (instances.length > 0) {
        await authorProcess.cancel({ businessKey: author.ID, cascade: true });
      }
    });

    // Enrich authors with verification process status
    this.after('READ', Authors, async (results, _req) => {
      await Promise.all(
        results.map(async (author) => {
          if (!author.ID) {
            author.verificationStatus = VERIFICATION_PENDING;
            author.isVerified = false;
            author.verificationCriticality = 2; // Warning (yellow)
            return;
          }

          const instances = await authorProcess.getInstancesByBusinessKey(author.ID, [
            'RUNNING',
            'COMPLETED',
            'CANCELED',
          ]);

          if (instances[0]?.id && instances[0]?.status) {
            const { id, status } = instances[0];

            switch (status) {
              case 'RUNNING':
                {
                  const attributes = await authorProcess.getAttributes(id);
                  author.verificationStatus = attributes[0]?.value ?? VERIFICATION_PENDING;
                  author.isVerified = false;
                  author.verificationCriticality = 2; // Warning (yellow)
                }
                break;
              case 'COMPLETED':
                {
                  const outputs = await authorProcess.getOutputs(id);
                  author.verificationStatus = outputs.verificationstatus;
                  author.isVerified = outputs.isverified;
                  author.verificationCriticality = outputs.isverified ? 3 : 1; // Green or Red
                }
                break;
              case 'CANCELED':
                {
                  author.verificationStatus = VERIFICATION_CANCELED;
                  author.isVerified = false;
                  author.verificationCriticality = 0; // Neutral
                }
                break;
            }
          } else if (createdAuthorIDs.has(author.ID)) {
            // Just created but process instance not yet visible (race condition)
            author.verificationStatus = VERIFICATION_PENDING;
            author.isVerified = false;
            author.verificationCriticality = 2; // Warning (yellow)
          } else {
            // Pre-existing seed data author with no process — treat as verified
            author.verificationStatus = VERIFICATION_SUCCESSFUL;
            author.isVerified = true;
            author.verificationCriticality = 3; // Positive (green)
          }
        }),
      );
    });

    return super.init();
  }
};
