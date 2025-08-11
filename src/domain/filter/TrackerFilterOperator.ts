enum TrackerFilterOperator {
  IS_EQUALS = "isEquals",
  IS_EQUALS_IGNORE_CASE = "isEqualsIgnoreCase",

  NOT_EQUALS = "notEquals",
  NOT_EQUALS_IGNORE_CASE = "notEqualsIgnoreCase",

  IS_CONTAINS = "isContains",
  IS_CONTAINS_IGNORE_CASE = "isContainsIgnoreCase",

  NOT_CONTAINS = "notContains",
  NOT_CONTAINS_IGNORE_CASE = "notContainsIgnoreCase",

  IS_STARTS_WITH = "isStartsWith",
  IS_STARTS_WITH_IGNORE_CASE = "isStartsWithIgnoreCase",

  NOT_STARTS_WITH = "notStartsWith",
  NOT_STARTS_WITH_IGNORE_CASE = "notStartsWithIgnoreCase",

  IS_ENDS_WITH = "isEndsWith",
  IS_ENDS_WITH_IGNORE_CASE = "isEndsWithIgnoreCase",

  NOT_ENDS_WITH = "notEndsWith",
  NOT_ENDS_WITH_IGNORE_CASE = "notEndsWithIgnoreCase",

  IS_REGEX_MATCH = "isRegexMatch",
  IS_REGEX_MATCH_IGNORE_CASE = "isRegexMatchIgnoreCase",

  NOT_REGEX_MATCH = "notRegexMatch",
  NOT_REGEX_MATCH_IGNORE_CASE = "notRegexMatchIgnoreCase",

  LESS_THAN = "lessThan",
  LESS_THAN_OR_EQUALS = "lessThanOrEquals",
  GREATER_THAN = "greaterThan",
  GREATER_THAN_OR_EQUALS = "greaterThanOrEquals",
}

export default TrackerFilterOperator;
