interface TransactionSubmitRequest {
  name:      string;
  key:       string;
  variables: Record<string, unknown>;
}

export default TransactionSubmitRequest;
