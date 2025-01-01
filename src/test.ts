import { fetchTransactionDetails, createSwapTransaction, getRugCheckConfirmed, fetchAndSaveSwapDetails, createSellTransaction } from "./transactions";
import { Connection } from "@solana/web3.js";

(async () => {
  const testId = null;
  if (testId) {
    const tx = await fetchTransactionDetails(testId);
    console.log(tx);
  }
})();

(async () => {
  const testId = "Df6yfrKC8kZE3KNkrHERKzAetSxbrWeniQfyJY4Jpump";
  if (testId) {
    const tx = await createSwapTransaction("So11111111111111111111111111111111111111112", testId);
    console.log(tx);
  }
})();

(async () => {
  const testId = null;
  if (testId) {
    const tx = await getRugCheckConfirmed(testId);
    console.log(tx);
  }
})();

(async () => {
  const testId = "3SQXLu2UFTN7mfPqei2aurPwVu7jzvvzNkj7WiwTT25pkHijVozVwYavuurQu1B63V6nWJ4o2dSQuMEPMczmq82q"; //"3SQXLu2UFTN7mfPqei2aurPwVu7jzvvzNkj7WiwTT25pkHijVozVwYavuurQu1B63V6nWJ4o2dSQuMEPMczmq82q";
  if (testId) {
    const tx = await fetchAndSaveSwapDetails(testId);
    console.log(tx);
  }
})();

(async () => {
  const testId = "";
  const testAmount = "7";
  if (testId) {
    // Mock connection and config for testing
    const connection = new Connection("https://api.mainnet-beta.solana.com");
    const config = {}; // assuming config is an empty object, replace with actual config if needed
    const tx = await createSellTransaction("So11111111111111111111111111111111111111112", testId, connection, config, testAmount);
    console.log(tx);
  }
})();
