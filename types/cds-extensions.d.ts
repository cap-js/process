/* eslint-disable @typescript-eslint/no-explicit-any */
declare module '@sap/cds' {
  interface RemoteEndpoints {
    api: string;
  }

  interface Html5AppsRepo {
    app_host_id: string;
  }

  interface UaaConfig {
    tenantmode: string;
    sburl: string;
    subaccountid: string;
    'credential-type': string;
    clientid: string;
    xsappname: string;
    clientsecret: string;
    serviceInstanceId: string;
    url: string;
    uaadomain: string;
    verificationkey: string;
    apiurl: string;
    identityzone: string;
    identityzoneid: string;
    tenantid: string;
    zoneid: string;
  }

  interface Destination {
    name?: string;
    endpoints: RemoteEndpoints;
    'sap.cloud.service': string;
    'sap.cloud.service.alias': string;
    saasregistryenabled: boolean;
    'html5-apps-repo': Html5AppsRepo;
    uaa: UaaConfig;
  }

  interface RemoteService {
    destination: Destination;
  }

  interface ServiceDefinitionAnnotation {
    [key: string]: any;
  }

  interface Service {
    definition: ServiceDefinitionAnnotation;
  }

  interface entity {
    [key: string]: any;
  }

  interface type {
    [key: string]: any;
  }

  // Process annotation types - using literal strings that match constants in lib/constants.ts
  interface Target extends cds.Definition_2 {
    '@bpm.process.start.id'?: string;
    '@bpm.process.start.on'?: string;
    '@bpm.process.start.if'?: object;
    '@bpm.process.start.inputs'?: object[];
    '@bpm.process.cancel.on'?: string;
    '@bpm.process.cancel.cascade'?: boolean;
    '@bpm.process.cancel.if'?: object;
    '@bpm.process.suspend.on'?: string;
    '@bpm.process.suspend.cascade'?: boolean;
    '@bpm.process.suspend.if'?: object;
    '@bpm.process.resume.on'?: string;
    '@bpm.process.resume.cascade'?: boolean;
    '@bpm.process.resume.if'?: object;
    '@bpm.process.businessKey'?: object;
  }

  interface Results extends cds.ResultSet {
    [key: string]: any;
  }

  /**
   * CDS request with process-specific data for DELETE operations
   */

  interface ProcessDeleteRequest extends cds.Request {
    _Process?: DeleteProcessObject;
  }

  type DeleteProcessObject = {
    Start?: Results;
    Cancel?: Results;
    Suspend?: Results;
    Resume?: Results;
  };
}
