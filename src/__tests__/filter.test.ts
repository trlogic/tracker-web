import { FilterCalculator, type Filter, type FilterOperator } from "src/utils/filter";
import { describe, expect, it } from "vitest";

describe("FilterCalculator", () => {
  const createFilter = (operator: FilterOperator, right: string): Filter => ({
    left: "testVar",
    operator,
    right,
  });

  const variables = {
    testVar:   "Hello World",
    numberVar: "42",
    emptyVar:  "",
  };

  describe("equality operators", () => {
    it("isEquals - exact match", () => {
      const filter = createFilter("isEquals", "Hello World");
      expect(FilterCalculator.calculate(filter, variables)).toBe(true);
    });

    it("isEquals - no match", () => {
      const filter = createFilter("isEquals", "hello world");
      expect(FilterCalculator.calculate(filter, variables)).toBe(false);
    });

    it("isEqualsIgnoreCase - case insensitive match", () => {
      const filter = createFilter("isEqualsIgnoreCase", "hello world");
      expect(FilterCalculator.calculate(filter, variables)).toBe(true);
    });

    it("notEquals - different values", () => {
      const filter = createFilter("notEquals", "Different");
      expect(FilterCalculator.calculate(filter, variables)).toBe(true);
    });

    it("notEqualsIgnoreCase - case insensitive different values", () => {
      const filter = createFilter("notEqualsIgnoreCase", "different");
      expect(FilterCalculator.calculate(filter, variables)).toBe(true);
    });
  });

  describe("contains operators", () => {
    it("isContains - substring found", () => {
      const filter = createFilter("isContains", "World");
      expect(FilterCalculator.calculate(filter, variables)).toBe(true);
    });

    it("isContains - substring not found", () => {
      const filter = createFilter("isContains", "xyz");
      expect(FilterCalculator.calculate(filter, variables)).toBe(false);
    });

    it("isContainsIgnoreCase - case insensitive substring", () => {
      const filter = createFilter("isContainsIgnoreCase", "world");
      expect(FilterCalculator.calculate(filter, variables)).toBe(true);
    });

    it("notContains - substring not found", () => {
      const filter = createFilter("notContains", "xyz");
      expect(FilterCalculator.calculate(filter, variables)).toBe(true);
    });

    it("notContainsIgnoreCase - case insensitive substring not found", () => {
      const filter = createFilter("notContainsIgnoreCase", "xyz");
      expect(FilterCalculator.calculate(filter, variables)).toBe(true);
    });
  });

  describe("startsWith operators", () => {
    it("isStartsWith - starts with string", () => {
      const filter = createFilter("isStartsWith", "Hello");
      expect(FilterCalculator.calculate(filter, variables)).toBe(true);
    });

    it("isStartsWith - does not start with string", () => {
      const filter = createFilter("isStartsWith", "World");
      expect(FilterCalculator.calculate(filter, variables)).toBe(false);
    });

    it("isStartsWithIgnoreCase - case insensitive starts with", () => {
      const filter = createFilter("isStartsWithIgnoreCase", "hello");
      expect(FilterCalculator.calculate(filter, variables)).toBe(true);
    });

    it("notStartsWith - does not start with string", () => {
      const filter = createFilter("notStartsWith", "World");
      expect(FilterCalculator.calculate(filter, variables)).toBe(true);
    });

    it("notStartsWithIgnoreCase - case insensitive does not start with", () => {
      const filter = createFilter("notStartsWithIgnoreCase", "world");
      expect(FilterCalculator.calculate(filter, variables)).toBe(true);
    });
  });

  describe("endsWith operators", () => {
    it("isEndsWith - ends with string", () => {
      const filter = createFilter("isEndsWith", "World");
      expect(FilterCalculator.calculate(filter, variables)).toBe(true);
    });

    it("isEndsWith - does not end with string", () => {
      const filter = createFilter("isEndsWith", "Hello");
      expect(FilterCalculator.calculate(filter, variables)).toBe(false);
    });

    it("isEndsWithIgnoreCase - case insensitive ends with", () => {
      const filter = createFilter("isEndsWithIgnoreCase", "world");
      expect(FilterCalculator.calculate(filter, variables)).toBe(true);
    });

    it("notEndsWith - does not end with string", () => {
      const filter = createFilter("notEndsWith", "Hello");
      expect(FilterCalculator.calculate(filter, variables)).toBe(true);
    });

    it("notEndsWithIgnoreCase - case insensitive does not end with", () => {
      const filter = createFilter("notEndsWithIgnoreCase", "hello");
      expect(FilterCalculator.calculate(filter, variables)).toBe(true);
    });
  });

  describe("numeric operators", () => {
    it("lessThan - number comparison", () => {
      const filter: Filter = { left: "numberVar", operator: "lessThan", right: "50" };
      expect(FilterCalculator.calculate(filter, variables)).toBe(true);
    });

    it("lessThanOrEquals - number comparison", () => {
      const filter: Filter = { left: "numberVar", operator: "lessThanOrEquals", right: "42" };
      expect(FilterCalculator.calculate(filter, variables)).toBe(true);
    });

    it("greaterThan - number comparison", () => {
      const filter: Filter = { left: "numberVar", operator: "greaterThan", right: "30" };
      expect(FilterCalculator.calculate(filter, variables)).toBe(true);
    });

    it("greaterThanOrEquals - number comparison", () => {
      const filter: Filter = { left: "numberVar", operator: "greaterThanOrEquals", right: "42" };
      expect(FilterCalculator.calculate(filter, variables)).toBe(true);
    });

    it("handles invalid numbers gracefully", () => {
      const filter = createFilter("lessThan", "not-a-number");
      const result = FilterCalculator.calculate(filter, variables);
      expect(typeof result).toBe("boolean"); // Should not throw
    });
  });

  describe("regex operators", () => {
    it("isRegexMatch - pattern matches", () => {
      const filter = createFilter("isRegexMatch", "H.llo");
      expect(FilterCalculator.calculate(filter, variables)).toBe(true);
    });

    it("isRegexMatch - pattern does not match", () => {
      const filter = createFilter("isRegexMatch", "^World");
      expect(FilterCalculator.calculate(filter, variables)).toBe(false);
    });

    it("isRegexMatchIgnoreCase - case insensitive pattern", () => {
      const filter = createFilter("isRegexMatchIgnoreCase", "h.llo");
      expect(FilterCalculator.calculate(filter, variables)).toBe(true);
    });

    it("notRegexMatch - pattern does not match", () => {
      const filter = createFilter("notRegexMatch", "^World");
      expect(FilterCalculator.calculate(filter, variables)).toBe(true);
    });

    it("notRegexMatchIgnoreCase - case insensitive pattern does not match", () => {
      const filter = createFilter("notRegexMatchIgnoreCase", "^world");
      expect(FilterCalculator.calculate(filter, variables)).toBe(true);
    });

    it("handles invalid regex gracefully", () => {
      const filter = createFilter("isRegexMatch", "[invalid");
      // Should handle regex errors gracefully
      expect(() => FilterCalculator.calculate(filter, variables)).not.toThrow();
    });
  });

  describe("edge cases", () => {
    it("handles missing variables", () => {
      const filter: Filter = { left: "nonExistentVar", operator: "isEquals", right: "" };
      expect(FilterCalculator.calculate(filter, variables)).toBe(true);
    });

    it("handles empty string values", () => {
      const filter: Filter = { left: "emptyVar", operator: "isEquals", right: "" };
      expect(FilterCalculator.calculate(filter, variables)).toBe(true);
    });

    it("handles non-string variable values", () => {
      const variablesWithNumber = { testVar: 123 };
      const filter = createFilter("isEquals", "123");
      expect(FilterCalculator.calculate(filter, variablesWithNumber)).toBe(true);
    });

    it("returns false for unknown operators", () => {
      const filter: Filter = {
        left:     "testVar",
        operator: "unknownOperator" as FilterOperator,
        right:    "test",
      };
      expect(FilterCalculator.calculate(filter, variables)).toBe(false);
    });
  });
});
