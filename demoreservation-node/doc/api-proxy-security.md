# API Proxy Security

In the original design, a consolidated app accesses backend S4/HANA data using a shared ABAP user via SAP API Management (APIM) as a proxy. The drawback of this design is that the shared ABAP user have accesss to virtually all OData services and it would not have any app user context, thus relying on the app running on SCP to properly handle authentication and authorization. We have seen in some apps that users might be able to fetch data by making GET calls from the browser simply by changing parameters in the OData request URL (filters, IDs, etc.) thus reducing security.

What we need is a proxy layer that can handle authentication and authorization at the user context level, before the proxied OData requests are made. This would require valdiation of roles, OData request URL parameters, request body, and perhaps even response body. Given that APIM is a generic API proxy, it is not equipped with the ability to parse JWT and restrict access based on the user attributes and scopes.

The better approach is to enhance the API proxy layer of the Node.js backend application with ability to perform various request and response validations. This document provides details on the new Secured API Proxy layer and how to configure it.

## Configuration Syntax

The configuration file `api-proxy-security.json`, which is located at the root of the Node.js backend applciation root, defines the validations performed on the requests made to the Secured API Proxy layer before proxying.

When validation fails, the Secured API Proxy layer will return a 400 bad request response with a message on the validation error in the body.

To describe the syntax, refer to the sample configuration below for reference:

```
{
  "allowNoMatch": false,
  "services": [
    {
      "name": "Z_VEHICLE_DEMO_RESERVATION_SRV_02",
      "allowNoMatch": true,
      "resources": [
        {
          "path": "^reservationListSet(/\\$count)?(\\?.+)?$",
          "methods": ["GET"],
          "validations": [
            {
              "appliesToRoles": ["TCI_User"],
              "mode": "filterParam",
              "name": "Email",
              "value": "${userAttributes.Email}"
            }
          ]
        },
        {
          "path": "^VehicleDetailSet\\((.+)\\)(\\?.+)?$",
          "methods": ["GET"],
          "validations": [
            {
              "appliesToRoles": ["TCI_User"],
              "mode": "namedAndUnnamedParam",
              "regExpGroup": 1,
              "name": "Email",
              "value": "'${userAttributes.Email}'",
              "caseSensitive": false
            }
          ]
        }
      ]
    }
  ]
}

```

The root of the configuration JSON object has the following properties:

| Name           | Description                                                                               | Type    | Required | Default Value |
| -------------- | ----------------------------------------------------------------------------------------- | ------- | -------- | ------------- |
| `allowNoMatch` | Whether a bad request error is returned if the request does not match any service defined | Boolean | No       | `false`       |
| `services`     | An array containing the list of services and resources for validation                     | Array   | No       | []            |

### `services`

The `services` array contains a list of objects that describe the service and the validations to be performed, each of which contains the following properties:

| Name           | Description                                                                                                  | Type    | Required | Default Value |
| -------------- | ------------------------------------------------------------------------------------------------------------ | ------- | -------- | ------------- |
| `name`         | The name of the service, which is matched against URL                                                        | String  | Yes      | -             |
| `allowNoMatch` | Whether a bad request error is returned if the request does not match any resources defined for this service | Boolean | No       | `false`       |
| `resources`    | An array containing the list of resources for validation                                                     | Array   | No       | []            |

For any defined services, `$metdata` calls will be allowed even if it is not defined as a resource. `$batch` calls will also be allowed, however the parts and changesets will be subjected to the validations as defined in the specified resources.

### `resources`

The `resources` array contains a list of objects that describe the resource and the validations to be performed, each of which contains the following properties:

| Name          | Description                                                                                                                                                                                             | Type   | Required | Default Value |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | -------- | ------------- |
| `path`        | A regular expression to match this resource against the URL; Match groups within the regular expression are used by some validation modes, such as `namedAndUnnamedParam`                               | String | Yes      | -             |
| `methods`     | An array containing the list of HTTP methods (eg. GET, POST, etc.) that applies to this resource for validation                                                                                         | Array  | No       | All methods   |
| `validations` | An array containing the list of validations to be applied to this matched resource; If empty, no additional validations are applied other than making source that there is a service and resource match | Array  | No       | []            |

