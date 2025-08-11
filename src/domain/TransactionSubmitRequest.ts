interface TransactionSubmitRequest {
  name: string;
  key: string;
  variables: Record<string, any>;
}

export default TransactionSubmitRequest;
