import { IamRole } from "@cdktf/provider-aws/lib/iam-role";
import { IamRolePolicyAttachment } from "@cdktf/provider-aws/lib/iam-role-policy-attachment";
import { LambdaFunction } from "@cdktf/provider-aws/lib/lambda-function";
import { TerraformAsset, AssetType } from "cdktf";
import { Construct } from "constructs";
import { Settings } from "../../settings";

interface LambdaProps {
  functionLocation: string;
}

export class Lambda extends Construct {
  fn: LambdaFunction;
  role: IamRole | undefined;
  constructor(
    scope: Construct,
    name: string,
    settings: Settings,
    props: LambdaProps
  ) {
    super(scope, name);

    // Creating IAM Role
    this.role = new IamRole(this, "lambdarole", {
      assumeRolePolicy: JSON.stringify({
        Version: `2012-10-17`,
        Statement: [
          {
            Action: ["sts:AssumeRole"],
            Principal: {
              Service: [`lambda.amazonaws.com`, `apigateway.amazonaws.com`],
            },
            Effect: "Allow",
            Sid: "",
          },
        ],
      }),
    });

    // Creates IAM Role Policy Attachments
    new IamRolePolicyAttachment(this, "lambda-managed-policy", {
      policyArn:
        "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
      role: this.role.name,
    });

    // Demo support to showcase more ways to add policys
    // new IamRolePolicyAttachment(this, "rds-policy", {
    //   policyArn: "arn:aws:iam::aws:policy/AmazonRDSDataFullAccess",
    //   role: this.role.name,
    // });

    // new IamRolePolicyAttachment(this, "secerts-manager-policy", {
    //   policyArn: "arn:aws:iam::aws:policy/SecretsManagerReadWrite",
    //   role: this.role.name,
    // });

    // new IamRolePolicyAttachment(this, "vpc-access", {
    //   policyArn:
    //     "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole",
    //   role: this.role.name,
    // });

    // new IamRolePolicyAttachment(this, "ses-email-policy", {
    //   policyArn: "arn:aws:iam::aws:policy/AmazonSESFullAccess",
    //   role: this.role.name,
    // });

    const asset = new TerraformAsset(this, `${name}-lambda-asset`, {
      path: props.functionLocation,
      type: AssetType.ARCHIVE,
    });

    // Create Lambda
    this.fn = new LambdaFunction(this, `lambda-deployment-${name}`, {
      functionName: `${settings.name}-${settings.environment}-lambda`,
      handler: "index.handler",
      runtime: `nodejs16.x`,
      role: this.role.arn.toString(),
      timeout: 15,
      memorySize: 128,
      sourceCodeHash: asset.assetHash,
      filename: asset.path,
    });
  }
}
