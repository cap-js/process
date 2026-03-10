import cds from '@sap/cds';
import { BUSINESS_KEY_ALIAS, PROCESS_LOGGER_PREFIX } from '../constants';

const LOG = cds.log(PROCESS_LOGGER_PREFIX);

export function getBusinessKeyColumnOrReject(req: cds.Request, businessKey: string | undefined) {
  if (!businessKey) {
    const msg = 'Business key is required but was not found in the entity.';
    LOG.error(msg);
    req.reject({ status: 400, message: msg });
  } else {
    return `${businessKey} ${BUSINESS_KEY_ALIAS}`;
  }
}
