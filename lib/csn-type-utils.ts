import cds from "@sap/cds";
import * as fs from 'fs'
import * as path from 'path'
import { PROCESS_CANCEL_EVENT, PROCESS_DEFINITION_ID, PROCESS_RESUME_EVENT, PROCESS_START_EVENT, PROCESS_SUSPEND_EVENT } from "./constants";

const LOG = cds.log('process');
export function findCsnFiles(externalDir: string): string[] | null {
    if (!fs.existsSync(externalDir)) {
        LOG.warn('No CSN files found, skipping process service extension.');
        return null;
    }

    try {
        const files = getAllCsnFilesRecursive(externalDir);
        LOG.info(`Found ${files.length} CSN file(s) in srv/external:`);
        return files.length > 0 ? files : null;
    } catch (error) {
        LOG.error('Error reading srv/external directory:', error);
        return null;
    }
}


function getAllCsnFilesRecursive(dirPath: string, arrayOfFiles: string[] = []): string[] {
    const files = fs.readdirSync(dirPath);

    files.forEach((file) => {
        const filePath = path.join(dirPath, file);
        if (fs.statSync(filePath).isDirectory()) {
            arrayOfFiles = getAllCsnFilesRecursive(filePath, arrayOfFiles);
        } else if (file.endsWith('.json') || file.endsWith('.csn')) {
            arrayOfFiles.push(filePath);
        }
    });

    return arrayOfFiles;
}


export function processWorkflowDefinition(file: string, csn: any): void {
    LOG.debug(`Processing file: ${file}`);

    const data = JSON.parse(fs.readFileSync(file, 'utf-8'));

    const serviceName = Object.keys(data.definitions).find(
        key => data.definitions[key].kind === 'service'
    );

    if (!serviceName || !csn.definitions) {
        return;
    }

    const service = data.definitions[serviceName];
    const processName = serviceName.replace("Service", "");
    const processInputs = data.definitions[`${serviceName}.ProcessInputs`];

    if (!processInputs?.elements) {
        return;
    }

    copyComplexTypes(processInputs.elements, data.definitions, serviceName, csn);


    createProcessEvents(processName, processInputs.elements, service['@build.process'], serviceName, csn);
}

function copyComplexTypes(
    elements: Record<string, any>,
    externalDefinitions: Record<string, any>,
    serviceName: string,
    csn: any
): void {
    const typeDependencies = findTypeDependencies(elements, externalDefinitions, serviceName);

    if (typeDependencies.size === 0) {
        LOG.debug(`Copying 0 type dependencies for ${serviceName.replace("Service", "")}:`);
        return;
    }

    LOG.debug(`Copying ${typeDependencies.size} type dependencies for ${serviceName.replace("Service", "")}:`);

    typeDependencies.forEach(typeName => {
        const typeDef = externalDefinitions[typeName];
        if (!typeDef) return;

        const newTypeName = `ProcessService.${typeName}`;

        if (csn.definitions[newTypeName]) {
            return;
        }

        LOG.debug(`  - ${typeName} -> ${newTypeName}`);

        csn.definitions[newTypeName] = updateTypeReferences(typeDef, serviceName);
    });
}

function createProcessEvents(
    processName: string,
    inputElements: Record<string, any>,
    processDefinitionId: string,
    serviceName: string,
    csn: any
): void {
    const updatedInputs = updateTypeReferences({ elements: inputElements }, serviceName).elements;

    csn.definitions[`ProcessService.start${processName}`] = {
        kind: 'event',
        [PROCESS_START_EVENT]: true,
        [PROCESS_DEFINITION_ID]: processDefinitionId,
        elements: updatedInputs,
    };

    csn.definitions[`ProcessService.cancel${processName}`] = {
        kind: 'event',
        [PROCESS_CANCEL_EVENT]: true,
        elements: {
            businessKey: { type: "cds.String", length: 256, notNull: true },
            cascade: { type: "cds.Boolean", notNull: true }
        }
    };

    csn.definitions[`ProcessService.resume${processName}`] = {
        kind: 'event',
        [PROCESS_RESUME_EVENT]: true,
        elements: {
            businessKey: { type: "cds.String", length: 256, notNull: true },
            cascade: { type: "cds.Boolean", notNull: true }
        }
    };

    csn.definitions[`ProcessService.suspend${processName}`] = {
        kind: 'event',
        [PROCESS_SUSPEND_EVENT]: true,
        elements: {
            businessKey: { type: "cds.String", length: 256, notNull: true },
            cascade: { type: "cds.Boolean", notNull: true }
        }
    };
}

function findTypeDependencies(
    elements: Record<string, any>,
    externalDefinitions: Record<string, any>,
    serviceName: string,
    visited: Set<string> = new Set()
): Set<string> {
    const dependencies = new Set<string>();

    for (const element of Object.values(elements)) {

        if (element.type && !element.type.startsWith('cds.') && !visited.has(element.type)) {
            visited.add(element.type);
            dependencies.add(element.type);
            const typeDef = externalDefinitions[element.type];
            if (typeDef?.elements) {
                const nested = findTypeDependencies(typeDef.elements, externalDefinitions, serviceName, visited);
                nested.forEach(dep => dependencies.add(dep));
            }
        }

        if (element.items?.type && !element.items.type.startsWith('cds.') && !visited.has(element.items.type)) {
            visited.add(element.items.type);
            dependencies.add(element.items.type);

            const typeDef = externalDefinitions[element.items.type];
            if (typeDef?.elements) {
                const nested = findTypeDependencies(typeDef.elements, externalDefinitions, serviceName, visited);
                nested.forEach(dep => dependencies.add(dep));
            }
        }
    }

    return dependencies;
}

function updateTypeReferences(obj: any, serviceName: string): any {
    if (!obj || typeof obj !== 'object') {
        return obj;
    }

    const cloned = JSON.parse(JSON.stringify(obj));

    if (cloned.elements) {
        for (const element of Object.values(cloned.elements) as any[]) {
            if (element.type?.startsWith(serviceName + '.')) {
                element.type = `ProcessService.${element.type}`;
            }

            if (element.items?.type?.startsWith(serviceName + '.')) {
                element.items.type = `ProcessService.${element.items.type}`;
            }
        }
    }

    return cloned;
}
