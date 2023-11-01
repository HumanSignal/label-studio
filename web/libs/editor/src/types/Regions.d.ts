declare interface LSFResult {
  type: string;
  from_name: any; // tag on page
  to_name: any; // tag on page
  value: Record<string, any>;
  mainValue: any;
}

declare interface LSFRegion {
  results: LSFResult[];
}
