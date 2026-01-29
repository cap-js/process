const cds = require('@sap/cds');
const { serviceToken, retrieveJwt } = require("@sap-cloud-sdk/connectivity");

exports.getAuth = async function(service : typeof cds.RemoteService, request?: typeof cds.Request) {
    let authToken = request?.http?.req ? retrieveJwt(request?.http?.req) : null;


    // TODO xsuaa deprecation also support ias/ams Tokens 
    authToken = await serviceToken(
        { 
            name: 'process-automation-service',
            label: 'process-automation-service', 
            tags: [],
            credentials: {
                url: `${service.destination.uaa.url}/oauth/token`,
                clientid: service.destination.uaa.clientid,
                clientsecret: service.destination.uaa.clientsecret
            }
        }
    );

    return `Bearer ${authToken}`;
}