export interface TransactionResult {
  id: string;
  fraud: TransactionRiskDetail;
  compliance: TransactionRiskDetail;
  failures: TransactionFailure[];
}

export interface TransactionRiskDetail {
  resolution: "APPROVED" | "ESCALATED" | "DECLINED";
  score: number;
  rules: RuleResult[];
}

export interface RuleResult {
  name: string;
  resolution: "APPROVED" | "ESCALATED" | "DECLINED";
  score: number;
  attachment: Record<string, any>;
}

export interface TransactionFailure {
  type: string;
  name: string;
  code: number;
  description: string;
}