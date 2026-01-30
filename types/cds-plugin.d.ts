import * as csn from './csn-extensions';

declare module '@sap/cds' {

  export = cds;
  namespace cds {

      namespace build {

        export class Plugin {
          init(): void {};
          model(): Promise<csn.CsnModel> { };
          pushMessage(message: string, level: number): void;

          static readonly INFO: number;
          static readonly WARNING: number;
          static readonly ERROR: number;
        }

      }

    }
}