import cds, { context } from '@sap/cds';
import { startRiskManagementProcess, cancelRiskManagementProcess, resumeRiskManagementProcess, suspendRiskManagementProcess } from '#cds-models/ProcessService';
import { start } from 'repl';

module.exports = class CatalogService extends cds.ApplicationService {
  init() {

    const { Books } = cds.entities('sap.capire.bookshop')
    const { ListOfBooks } = this.entities

    // Add some discount for overstocked books
    this.after('each', ListOfBooks, book => {
      if (book.stock > 111) book.title += ` -- 11% discount!`
    })

    // Reduce stock of ordered books if available stock suffices
    this.on('submitOrder', async req => {
      let { book: id, quantity } = req.data
      let book = await SELECT.one.from(Books, id, b => b.stock)

      // Validate input data
      if (!book) return req.error(404, `Book #${id} doesn't exist`)
      if (quantity < 1) return req.error(400, `quantity has to be 1 or more`)
      if (!book.stock || quantity > book.stock) return req.error(409, `${quantity} exceeds stock for book #${id}`)

      // Reduce stock in database and return updated stock value
      await UPDATE(Books, id).with({ stock: book.stock -= quantity })
      return book
    })

    // Emit event when an order has been submitted
    this.after('READ', async (_, req) => {
      let { book, quantity } = req.data
      await this.emit('OrderedBook', { book, quantity, buyer: req.user.id })
      const processService = await cds.connect.to('ProcessService');

      const startContext: startRiskManagementProcess = {
        title: "Sample Risk",
        desciption: "This is a sample risk created to demonstrate process integration.",
        probability: 0.75,
        severity: "High",
        impact: 50000.00,
        category: "Operational",
        dueDate: "2024-12-31",
        owner: req.user.id,
      }

      const cancelContext: cancelRiskManagementProcess = {
        businessKey: "test_businessKey",
        cascade: true
      }
      const resumeContext: resumeRiskManagementProcess = {
        businessKey: "test_businessKey",
        cascade: true
      }
      const suspendContext: suspendRiskManagementProcess = {
        businessKey: "test_businessKey",
        cascade: true
      }

      await processService.send('startRiskManagementProcess', startContext);
      await processService.send('cancelRiskManagementProcess', cancelContext);
      await processService.send('resumeRiskManagementProcess', resumeContext);
      await processService.send('suspendRiskManagementProcess', suspendContext);




      // const ProcessService = await cds.connect.to('ProcessService')
      // await ProcessService.emit('StartMyCrazyProcess', { abc: '1234' })
    })

    // Delegate requests to the underlying generic service
    return super.init()
  }
}
