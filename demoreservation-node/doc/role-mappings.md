# Role Mappings

The User Details API in the Node.js backend application provides a `currentScopesForUser` service that returns the role that the authenticated user belongs to, based on its SAML attributes (e.g. whether it is a dealer or TCI user) and scopes. In some sense, this service is reverse-engineering the user attributes and scopes back into the role templates that are defined in `xs-security.json`. The response of this service is then used by the SAPUI5 front-end code to control role-specific functionality.

In the past, the mapping information is hardcoded in the Node.js route logic. To make it more configurable, we have ported the definition into a JSON configuration file instead. This configuration is also used by the new secured API proxy layer.

## Configuration Syntax

The configuration file `role-mappings.json`, which is located at the root of the Node.js backend applciation root, defines the roles and the attributes and scopes that must be matched for an authenticated user to be mapped to the role.

To describe the syntax, refer to the sample configuration below for reference:

```
{
  "roles": [
    {
      "name": "TCI_Admin",
      "attributes": {},
      "scopes": [
        "$XSAPPNAME.Approve_Reservations",
        "$XSAPPNAME.Manage_Reservations"
      ]
    },
    {
      "name": "TCI_User",
      "attributes": {
        "UserType": "National"
      },
      "scopes": ["$XSAPPNAME.Manage_Reservations"]
    }
  ]
}
```

### `roles`

An array that contains the role definitions, each of which contains the following properties:

| Name         | Description                                                                                                                                                                                     | Type   | Required | Default Value |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | -------- | ------------- |
| `name`       | The name of the role                                                                                                                                                                            | String | Yes      | -             |
| `attributes` | An object that contains the key-value pairs of SAML attributes and the values that the JWT token must have to be mapped to the role                                                             | Object | Yes      | -             |
| `scopes`     | An array that contains the scopes tha thte jWT token must have exactly to be mapped to the role; The scopes should match the mappings for the corresponding role template in `xs-security.json` | Array  | Yes      | -             |
