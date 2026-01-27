const cds = require('@sap/cds');


export type ValidationResult = {
    isValid: boolean;
    errors?: {
        code: string;
        message: string;
    }[];
};

export type EntityAnnotationCallback = (key: string, value: any) => void;
export type ElementAnnotationCallback = (key: string, value: any, context: { elementName: string }) => void;

export function walkEntityAnnotations(
  entity: typeof cds.entity,
  onEntityAnnotation?: EntityAnnotationCallback,
  onElementAnnotation?: ElementAnnotationCallback
) {
  const entityAnnotations = Object.entries(entity).filter(([key]) => key.startsWith('@build'));
  for(const [key, value] of entityAnnotations) {
    console.log(`  - Entity property: ${key} = ${value}`);
    onEntityAnnotation?.(key, value);
  }

  if (!entity.elements) {
    return;
  }

  for (const [elementName, element] of Object.entries(entity.elements)) {
    console.log(`   - Element: ${elementName}`);  
    const elementAnnotations = Object.entries(element as any).filter(([key]) => key.startsWith('@build'));
    for (const [key, value] of elementAnnotations) {
      console.log(`    - Element property: ${key} = ${value}`);
      onElementAnnotation?.(key, value, { elementName });
    }
  }
}