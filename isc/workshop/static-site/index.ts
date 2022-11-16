import { CloudfrontOriginAccessIdentity } from "@cdktf/provider-aws/lib/cloudfront-origin-access-identity";
import { S3Bucket } from "@cdktf/provider-aws/lib/s3-bucket";
import { S3BucketPolicy } from "@cdktf/provider-aws/lib/s3-bucket-policy";
import { S3BucketWebsiteConfiguration } from "@cdktf/provider-aws/lib/s3-bucket-website-configuration";
import { Construct } from "constructs";
import * as mime from "mime-types";
import * as path from "path";
import * as glob from "glob";
import { Settings } from "../../settings";
import { S3BucketObject } from "@cdktf/provider-aws/lib/s3-bucket-object";
import { CloudfrontDistribution } from "@cdktf/provider-aws/lib/cloudfront-distribution";
import { TerraformOutput } from "cdktf";
import { Route53Record } from "@cdktf/provider-aws/lib/route53-record";

export class UIDeployment extends Construct {
  bucket: S3Bucket | undefined;
  constructor(scope: Construct, name: string, settings: Settings) {
    super(scope, name);
    // Just a check to make this environment needs a UI Deployed
    if (settings.uiDeployment) {
      this.bucket = new S3Bucket(this, "s3-ui-deployment", {
        bucket: settings.uiBucketName,
        acl: "private",
      });

      // Setup Website Configuration
      new S3BucketWebsiteConfiguration(this, "s3-ui-website-config", {
        bucket: this.bucket.bucket,
        indexDocument: {
          suffix: "index.html",
        },
        errorDocument: {
          key: "index.html",
        },
      });

      // Create a CloudfrontOriginAccess
      const cloudfrontOriginAccessIdentity = new CloudfrontOriginAccessIdentity(
        this,
        `origin-access-${name}`,
        {
          comment: `For ${settings.name}`,
        }
      );

      // Creates a S3 Bucket Policy for our Web App
      new S3BucketPolicy(this, "s3-ui-deployment-policy", {
        bucket: this.bucket.id,
        policy: JSON.stringify({
          Version: "2012-10-17",
          Id: `${name}-public-website`,
          Statement: [
            {
              Sid: "",
              Effect: "Allow",
              Principal: {
                AWS: `arn:aws:iam::cloudfront:user/CloudFront Origin Access Identity ${cloudfrontOriginAccessIdentity.id}`,
              },
              Action: "s3:GetObject",
              Resource: `arn:aws:s3:::${settings.uiBucketName!}/*`,
            },
            {
              Sid: "",
              Effect: "Allow",
              Principal: {
                AWS: `arn:aws:iam::cloudfront:user/CloudFront Origin Access Identity ${cloudfrontOriginAccessIdentity.id}`,
              },
              Action: "s3:ListBucket",
              Resource: `arn:aws:s3:::${settings.uiBucketName!}`,
            },
            {
              Sid: "",
              Effect: "Deny",
              Principal: {
                AWS: "*",
              },
              Action: "s3:*",
              Resource: [
                `arn:aws:s3:::${settings.uiBucketName!}/*`,
                `arn:aws:s3:::${settings.uiBucketName!}`,
              ],
              Condition: {
                Bool: {
                  "aws:SecureTransport": "false",
                },
              },
            },
          ],
        }),
      });

      // Fun stuff, let's grab the deployed files. We're expecting that someone has ran a build on the ui.

      // Let's check and grab files to deploy
      const files = glob.sync(
        path.resolve(__dirname, "../../../app/build/**/*"),
        {
          absolute: false,
          nodir: true,
        }
      );

      if (files.length > 0) {
        for (const file of files) {
          // We will set this item in S3.
          new S3BucketObject(
            this,
            `cloudfrount_s3_${path.dirname(file)}_${path.basename(file)}`,
            {
              dependsOn: [this.bucket], // Wait untill the bucket is not created
              key: file.replace(
                path.resolve(__dirname, "../../../app/build"),
                ""
              ), // Using relative path for folder structure on S3
              bucket: this.bucket.bucket,
              source: path.resolve(file), // Using absolute path to upload
              etag: `${Date.now()}`,
              contentType: mime.lookup(path.extname(file)) || undefined,
            }
          );
        }
      }
      // Setup a Cloudfront Distribution
      const cloudFrontDeployment = new CloudfrontDistribution(
        this,
        "ui-deployment-cloudfront",
        {
          enabled: true,
          defaultRootObject: "index.html",
          retainOnDelete: false,
          httpVersion: "http2",
          origin: [
            {
              originId: settings.uiBucketName!,
              domainName: this.bucket.bucketDomainName,
              s3OriginConfig: {
                originAccessIdentity:
                  cloudfrontOriginAccessIdentity.cloudfrontAccessIdentityPath,
              },
            },
          ],

          aliases: settings.setupDomain ? [settings.uiBucketName] : [],
          viewerCertificate: settings.setupDomain
            ? {
                acmCertificateArn: settings.ACMCertificateArn,
                sslSupportMethod: "sni-only",
              }
            : {
                cloudfrontDefaultCertificate: true,
                sslSupportMethod: "sni-only",
              },
          defaultCacheBehavior: {
            minTtl: 0,
            defaultTtl: 60,
            maxTtl: 86400,
            allowedMethods: [
              "DELETE",
              "GET",
              "HEAD",
              "OPTIONS",
              "PATCH",
              "POST",
              "PUT",
            ],
            cachedMethods: ["GET", "HEAD"],
            targetOriginId: settings.uiBucketName!,
            viewerProtocolPolicy: "redirect-to-https",
            forwardedValues: {
              cookies: {
                forward: "none",
              },
              headers: [],
              queryString: false,
            },
          },
          restrictions: {
            geoRestriction: {
              restrictionType: "none",
            },
          },
          waitForDeployment: false,
        }
      );

      new TerraformOutput(this, "website_endpoint", {
        description: "CloudFront URL",
        value: `https://${cloudFrontDeployment.domainName}`,
      });

      if (settings.setupDomain) {
        new Route53Record(this, `distribution-domain-${name}`, {
          name: settings.uiBucketName!,
          type: "A",
          zoneId: settings.domainZoneId,
          alias: [
            {
              name: cloudFrontDeployment.domainName,
              zoneId: cloudFrontDeployment.hostedZoneId,
              evaluateTargetHealth: true,
            },
          ],
        });

        new TerraformOutput(this, "website_custom_endpoint", {
          description: "CloudFront (Custom Domain) URL",
          value: `https://${settings.uiBucketName}`,
        });
      }
    }
  }
}
