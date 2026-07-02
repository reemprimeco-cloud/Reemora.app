const BASE_URL = process.env.MYFATOORAH_BASE_URL || "https://apitest.myfatoorah.com";

interface SendPaymentParams {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  amount: number;
  currency: string;
  reference: string;
  itemName: string;
  callbackUrl: string;
  errorUrl: string;
}

export async function createMyFatoorahPayment(params: SendPaymentParams) {
  const apiKey = process.env.MYFATOORAH_API_KEY;
  if (!apiKey) {
    throw new Error(
      "MyFatoorah is not configured. Set MYFATOORAH_API_KEY in your deployment environment variables."
    );
  }

  const response = await fetch(`${BASE_URL}/v2/SendPayment`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      CustomerName: params.customerName,
      CustomerEmail: params.customerEmail,
      CustomerMobile: params.customerPhone,
      InvoiceValue: params.amount,
      DisplayCurrencyIso: params.currency,
      Language: "en",
      CustomerReference: params.reference,
      InvoiceItems: [{ ItemName: params.itemName, Quantity: 1, UnitPrice: params.amount }],
      CallBackUrl: params.callbackUrl,
      ErrorUrl: params.errorUrl,
    }),
  });

  const data = await response.json();

  if (!response.ok || !data.IsSuccess) {
    throw new Error(data?.Message || "MyFatoorah rejected the payment request");
  }

  return {
    invoiceUrl: data.Data.InvoiceURL as string,
    invoiceId: data.Data.InvoiceId as number,
  };
}

export async function getMyFatoorahPaymentStatus(key: string, keyType: "PaymentId" | "InvoiceId" = "PaymentId") {
  const apiKey = process.env.MYFATOORAH_API_KEY;
  if (!apiKey) throw new Error("MyFatoorah is not configured.");

  const response = await fetch(`${BASE_URL}/v2/GetPaymentStatus`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ Key: key, KeyType: keyType }),
  });

  const data = await response.json();
  if (!response.ok || !data.IsSuccess) {
    throw new Error(data?.Message || "Unable to fetch MyFatoorah payment status");
  }
  return data.Data;
}
