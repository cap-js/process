import cds from '@sap/cds';


export type ValidationResult = {
    isValid: boolean;
    errors?: {
        code: string;
        message: string;
    }[];
};

export type EntityAnnotationCallback = (key: string, value: any) => void;
export type ElementAnnotationCallback = (key: string, value: any, context: { elementName: string }) => void;

export function getKeyFieldsForEntity(entity: typeof cds.entity): string[] {
    const keys = entity.keys;
    const result = [];
    for(const key in keys) {
        result.push(key);
    }
    return result;
 }

export function coerceToString(value: any, toUpperCase?: boolean) : any | undefined {
    if (typeof value === 'string') {
        return toUpperCase ? value.toUpperCase() : value;
    } else if (typeof value === 'object') {
        if ('=' in value && value['='] !== undefined) {
            return toUpperCase ? value['='].toUpperCase() : value['='];
        } else if (typeof value.toString === 'function') {
            return toUpperCase ? value.toString().toUpperCase() : value.toString();
        }
    }
    return undefined;
}


export function entityHasAnnotation(
  entity: cds.entity,
): any {
  const entityAnnotations = Object.entries(entity).filter(([key]) => key.startsWith('@build'));
  return entityAnnotations;
}

export function elementHasAnnotation(
  entity: cds.entity,
) : any {
    const elementAnnotations = Object.entries(entity.elements).filter(([key]) => key.startsWith('@build')); 
    return elementAnnotations;
}
