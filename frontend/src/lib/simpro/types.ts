export interface SimproJob {
  ID: number;
  Name: string;
  Description: string;
  Status: {
    ID: number;
    Name: string;
  };
  Customer: {
    ID: number;
    Name: string;
  };
  Site: {
    ID: number;
    Name: string;
  };
  Total: {
    ExTax: number;
    IncTax: number;
  };
  DateModified: string;
}

export interface SimproCustomer {
  ID: number;
  Name: string;
  Email: string;
  Phone: string;
  AltPhone: string;
  Address: {
    Address: string;
    City: string;
    State: string;
    Postcode: string;
    Country: string;
  };
}

export interface SimproToken {
  access_token: string;
  refresh_token: string;
  expires_at: string;
}
