import * as csn from './csn-extensions';

declare module '@sap/cds' {
  export = cds;
  namespace cds {
    namespace build {
      export class Plugin {
        init(): void;
        build(): Promise<void>;
        model(): Promise<csn.CsnModel>;
        pushMessage(message: string, level: number): void;
        copy(src: string): { to(dest: string): Promise<void> };
        write(content: any): { to(dest: string): Promise<void> };

        task: { src: string; dest: string; options?: any };
        messages: { message: string; severity: number }[];

        static taskDefaults: { src?: string; dest?: string };
        static hasTask(): boolean;
        static readonly INFO: number;
        static readonly WARNING: number;
        static readonly ERROR: number;
      }

      export class BuildError extends Error {
        constructor(message: string);
      }

      export function register(name: string, plugin: typeof Plugin): void;
    }
  }
}
