export const fieldAliases: Record<string, string[]> = {
  // Name fields — avoid generic "name" (matches company_name via fuzzy)
  name:             ["firstname", "first_name", "given_name", "forename"],
  surname:          ["lastName", "last_name", "surname", "family_name"],
  title:            ["title", "salutation", "prefix"],

  // Contact — mobile
  email:            ["emailaddress", "email_address", "email", "emailAddress"],
  mobile:           ["mobile", "mobileNumber", "mobile_number", "cell",
                     "phonenumber", "phone_number", "phone"],
  landline:         ["landline", "land_line", "telephone",
                     "web_mail_company_phone_number"],

  // Address fields
  address_line_1:   ["address_line_1", "addressLine1", "address1",
                     "whereIsCurrentBoiler", "bestDescribeYourHome",
                     "address", "street"],
  address_line_2:   ["address_line_2", "addressLine2", "address2"],
  address_line_3:   ["address_line_3", "addressLine3", "address3"],
  town:             ["town", "city"],
  county:           ["county", "region", "state"],
  postcode:         ["postcode", "post_code", "postalCode", "postal_code"],
  country_code:     ["country", "countryCode", "country_code"],

  // Company fields
  company_name:     ["web_mail_company_name", "companyName", "company_name", "company"],
  company_landline: ["web_mail_company_phone_number", "companyLandline",
                     "company_landline", "companyPhone"],
  company_email:    ["web_mail_company_email", "companyEmail", "company_email"],

  // Type fields
  customer_type:    ["customerType", "customer_type", "type",
                     "bestDescribeYourHome", "typeOfBoiler"],

  // Mail "to" — explicit keys only (no fuzzy garbage like boolean "yes")
  to:               ["emailaddress", "email", "email_address", "to_email"],
};
