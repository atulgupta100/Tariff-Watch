
export interface ProductInfo {
  hsCode: string;
  description: string;
  dutyRate: number; // as a percentage (e.g., 5.5)
  countryOfOrigin: string;
  destinationCountry: string;
  notes?: string;
  isFromLocalDb?: boolean;
}

export interface StaticDutyRate {
  htsCode: string;
  destination: string;
  origin?: string; // Optional: specify if different rates apply by origin
  dutyRate: number;
  description: string;
}

export interface AdditionalCost {
  id: string;
  label: string;
  value: number;
  included: boolean;
}

export interface CustomDuty {
  id: string;
  label: string;
  rate: number;
  isCompounded: boolean; // Calculated after base duty?
}

export interface CalculationInputs {
  unitPrice: number;
  quantity: number;
  freight: number;
  includeFreight: boolean;
  insurance: number;
  includeInsurance: boolean;
  originCountry: string;
  additionalCosts: AdditionalCost[];
  inlandLogistics: AdditionalCost[];
  customDuties: CustomDuty[];
}

export interface CalculationResult {
  fobValue: number;
  cifValue: number;
  dutyAmount: number;
  additionalCostsTotal: number;
  inlandLogisticsTotal: number;
  totalLandedCost: number;
  totalDutyRate: number;
}
