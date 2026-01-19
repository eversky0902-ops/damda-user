declare global {
  interface Window {
    AUTHNICE: {
      requestPay: (options: NicePayRequestOptions) => void;
    };
  }
}

export interface NicePayRequestOptions {
  clientId: string;
  method: "card" | "bank" | "vbank" | "cellphone";
  orderId: string;
  amount: number;
  goodsName: string;
  returnUrl: string;
  fnError: (result: NicePayErrorResult) => void;
}

export interface NicePayErrorResult {
  errorCode: string;
  errorMsg: string;
}

export interface NicePaySuccessResult {
  authResultCode: string;
  authResultMsg: string;
  tid: string;
  clientId: string;
  orderId: string;
  amount: number;
  mallReserved: string;
  authToken: string;
  signature: string;
}

export {};
