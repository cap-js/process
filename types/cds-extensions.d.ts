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
    '@build.process.start.id'?: string;
    '@build.process.start.on'?: string;
    '@build.process.start.when'?: object;
    '@build.process.cancel.on'?: string;
    '@build.process.cancel.cascade'?: boolean;
    '@build.process.cancel.when'?: object;
    '@build.process.suspend.on'?: string;
    '@build.process.suspend.cascade'?: boolean;
    '@build.process.suspend.when'?: object;
    '@build.process.resume.on'?: string;
    '@build.process.resume.cascade'?: boolean;
    '@build.process.resume.when'?: object;
  }

  interface Results extends cds.ResultSet {
    [key: string]: any ;
  }
  
  interface DeleteRequest extends cds.Request {
    _Process?: cds.entity[];
  }
}