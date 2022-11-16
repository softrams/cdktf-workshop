// Copyright (c) HashiCorp, Inc
// SPDX-License-Identifier: MPL-2.0
import { Construct } from "constructs";
import { App, S3Backend, TerraformStack } from "cdktf";
import { AwsProvider } from "@cdktf/provider-aws/lib/provider";
import * as path from "path";
import { UIDeployment } from "./workshop/static-site";
import { Lambda } from "./workshop/lambda-function";
import { ApiGateway } from "./workshop/api-gateway";
import { Settings } from "./settings";

export class CDKTFWorkShop extends TerraformStack {
  constructor(scope: Construct, id: string, settings: Settings) {
    super(scope, id);

    new AwsProvider(this, "provider", {
      region: settings.region,
    });

    // Setups S3 Backend Tracking of Deployments
    new S3Backend(this, {
      bucket: "cdktf-workshop-tfstate",
      key: `${settings.environment}/terraform.${settings.environment}.tfstate`,
      region: settings.region,
    });

    // Step One of Workshop setup UI Deployment
    new UIDeployment(this, `ui-deployment-${settings.environment}`, settings);

    // Step Two of Workshop - Setup NodeJS Lambda
    const { fn } = new Lambda(
      this,
      `lambda-deployment-main-${settings.name}`,
      settings,
      {
        functionLocation: path.resolve(__dirname, "../functions/mainfunc"),
      }
    );

    // Step Three of Workshop - Setup API Gateway
    new ApiGateway(this, "workshop-api", settings, {
      lambda: fn,
      public_path: "public",
    });
  }
}

const app = new App();
// Multi Envrionment Support
new CDKTFWorkShop(app, "dev", {
  name: "cdktfworkshop-dev",
  environment: "dev",
  region: "us-east-1",
  uiDeployment: true,
  uiBucketName: "workshop-dev.softrams.cloud",
  lambdaBucketName: "workshop-dev-lambda",
  setupDomain: false,
  domainZoneId: "",
  ACMCertificateArn: "",
});

new CDKTFWorkShop(app, "test", {
  name: "cdktfworkshop-test",
  environment: "test",
  region: "us-east-1",
  uiDeployment: true,
  uiBucketName: "workshop-test.softrams.cloud",
  lambdaBucketName: "workshop-test-lambda",
  setupDomain: false,
  domainZoneId: "",
  ACMCertificateArn: "",
});

new CDKTFWorkShop(app, "demo", {
  name: "cdktfworkshop-demo",
  environment: "demo", // Our Environment name, this tells us which stage to deploy and name
  region: "us-east-1",
  uiDeployment: true, // Let's us check in code if we need to deploy the UI or not
  uiBucketName: "workshop-demo.softrams.cloud", // If we are deploying the UI we need a bucketname for it.
  lambdaBucketName: "workshop-demo-lambda", // Setups our lambda bucket to store our zips
  setupDomain: false, // Again checks if a domain needs to be setup or not
  domainZoneId: "", // Setups up domain in correct zone
  ACMCertificateArn: "",
});

app.synth();
