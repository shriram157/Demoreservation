# Mock Role Mappings

In the typical multi-target application development workflow, a developer would develop and test their SAPUI5 front-end application in SAP Web IDE Full Stack, which runs in an SCP Neo subaccount. Since the Node.js backend must be deployed to an SCP CF subaccount, the shared backend application instanced in the SCP CF development subaccount is used. The connection is done through a destination configured in SCP Neo and referenced in `neo-app.json`, via the OAuth 2.0 SAML Bearer Assertion flow to authenticate.

However, the limitation with this type of authentication is that the authenticated user, which is also the authenticated SCP Neo user, would be missing all the SAML attributes and scopes in its JWT that the Node.js backend application expects to work properly. To support this scenario, we need to fake/mock the missing data so that the authenticated user can pretend of be of a certain role (e.g. a dealer user). This is done by enhancing the existing User Details API with support for the so-called mock user mode.

## Configuration Syntax

The configuration file `mock-role-mappings.json`, which is located at the root of the Node.js backend applciation root, defines the supported mock roles and their attributes and scopes that would be added to the authenticated user details.

To describe the syntax, refer to the sample configuration below for reference:

```
{
  "mockRoles": [
    {
      "name": "Mock_TCI_Admin",
      "mockData": {
        "name": "TCI_Admin",
        "attributes": {
          "Email": "${userInfo.email}",
          "FirstName": "${userInfo.givenName}",
          "Language": "English",
          "LastName": "${userInfo.familyName}",
          "UserType": "National"
        },
        "scopes": [
          "$XSAPPNAME.Approve_Reservations",
          "$XSAPPNAME.Manage_Reservations"
        ]
      }
    },
    {
      "name": "Mock_TCI_User",
      "mockData": {
        "name": "TCI_User",
        "attributes": {
          "Email": "${userInfo.email}",
          "FirstName": "${userInfo.givenName}",
          "Language": "English",
          "LastName": "${userInfo.familyName}",
          "UserType": "National"
        },
        "scopes": ["$XSAPPNAME.Manage_Reservations"]
      }
    }
  ]
}
```

### `mockRoles`

An array that contains the mock role definitions, each of which contains the following properties:

| Name       | Description                                                                  | Type   | Required | Default Value |
| ---------- | ---------------------------------------------------------------------------- | ------ | -------- | ------------- |
| `name`     | The name of the mock role; Used in the `MOCK_ROLE_NAME` environment variable | String | Yes      | -             |
| `mockData` | The mock data definition - see below                                         | Object | Yes      | -             |

### `mockData`

An object that contains the mock role data definition, each of which contains the following properties:

| Name         | Description                                                                                                                                                             | Type   | Required | Default Value |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | -------- | ------------- |
| `name`       | The name of the role; It should match the role template name in `xs-security.json`                                                                                      | String | Yes      | -             |
| `attributes` | An object that contains key-value pairs of attributes for this role; The attributes should match the mappings for the corresponding role template in `xs-security.json` | Object | Yes      | -             |
| `scopes`     | An array that contains the scopes for this role; The scopes should match the mappings for the corresponding role template in `xs-security.json`                         | Array  | Yes      | -             |

For the attribute values, you can use certain information in the authenticated user data with the `${userInfo.*}` syntax. Currently, `userInfo.email`, `userInfo.givenName`, and `userInfo.familyName` are supported to map the e-mail, first name, and last name of the authenticated SCP Neo user.

## Enabling Mock User Mode

To enable mock user mode, you must define the following environment variables in the MTA extension descriptor file for the development org/space:

- `MOCK_USER_MODE` - set to `true`
- `MOCK_USER_ORIGIN` - set to local service provider name from the SCP Neo trust configuaration. For sustainment development environment.
- `MOCK_ROLE_NAME` - set to the name of the mock role defined in `mock-role-mappings.json`. Refer to configuration below for details.

For security reasons, this should only be enabled for the development instances.
