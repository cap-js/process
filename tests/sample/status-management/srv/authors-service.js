const cds = require('@sap/cds');

const AUTHOR_PROCESS = 'eu12.cdsmunich.sampleapplicationproject.AuthorVerificationProcessService';

module.exports = class AuthorsService extends cds.ApplicationService {
  init() {
    const { Authors } = this.entities;
    this.before(['NEW', 'CREATE'], 'Authors', genid);

    // ---------------------------------------------------------------
    // Authors: Programmatic process lifecycle (start, cancel, status)
    // ---------------------------------------------------------------

    // Start verification process when a new author is created
    this.after('CREATE', 'Authors', async (author, req) => {
      try {
        const verificationService = await cds.connect.to(AUTHOR_PROCESS);
        await verificationService.start({
          authorname: author.name,
          dateofbirth: author.dateOfBirth ?? '',
          placeofbirth: author.placeOfBirth ?? '',
        });
      } catch (err) {
        req.warn(200, 'Author created, but verification process could not be started.');
      }
    });

    // Cancel verification process when an unverified author is deleted
    this.after('DELETE', 'Authors', async (author, req) => {
      if (!author.name) return;

      const verificationService = await cds.connect.to(AUTHOR_PROCESS);
      const instances = await verificationService.getInstancesByBusinessKey(author.name, [
        'RUNNING',
      ]);
      if (instances.length > 0) {
        await verificationService.cancel({ businessKey: author.name, cascade: true });
      }
    });

    // Enrich authors with verification process status
    this.after('READ', Authors, async (results, _req) => {
      const verificationService = await cds.connect.to(AUTHOR_PROCESS);

      await Promise.all(
        results.map(async (author) => {
          if (!author.name) {
            author.verificationStatus = 'Pending';
            author.isVerified = false;
            author.verificationCriticality = 2; // Warning (yellow)
            return;
          }

          const instances = await verificationService.getInstancesByBusinessKey(author.name, [
            'RUNNING',
            'COMPLETED',
            'CANCELED',
          ]);

          if (instances[0]?.id && instances[0]?.status) {
            const { id, status } = instances[0];

            if (status === 'RUNNING') {
              const attributes = await verificationService.getAttributes(id);
              author.verificationStatus = attributes[0]?.value ?? 'Verification In Progress';
              author.isVerified = false;
              author.verificationCriticality = 2; // Warning (yellow)
            } else if (status === 'COMPLETED') {
              const outputs = await verificationService.getOutputs(id);
              author.verificationStatus = outputs.verificationstatus;
              author.isVerified = outputs.isverified;
              author.verificationCriticality = outputs.isverified ? 3 : 1; // Green or Red
            } else if (status === 'CANCELED') {
              author.verificationStatus = 'Cancelled';
              author.isVerified = false;
              author.verificationCriticality = 0; // Neutral
            }
          } else {
            // Every new author triggers a verification process, so if no instance
            // is found it's either a race condition (just created) or a pre-existing
            // author that was never verified -- both correctly shown as pending.
            author.verificationStatus = 'Verification Pending';
            author.isVerified = false;
            author.verificationCriticality = 2; // Warning (yellow)
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
