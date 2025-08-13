/**
 * Filter operations for tracker validation
 */

export type FilterOperator =
  | "isEquals"
  | "isEqualsIgnoreCase"
  | "notEquals"
  | "notEqualsIgnoreCase"
  | "isContains"
  | "isContainsIgnoreCase"
  | "notContains"
  | "notContainsIgnoreCase"
  | "isStartsWith"
  | "isStartsWithIgnoreCase"
  | "notStartsWith"
  | "notStartsWithIgnoreCase"
  | "isEndsWith"
  | "isEndsWithIgnoreCase"
  | "notEndsWith"
  | "notEndsWithIgnoreCase"
  | "isRegexMatch"
  | "isRegexMatchIgnoreCase"
  | "notRegexMatch"
  | "notRegexMatchIgnoreCase"
  | "lessThan"
  | "lessThanOrEquals"
  | "greaterThan"
  | "greaterThanOrEquals";

export interface Filter {
  left:     string;
  operator: FilterOperator;
  right:    string;
}

export class FilterCalculator {
  static calculate(filter: Filter, variables: Record<string, unknown>): boolean {
    const leftValue = String(variables[filter.left] ?? "");
    const rightValue = filter.right;

    switch (filter.operator) {
      case "isEquals":
        return leftValue === rightValue;
      case "isEqualsIgnoreCase":
        return leftValue.toLowerCase() === rightValue.toLowerCase();
      case "notEquals":
        return leftValue !== rightValue;
      case "notEqualsIgnoreCase":
        return leftValue.toLowerCase() !== rightValue.toLowerCase();
      case "isContains":
        return leftValue.includes(rightValue);
      case "isContainsIgnoreCase":
        return leftValue.toLowerCase().includes(rightValue.toLowerCase());
      case "notContains":
        return !leftValue.includes(rightValue);
      case "notContainsIgnoreCase":
        return !leftValue.toLowerCase().includes(rightValue.toLowerCase());
      case "isStartsWith":
        return leftValue.startsWith(rightValue);
      case "isStartsWithIgnoreCase":
        return leftValue.toLowerCase().startsWith(rightValue.toLowerCase());
      case "notStartsWith":
        return !leftValue.startsWith(rightValue);
      case "notStartsWithIgnoreCase":
        return !leftValue.toLowerCase().startsWith(rightValue.toLowerCase());
      case "isEndsWith":
        return leftValue.endsWith(rightValue);
      case "isEndsWithIgnoreCase":
        return leftValue.toLowerCase().endsWith(rightValue.toLowerCase());
      case "notEndsWith":
        return !leftValue.endsWith(rightValue);
      case "notEndsWithIgnoreCase":
        return !leftValue.toLowerCase().endsWith(rightValue.toLowerCase());
      case "lessThan":
        return Number.parseFloat(leftValue) < Number.parseFloat(rightValue);
      case "lessThanOrEquals":
        return Number.parseFloat(leftValue) <= Number.parseFloat(rightValue);
      case "greaterThan":
        return Number.parseFloat(leftValue) > Number.parseFloat(rightValue);
      case "greaterThanOrEquals":
        return Number.parseFloat(leftValue) >= Number.parseFloat(rightValue);
      case "isRegexMatch": {
        try {
          const result = new RegExp(rightValue, "g").exec(leftValue);
          return result !== null && result.length > 0;
        } catch {
          return false;
        }
      }
      case "isRegexMatchIgnoreCase": {
        try {
          const result = new RegExp(rightValue, "gi").exec(leftValue);
          return result !== null && result.length > 0;
        } catch {
          return false;
        }
      }
      case "notRegexMatch": {
        try {
          const result = new RegExp(rightValue, "g").exec(leftValue);
          return !(result !== null && result.length > 0);
        } catch {
          return false;
        }
      }
      case "notRegexMatchIgnoreCase": {
        try {
          const result = new RegExp(rightValue, "gi").exec(leftValue);
          return !(result !== null && result.length > 0);
        } catch {
          return false;
        }
      }
      default:
        return false;
    }
  }
}
