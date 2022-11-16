# Setup CDKTF as Brand New

## Let's get started

#### Installing CDKTF CLI

`npm install --global cdktf-cli@latest`

#### CDKTF Init with Typescript

`cdktf init --template=typescript --local`

#### CDKTF Init with Python

`cdktf init --template=python --local`

#### Setup Provider for AWS

`cdktf provider add "aws@~>4.0"`

#### Setting up a S3 for Tracking Deployments

We will need to a create a S3 bucket that will be used to hold our tfstate files from Terraform.
Let's create a s3 bucket called `workshop-deployments` for this workshop.

[More Information About Creating S3 Buckets](https://docs.aws.amazon.com/AmazonS3/latest/userguide/create-bucket-overview.html)
