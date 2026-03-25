package com.autotally.server.templates;

import lombok.NoArgsConstructor;

@NoArgsConstructor
public class TallyTemplates {

    public static final String GET_COMPANY = """
            <ENVELOPE>
                <HEADER>
                    <VERSION>1</VERSION>
                    <TALLYREQUEST>Export</TALLYREQUEST>
                    <TYPE>Collection</TYPE>
                    <ID>CompanyInfo</ID>
                </HEADER>
                <BODY>
                    <DESC>
                        <STATICVARIABLES />
                        <TDL>
                            <TDLMESSAGE>
                                <OBJECT NAME="CurrentCompany">
                                    <LOCALFORMULA>CurrentCompany:##SVCURRENTCOMPANY</LOCALFORMULA>
                                </OBJECT>
                                <COLLECTION NAME="CompanyInfo">
                                    <OBJECTS>CurrentCompany</OBJECTS>
                                </COLLECTION>
                            </TDLMESSAGE>
                        </TDL>
                    </DESC>
                </BODY>
            </ENVELOPE>
            """;

    public static final String GET_LEDGERS = """
            <ENVELOPE>
                <HEADER>
                    <VERSION>1</VERSION>
                    <TALLYREQUEST>EXPORT</TALLYREQUEST>
                    <TYPE>COLLECTION</TYPE>
                    <ID>LedgerGSTINList</ID>
                </HEADER>
                <BODY>
                    <DESC>
                        <STATICVARIABLES>
                            <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
                        </STATICVARIABLES>
                        <TDL>
                            <TDLMESSAGE>
                                <COLLECTION NAME="LedgerGSTINList" ISMODIFY="No">
                                    <TYPE>Ledger</TYPE>
                                    <NATIVEMETHOD>Name</NATIVEMETHOD>
                                    <NATIVEMETHOD>PartyGSTIN</NATIVEMETHOD>
                                    <NATIVEMETHOD>Parent</NATIVEMETHOD>
                                </COLLECTION>
                            </TDLMESSAGE>
                        </TDL>
                    </DESC>
                </BODY>
            </ENVELOPE>
            """;

//    public static final String CREATE_LEDGER_OUTER = """
//            <ENVELOPE>
//                  <HEADER>
//                    <TALLYREQUEST>Import Data</TALLYREQUEST>
//                  </HEADER>
//                  <BODY>
//                    <IMPORTDATA>
//                      <REQUESTDESC>
//                        <REPORTNAME>All Masters</REPORTNAME>
//                      </REQUESTDESC>
//                      <REQUESTDATA>
//                      VAR_BODY
//                      </REQUESTDATA>
//                    </IMPORTDATA>
//                  </BODY>
//            </ENVELOPE>
//            """;
//
//    public static final String CREATE_LEDGER_INNER = """
//            <TALLYMESSAGE>
//                  <LEDGER NAME="VAR_NAME" ACTION="Create">
//                    <NAME>VAR_NAME</NAME>
//                    <PARENT>VAR_PARENT</PARENT>
//                    <ISBILLWISEON>Yes</ISBILLWISEON>
//                    <ADDRESS.LIST>
//                      <ADDRESS>VAR_ADDRESS</ADDRESS>
//                    </ADDRESS.LIST>
//                    <STATENAME>VAR_STATE</STATENAME>
//                    <COUNTRYNAME>VAR_COUNTRY</COUNTRYNAME>
//                    <GSTREGISTRATIONTYPE>VAR_REG_TYPE</GSTREGISTRATIONTYPE>
//                    <PARTYGSTIN>VAR_GSTIN</PARTYGSTIN>
//                  </LEDGER>
//                </TALLYMESSAGE>
//            """;

    public static final String CREATE_VOUCHER_OUTER = """
            <ENVELOPE>
            <HEADER>
                <TALLYREQUEST>Import Data</TALLYREQUEST>
            </HEADER>
            <BODY>
                <IMPORTDATA>
                    <REQUESTDESC>
                        <REPORTNAME>Vouchers</REPORTNAME>
                        <STATICVARIABLES>
                            <SVCURRENTCOMPANY>VAR_COMPANY_NAME</SVCURRENTCOMPANY>
                        </STATICVARIABLES>
                    </REQUESTDESC>
                    <REQUESTDATA>
                        VAR_BODY
                    </REQUESTDATA>
                </IMPORTDATA>
            </BODY>
            </ENVELOPE>
            """;

    public static final String CREATE_VOUCHER_INNER = """
            <TALLYMESSAGE xmlns:UDF="TallyUDF">
                <VOUCHER VCHTYPE="VAR_INVOICE_TYPE" ACTION="Create" OBJVIEW="Accounting Voucher View">
                    <DATE>VAR_DATE</DATE>
                    <VOUCHERTYPENAME>VAR_INVOICE_TYPE</VOUCHERTYPENAME>
                    <VOUCHERNUMBER>VAR_INV_NUM</VOUCHERNUMBER>
                    <PERSISTEDVIEW>Accounting Voucher View</PERSISTEDVIEW>
                    <ISINVOICE>No</ISINVOICE>

                    VAR_LEDGER_ENTRIES
                </VOUCHER>
            </TALLYMESSAGE>
            """;

    public static final String LEDGER_ENTRY = """
            <ALLLEDGERENTRIES.LIST>
                <LEDGERNAME>VAR_LEDGER_NAME</LEDGERNAME>
                <ISDEEMEDPOSITIVE>VAR_DEEMED_POS</ISDEEMEDPOSITIVE>
                <AMOUNT>VAR_AMOUNT</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            """;
}
