// Copyright (c) HashiCorp, Inc
// SPDX-License-Identifier: MPL-2.0
import "cdktf/lib/testing/adapters/jest"; // Load types for expect matchers
import { Testing } from "cdktf";
import { CDKTFWorkShop } from "../main";

describe("My CDKTF Application", () => {
  // The tests below are example tests, you can find more information at
  // https://cdk.tf/testing
  it.todo("should be tested");

  // // All Unit tests test the synthesised terraform code, it does not create real-world resources
  describe("Unit testing using assertions", () => {
    it("should contain a resource", () => {
      expect(
Testing.synthScope((stack) => {
  new CDKTFWorkShop(stack, "my-app", {
    uiDeployment: true, // Let's us check in code if we need to deploy the UI or not
    region: "us-east-1",
    uiBucketName: "workshop-my-app.softrams.cloud", // If we are deploying the UI we need a bucketname for it.
    environment: "my-app", // Our Environment name, this tells us which stage to deploy and name
    name: "cdktfworkshop",
    lambdaBucketName: "workshop-my-app-lambda", // Setups our lambda bucket to store our zips
    setupDomain: true, // Again checks if a domain needs to be setup or not
    domainZoneId: "testingZoneHere" // Setups up domain in correct zone
  });
})).
toMatchInlineSnapshot(`
"{
}"
`);
    });
  });

  // describe("Unit testing using snapshots", () => {
  //   it("Tests the snapshot", () => {
  //     const app = Testing.app();
  //     const stack = new TerraformStack(app, "test");

  //     new TestProvider(stack, "provider", {
  //       accessKey: "1",
  //     });

  //     new TestResource(stack, "test", {
  //       name: "my-resource",
  //     });

  //     expect(Testing.synth(stack)).toMatchSnapshot();
  //   });

  //   it("Tests a combination of resources", () => {
  //     expect(
  //       Testing.synthScope((stack) => {
  //         new TestDataSource(stack, "test-data-source", {
  //           name: "foo",
  //         });

  //         new TestResource(stack, "test-resource", {
  //           name: "bar",
  //         });
  //       })
  //     ).toMatchInlineSnapshot();
  //   });
  // });

  // describe("Checking validity", () => {
  //   it("check if the produced terraform configuration is valid", () => {
  //     const app = Testing.app();
  //     const stack = new TerraformStack(app, "test");

  //     new TestDataSource(stack, "test-data-source", {
  //       name: "foo",
  //     });

  //     new TestResource(stack, "test-resource", {
  //       name: "bar",
  //     });
  //     expect(Testing.fullSynth(app)).toBeValidTerraform();
  //   });

  //   it("check if this can be planned", () => {
  //     const app = Testing.app();
  //     const stack = new TerraformStack(app, "test");

  //     new TestDataSource(stack, "test-data-source", {
  //       name: "foo",
  //     });

  //     new TestResource(stack, "test-resource", {
  //       name: "bar",
  //     });
  //     expect(Testing.fullSynth(app)).toPlanSuccessfully();
  //   });
  // });
});