### `validations`

The `validations` array contains a list of objects that defines the validation rules, each of which contains the following properties:

| Name             | Description                                                                                                                        | Type   | Required | Default Value |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------ | -------- | ------------- |
| `appliesToRoles` | An array containing the list of roles, defined in `role-mappings.json`, that this validation rule applies to                       | Array  | No       | All roles     |
| `mode`           | The name of the validation rule; Refer to the next section for the supported modes and the additional properties that are required | String | Yes      | -             |

### Supported validation modes

The following list contains the supported validation modes and their mode-specific properties for the validation object:

##### `filterParam`

The `filterParam` validation mode validates that an OData `$filter` query parameter contains an `eq` clause that a field has a given value. For exmaple, the following validation checks that the OData request filters for objects with the `Email` field matching the e-mail address of the current user (see replacement variables):

```
{
  "appliesToRoles": ["TCI_User"],
  "mode": "filterParam",
  "name": "Email",
  "value": "${userAttributes.Email}"
}
```

The following properties apply to this validation mode:

| Name    | Description                  | Type   | Required | Default Value |
| ------- | ---------------------------- | ------ | -------- | ------------- |
| `name`  | The field name               | String | Yes      | -             |
| `value` | The field value to check for | String | Yes      | -             |

#### `namedAndUnnamedParam`

The `namedAndUnnamedParam` validation mode validates that the key predicate of the OData resource path in the URL has a given key-value pair (or just the given value, if the single key is implied). For example, the following validation checks that the OData request is accessing a resource that contains the key `Email` matching the e-mail address of the current user (see replacement variables):

```
{
  "appliesToRoles": ["TCI_User"],
  "mode": "namedAndUnnamedParam",
  "regExpGroup": 1,
  "name": "Email",
  "value": "'${userAttributes.Email}'",
  "caseSensitive": false
}
```

The following properties apply to this validation mode:

| Name            | Description                                                                            | Type    | Required | Default Value |
| --------------- | -------------------------------------------------------------------------------------- | ------- | -------- | ------------- |
| `regExpGroup`   | The group number of the regular expression match group in the resource `path` property | Integer | Yes      | -             |
| `name`          | The key name                                                                           | String  | Yes      | -             |
| `value`         | The key value to check for                                                             | String  | Yes      | -             |
| `caseSensitive` | Whether the value match should be case-sensitive                                       | Boolean | No       | `true`        |

#### `jsonBody`

The `jsonBody` validate mode validates that the request body, which must be in JSON format as specified by `Content-Type`, must match the given [JsonPath](https://www.npmjs.com/package/jsonpath-plus). For exmaple, the following validation checks that the OData request body (for example, for a create request) contains the `Email` field matching the e-mail address of the current user (see replacement variables):

```
{
  "appliesToRoles": ["TCI_User"],
  "mode": "jsonBody",
  "jsonPath": "$[?(@.Email = '${userAttributes.Email}')]"
}
```

The following properties apply to this validation mode:

| Name       | Description           | Type   | Required | Default Value |
| ---------- | --------------------- | ------ | -------- | ------------- |
| `jsonPath` | The JsonPath to match | String | Yes      | -             |

#### `resJsonBody`

Where as all other validation modes apply to request, the `resJsonBody` validation mode validates that the response body, which must be in JSON format as specified by `Content-Type` (which also means that response from \$batch requests are not supported), must match the given [JsonPath](https://www.npmjs.com/package/jsonpath-plus). The format is essentially to the as the `jsonBody` validatyion mode, with the following properties:

| Name       | Description           | Type   | Required | Default Value |
| ---------- | --------------------- | ------ | -------- | ------------- |
| `jsonPath` | The JsonPath to match | String | Yes      | -             |

## Replacement variables

The `value` property in the validation objects can have replacement variables that are replaced with SAML attribute values or user data during runtime. SAML attributes can be replaced with the `${userAttributes.*}` syntax, where `*` can be any SAML attributes that are defined in the XSUAA configuration. User data can be replaced with the `${userInfo.*}` syntax. Currently, `userInfo.email`, `userInfo.givenName`, and `userInfo.familyName` are supported to map the e-mail, first name, and last name.
