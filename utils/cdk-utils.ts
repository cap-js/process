const cds = require('@sap/cds');
const { HttpDestination, serviceToken, retrieveJwt } = require("@sap-cloud-sdk/connectivity");
exports.getAuth = async function(service : typeof cds.RemoteService, request: typeof cds.Request) {

    let authToken = request?.http?.req ? retrieveJwt(request?.http?.req) : null;

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

    const dest: typeof HttpDestination = {
        url: service.destination.endpoints.api,
        authentication: 'OAuth2ClientCredentials',
        authTokens: [{
            type: 'Bearer',
            value: authToken,
            error: null,
            http_header: {
                'key': 'Authorization',
                'value': `Bearer ${authToken}`
            }
        }]
    };

    return dest;
}