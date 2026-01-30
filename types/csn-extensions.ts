/**
* Strongly Typed CSN (Core Schema Notation) Model in TypeScript
* Based on https://cap.cloud.sap/docs/cds/csn
*/

//
// ──────────────────────────────────────────────────────────────
//  BUILT-IN CDS TYPES
// ──────────────────────────────────────────────────────────────
//

export enum CdsBuiltinType {
  String = 'cds.String',
  LargeString = 'cds.LargeString',
  Binary = 'cds.Binary',
  LargeBinary = 'cds.LargeBinary',
  Boolean = 'cds.Boolean',
  Integer = 'cds.Integer',
  UInt8 = 'cds.UInt8',
  UInt16 = 'cds.UInt16',
  UInt32 = 'cds.UInt32',
  Integer64 = 'cds.Integer64',
  Decimal = 'cds.Decimal',
  DecimalFloat = 'cds.DecimalFloat',
  Double = 'cds.Double',
  Date = 'cds.Date',
  Time = 'cds.Time',
  DateTime = 'cds.DateTime',
  Timestamp = 'cds.Timestamp',
  UUID = 'cds.UUID',
  Association = 'cds.Association',
  Composition = 'cds.Composition',
}
// User-defined or built-in type reference
export type CdsTypeRef = CdsBuiltinType | string;
//
// ──────────────────────────────────────────────────────────────
//  TOP-LEVEL MODEL
// ──────────────────────────────────────────────────────────────
//
export interface CsnModel {
  $version?: string;
  requires?: string[];
  definitions?: Record<string, CsnDefinition>;
  extensions?: CsnExtension[];
  i18n?: Record<string, Record<string, string>>;
  meta?: Record<string, string>;
}
//
// ──────────────────────────────────────────────────────────────
//  DEFINITION UNION
// ──────────────────────────────────────────────────────────────
//
export type CsnDefinition =
  | CsnEntity
  | CsnType
  | CsnService
  | CsnAction
  | CsnFunction
  | CsnAnnotation;
export interface CsnBaseDefinition extends CsnAnnotations {
  name?: string;
  doc?: string;
  kind:
    | 'entity'
    | 'type'
    | 'service'
    | 'action'
    | 'function'
    | 'annotation';
}
//
// ──────────────────────────────────────────────────────────────
//  SERVICE
// ──────────────────────────────────────────────────────────────
//
export interface CsnService extends CsnBaseDefinition {
  kind: 'service';
}
//
// ──────────────────────────────────────────────────────────────
//  ENTITY
// ──────────────────────────────────────────────────────────────
//
export interface CsnEntity extends CsnBaseDefinition {
  kind: 'entity';
  elements: Record<string, CsnElement>;
  query?: CqnQuery;
  projection?: CqnProjection;
  actions?: Record<string, CsnAction | CsnFunction>;
}
//
// ──────────────────────────────────────────────────────────────
//  TYPE
// ──────────────────────────────────────────────────────────────
//
export interface CsnType extends CsnBaseDefinition {
  kind: 'type';
  // For scalar/alias types, set `type`. For structured, omit `type` and set `elements`.
  type?: CdsTypeRef;
  elements?: Record<string, CsnElement>;
  // For arrayed types, use `items` with inline spec
  items?: CsnTypeSpec;
  length?: number;
  precision?: number;
  scale?: number;
  enum?: Record<string, CsnEnumMember>;
  localized?: boolean;
  default?: any;
  notNull?: boolean;
}
// Inline type spec for items or inline element types
export interface CsnTypeSpec {
  type?: CdsTypeRef;
  elements?: Record<string, CsnElement>;
  items?: CsnTypeSpec; // nested arrays
  enum?: Record<string, CsnEnumMember>;
  length?: number;
  precision?: number;
  scale?: number;
  localized?: boolean;
  default?: any;
  notNull?: boolean;
}
//
// ──────────────────────────────────────────────────────────────
//  ACTION & FUNCTION
// ──────────────────────────────────────────────────────────────
//
export interface CsnAction extends CsnBaseDefinition {
  kind: 'action';
  params?: Record<string, CsnElement>;
  returns?: CsnType | CsnElement;
}
export interface CsnFunction extends CsnBaseDefinition {
  kind: 'function';
  params?: Record<string, CsnElement>;
  returns?: CsnType | CsnElement;
}
//
// ──────────────────────────────────────────────────────────────
//  ANNOTATION
// ──────────────────────────────────────────────────────────────
//
export interface CsnAnnotation extends CsnBaseDefinition {
  kind: 'annotation';
  target?: string;
  value?: any;
}
//
// ──────────────────────────────────────────────────────────────
//  ELEMENT (field of entity or structured type)
// ──────────────────────────────────────────────────────────────
//
export interface CsnElement extends CsnAnnotations {
  type: CdsTypeRef;
  notNull?: boolean;
  key?: boolean;
  virtual?: boolean;
  localized?: boolean;
  length?: number;
  precision?: number;
  scale?: number;
  default?: any;
  elements?: Record<string, CsnElement>;
  items?: CsnTypeSpec; // optional inline array spec (we prefer named array types)
  target?: string;
  cardinality?: CsnCardinality;
  on?: CqnExpression;
  keys?: CqnKeyRef[];
}
//
// ──────────────────────────────────────────────────────────────
//  ENUM MEMBER
// ──────────────────────────────────────────────────────────────
//
export interface CsnEnumMember extends CsnAnnotations {
  val?: any;
}
//
// ──────────────────────────────────────────────────────────────
//  CARDINALITY (for associations)
// ──────────────────────────────────────────────────────────────
//
export interface CsnCardinality {
  src?: number;
  min?: number;
  max?: number | '*';
}
//
// ──────────────────────────────────────────────────────────────
//  EXTENSIONS
// ──────────────────────────────────────────────────────────────
//
export interface CsnExtension extends CsnAnnotations {
  extend?: string;
  annotate?: string;
  elements?: Record<string, CsnElement>;
  includes?: string[];
}
export interface CsnAnnotations {
  [annotationName: `@${string}`]: any;
}
//
// ──────────────────────────────────────────────────────────────
//  SIMPLIFIED CQN (for view/query definitions)
// ──────────────────────────────────────────────────────────────
//
export interface CqnQuery {
  SELECT?: {
    from: string | { ref: string[] };
    columns?: any[];
    where?: any[];
    groupBy?: any[];
    orderBy?: any[];
  };
}
export interface CqnProjection {
  from: string | { ref: string[] };
  columns?: any[];
  where?: any[];
}
export type CqnExpression = any;
export type CqnKeyRef = { ref: string[] };