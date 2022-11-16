import { ApiGatewayDeployment } from "@cdktf/provider-aws/lib/api-gateway-deployment";
import { ApiGatewayIntegration } from "@cdktf/provider-aws/lib/api-gateway-integration";
import { ApiGatewayIntegrationResponse } from "@cdktf/provider-aws/lib/api-gateway-integration-response";
import { ApiGatewayMethod } from "@cdktf/provider-aws/lib/api-gateway-method";
import { ApiGatewayMethodResponse } from "@cdktf/provider-aws/lib/api-gateway-method-response";
import { ApiGatewayModel } from "@cdktf/provider-aws/lib/api-gateway-model";
import { ApiGatewayResource } from "@cdktf/provider-aws/lib/api-gateway-resource";
import { ApiGatewayRestApi } from "@cdktf/provider-aws/lib/api-gateway-rest-api";
import { LambdaFunction } from "@cdktf/provider-aws/lib/lambda-function";
import { LambdaPermission } from "@cdktf/provider-aws/lib/lambda-permission";
import { TerraformOutput } from "cdktf";
import { Construct } from "constructs";
import { Settings } from "../../settings";

interface ApiGatewayProps {
  lambda: LambdaFunction;
  public_path: string;
}

export class ApiGateway extends Construct {
  api: ApiGatewayRestApi | undefined;
  constructor(
    scope: Construct,
    name: string,
    settings: Settings,
    props: ApiGatewayProps
  ) {
    super(scope, name);

    this.api = new ApiGatewayRestApi(this, `api-gateway-rest-${name}`, {
      name: `${settings.name}-api-${settings.environment}`,
    });

    // Reponse Models

    new ApiGatewayModel(this, `responseSchema-${name}`, {
      restApiId: this.api.id!,
      name: `ResponseSchema`,
      description: ``,
      contentType: `application/json`,
      schema: JSON.stringify({
        type: "object",
        required: ["response"],
        properties: {
          response: {
            type: "string",
          },
        },
        title: "Response Schema",
      }),
      dependsOn: [this.api],
    });

    // Creating API Resources
    const resource = new ApiGatewayResource(this, `api-resource-${name}`, {
      restApiId: this.api.id,
      parentId: this.api.rootResourceId,
      pathPart: props.public_path,
    });

    const proxyResource = new ApiGatewayResource(
      this,
      `api-proxy-resource-${name}`,
      {
        restApiId: this.api.id,
        parentId: resource.id,
        pathPart: `{proxy+}`,
      }
    );

    const method = new ApiGatewayMethod(this, `api-method-any-${name}`, {
      restApiId: this.api.id,
      resourceId: resource.id,
      httpMethod: "ANY",
      authorization: "NONE",
    });

    const methodAnyProxy = new ApiGatewayMethod(this, `api-proxy-any-${name}`, {
      resourceId: proxyResource.id,
      restApiId: this.api.id,
      httpMethod: "ANY",
      authorization: "NONE",
    });

    const methodOp = new ApiGatewayMethod(this, `api-method-opitions-${name}`, {
      resourceId: resource.id,
      restApiId: this.api.id,
      httpMethod: "OPTIONS",
      authorization: "NONE",
    });

    const methodOpProxy = new ApiGatewayMethod(
      this,
      `api-method-proxy-opitions-${name}`,
      {
        resourceId: proxyResource.id,
        restApiId: this.api.id,
        httpMethod: "OPTIONS",
        authorization: "NONE",
      }
    );

    const proxyIntegration = new ApiGatewayIntegration(
      this,
      `${name}-proxy-integration-changed`,
      {
        httpMethod: methodAnyProxy.httpMethod,
        resourceId: methodAnyProxy.resourceId,
        restApiId: this.api.id,
        type: "AWS_PROXY",
        integrationHttpMethod: "POST",
        uri: props.lambda.invokeArn,
      }
    );

    const Integration = new ApiGatewayIntegration(
      this,
      `${name}-integration-root-changed`,
      {
        restApiId: this.api.id,
        resourceId: method.resourceId,
        httpMethod: method.httpMethod,
        type: "AWS_PROXY",
        integrationHttpMethod: "POST",
        uri: props.lambda.invokeArn,
      }
    );

    new ApiGatewayIntegrationResponse(this, `IntegrationResponse-${name}`, {
      restApiId: this.api.id,
      resourceId: method.resourceId,
      httpMethod: method.httpMethod,
      statusCode: `200`,
      responseTemplates: {
        "application/json": "",
      },
      dependsOn: [proxyIntegration, method, resource],
    });

    new ApiGatewayIntegrationResponse(
      this,
      `IntegrationResponseAnyProxy-${name}`,
      {
        restApiId: this.api.id,
        resourceId: methodAnyProxy.resourceId,
        httpMethod: methodAnyProxy.httpMethod,
        statusCode: `200`,
        responseTemplates: {
          "application/json": "",
        },
        dependsOn: [proxyIntegration, methodAnyProxy, proxyResource],
      }
    );

    new ApiGatewayMethodResponse(this, `api-proxy-any-response-${name}`, {
      restApiId: this.api.id!,
      resourceId: proxyResource.id!,
      httpMethod: "ANY",
      statusCode: "200",
      responseModels: { "application/json": "ResponseSchema" },
    });

    new ApiGatewayMethodResponse(this, `api-any-response-${name}`, {
      restApiId: this.api.id!,
      resourceId: resource.id!,
      httpMethod: "ANY",
      statusCode: "200",
      responseModels: { "application/json": "ResponseSchema" },
      dependsOn: [method],
    });

    new ApiGatewayMethodResponse(this, `options-response-${name}`, {
      restApiId: this.api.id!,
      resourceId: resource.id!,
      httpMethod: methodOp.httpMethod,
      statusCode: "200",
      responseParameters: {
        "method.response.header.Access-Control-Allow-Headers": false,
        "method.response.header.Access-Control-Allow-Methods": false,
        "method.response.header.Access-Control-Allow-Origin": false,
      },
      dependsOn: [methodOp, resource],
    });

    new ApiGatewayMethodResponse(this, `options-proxy-response-${name}`, {
      restApiId: this.api.id!,
      resourceId: proxyResource.id!,
      httpMethod: methodOpProxy.httpMethod,
      statusCode: "200",
      responseParameters: {
        "method.response.header.Access-Control-Allow-Headers": false,
        "method.response.header.Access-Control-Allow-Methods": false,
        "method.response.header.Access-Control-Allow-Origin": false,
      },
      dependsOn: [methodOpProxy, proxyResource],
    });

    new ApiGatewayIntegration(this, `${name}-integration-proxyLamdbaMock`, {
      restApiId: this.api.id,
      resourceId: resource.id!,
      httpMethod: methodOp.httpMethod,
      type: `MOCK`,
      requestTemplates: {
        "application/json": '{"statusCode": 200}',
      },
    });

    new ApiGatewayIntegration(this, `${name}-integration-proxyMock`, {
      restApiId: this.api.id,
      resourceId: proxyResource.id!,
      httpMethod: methodOpProxy.httpMethod,
      type: `MOCK`,
      requestTemplates: {
        "application/json": '{"statusCode": 200}',
      },
    });

    new ApiGatewayIntegrationResponse(
      this,
      `IntegrationResponseOptions-method-proxy-${name}-changed`,
      {
        restApiId: this.api.id!,
        resourceId: proxyResource.id!,
        httpMethod: methodOpProxy.httpMethod,
        statusCode: "200",
        responseParameters: {
          "method.response.header.Access-Control-Allow-Headers": `'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent,Velocity-Cfg-Id,Accept-Language,Access-Control-Allow-Origin'`,
          "method.response.header.Access-Control-Allow-Methods": `'DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT'`,
          "method.response.header.Access-Control-Allow-Origin": `'*'`,
        },
        dependsOn: [
          methodOpProxy,
          proxyResource,
          Integration,
          proxyIntegration,
        ],
      }
    );
    new ApiGatewayIntegrationResponse(
      this,
      `IntegrationResponseLamdba-method-proxy-${name}-changed`,
      {
        restApiId: this.api.id!,
        resourceId: resource.id!,
        httpMethod: methodOpProxy.httpMethod,
        statusCode: "200",
        responseParameters: {
          "method.response.header.Access-Control-Allow-Headers": `'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent,Velocity-Cfg-Id,Accept-Language,Access-Control-Allow-Origin'`,
          "method.response.header.Access-Control-Allow-Methods": `'DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT'`,
          "method.response.header.Access-Control-Allow-Origin": `'*'`,
        },
        responseTemplates: {
          "application/json": "",
        },
        dependsOn: [methodOpProxy, resource, Integration, proxyIntegration],
      }
    );

    const deployment = new ApiGatewayDeployment(this, `${name}-deployment`, {
      restApiId: this.api.id,
      dependsOn: [proxyIntegration, Integration],
      stageName: settings.environment,
    });

    new LambdaPermission(
      this,
      `${settings.name}-apigateway-lambda-permission`,
      {
        action: "lambda:InvokeFunction",
        functionName: props.lambda.functionName,
        principal: "apigateway.amazonaws.com",
        sourceArn: `${this.api.executionArn}/*/*`,
      }
    );

    new TerraformOutput(this, "Backend URL", {
      value: `${deployment.invokeUrl}/public/welcome`,
    });
  }
}
